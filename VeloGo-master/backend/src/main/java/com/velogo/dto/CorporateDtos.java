package com.velogo.dto;

import com.velogo.domain.enums.ApprovalStatus;
import com.velogo.domain.enums.CompanyMemberRole;
import com.velogo.domain.enums.CompanyMemberStatus;
import com.velogo.domain.enums.CompanyStatus;
import com.velogo.domain.enums.InvoiceStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class CorporateDtos {

    public record CompanyDto(
            String id,
            String name,
            String taxId,
            String billingAddress,
            String domain,
            String contactEmail,
            BigDecimal creditLimit,
            BigDecimal usedCredit,
            BigDecimal availableCredit,
            CompanyStatus status,
            BigDecimal approvalThreshold,
            long memberCount,
            long pendingApprovalsCount,
            LocalDateTime createdAt
    ) {}

    public record CompanyMemberDto(
            String id,
            String companyId,
            String userId,
            String userName,
            String userEmail,
            String userPhone,
            CompanyMemberRole role,
            BigDecimal monthlyBudget,
            BigDecimal currentMonthSpent,
            BigDecimal remainingBudget,
            CompanyMemberStatus status,
            LocalDateTime createdAt
    ) {}

    public record CreateCompanyRequest(
            @NotBlank(message = "Company name is required")
            String name,
            @NotBlank(message = "Tax ID / GSTIN is required")
            String taxId,
            @NotBlank(message = "Billing address is required")
            String billingAddress,
            String domain,
            @NotBlank(message = "Contact email is required")
            String contactEmail,
            @DecimalMin(value = "1000.00", message = "Credit limit must be at least ₹1000")
            BigDecimal creditLimit,
            @DecimalMin(value = "0.00", message = "Approval threshold cannot be negative")
            BigDecimal approvalThreshold
    ) {}

    public record AddMemberRequest(
            @NotBlank(message = "User email is required")
            String userEmail,
            @NotNull(message = "Role is required")
            CompanyMemberRole role,
            @NotNull(message = "Monthly budget is required")
            @DecimalMin(value = "100.00", message = "Monthly budget must be at least ₹100")
            BigDecimal monthlyBudget
    ) {}

    public record UpdateMemberBudgetRequest(
            @NotNull(message = "Monthly budget is required")
            @DecimalMin(value = "0.00", message = "Monthly budget cannot be negative")
            BigDecimal monthlyBudget,
            CompanyMemberRole role,
            CompanyMemberStatus status
    ) {}

    public record RideApprovalRequestDto(
            String id,
            String rideId,
            String companyId,
            String companyName,
            String employeeId,
            String employeeName,
            String employeeEmail,
            String approverId,
            String approverName,
            ApprovalStatus status,
            BigDecimal estimatedFare,
            String pickupAddress,
            String destAddress,
            String reason,
            String rejectionReason,
            LocalDateTime requestedAt,
            LocalDateTime reviewedAt
    ) {}

    public record ReviewApprovalRequest(
            boolean approved,
            String rejectionReason
    ) {}

    public record CorporateInvoiceDto(
            String id,
            String companyId,
            String companyName,
            String invoiceNumber,
            LocalDateTime billingPeriodStart,
            LocalDateTime billingPeriodEnd,
            BigDecimal subtotalAmount,
            BigDecimal taxAmount,
            BigDecimal totalAmount,
            int ridesCount,
            InvoiceStatus status,
            String invoiceUrl,
            LocalDateTime dueDate,
            LocalDateTime paidAt,
            LocalDateTime createdAt
    ) {}

    public record CorporateBookingEligibilityDto(
            boolean eligible,
            boolean requiresApproval,
            BigDecimal remainingBudget,
            BigDecimal estimatedFare,
            String reason,
            String companyName,
            String companyId,
            String memberRole
    ) {}

    public record CorporateDashboardOverviewDto(
            CompanyDto company,
            List<CompanyMemberDto> members,
            List<RideApprovalRequestDto> pendingApprovals,
            List<CorporateInvoiceDto> recentInvoices,
            long totalRidesTaken,
            BigDecimal totalSpentCurrentMonth
    ) {}

    public record VerifyCompanyStatusRequest(
            @NotNull CompanyStatus status,
            String rejectionReason
    ) {}

    public record InviteTeamMemberRequest(
            @NotBlank String email,
            @NotNull CompanyMemberRole role,
            @NotNull BigDecimal monthlyBudget
    ) {}
}
