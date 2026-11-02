package com.velogo;

import com.velogo.domain.Coupon;
import com.velogo.domain.FareConfiguration;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.repository.CouponRepository;
import com.velogo.repository.FareConfigurationRepository;
import com.velogo.service.FareCalculationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FareCalculationServiceTest {

    @Mock
    private FareConfigurationRepository fareConfigRepository;

    @Mock
    private CouponRepository couponRepository;

    @InjectMocks
    private FareCalculationService fareCalculationService;

    private FareConfiguration bikeConfig;

    @BeforeEach
    void setUp() {
        bikeConfig = FareConfiguration.builder()
                .category(VehicleCategory.BIKE)
                .baseFare(new BigDecimal("25.00"))
                .minFare(new BigDecimal("35.00"))
                .perKmRate(new BigDecimal("9.00"))
                .perMinRate(new BigDecimal("1.50"))
                .bookingFee(new BigDecimal("5.00"))
                .taxRatePercent(new BigDecimal("5.00"))
                .active(true)
                .build();
    }

    @Test
    void testStandardBikeFareCalculationWithoutCoupon() {
        when(fareConfigRepository.findByCategory(VehicleCategory.BIKE)).thenReturn(Optional.of(bikeConfig));

        // 5 km, 15 minutes
        // Base: 25.00
        // Distance: 5 * 9 = 45.00
        // Time: 15 * 1.50 = 22.50
        // Booking Fee: 5.00
        // Subtotal: 25 + 45 + 22.5 + 5 = 97.50
        // Tax (5% of 97.50): 4.88
        // Total Fare: 97.50 + 4.88 = 102.38
        FareCalculationService.FareBreakdown breakdown = fareCalculationService.calculateFare(
                VehicleCategory.BIKE,
                new BigDecimal("5.00"),
                15,
                null
        );

        assertNotNull(breakdown);
        assertEquals(new BigDecimal("25.00"), breakdown.baseFare());
        assertEquals(new BigDecimal("45.00"), breakdown.distanceCharge());
        assertEquals(new BigDecimal("22.50"), breakdown.timeCharge());
        assertEquals(new BigDecimal("5.00"), breakdown.bookingFee());
        assertEquals(new BigDecimal("97.50"), breakdown.subtotal());
        assertEquals(BigDecimal.ZERO, breakdown.discountAmount());
        assertEquals(new BigDecimal("4.88"), breakdown.taxAmount());
        assertEquals(new BigDecimal("102.38"), breakdown.totalFare());
    }

    @Test
    void testMinimumFareAppliedWhenRideIsVeryShort() {
        when(fareConfigRepository.findByCategory(VehicleCategory.BIKE)).thenReturn(Optional.of(bikeConfig));

        // 0.2 km, 1 minute
        // Base: 25 + (0.2 * 9 = 1.8) + (1 * 1.5 = 1.5) + 5 = 33.30
        // Below minFare (35.00) -> subtotal should be 35.00
        FareCalculationService.FareBreakdown breakdown = fareCalculationService.calculateFare(
                VehicleCategory.BIKE,
                new BigDecimal("0.20"),
                1,
                null
        );

        assertEquals(new BigDecimal("35.00"), breakdown.subtotal());
    }

    @Test
    void testCouponDiscountAppliedCorrectly() {
        when(fareConfigRepository.findByCategory(VehicleCategory.BIKE)).thenReturn(Optional.of(bikeConfig));

        Coupon coupon = Coupon.builder()
                .code("VELO50")
                .discountPercent(new BigDecimal("50.00"))
                .maxDiscount(new BigDecimal("40.00"))
                .minRideAmount(new BigDecimal("50.00"))
                .active(true)
                .expiryDate(LocalDateTime.now().plusDays(10))
                .build();

        when(couponRepository.findByCodeIgnoreCaseAndActiveTrue("VELO50")).thenReturn(Optional.of(coupon));

        // Subtotal: 97.50
        // 50% discount of 97.50 is 48.75, but maxDiscount is 40.00 -> discount capped at 40.00
        // After discount: 97.50 - 40.00 = 57.50
        // Tax 5% of 57.50: 2.88
        // Total Fare: 57.50 + 2.88 = 60.38
        FareCalculationService.FareBreakdown breakdown = fareCalculationService.calculateFare(
                VehicleCategory.BIKE,
                new BigDecimal("5.00"),
                15,
                "VELO50"
        );

        assertEquals(new BigDecimal("40.00"), breakdown.discountAmount());
        assertEquals("VELO50", breakdown.couponCode());
        assertEquals(new BigDecimal("60.38"), breakdown.totalFare());
    }
}
