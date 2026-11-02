package com.velogo.controller;

import com.velogo.domain.User;
import com.velogo.dto.AuthDtos;
import com.velogo.repository.UserRepository;
import com.velogo.security.CustomUserDetails;
import com.velogo.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for customer and captain registration, login, and token refresh")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    @Operation(summary = "Login with email/phone and password")
    public ResponseEntity<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/register")
    @Operation(summary = "Register new Customer")
    public ResponseEntity<AuthDtos.AuthResponse> registerCustomer(@Valid @RequestBody AuthDtos.RegisterCustomerRequest req) {
        return ResponseEntity.ok(authService.registerCustomer(req));
    }

    @PostMapping("/register/captain")
    @Operation(summary = "Register new Captain with driving license and vehicle")
    public ResponseEntity<AuthDtos.AuthResponse> registerCaptain(@Valid @RequestBody AuthDtos.RegisterCaptainRequest req) {
        return ResponseEntity.ok(authService.registerCaptain(req));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh JWT access token")
    public ResponseEntity<AuthDtos.AuthResponse> refreshToken(@Valid @RequestBody AuthDtos.RefreshTokenRequest req) {
        return ResponseEntity.ok(authService.refreshAccessToken(req.refreshToken()));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user and revoke tokens")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) AuthDtos.RefreshTokenRequest req
    ) {
        if (userDetails != null) {
            authService.logout(userDetails.getId(), req != null ? req.refreshToken() : null);
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<AuthDtos.UserDto> getCurrentUser(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.getCurrentUserDto(userDetails.getId()));
    }
}
