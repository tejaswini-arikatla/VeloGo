package com.velogo.controller;

import com.velogo.domain.User;
import com.velogo.dto.CorporateDtos;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.UserRepository;
import com.velogo.security.CustomUserDetails;
import com.velogo.service.CorporateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/corporate")
@RequiredArgsConstructor
@Tag(name = "Corporate", description = "Enterprise corporate accounts, employee allowances, approvals, and B2B invoices")
public class CorporateController {

    private final CorporateService corporateService;
    private final UserRepository userRepository;

    @GetMapping("/profile")
    @Operation(summary = "Get current authenticated user's corporate membership status")
    public ResponseEntity<CorporateDtos.CompanyMemberDto> getMyCorporateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return corporateService.getMemberProfileForUser(userDetails.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/eligibility")
    @Operation(summary = "Check if user can book a ride using their corporate allowance")
    public ResponseEntity<CorporateDtos.CorporateBookingEligibilityDto> checkEligibility(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0.00") BigDecimal fare
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(corporateService.checkCorporateBookingEligibility(user, fare));
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get corporate admin and manager dashboard overview")
    public ResponseEntity<CorporateDtos.CorporateDashboardOverviewDto> getDashboard(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(corporateService.getCorporateDashboard(user));
    }

    @GetMapping("/companies")
    @Operation(summary = "List registered enterprise companies with optional status filter")
    public ResponseEntity<List<CorporateDtos.CompanyDto>> getAllCompanies(
            @RequestParam(required = false) com.velogo.domain.enums.CompanyStatus status
    ) {
        return ResponseEntity.ok(corporateService.getAllCompanies(status));
    }

    @PatchMapping("/companies/{companyId}/verification")
    @Operation(summary = "Super-admin approve or reject enterprise registration")
    public ResponseEntity<CorporateDtos.CompanyDto> verifyCompany(
            @PathVariable String companyId,
            @Valid @RequestBody CorporateDtos.VerifyCompanyStatusRequest req
    ) {
        return ResponseEntity.ok(corporateService.verifyCompanyRegistration(companyId, req.status(), req.rejectionReason()));
    }

    @PostMapping("/companies")
    @Operation(summary = "Register an enterprise company account")
    public ResponseEntity<CorporateDtos.CompanyDto> registerCompany(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CorporateDtos.CreateCompanyRequest req
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(corporateService.registerCompany(user, req));
    }

    @PostMapping("/companies/{companyId}/members")
    @Operation(summary = "Add an employee/manager to corporate roster with allowance")
    public ResponseEntity<CorporateDtos.CompanyMemberDto> addMember(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String companyId,
            @Valid @RequestBody CorporateDtos.AddMemberRequest req
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(corporateService.addMember(user, companyId, req));
    }

    @PatchMapping("/companies/{companyId}/members/{memberId}")
    @Operation(summary = "Update employee budget, role, or status")
    public ResponseEntity<CorporateDtos.CompanyMemberDto> updateMember(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String companyId,
            @PathVariable String memberId,
            @Valid @RequestBody CorporateDtos.UpdateMemberBudgetRequest req
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(corporateService.updateMember(user, companyId, memberId, req));
    }

    @PostMapping("/approvals/{requestId}/review")
    @Operation(summary = "Approve or reject a corporate ride booking request")
    public ResponseEntity<CorporateDtos.RideApprovalRequestDto> reviewApproval(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String requestId,
            @Valid @RequestBody CorporateDtos.ReviewApprovalRequest req
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(corporateService.reviewApprovalRequest(user, requestId, req));
    }

    @PostMapping("/companies/{companyId}/invoices/generate")
    @Operation(summary = "Trigger consolidated monthly invoice generation")
    public ResponseEntity<CorporateDtos.CorporateInvoiceDto> generateInvoice(
            @PathVariable String companyId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        LocalDateTime start = startDate != null ? LocalDateTime.parse(startDate) : LocalDateTime.now().minusMonths(1).withDayOfMonth(1).withHour(0).withMinute(0);
        LocalDateTime end = endDate != null ? LocalDateTime.parse(endDate) : LocalDateTime.now();
        return ResponseEntity.ok(corporateService.generateInvoiceManually(companyId, start, end));
    }
}
