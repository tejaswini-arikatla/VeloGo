package com.velogo.controller;

import com.velogo.dto.AuthDtos;
import com.velogo.dto.CaptainDtos;
import com.velogo.dto.RideDtos;
import com.velogo.security.CustomUserDetails;
import com.velogo.service.CaptainService;
import com.velogo.service.RideService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/captains")
@RequiredArgsConstructor
@Tag(name = "Captain", description = "Captain availability, location updates, and trip execution")
public class CaptainController {

    private final CaptainService captainService;
    private final RideService rideService;

    @GetMapping("/me")
    @Operation(summary = "Get captain profile and earnings")
    public ResponseEntity<AuthDtos.CaptainSummaryDto> getProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(captainService.getProfile(userDetails.getId()));
    }

    @PatchMapping("/availability")
    @Operation(summary = "Toggle online / offline availability")
    public ResponseEntity<AuthDtos.CaptainSummaryDto> toggleAvailability(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody CaptainDtos.ToggleAvailabilityRequest req
    ) {
        return ResponseEntity.ok(captainService.toggleAvailability(userDetails.getId(), req.online()));
    }

    @PostMapping("/women-only/apply")
    @Operation(summary = "Captain applies for Women-Only Bike program with demo declaration")
    public ResponseEntity<AuthDtos.CaptainSummaryDto> applyWomenOnly(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CaptainDtos.ApplyWomenOnlyRequest req
    ) {
        return ResponseEntity.ok(captainService.applyForWomenOnly(userDetails.getId(), req));
    }

    @PostMapping("/location")
    @Operation(summary = "Send GPS location update")
    public ResponseEntity<Void> updateLocation(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CaptainDtos.UpdateLocationRequest req
    ) {
        captainService.updateLocation(userDetails.getId(), req);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/rides/active")
    @Operation(summary = "Get currently active ride for captain")
    public ResponseEntity<RideDtos.RideDto> getActiveRide(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(rideService.getActiveCaptainRide(userDetails.getId()));
    }

    @GetMapping("/rides/history")
    @Operation(summary = "Get captain ride history")
    public ResponseEntity<List<RideDtos.RideDto>> getHistory(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(rideService.getCaptainRides(userDetails.getId()));
    }

    @PostMapping("/rides/{rideId}/accept")
    @Operation(summary = "Captain accepts incoming ride request")
    public ResponseEntity<RideDtos.RideDto> acceptRide(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String rideId
    ) {
        return ResponseEntity.ok(rideService.captainAcceptRide(userDetails.getId(), rideId));
    }

    @PostMapping("/rides/{rideId}/arrive")
    @Operation(summary = "Captain marks arrival at customer pickup point")
    public ResponseEntity<RideDtos.RideDto> arriveAtPickup(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String rideId
    ) {
        return ResponseEntity.ok(rideService.captainArriveAtPickup(userDetails.getId(), rideId));
    }

    @PostMapping("/rides/{rideId}/start")
    @Operation(summary = "Captain verifies OTP and starts trip")
    public ResponseEntity<RideDtos.RideDto> startTrip(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String rideId,
            @RequestBody CaptainDtos.RideActionRequest req
    ) {
        return ResponseEntity.ok(rideService.captainStartTrip(userDetails.getId(), rideId, req.otpCode()));
    }

    @PostMapping("/rides/{rideId}/complete")
    @Operation(summary = "Captain completes trip at destination")
    public ResponseEntity<RideDtos.RideDto> completeTrip(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String rideId
    ) {
        return ResponseEntity.ok(rideService.captainCompleteTrip(userDetails.getId(), rideId));
    }
}
