package com.velogo.controller;

import com.velogo.domain.CustomerProfile;
import com.velogo.domain.Notification;
import com.velogo.domain.User;
import com.velogo.dto.RideDtos;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.CustomerProfileRepository;
import com.velogo.repository.NotificationRepository;
import com.velogo.repository.UserRepository;
import com.velogo.security.CustomUserDetails;
import com.velogo.service.RideService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customer", description = "Endpoints for customer profile, active ride, and notifications")
public class CustomerController {

    private final CustomerProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final RideService rideService;
    private final NotificationRepository notificationRepository;

    @GetMapping("/me")
    @Operation(summary = "Get current customer profile")
    public ResponseEntity<?> getCustomerProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
        CustomerProfile profile = profileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));
        return ResponseEntity.ok(profile);
    }

    @PatchMapping("/me")
    @Operation(summary = "Update emergency contact or profile")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, String> updates
    ) {
        CustomerProfile profile = profileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));

        if (updates.containsKey("emergencyContactName")) {
            profile.setEmergencyContactName(updates.get("emergencyContactName"));
        }
        if (updates.containsKey("emergencyContactPhone")) {
            profile.setEmergencyContactPhone(updates.get("emergencyContactPhone"));
        }

        CustomerProfile saved = profileRepository.save(profile);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/me/active-ride")
    @Operation(summary = "Get currently active ride for customer")
    public ResponseEntity<RideDtos.RideDto> getActiveRide(@AuthenticationPrincipal CustomUserDetails userDetails) {
        RideDtos.RideDto active = rideService.getActiveCustomerRide(userDetails.getId());
        return ResponseEntity.ok(active);
    }

    @GetMapping("/me/rides")
    @Operation(summary = "Get ride history for customer")
    public ResponseEntity<List<RideDtos.RideDto>> getRideHistory(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(rideService.getCustomerRides(userDetails.getId()));
    }

    @GetMapping("/me/notifications")
    @Operation(summary = "Get notifications for customer")
    public ResponseEntity<List<Notification>> getNotifications(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(notificationRepository.findByUserIdOrderByCreatedAtDesc(userDetails.getId()));
    }
}
