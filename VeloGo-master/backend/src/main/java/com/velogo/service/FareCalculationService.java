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
            String couponCode
    ) {}

    public FareBreakdown calculateFare(VehicleCategory category, BigDecimal distanceKm, Integer durationMinutes, String couponCode) {
        FareConfiguration config = fareConfigRepository.findByCategory(category)
                .orElseGet(() -> getDefaultConfig(category));

        BigDecimal baseFare = config.getBaseFare();
        BigDecimal distanceCharge = distanceKm.multiply(config.getPerKmRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal timeCharge = BigDecimal.valueOf(durationMinutes).multiply(config.getPerMinRate()).setScale(2, RoundingMode.HALF_UP);
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
                appliedCoupon
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
