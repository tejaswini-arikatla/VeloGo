package com.velogo;

import com.velogo.domain.*;
import com.velogo.domain.enums.*;
import com.velogo.dto.SubscriptionDtos;
import com.velogo.repository.SubscriptionPlanRepository;
import com.velogo.repository.SubscriptionUsageRepository;
import com.velogo.repository.UserSubscriptionRepository;
import com.velogo.service.NotificationService;
import com.velogo.service.SubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubscriptionServiceTest {

    @Mock
    private SubscriptionPlanRepository planRepository;

    @Mock
    private UserSubscriptionRepository userSubscriptionRepository;

    @Mock
    private SubscriptionUsageRepository usageRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private SubscriptionService subscriptionService;

    private User user;
    private SubscriptionPlan commuterPlan;
    private UserSubscription activeSubscription;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id("u-sub-1")
                .fullName("Alice Commuter")
                .email("alice@commuter.com")
                .phone("+919000000003")
                .role(Role.ROLE_CUSTOMER)
                .build();

        commuterPlan = SubscriptionPlan.builder()
                .id("plan-commuter")
                .name("VeloGo Commuter Pass")
                .description("20% off all rides plus 5 free rides")
                .tier(SubscriptionTier.COMMUTER)
                .price(new BigDecimal("299.00"))
                .interval(SubscriptionInterval.MONTHLY)
                .discountPercentage(new BigDecimal("20.00"))
                .maxDiscountPerRide(new BigDecimal("50.00"))
                .freeRidesCount(5)
                .priorityMatching(false)
                .status(PlanStatus.ACTIVE)
                .build();

        activeSubscription = UserSubscription.builder()
                .id("usub-1")
                .user(user)
                .plan(commuterPlan)
                .status(SubscriptionStatus.ACTIVE)
                .currentPeriodStart(LocalDateTime.now().minusDays(5))
                .currentPeriodEnd(LocalDateTime.now().plusDays(25))
                .autoRenew(true)
                .remainingFreeRides(3)
                .totalDiscountSaved(new BigDecimal("120.00"))
                .totalRidesTaken(4)
                .build();
    }

    @Test
    @DisplayName("Should evaluate 100% free ride when remaining free rides count > 0")
    void testEvaluateDiscount_FreeRide() {
        when(userSubscriptionRepository.findActiveSubscriptionsByUserId("u-sub-1"))
                .thenReturn(List.of(activeSubscription));

        Optional<SubscriptionService.SubscriptionDiscountResult> result =
                subscriptionService.evaluateSubscriptionDiscount("u-sub-1", new BigDecimal("150.00"));

        assertTrue(result.isPresent());
        assertTrue(result.get().isFreeRide());
        assertEquals(new BigDecimal("150.00"), result.get().discountAmount());
    }

    @Test
    @DisplayName("Should evaluate percentage discount capped at max discount when free rides exhausted")
    void testEvaluateDiscount_PercentageDiscountCapped() {
        activeSubscription.setRemainingFreeRides(0);
        when(userSubscriptionRepository.findActiveSubscriptionsByUserId("u-sub-1"))
                .thenReturn(List.of(activeSubscription));

        // 20% of 400 is 80, but maxDiscountPerRide is 50.00
        Optional<SubscriptionService.SubscriptionDiscountResult> result =
                subscriptionService.evaluateSubscriptionDiscount("u-sub-1", new BigDecimal("400.00"));

        assertTrue(result.isPresent());
        assertFalse(result.get().isFreeRide());
        assertEquals(new BigDecimal("50.00"), result.get().discountAmount());
    }

    @Test
    @DisplayName("Should subscribe user to active plan and notify")
    void testSubscribeToPlan() {
        when(planRepository.findById("plan-commuter")).thenReturn(Optional.of(commuterPlan));
        when(userSubscriptionRepository.findActiveSubscriptionsByUserId("u-sub-1")).thenReturn(List.of());
        when(userSubscriptionRepository.save(any(UserSubscription.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SubscriptionDtos.SubscribeRequest req = new SubscriptionDtos.SubscribeRequest("plan-commuter", "pm_card_test");
        SubscriptionDtos.UserSubscriptionDto subDto = subscriptionService.subscribeToPlan(user, req);

        assertNotNull(subDto);
        assertEquals("VeloGo Commuter Pass", subDto.planName());
        assertEquals(5, subDto.remainingFreeRides());
        assertTrue(subDto.autoRenew());
        verify(notificationService).sendNotification(eq("u-sub-1"), contains("Activated"), anyString(), eq(NotificationType.PROMO));
    }
}
