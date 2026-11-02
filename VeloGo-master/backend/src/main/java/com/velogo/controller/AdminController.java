package com.velogo.controller;

import com.velogo.domain.*;
import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import com.velogo.dto.AdminDtos;
import com.velogo.dto.RideDtos;
import com.velogo.repository.CouponRepository;
import com.velogo.repository.FareConfigurationRepository;
import com.velogo.repository.UserRepository;
import com.velogo.security.CustomUserDetails;
import com.velogo.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Administration metrics, customer & captain management, pricing rules, and audit logs")
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;
    private final FareConfigurationRepository fareConfigRepository;
    private final CouponRepository couponRepository;

    @GetMapping("/overview")
    @Operation(summary = "Get high-level platform metrics and financial breakdown")
    public ResponseEntity<AdminDtos.AdminOverviewDto> getOverview() {
        return ResponseEntity.ok(adminService.getOverview());
    }

    @GetMapping("/customers")
    @Operation(summary = "List paginated customers")
    public ResponseEntity<Page<User>> getCustomers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(userRepository.findByRole(Role.ROLE_CUSTOMER, PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @PatchMapping("/customers/{userId}/status")
    @Operation(summary = "Suspend or reactivate customer account")
    public ResponseEntity<User> updateCustomerStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String userId,
            @RequestBody AdminDtos.UpdateUserStatusRequest req
    ) {
        User admin = userRepository.findById(userDetails.getId()).orElseThrow();
        return ResponseEntity.ok(adminService.updateCustomerStatus(admin, userId, req.active(), req.reason()));
    }

    @GetMapping("/captains")
    @Operation(summary = "List paginated captains with optional verification status filter")
    public ResponseEntity<Page<AdminDtos.CaptainAdminDto>> getCaptains(
            @RequestParam(required = false) VerificationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(adminService.getCaptains(status, PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @PatchMapping("/captains/{captainId}/verification")
    @Operation(summary = "Approve or reject a captain registration")
    public ResponseEntity<CaptainProfile> verifyCaptain(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String captainId,
            @Valid @RequestBody AdminDtos.VerifyCaptainActionRequest req
    ) {
        User admin = userRepository.findById(userDetails.getId()).orElseThrow();
        return ResponseEntity.ok(adminService.verifyCaptain(admin, captainId, req.status(), req.reason()));
    }

    @PatchMapping("/captains/{captainId}/women-only")
    @Operation(summary = "Approve or reject captain Women-Only Bike eligibility")
    public ResponseEntity<CaptainProfile> verifyWomenOnly(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String captainId,
            @Valid @RequestBody AdminDtos.VerifyWomenOnlyActionRequest req
    ) {
        User admin = userRepository.findById(userDetails.getId()).orElseThrow();
        return ResponseEntity.ok(adminService.verifyWomenOnlyCaptain(admin, captainId, req.status(), req.reason()));
    }

    @GetMapping("/rides")
    @Operation(summary = "List all platform rides with detailed statuses")
    public ResponseEntity<Page<RideDtos.RideDto>> getAllRides(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(adminService.getAllRides(PageRequest.of(page, size)));
    }

    @GetMapping("/pricing")
    @Operation(summary = "Get current fare configuration for all categories")
    public ResponseEntity<List<FareConfiguration>> getFareConfigs() {
        return ResponseEntity.ok(fareConfigRepository.findAll());
    }

    @PutMapping("/pricing/{category}")
    @Operation(summary = "Update fare configuration for a category")
    public ResponseEntity<FareConfiguration> updateFareConfig(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable VehicleCategory category,
            @Valid @RequestBody AdminDtos.UpdateFareConfigRequest req
    ) {
        User admin = userRepository.findById(userDetails.getId()).orElseThrow();
        return ResponseEntity.ok(adminService.updateFareConfig(admin, category, req));
    }

    @GetMapping("/coupons")
    @Operation(summary = "List all promotional coupons")
    public ResponseEntity<List<Coupon>> getCoupons() {
        return ResponseEntity.ok(couponRepository.findAll());
    }

    @PostMapping("/coupons")
    @Operation(summary = "Create a new coupon code")
    public ResponseEntity<Coupon> createCoupon(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody AdminDtos.CreateCouponRequest req
    ) {
        User admin = userRepository.findById(userDetails.getId()).orElseThrow();
        return ResponseEntity.ok(adminService.createCoupon(admin, req));
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "View security and administrative audit trail")
    public ResponseEntity<Page<AdminAuditLog>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        return ResponseEntity.ok(adminService.getAuditLogs(PageRequest.of(page, size)));
    }
}
