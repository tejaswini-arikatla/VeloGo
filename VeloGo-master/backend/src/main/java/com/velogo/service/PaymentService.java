package com.velogo.service;

import com.velogo.domain.Payment;
import com.velogo.domain.Ride;
import com.velogo.domain.User;
import com.velogo.domain.enums.NotificationType;
import com.velogo.domain.enums.PaymentMethod;
import com.velogo.domain.enums.PaymentStatus;
import com.velogo.dto.PaymentDtos;
import com.velogo.exception.BadRequestException;
import com.velogo.exception.ForbiddenException;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.PaymentRepository;
import com.velogo.repository.RideRepository;
import com.velogo.websocket.RideEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final RideRepository rideRepository;
    private final NotificationService notificationService;
    private final RideEventPublisher eventPublisher;

    @Value("${app.razorpay.key-id:rzp_test_velogo123456}")
    private String razorpayKeyId;

    @Value("${app.razorpay.key-secret:velogo_secret_test_key}")
    private String razorpayKeySecret;

    @Value("${app.razorpay.simulate-mode:true}")
    private boolean simulateMode;

    @Transactional
    public PaymentDtos.CreatePaymentOrderResponse createPaymentOrder(User customer, PaymentDtos.CreatePaymentOrderRequest req) {
        Ride ride = rideRepository.findById(req.rideId())
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found"));

        if (!ride.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You are not authorized to make payment for this ride.");
        }

        BigDecimal amount = ride.getFinalFare() != null ? ride.getFinalFare() : ride.getEstimatedFare();

        Payment payment = paymentRepository.findByRideId(ride.getId())
                .orElseGet(() -> Payment.builder()
                        .id(UUID.randomUUID().toString())
                        .ride(ride)
                        .customer(customer)
                        .amount(amount)
                        .currency("INR")
                        .method(req.paymentMethod())
                        .status(PaymentStatus.PENDING)
                        .idempotencyKey(req.idempotencyKey() != null ? req.idempotencyKey() : "idem-" + ride.getId())
                        .build());

        payment.setMethod(req.paymentMethod());
        payment.setAmount(amount);

        String orderId = "order_sim_" + System.currentTimeMillis();
        payment.setRazorpayOrderId(orderId);
        Payment saved = paymentRepository.save(payment);

        return new PaymentDtos.CreatePaymentOrderResponse(
                saved.getId(),
                ride.getId(),
                amount,
                "INR",
                req.paymentMethod(),
                saved.getStatus(),
                orderId,
                razorpayKeyId,
                simulateMode
        );
    }

    @Transactional
    public PaymentDtos.PaymentReceiptDto verifyPayment(User customer, PaymentDtos.VerifyPaymentRequest req) {
        Payment payment = paymentRepository.findById(req.paymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment record not found"));

        if (!payment.getCustomer().getId().equals(customer.getId())) {
            throw new ForbiddenException("You are not authorized to verify this payment.");
        }

        // Idempotency: if already SUCCESS, return receipt immediately
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return generateReceipt(payment);
        }

        if (payment.getMethod() == PaymentMethod.CASH) {
            // Cash payment marked completed
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setCompletedAt(LocalDateTime.now());
            payment.setRazorpayPaymentId("cash_pay_" + System.currentTimeMillis());
        } else if (req.simulatedSuccess() || simulateMode) {
            // Dev Payment Simulator verification
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setCompletedAt(LocalDateTime.now());
            payment.setRazorpayPaymentId(req.razorpayPaymentId() != null ? req.razorpayPaymentId() : "pay_sim_" + System.currentTimeMillis());
            payment.setRazorpaySignature("sig_sim_valid_" + UUID.randomUUID());
        } else {
            // Live Razorpay signature check
            if (req.razorpayPaymentId() == null || req.razorpayOrderId() == null || req.razorpaySignature() == null) {
                throw new BadRequestException("Missing Razorpay payment verification parameters.");
            }
            boolean valid = verifyRazorpaySignature(req.razorpayOrderId(), req.razorpayPaymentId(), req.razorpaySignature());
            if (!valid) {
                payment.setStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);
                throw new BadRequestException("Razorpay signature verification failed. Payment untrusted.");
            }
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setCompletedAt(LocalDateTime.now());
            payment.setRazorpayPaymentId(req.razorpayPaymentId());
            payment.setRazorpaySignature(req.razorpaySignature());
        }

        Payment updated = paymentRepository.save(payment);

        // Notify customer
        notificationService.sendNotification(
                customer.getId(),
                "Payment Successful!",
                "Payment of ₹" + updated.getAmount() + " for ride " + payment.getRide().getId() + " was successful.",
                NotificationType.PAYMENT
        );

        eventPublisher.publishRideUpdate(payment.getRide().getId(), updated);

        return generateReceipt(updated);
    }

    @Transactional(readOnly = true)
    public PaymentDtos.PaymentReceiptDto getReceiptByRideId(String rideId, String userId) {
        Payment payment = paymentRepository.findByRideId(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for ride: " + rideId));

        return generateReceipt(payment);
    }

    private boolean verifyRazorpaySignature(String orderId, String paymentId, String signature) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(razorpayKeySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String generated = HexFormat.of().formatHex(hash);
            return MessageDigest.isEqual(generated.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Signature verification error", e);
            return false;
        }
    }

    private PaymentDtos.PaymentReceiptDto generateReceipt(Payment p) {
        Ride r = p.getRide();
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

        String captainName = r.getCaptain() != null ? r.getCaptain().getUser().getFullName() : "Assigned Captain";
        String vehicleModel = r.getCaptain() != null && r.getCaptain().getVehicle() != null ? r.getCaptain().getVehicle().getModel() : "Vehicle";
        String regNumber = r.getCaptain() != null && r.getCaptain().getVehicle() != null ? r.getCaptain().getVehicle().getRegistrationNumber() : "KA-01";

        BigDecimal baseFare = new BigDecimal("25.00");
        BigDecimal distanceCharge = r.getDistanceKm().multiply(new BigDecimal("9.00")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal timeCharge = BigDecimal.valueOf(r.getDurationMinutes()).multiply(new BigDecimal("1.50")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bookingFee = new BigDecimal("5.00");

        return new PaymentDtos.PaymentReceiptDto(
                p.getId(),
                r.getId(),
                r.getCustomer().getFullName(),
                r.getCustomer().getEmail(),
                r.getCustomer().getPhone(),
                captainName,
                r.getVehicleCategory(),
                vehicleModel,
                regNumber,
                r.getPickupAddress(),
                r.getDestAddress(),
                r.getDistanceKm(),
                r.getDurationMinutes(),
                baseFare,
                distanceCharge,
                timeCharge,
                bookingFee,
                r.getTaxAmount(),
                r.getDiscountAmount(),
                p.getAmount(),
                p.getMethod(),
                p.getStatus(),
                p.getRazorpayPaymentId() != null ? p.getRazorpayPaymentId() : p.getId(),
                p.getCompletedAt() != null ? p.getCompletedAt().format(dtf) : LocalDateTime.now().format(dtf)
        );
    }
}
