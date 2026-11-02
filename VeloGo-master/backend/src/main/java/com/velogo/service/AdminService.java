package com.velogo.service;

import com.velogo.domain.*;
import com.velogo.domain.enums.NotificationType;
import com.velogo.domain.enums.RideStatus;
import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import com.velogo.dto.AdminDtos;
import com.velogo.dto.RideDtos;
import com.velogo.exception.BadRequestException;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final CaptainProfileRepository captainRepository;
    private final RideRepository rideRepository;
    private final PaymentRepository paymentRepository;
    private final FareConfigurationRepository fareConfigRepository;
    private final CouponRepository couponRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final NotificationService notificationService;
    private final VehicleRepository vehicleRepository;
    private final RideService rideService;

    @Transactional(readOnly = true)
    public Page<AdminDtos.CaptainAdminDto> getCaptains(VerificationStatus status, Pageable pageable) {
        Page<CaptainProfile> profiles = (status != null)
                ? captainRepository.findByVerificationStatus(status, pageable)
                : captainRepository.findAll(pageable);

        return profiles.map(cp -> {
            AdminDtos.CaptainUserSummary userSummary = (cp.getUser() != null)
                    ? new AdminDtos.CaptainUserSummary(cp.getUser().getId(), cp.getUser().getFullName(), cp.getUser().getEmail(), cp.getUser().getPhone())
                    : null;
            AdminDtos.CaptainVehicleSummary vehicleSummary = vehicleRepository.findByCaptainId(cp.getId())
                    .map(v -> new AdminDtos.CaptainVehicleSummary(v.getId(), v.getCategory(), v.getModel(), v.getRegistrationNumber(), v.getColor()))
                    .orElse(null);
            return new AdminDtos.CaptainAdminDto(
                    cp.getId(),
                    userSummary,
                    vehicleSummary,
                    cp.getDrivingLicenseNumber(),
                    cp.getVerificationStatus(),
                    cp.getRejectionReason(),
                    cp.isOnline(),
                    cp.isAvailable(),
                    cp.isWomenOnlyEligible(),
                    cp.getWomenOnlyStatus(),
                    cp.getWomenOnlyRejectionReason(),
                    cp.getRatingAvg(),
                    cp.getTotalRides(),
                    cp.getTotalEarnings(),
                    cp.getCreatedAt() != null ? cp.getCreatedAt().toString() : null
            );
        });
    }

    @Transactional(readOnly = true)
    public AdminDtos.AdminOverviewDto getOverview() {
        long totalCustomers = userRepository.countByRole(Role.ROLE_CUSTOMER);
        long totalCaptains = userRepository.countByRole(Role.ROLE_CAPTAIN);
        long pendingCaptains = captainRepository.countByVerificationStatus(VerificationStatus.PENDING);
        long onlineCaptains = captainRepository.countByOnlineTrue();

        long totalRides = rideRepository.count();
        long completedRides = rideRepository.countByStatus(RideStatus.COMPLETED);
        long cancelledRides = rideRepository.countByStatus(RideStatus.CANCELLED);
        long activeRides = totalRides - completedRides - cancelledRides;

        BigDecimal grossBooking = rideRepository.calculateTotalGrossBookingValue();
        BigDecimal totalPayments = paymentRepository.calculateTotalCollectedPayments();

        Page<Ride> recent = rideRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 10));
        List<AdminDtos.RecentRideDto> recentDtos = recent.stream().map(r -> new AdminDtos.RecentRideDto(
                r.getId(),
                r.getCustomer().getFullName(),
                r.getCaptain() != null ? r.getCaptain().getUser().getFullName() : "Unassigned",
                r.getVehicleCategory(),
                r.getStatus(),
                r.getFinalFare() != null ? r.getFinalFare() : r.getEstimatedFare(),
                r.getCreatedAt().toString()
        )).toList();

        return new AdminDtos.AdminOverviewDto(
                totalCustomers,
                totalCaptains,
                pendingCaptains,
                onlineCaptains,
                totalRides,
                Math.max(0, activeRides),
                completedRides,
                cancelledRides,
                grossBooking,
                totalPayments,
                recentDtos
        );
    }

    @Transactional(readOnly = true)
    public Page<RideDtos.RideDto> getAllRides(Pageable pageable) {
        Page<Ride> rides = rideRepository.findAllByOrderByCreatedAtDesc(pageable);
        return rides.map(rideService::toRideDto);
    }

    @Transactional(readOnly = true)
    public Page<AdminAuditLog> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Transactional
    public CaptainProfile verifyCaptain(User admin, String captainId, VerificationStatus newStatus, String reason) {
        CaptainProfile captain = captainRepository.findById(captainId)
                .orElseThrow(() -> new ResourceNotFoundException("Captain profile not found with id: " + captainId));

        captain.setVerificationStatus(newStatus);
        captain.setRejectionReason(reason);
        if (newStatus != VerificationStatus.APPROVED) {
            captain.setOnline(false);
            captain.setAvailable(false);
        }
        CaptainProfile saved = captainRepository.save(captain);

        // Audit log
        recordAuditLog(admin, "VERIFY_CAPTAIN", "CaptainProfile", captainId,
                "Status changed to " + newStatus + (reason != null ? ". Reason: " + reason : ""));

        // Notify captain
        String msg = newStatus == VerificationStatus.APPROVED
                ? "Congratulations! Your VeloGo Captain application has been APPROVED. You can now go online and accept rides."
                : "Your VeloGo Captain application was rejected. Reason: " + reason;

        notificationService.sendNotification(
                captain.getUser().getId(),
                "Captain Account " + newStatus,
                msg,
                NotificationType.VERIFICATION
        );

        return saved;
    }

    @Transactional
    public CaptainProfile verifyWomenOnlyCaptain(User admin, String captainId, String newStatus, String reason) {
        CaptainProfile captain = captainRepository.findById(captainId)
                .orElseThrow(() -> new ResourceNotFoundException("Captain profile not found with id: " + captainId));

        if ("APPROVED".equalsIgnoreCase(newStatus)) {
            captain.setWomenOnlyEligible(true);
            captain.setWomenOnlyStatus("APPROVED");
            captain.setWomenOnlyRejectionReason(null);
        } else if ("REJECTED".equalsIgnoreCase(newStatus)) {
            captain.setWomenOnlyEligible(false);
            captain.setWomenOnlyStatus("REJECTED");
            captain.setWomenOnlyRejectionReason(reason);
        } else {
            throw new BadRequestException("Invalid Women-Only verification status: " + newStatus);
        }

        CaptainProfile saved = captainRepository.save(captain);

        // Audit log
        recordAuditLog(admin, "VERIFY_WOMEN_ONLY_CAPTAIN", "CaptainProfile", captainId,
                "Women-Only status changed to " + newStatus + (reason != null ? ". Reason: " + reason : ""));

        // Notify captain
        notificationService.sendNotification(
                captain.getUser().getId(),
                "Women-Only Bike Program Update",
                "Your Women-Only application has been " + newStatus.toUpperCase() + (reason != null ? ". Reason: " + reason : "."),
                NotificationType.VERIFICATION
        );

        return saved;
    }

    @Transactional
    public User updateCustomerStatus(User admin, String userId, boolean active, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setActive(active);
        User saved = userRepository.save(user);

        recordAuditLog(admin, active ? "ACTIVATE_USER" : "SUSPEND_USER", "User", userId,
                "User " + (active ? "activated" : "suspended") + ". Reason: " + reason);

        return saved;
    }

    @Transactional
    public FareConfiguration updateFareConfig(User admin, VehicleCategory category, AdminDtos.UpdateFareConfigRequest req) {
        FareConfiguration config = fareConfigRepository.findByCategory(category)
                .orElseGet(() -> FareConfiguration.builder().id(UUID.randomUUID().toString()).category(category).build());

        config.setBaseFare(req.baseFare());
        config.setMinFare(req.minFare());
        config.setPerKmRate(req.perKmRate());
        config.setPerMinRate(req.perMinRate());
        config.setBookingFee(req.bookingFee());
        config.setTaxRatePercent(req.taxRatePercent());
        if (req.active() != null) config.setActive(req.active());

        FareConfiguration saved = fareConfigRepository.save(config);

        recordAuditLog(admin, "UPDATE_FARE_CONFIG", "FareConfiguration", category.name(),
                "Base=" + req.baseFare() + ", PerKm=" + req.perKmRate() + ", PerMin=" + req.perMinRate());

        return saved;
    }

    @Transactional
    public Coupon createCoupon(User admin, AdminDtos.CreateCouponRequest req) {
        if (couponRepository.findByCodeIgnoreCase(req.code().trim()).isPresent()) {
            throw new BadRequestException("Coupon with code " + req.code() + " already exists.");
        }

        Coupon coupon = Coupon.builder()
                .id(UUID.randomUUID().toString())
                .code(req.code().trim().toUpperCase())
                .description(req.description())
                .discountPercent(req.discountPercent())
                .maxDiscount(req.maxDiscount())
                .minRideAmount(req.minRideAmount())
                .active(req.active() != null ? req.active() : true)
                .expiryDate(req.validDays() != null ? LocalDateTime.now().plusDays(req.validDays()) : null)
                .build();

        Coupon saved = couponRepository.save(coupon);

        recordAuditLog(admin, "CREATE_COUPON", "Coupon", saved.getCode(),
                "Discount=" + req.discountPercent() + "%, Max=" + req.maxDiscount());

        return saved;
    }

    private void recordAuditLog(User admin, String action, String targetEntity, String targetId, String details) {
        AdminAuditLog logEntry = AdminAuditLog.builder()
                .id(UUID.randomUUID().toString())
                .admin(admin)
                .action(action)
                .targetEntity(targetEntity)
                .targetId(targetId)
                .details(details)
                .build();
        auditLogRepository.save(logEntry);
    }
}
