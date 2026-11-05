package com.velogo.dto;

import com.velogo.domain.enums.VehicleCategory;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CaptainDtos {

    public record UpdateLocationRequest(
            @NotNull(message = "Latitude is required")
            @jakarta.validation.constraints.DecimalMin(value = "-90.0", message = "Latitude must be >= -90.0")
            @jakarta.validation.constraints.DecimalMax(value = "90.0", message = "Latitude must be <= 90.0")
            BigDecimal latitude,

            @NotNull(message = "Longitude is required")
            @jakarta.validation.constraints.DecimalMin(value = "-180.0", message = "Longitude must be >= -180.0")
            @jakarta.validation.constraints.DecimalMax(value = "180.0", message = "Longitude must be <= 180.0")
            BigDecimal longitude,

            BigDecimal heading
    ) {}

    public record ToggleAvailabilityRequest(
            boolean online
    ) {}

    public record RideActionRequest(
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
