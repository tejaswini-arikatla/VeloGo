package com.velogo.dto;

import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class AuthDtos {

    public record LoginRequest(
            @NotBlank(message = "Email or phone is required")
            String emailOrPhone,

            @NotBlank(message = "Password is required")
            String password
    ) {}

    public record RegisterCustomerRequest(
            @NotBlank(message = "Full name is required")
            String fullName,

            @NotBlank(message = "Email is required")
            @Email(message = "Invalid email format")
            String email,

            @NotBlank(message = "Phone number is required")
            String phone,

            @NotBlank(message = "Password is required")
            @Size(min = 6, message = "Password must be at least 6 characters")
            String password,

            String emergencyContactName,
            String emergencyContactPhone,
            String gender
    ) {}

    public record RegisterCaptainRequest(
            @NotBlank(message = "Full name is required")
            String fullName,

            @NotBlank(message = "Email is required")
            @Email(message = "Invalid email format")
            String email,

            @NotBlank(message = "Phone number is required")
            String phone,

            @NotBlank(message = "Password is required")
            @Size(min = 6, message = "Password must be at least 6 characters")
            String password,

            @NotBlank(message = "Driving license number is required")
            String drivingLicenseNumber,

            @NotNull(message = "Vehicle category is required")
            VehicleCategory vehicleCategory,

            @NotBlank(message = "Vehicle model is required")
            String vehicleModel,

            @NotBlank(message = "Registration number is required")
            String registrationNumber,

            @NotBlank(message = "Vehicle color is required")
            String vehicleColor
    ) {}

    public record RefreshTokenRequest(
            @NotBlank(message = "Refresh token is required")
            String refreshToken
    ) {}

    public record VehicleDto(
            String id,
            VehicleCategory category,
            String model,
            String registrationNumber,
            String color
    ) {}

    public record CaptainSummaryDto(
            String captainId,
            VerificationStatus verificationStatus,
            String rejectionReason,
            boolean online,
            boolean available,
            boolean womenOnlyEligible,
            String womenOnlyStatus,
            BigDecimal currentLatitude,
            BigDecimal currentLongitude,
            BigDecimal ratingAvg,
            Integer totalRides,
            BigDecimal totalEarnings,
            VehicleDto vehicle
    ) {}

    public record UserDto(
            String id,
            String email,
            String phone,
            String fullName,
            Role role,
            boolean active,
            String avatarUrl,
            String gender,
            CaptainSummaryDto captainProfile
    ) {}

    public record AuthResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            UserDto user
    ) {}
}
