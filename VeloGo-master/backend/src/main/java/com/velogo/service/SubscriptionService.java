package com.velogo.service;

import com.velogo.domain.Ride;
import com.velogo.domain.SubscriptionPlan;
import com.velogo.domain.SubscriptionUsage;
import com.velogo.domain.User;
import com.velogo.domain.UserSubscription;
import com.velogo.domain.enums.NotificationType;
import com.velogo.domain.enums.PlanStatus;
import com.velogo.domain.enums.SubscriptionInterval;
import com.velogo.domain.enums.SubscriptionStatus;
import com.velogo.dto.SubscriptionDtos;
import com.velogo.exception.BadRequestException;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.SubscriptionPlanRepository;
import com.velogo.repository.SubscriptionUsageRepository;
import com.velogo.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionUsageRepository usageRepository;
    private final NotificationService notificationService;

    public List<SubscriptionDtos.SubscriptionPlanDto> getActivePlans() {
        return planRepository.findByStatusOrderByPriceAsc(PlanStatus.ACTIVE).stream()
                .map(this::mapToPlanDto)
                .toList();
    }

    public SubscriptionDtos.UserSubscriptionPortalDto getUserSubscriptionPortal(User user) {
        List<UserSubscription> activeSubs = userSubscriptionRepository.findActiveSubscriptionsByUserId(user.getId());
        SubscriptionDtos.UserSubscriptionDto activeDto = activeSubs.isEmpty() ? null : mapToUserSubDto(activeSubs.get(0));

        List<SubscriptionDtos.SubscriptionPlanDto> plans = getActivePlans();

        List<SubscriptionDtos.SubscriptionUsageDto> usages = activeSubs.isEmpty()
                ? List.of()
                : usageRepository.findByUserSubscriptionIdOrderByUsedAtDesc(activeSubs.get(0).getId()).stream()
                .limit(10)
                .map(u -> new SubscriptionDtos.SubscriptionUsageDto(
                        u.getId(),
                        u.getUserSubscription().getId(),
                        u.getRide() != null ? u.getRide().getId() : null,
                        u.getDiscountApplied(),
                        u.isWasFreeRide(),
                        u.getUsedAt()
                ))
                .toList();

        BigDecimal totalSavings = activeSubs.isEmpty() ? BigDecimal.ZERO : activeSubs.get(0).getTotalDiscountSaved();
        int ridesWithPass = activeSubs.isEmpty() ? 0 : activeSubs.get(0).getTotalRidesTaken();

        return new SubscriptionDtos.UserSubscriptionPortalDto(
                activeDto,
                plans,
                usages,
                totalSavings,
                ridesWithPass
        );
    }

    @Transactional
    public SubscriptionDtos.UserSubscriptionDto subscribeToPlan(User user, SubscriptionDtos.SubscribeRequest req) {
        SubscriptionPlan plan = planRepository.findById(req.planId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription plan not found"));

        if (plan.getStatus() != PlanStatus.ACTIVE) {
            throw new BadRequestException("This subscription plan is no longer active");
        }

        // Check if user already has an active subscription
        List<UserSubscription> currentActive = userSubscriptionRepository.findActiveSubscriptionsByUserId(user.getId());
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = plan.getInterval() == SubscriptionInterval.ANNUAL
                ? start.plusYears(1)
                : start.plusMonths(1);

        if (!currentActive.isEmpty()) {
            // Cancel old subscription
            UserSubscription old = currentActive.get(0);
            old.setStatus(SubscriptionStatus.CANCELLED);
            old.setAutoRenew(false);
            userSubscriptionRepository.save(old);
        }

        UserSubscription sub = UserSubscription.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .plan(plan)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(start)
                .currentPeriodEnd(end)
                .autoRenew(true)
                .paymentMethodId(req.paymentMethodId() != null ? req.paymentMethodId() : "pm_card_demo")
                .remainingFreeRides(plan.getFreeRidesCount())
                .totalDiscountSaved(BigDecimal.ZERO)
                .totalRidesTaken(0)
                .build();

        UserSubscription saved = userSubscriptionRepository.save(sub);

        notificationService.sendNotification(
                user.getId(),
                "Subscription Activated: " + plan.getName(),
                "Welcome to " + plan.getName() + "! Enjoy " + plan.getDiscountPercentage() + "% discount and " +
                        plan.getFreeRidesCount() + " free rides until " + end.toLocalDate(),
                NotificationType.PROMO
        );

        return mapToUserSubDto(saved);
    }

    @Transactional
    public SubscriptionDtos.UserSubscriptionDto toggleAutoRenew(User user, String subscriptionId) {
        UserSubscription sub = userSubscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found"));

        if (!sub.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Unauthorized access to subscription");
        }

        sub.setAutoRenew(!sub.isAutoRenew());
        UserSubscription updated = userSubscriptionRepository.save(sub);
        return mapToUserSubDto(updated);
    }

    @Transactional
    public SubscriptionDtos.UserSubscriptionDto cancelSubscription(User user, String subscriptionId) {
        UserSubscription sub = userSubscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found"));

        if (!sub.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Unauthorized access to subscription");
        }

        sub.setAutoRenew(false);
        sub.setStatus(SubscriptionStatus.CANCELLED);
        UserSubscription updated = userSubscriptionRepository.save(sub);

        notificationService.sendNotification(
                user.getId(),
                "Subscription Cancelled",
                "Your " + sub.getPlan().getName() + " pass auto-renewal has been turned off. Benefits remain active until " +
                        sub.getCurrentPeriodEnd().toLocalDate(),
                NotificationType.SYSTEM
        );

        return mapToUserSubDto(updated);
    }

    public record SubscriptionDiscountResult(
            UserSubscription subscription,
            BigDecimal discountAmount,
            boolean isFreeRide,
            String planName
    ) {}

    public Optional<SubscriptionDiscountResult> evaluateSubscriptionDiscount(String userId, BigDecimal baseFare) {
        List<UserSubscription> activeSubs = userSubscriptionRepository.findActiveSubscriptionsByUserId(userId);
        if (activeSubs.isEmpty()) {
            return Optional.empty();
        }

        UserSubscription sub = activeSubs.get(0);
        SubscriptionPlan plan = sub.getPlan();

        // 1. Free ride check
        if (sub.getRemainingFreeRides() != null && sub.getRemainingFreeRides() > 0) {
            return Optional.of(new SubscriptionDiscountResult(
                    sub,
                    baseFare,
                    true,
                    plan.getName() + " (Free Ride)"
            ));
        }

        // 2. Percentage discount up to max_discount_per_ride
        if (plan.getDiscountPercentage() != null && plan.getDiscountPercentage().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal rawDiscount = baseFare.multiply(plan.getDiscountPercentage())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal discount = rawDiscount.min(plan.getMaxDiscountPerRide()).setScale(2, RoundingMode.HALF_UP);

            if (discount.compareTo(BigDecimal.ZERO) > 0) {
                return Optional.of(new SubscriptionDiscountResult(
                        sub,
                        discount,
                        false,
                        plan.getName() + " (" + plan.getDiscountPercentage() + "% Off)"
                ));
            }
        }

        return Optional.empty();
    }

    public SubscriptionDtos.SubscriptionDiscountCalculationDto calculateDiscountForFare(String userId, BigDecimal baseFare) {
        if (userId == null || baseFare == null || baseFare.compareTo(BigDecimal.ZERO) <= 0) {
            return new SubscriptionDtos.SubscriptionDiscountCalculationDto(
                    BigDecimal.ZERO, false, null, baseFare != null ? baseFare : BigDecimal.ZERO, baseFare != null ? baseFare : BigDecimal.ZERO
            );
        }
        Optional<SubscriptionDiscountResult> opt = evaluateSubscriptionDiscount(userId, baseFare);
        if (opt.isEmpty()) {
            return new SubscriptionDtos.SubscriptionDiscountCalculationDto(
                    BigDecimal.ZERO, false, null, baseFare, baseFare
            );
        }
        SubscriptionDiscountResult res = opt.get();
        BigDecimal finalFare = res.isFreeRide() ? BigDecimal.ZERO : baseFare.subtract(res.discountAmount()).max(BigDecimal.ZERO);
        return new SubscriptionDtos.SubscriptionDiscountCalculationDto(
                res.discountAmount(),
                res.isFreeRide(),
                res.planName(),
                baseFare,
                finalFare
        );
    }

    public SubscriptionDtos.CreateSubscriptionOrderResponse createSubscriptionOrder(User user, String planId) {
        SubscriptionPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription plan not found"));

        if (plan.getStatus() != PlanStatus.ACTIVE) {
            throw new BadRequestException("This subscription plan is currently unavailable");
        }

        String orderId = "sub_ord_" + UUID.randomUUID().toString().substring(0, 10);
        return new SubscriptionDtos.CreateSubscriptionOrderResponse(
                orderId,
                plan.getId(),
                plan.getName(),
                plan.getPrice(),
                "INR",
                "rzp_test_velogo123456"
        );
    }

    @Transactional
    public SubscriptionDtos.UserSubscriptionDto verifySubscriptionPayment(User user, SubscriptionDtos.VerifySubscriptionPaymentRequest req) {
        log.info("Verifying subscription order {} for user {} on plan {}", req.razorpayOrderId(), user.getEmail(), req.planId());
        return subscribeToPlan(user, new SubscriptionDtos.SubscribeRequest(
                req.planId(),
                req.razorpayPaymentId() != null ? req.razorpayPaymentId() : "pm_card_demo_verified"
        ));
    }

    @Transactional
    public void handleWebhookEvent(SubscriptionDtos.SubscriptionWebhookRequest webhook) {
        log.info("Processing subscription webhook event: {}", webhook.event());
        if (webhook.subscriptionId() == null) return;

        userSubscriptionRepository.findById(webhook.subscriptionId()).ifPresent(sub -> {
            if ("invoice.payment_succeeded".equalsIgnoreCase(webhook.event())) {
                sub.setStatus(SubscriptionStatus.ACTIVE);
                LocalDateTime nextEnd = sub.getPlan().getInterval() == SubscriptionInterval.ANNUAL
                        ? sub.getCurrentPeriodEnd().plusYears(1)
                        : sub.getCurrentPeriodEnd().plusMonths(1);
                sub.setCurrentPeriodEnd(nextEnd);
                sub.setRemainingFreeRides(sub.getPlan().getFreeRidesCount());
                userSubscriptionRepository.save(sub);
                log.info("Webhook: renewed subscription {}", sub.getId());
            } else if ("payment_failed".equalsIgnoreCase(webhook.event())) {
                sub.setStatus(SubscriptionStatus.PAST_DUE);
                userSubscriptionRepository.save(sub);
            } else if ("customer.subscription.deleted".equalsIgnoreCase(webhook.event())) {
                sub.setStatus(SubscriptionStatus.CANCELLED);
                sub.setAutoRenew(false);
                userSubscriptionRepository.save(sub);
            }
        });
    }

    @Transactional
    public void recordUsage(UserSubscription sub, Ride ride, BigDecimal discount, boolean isFreeRide) {
        if (sub == null) return;

        SubscriptionUsage usage = SubscriptionUsage.builder()
                .id(UUID.randomUUID().toString())
                .userSubscription(sub)
                .ride(ride)
                .discountApplied(discount != null ? discount : BigDecimal.ZERO)
                .wasFreeRide(isFreeRide)
                .usedAt(LocalDateTime.now())
                .build();
        usageRepository.save(usage);

        sub.setTotalRidesTaken(sub.getTotalRidesTaken() + 1);
        if (discount != null) {
            sub.setTotalDiscountSaved(sub.getTotalDiscountSaved().add(discount));
        }
        if (isFreeRide && sub.getRemainingFreeRides() > 0) {
            sub.setRemainingFreeRides(sub.getRemainingFreeRides() - 1);
        }
        userSubscriptionRepository.save(sub);
    }

    // Automated Recurring Renewal Job - runs every hour to check subscriptions expiring within 24 hours
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void processRecurringRenewals() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime next24h = now.plusHours(24);

        List<UserSubscription> expiring = userSubscriptionRepository.findExpiringSubscriptions(now, next24h);
        log.info("Processing recurring renewals for {} expiring subscriptions", expiring.size());

        for (UserSubscription sub : expiring) {
            if (sub.isAutoRenew()) {
                // Mock payment renewal success
                SubscriptionPlan plan = sub.getPlan();
                LocalDateTime newStart = sub.getCurrentPeriodEnd();
                LocalDateTime newEnd = plan.getInterval() == SubscriptionInterval.ANNUAL
                        ? newStart.plusYears(1)
                        : newStart.plusMonths(1);

                sub.setCurrentPeriodStart(newStart);
                sub.setCurrentPeriodEnd(newEnd);
                sub.setRemainingFreeRides(plan.getFreeRidesCount());
                userSubscriptionRepository.save(sub);

                notificationService.sendNotification(
                        sub.getUser().getId(),
                        "Subscription Renewed: " + plan.getName(),
                        "Your pass has been renewed successfully until " + newEnd.toLocalDate() + ". Thank you for choosing VeloGo!",
                        NotificationType.SYSTEM
                );
            } else {
                sub.setStatus(SubscriptionStatus.EXPIRED);
                userSubscriptionRepository.save(sub);
            }
        }

        // Also clean up any that passed expiration date without renewal
        List<UserSubscription> pastDue = userSubscriptionRepository.findExpiredSubscriptions(now);
        for (UserSubscription sub : pastDue) {
            sub.setStatus(SubscriptionStatus.EXPIRED);
            userSubscriptionRepository.save(sub);
        }
    }

    private SubscriptionDtos.SubscriptionPlanDto mapToPlanDto(SubscriptionPlan plan) {
        return new SubscriptionDtos.SubscriptionPlanDto(
                plan.getId(),
                plan.getName(),
                plan.getDescription(),
                plan.getTier(),
                plan.getPrice(),
                plan.getInterval(),
                plan.getDiscountPercentage(),
                plan.getMaxDiscountPerRide(),
                plan.getFreeRidesCount(),
                plan.isPriorityMatching(),
                plan.getStatus()
        );
    }

    private SubscriptionDtos.UserSubscriptionDto mapToUserSubDto(UserSubscription sub) {
        boolean isActive = sub.getStatus() == SubscriptionStatus.ACTIVE && sub.getCurrentPeriodEnd().isAfter(LocalDateTime.now());
        return new SubscriptionDtos.UserSubscriptionDto(
                sub.getId(),
                sub.getUser().getId(),
                sub.getUser().getFullName(),
                sub.getPlan().getId(),
                sub.getPlan().getName(),
                sub.getPlan().getTier(),
                sub.getPlan().getPrice(),
                sub.getPlan().getInterval(),
                sub.getStatus(),
                sub.getCurrentPeriodStart(),
                sub.getCurrentPeriodEnd(),
                sub.isAutoRenew(),
                sub.getRemainingFreeRides(),
                sub.getTotalDiscountSaved(),
                sub.getTotalRidesTaken(),
                isActive,
                sub.getCreatedAt()
        );
    }
}
