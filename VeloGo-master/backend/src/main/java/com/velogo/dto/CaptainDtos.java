package com.velogo.dto;

import com.velogo.domain.enums.VehicleCategory;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CaptainDtos {

    public record UpdateLocationRequest(
            @NotNull BigDecimal latitude,
            @NotNull BigDecimal longitude,
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
