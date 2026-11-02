package com.velogo.controller;

import com.velogo.domain.User;
import com.velogo.dto.RideDtos;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.UserRepository;
import com.velogo.security.CustomUserDetails;
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
@RequestMapping("/api/v1/rides")
@RequiredArgsConstructor
@Tag(name = "Rides", description = "Ride estimation, booking, cancellation, and status tracking")
public class RideController {

    private final RideService rideService;
    private final UserRepository userRepository;

    @PostMapping("/estimate")
    @Operation(summary = "Estimate fares for all vehicle categories between pickup and destination")
    public ResponseEntity<RideDtos.FareEstimateResponse> estimateFares(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody RideDtos.FareEstimateRequest req
    ) {
        String userId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(rideService.estimateFares(req, userId));
    }

    @PostMapping({"", "/book"})
    @Operation(summary = "Book a new ride and initiate captain matching")
    public ResponseEntity<RideDtos.RideDto> bookRide(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody RideDtos.BookRideRequest req
    ) {
        User customer = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(rideService.bookRide(customer, req));
    }

    @GetMapping("/{rideId}")
    @Operation(summary = "Get ride details and current status")
    public ResponseEntity<RideDtos.RideDto> getRideDetails(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String rideId
    ) {
        return ResponseEntity.ok(rideService.getRideDetails(rideId, userDetails.getId()));
    }

    @PostMapping("/{rideId}/cancel")
    @Operation(summary = "Cancel an active ride with reason")
    public ResponseEntity<RideDtos.RideDto> cancelRide(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String rideId,
            @Valid @RequestBody RideDtos.CancelRideRequest req
    ) {
        return ResponseEntity.ok(rideService.cancelRide(userDetails.getId(), rideId, req.reason()));
    }

    @GetMapping("/history")
    @Operation(summary = "Get authenticated user ride history")
    public ResponseEntity<List<RideDtos.RideDto>> getHistory(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(rideService.getCustomerRides(userDetails.getId()));
    }
}
