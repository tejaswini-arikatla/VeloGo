package com.velogo.dto;

import com.velogo.domain.enums.VehicleCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public class CaptainDtos {

    public record UpdateLocationRequest(
            @NotNull(message = "Latitude is required")
            @DecimalMin(value = "-90.00", message = "Latitude must be >= -90.00")
            @DecimalMax(value = "90.00", message = "Latitude must be <= 90.00")
            BigDecimal latitude,

            @NotNull(message = "Longitude is required")
            @DecimalMin(value = "-180.00", message = "Longitude must be >= -180.00")
            @DecimalMax(value = "180.00", message = "Longitude must be <= 180.00")
            BigDecimal longitude,

            BigDecimal heading
    ) {}

    public record ToggleAvailabilityRequest(
            boolean online
    ) {}

    public record RideActionRequest(
            @Pattern(regexp = "^[0-9]{4}$", message = "OTP must be a 4-digit numeric code")
            String otpCode
    ) {}

    public record ApplyWomenOnlyRequest(
            @NotNull(message = "Demo declaration must be confirmed")
            Boolean demoDeclarationAcknowledged
    ) {}

    public record IncomingRideDispatchDto(
            String dispatchId,
            String rideId,
            VehicleCategory category,
            String pickupAddress,
            BigDecimal pickupLat,
            BigDecimal pickupLng,
            String destAddress,
            BigDecimal destLat,
            BigDecimal destLng,
            BigDecimal distanceKm,
            Integer durationMinutes,
            BigDecimal estimatedFare,
            int countdownSeconds,
            String customerName,
            BigDecimal customerRating,
            Boolean isForSomeoneElse,
            String travelerName,
            String travelerRelationship
    ) {}
}
