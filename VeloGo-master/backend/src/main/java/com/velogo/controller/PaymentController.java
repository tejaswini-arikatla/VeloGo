package com.velogo.controller;

import com.velogo.domain.User;
import com.velogo.dto.PaymentDtos;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.UserRepository;
import com.velogo.security.CustomUserDetails;
import com.velogo.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Payment orders, signature verification, receipts, and dev simulation")
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    @PostMapping("/order")
    @Operation(summary = "Create payment order (Cash or Razorpay test order)")
    public ResponseEntity<PaymentDtos.CreatePaymentOrderResponse> createOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PaymentDtos.CreatePaymentOrderRequest req
    ) {
        User customer = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(paymentService.createPaymentOrder(customer, req));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify Razorpay signature or simulated dev payment")
    public ResponseEntity<PaymentDtos.PaymentReceiptDto> verifyPayment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PaymentDtos.VerifyPaymentRequest req
    ) {
        User customer = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(paymentService.verifyPayment(customer, req));
    }

    @GetMapping("/receipt/{rideId}")
    @Operation(summary = "Get official downloadable ride receipt")
    public ResponseEntity<PaymentDtos.PaymentReceiptDto> getReceipt(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String rideId
    ) {
        return ResponseEntity.ok(paymentService.getReceiptByRideId(rideId, userDetails.getId()));
    }

    @PostMapping("/webhook")
    @Operation(summary = "Razorpay webhook callback endpoint")
    public ResponseEntity<String> handleWebhook(@RequestBody String payload) {
        // Idempotent webhook receiver
        return ResponseEntity.ok("OK");
    }
}
