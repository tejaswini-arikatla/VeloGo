package com.velogo.service;

import com.velogo.domain.Coupon;
import com.velogo.domain.FareConfiguration;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.dto.RideDtos;
import com.velogo.repository.CouponRepository;
import com.velogo.repository.FareConfigurationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FareCalculationService {

    private final FareConfigurationRepository fareConfigRepository;
    private final CouponRepository couponRepository;

    public record FareBreakdown(
            BigDecimal baseFare,
            BigDecimal distanceCharge,
            BigDecimal timeCharge,
            BigDecimal bookingFee,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal taxAmount,
            BigDecimal totalFare,
            String couponCode,
            BigDecimal surgeMultiplier
    ) {
        public FareBreakdown(
                BigDecimal baseFare,
                BigDecimal distanceCharge,
                BigDecimal timeCharge,
                BigDecimal bookingFee,
                BigDecimal subtotal,
                BigDecimal discountAmount,
                BigDecimal taxAmount,
                BigDecimal totalFare,
                String couponCode
        ) {
            this(baseFare, distanceCharge, timeCharge, bookingFee, subtotal, discountAmount, taxAmount, totalFare, couponCode, BigDecimal.ONE);
        }
    }

    public BigDecimal calculateSurgeMultiplier(LocalDateTime requestTime, int nearbyDemandCount, int availableCaptainsCount) {
        BigDecimal multiplier = BigDecimal.ONE;
        if (requestTime == null) {
            requestTime = LocalDateTime.now();
        }
        int timeInMinutes = requestTime.getHour() * 60 + requestTime.getMinute();

        // Morning rush hour: 08:00 - 10:30 (480 - 630 mins) -> 1.25x
        if (timeInMinutes >= 480 && timeInMinutes <= 630) {
            multiplier = new BigDecimal("1.25");
        }
        // Evening rush hour: 17:30 - 20:30 (1050 - 1230 mins) -> 1.30x
        else if (timeInMinutes >= 1050 && timeInMinutes <= 1230) {
            multiplier = new BigDecimal("1.30");
        }
        // Late night: 23:30 - 04:30 -> 1.15x
        else if (timeInMinutes >= 1410 || timeInMinutes <= 270) {
            multiplier = new BigDecimal("1.15");
        }

        // Supply-demand ratio surge
        if (availableCaptainsCount > 0 && nearbyDemandCount > availableCaptainsCount) {
            double ratio = (double) nearbyDemandCount / availableCaptainsCount;
            if (ratio >= 2.0) {
                multiplier = multiplier.max(new BigDecimal("1.50"));
            } else if (ratio >= 1.5) {
                multiplier = multiplier.max(new BigDecimal("1.35"));
            }
        } else if (availableCaptainsCount == 0 && nearbyDemandCount > 0) {
            multiplier = multiplier.max(new BigDecimal("1.50"));
        }

        return multiplier.setScale(2, RoundingMode.HALF_UP);
    }

    public FareBreakdown calculateFare(VehicleCategory category, BigDecimal distanceKm, Integer durationMinutes, String couponCode) {
        return calculateFare(category, distanceKm, durationMinutes, couponCode, BigDecimal.ONE);
    }

    public FareBreakdown calculateFare(VehicleCategory category, BigDecimal distanceKm, Integer durationMinutes, String couponCode, BigDecimal surgeMultiplier) {
        FareConfiguration config = fareConfigRepository.findByCategory(category)
                .orElseGet(() -> getDefaultConfig(category));

        BigDecimal effectiveSurge = surgeMultiplier != null && surgeMultiplier.compareTo(BigDecimal.ONE) >= 0 ? surgeMultiplier : BigDecimal.ONE;
        BigDecimal baseFare = config.getBaseFare();
        BigDecimal distanceCharge = distanceKm.multiply(config.getPerKmRate()).multiply(effectiveSurge).setScale(2, RoundingMode.HALF_UP);
        BigDecimal timeCharge = BigDecimal.valueOf(durationMinutes).multiply(config.getPerMinRate()).multiply(effectiveSurge).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bookingFee = config.getBookingFee();

        BigDecimal rawSubtotal = baseFare.add(distanceCharge).add(timeCharge).add(bookingFee);
        BigDecimal subtotal = rawSubtotal.max(config.getMinFare()).setScale(2, RoundingMode.HALF_UP);

        BigDecimal discountAmount = BigDecimal.ZERO;
        String appliedCoupon = null;

        if (couponCode != null && !couponCode.isBlank()) {
            Optional<Coupon> optCoupon = couponRepository.findByCodeIgnoreCaseAndActiveTrue(couponCode.trim());
            if (optCoupon.isPresent()) {
                Coupon coupon = optCoupon.get();
                boolean notExpired = coupon.getExpiryDate() == null || coupon.getExpiryDate().isAfter(LocalDateTime.now());
                if (notExpired && subtotal.compareTo(coupon.getMinRideAmount()) >= 0) {
                    BigDecimal calculatedDiscount = subtotal.multiply(coupon.getDiscountPercent())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    discountAmount = calculatedDiscount.min(coupon.getMaxDiscount()).setScale(2, RoundingMode.HALF_UP);
                    appliedCoupon = coupon.getCode();
                }
            }
        }

        BigDecimal afterDiscount = subtotal.subtract(discountAmount).max(BigDecimal.ZERO);
        BigDecimal taxAmount = afterDiscount.multiply(config.getTaxRatePercent())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal totalFare = afterDiscount.add(taxAmount).setScale(2, RoundingMode.HALF_UP);

        return new FareBreakdown(
                baseFare,
                distanceCharge,
                timeCharge,
                bookingFee,
                subtotal,
                discountAmount,
                taxAmount,
                totalFare,
                appliedCoupon,
                effectiveSurge
        );
    }

    public RideDtos.CouponAppliedDto validateCoupon(String couponCode, BigDecimal rideAmount) {
        if (couponCode == null || couponCode.isBlank()) {
            return null;
        }
        Optional<Coupon> optCoupon = couponRepository.findByCodeIgnoreCaseAndActiveTrue(couponCode.trim());
        if (optCoupon.isEmpty()) {
            return null;
        }
        Coupon coupon = optCoupon.get();
        if (coupon.getExpiryDate() != null && coupon.getExpiryDate().isBefore(LocalDateTime.now())) {
            return null;
        }
        if (rideAmount.compareTo(coupon.getMinRideAmount()) < 0) {
            return null;
        }

        BigDecimal discount = rideAmount.multiply(coupon.getDiscountPercent())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                .min(coupon.getMaxDiscount());

        return new RideDtos.CouponAppliedDto(coupon.getCode(), discount, coupon.getDescription());
    }

    private FareConfiguration getDefaultConfig(VehicleCategory category) {
        return switch (category) {
            case BIKE -> FareConfiguration.builder()
                    .category(VehicleCategory.BIKE)
                    .baseFare(new BigDecimal("25.00"))
                    .minFare(new BigDecimal("35.00"))
                    .perKmRate(new BigDecimal("9.00"))
                    .perMinRate(new BigDecimal("1.50"))
                    .bookingFee(new BigDecimal("5.00"))
                    .taxRatePercent(new BigDecimal("5.00"))
                    .active(true)
                    .build();
            case WOMEN_BIKE -> FareConfiguration.builder()
                    .category(VehicleCategory.WOMEN_BIKE)
                    .baseFare(new BigDecimal("25.00"))
                    .minFare(new BigDecimal("35.00"))
                    .perKmRate(new BigDecimal("9.00"))
                    .perMinRate(new BigDecimal("1.50"))
                    .bookingFee(new BigDecimal("5.00"))
                    .taxRatePercent(new BigDecimal("5.00"))
                    .active(true)
                    .build();
            case AUTO -> FareConfiguration.builder()
                    .category(VehicleCategory.AUTO)
                    .baseFare(new BigDecimal("35.00"))
                    .minFare(new BigDecimal("50.00"))
                    .perKmRate(new BigDecimal("13.00"))
                    .perMinRate(new BigDecimal("2.00"))
                    .bookingFee(new BigDecimal("8.00"))
                    .taxRatePercent(new BigDecimal("5.00"))
                    .active(true)
                    .build();
            case CAB -> FareConfiguration.builder()
                    .category(VehicleCategory.CAB)
                    .baseFare(new BigDecimal("70.00"))
                    .minFare(new BigDecimal("100.00"))
                    .perKmRate(new BigDecimal("18.00"))
                    .perMinRate(new BigDecimal("3.00"))
                    .bookingFee(new BigDecimal("15.00"))
                    .taxRatePercent(new BigDecimal("5.00"))
                    .active(true)
                    .build();
        };
    }
}
