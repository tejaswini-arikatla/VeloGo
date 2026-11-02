package com.velogo.service;

import com.velogo.domain.*;
import com.velogo.domain.enums.NotificationType;
import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.VerificationStatus;
import com.velogo.dto.AuthDtos;
import com.velogo.exception.BadRequestException;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.exception.UnauthorizedException;
import com.velogo.repository.*;
import com.velogo.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final CaptainProfileRepository captainProfileRepository;
    private final VehicleRepository vehicleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final NotificationService notificationService;
    private final CaptainService captainService;
    @org.springframework.context.annotation.Lazy
    private final CorporateService corporateService;

    @Transactional
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest req) {
        String identifier = req.emailOrPhone().trim();
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByPhone(identifier))
                .orElseThrow(() -> new UnauthorizedException("Invalid email/phone or password."));

        if (!user.isActive()) {
            throw new UnauthorizedException("Your account has been deactivated. Please contact support.");
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email/phone or password.");
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        // Store refresh token
        saveRefreshToken(user, refreshToken);

        corporateService.checkAndAutoJoinCompanyByEmail(user);

        AuthDtos.UserDto userDto = buildUserDto(user);
        return new AuthDtos.AuthResponse(accessToken, refreshToken, "Bearer", userDto);
    }

    @Transactional
    public AuthDtos.AuthResponse registerCustomer(AuthDtos.RegisterCustomerRequest req) {
        if (userRepository.existsByEmail(req.email().trim().toLowerCase())) {
            throw new BadRequestException("An account with email " + req.email() + " already exists.");
        }
        if (userRepository.existsByPhone(req.phone().trim())) {
            throw new BadRequestException("An account with phone " + req.phone() + " already exists.");
        }

        String gender = (req.gender() != null && !req.gender().isBlank()) ? req.gender().trim().toUpperCase() : "UNSPECIFIED";

        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .email(req.email().trim().toLowerCase())
                .phone(req.phone().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .fullName(req.fullName().trim())
                .role(Role.ROLE_CUSTOMER)
                .active(true)
                .gender(gender)
                .avatarUrl("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150")
                .build();
        User savedUser = userRepository.save(user);

        CustomerProfile profile = CustomerProfile.builder()
                .id(UUID.randomUUID().toString())
                .user(savedUser)
                .ratingAvg(new BigDecimal("5.00"))
                .totalRides(0)
                .emergencyContactName(req.emergencyContactName())
                .emergencyContactPhone(req.emergencyContactPhone())
                .build();
        customerProfileRepository.save(profile);

        notificationService.sendNotification(
                savedUser.getId(),
                "Welcome to VeloGo!",
                "Get started by exploring bike rides, autos, and cabs with exclusive discounts.",
                NotificationType.PROMO
        );

        String accessToken = jwtTokenProvider.generateAccessToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(savedUser.getId());
        saveRefreshToken(savedUser, refreshToken);

        corporateService.checkAndAutoJoinCompanyByEmail(savedUser);

        AuthDtos.UserDto userDto = buildUserDto(savedUser);
        return new AuthDtos.AuthResponse(accessToken, refreshToken, "Bearer", userDto);
    }

    @Transactional
    public AuthDtos.AuthResponse registerCaptain(AuthDtos.RegisterCaptainRequest req) {
        if (userRepository.existsByEmail(req.email().trim().toLowerCase())) {
            throw new BadRequestException("An account with email " + req.email() + " already exists.");
        }
        if (userRepository.existsByPhone(req.phone().trim())) {
            throw new BadRequestException("An account with phone " + req.phone() + " already exists.");
        }
        if (vehicleRepository.existsByRegistrationNumber(req.registrationNumber().trim().toUpperCase())) {
            throw new BadRequestException("A vehicle with registration number " + req.registrationNumber() + " already exists.");
        }

        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .email(req.email().trim().toLowerCase())
                .phone(req.phone().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .fullName(req.fullName().trim())
                .role(Role.ROLE_CAPTAIN)
                .active(true)
                .gender("UNSPECIFIED")
                .avatarUrl("https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150")
                .build();
        User savedUser = userRepository.save(user);

        CaptainProfile profile = CaptainProfile.builder()
                .id(UUID.randomUUID().toString())
                .user(savedUser)
                .drivingLicenseNumber(req.drivingLicenseNumber().trim().toUpperCase())
                .verificationStatus(VerificationStatus.PENDING)
                .online(false)
                .available(false)
                .womenOnlyEligible(false)
                .womenOnlyStatus("NOT_APPLIED")
                .ratingAvg(new BigDecimal("5.00"))
                .totalRides(0)
                .totalEarnings(BigDecimal.ZERO)
                .build();
        CaptainProfile savedCaptain = captainProfileRepository.save(profile);

        Vehicle vehicle = Vehicle.builder()
                .id(UUID.randomUUID().toString())
                .captain(savedCaptain)
                .category(req.vehicleCategory())
                .model(req.vehicleModel().trim())
                .registrationNumber(req.registrationNumber().trim().toUpperCase())
                .color(req.vehicleColor().trim())
                .build();
        vehicleRepository.save(vehicle);

        notificationService.sendNotification(
                savedUser.getId(),
                "Captain Application Received",
                "Your details have been submitted for admin verification. You will be notified once approved.",
                NotificationType.VERIFICATION
        );

        String accessToken = jwtTokenProvider.generateAccessToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(savedUser.getId());
        saveRefreshToken(savedUser, refreshToken);

        AuthDtos.UserDto userDto = buildUserDto(savedUser);
        return new AuthDtos.AuthResponse(accessToken, refreshToken, "Bearer", userDto);
    }

    @Transactional
    public AuthDtos.AuthResponse refreshAccessToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new UnauthorizedException("Invalid or expired refresh token.");
        }

        RefreshToken stored = refreshTokenRepository.findByTokenHashAndRevokedFalse(refreshToken)
                .orElseThrow(() -> new UnauthorizedException("Revoked or unknown refresh token."));

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token has expired. Please sign in again.");
        }

        User user = stored.getUser();
        String newAccessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        AuthDtos.UserDto userDto = buildUserDto(user);

        return new AuthDtos.AuthResponse(newAccessToken, refreshToken, "Bearer", userDto);
    }

    @Transactional
    public void logout(String userId, String refreshToken) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    @Transactional(readOnly = true)
    public AuthDtos.UserDto getCurrentUserDto(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        return buildUserDto(user);
    }

    private void saveRefreshToken(User user, String token) {
        RefreshToken rt = RefreshToken.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .tokenHash(token)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(rt);
    }

    public AuthDtos.UserDto buildUserDto(User user) {
        AuthDtos.CaptainSummaryDto captainSummary = null;
        if (user.getRole() == Role.ROLE_CAPTAIN) {
            Optional<CaptainProfile> optCaptain = captainProfileRepository.findByUserId(user.getId());
            if (optCaptain.isPresent()) {
                captainSummary = captainService.toCaptainSummaryDto(optCaptain.get());
            }
        }

        return new AuthDtos.UserDto(
                user.getId(),
                user.getEmail(),
                user.getPhone(),
                user.getFullName(),
                user.getRole(),
                user.isActive(),
                user.getAvatarUrl(),
                user.getGender(),
                captainSummary
        );
    }
}
