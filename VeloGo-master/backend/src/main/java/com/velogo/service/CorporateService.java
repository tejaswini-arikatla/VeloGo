package com.velogo.service;

import com.velogo.domain.*;
import com.velogo.domain.enums.*;
import com.velogo.dto.CorporateDtos;
import com.velogo.exception.BadRequestException;
import com.velogo.exception.ForbiddenException;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class CorporateService {

    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository memberRepository;
    private final RideApprovalRequestRepository approvalRepository;
    private final CorporateInvoiceRepository invoiceRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final RideService rideService;

    public CorporateService(
            CompanyRepository companyRepository,
            CompanyMemberRepository memberRepository,
            RideApprovalRequestRepository approvalRepository,
            CorporateInvoiceRepository invoiceRepository,
            RideRepository rideRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            @org.springframework.context.annotation.Lazy RideService rideService
    ) {
        this.companyRepository = companyRepository;
        this.memberRepository = memberRepository;
        this.approvalRepository = approvalRepository;
        this.invoiceRepository = invoiceRepository;
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.rideService = rideService;
    }

    public Optional<CorporateDtos.CompanyMemberDto> getMemberProfileForUser(String userId) {
        return memberRepository.findByUserIdAndStatus(userId, CompanyMemberStatus.ACTIVE)
                .map(this::mapToMemberDto);
    }

    public CorporateDtos.CorporateBookingEligibilityDto checkCorporateBookingEligibility(User user, BigDecimal estimatedFare) {
        Optional<CompanyMember> optMember = memberRepository.findByUserIdAndStatus(user.getId(), CompanyMemberStatus.ACTIVE);
        if (optMember.isEmpty()) {
            return new CorporateDtos.CorporateBookingEligibilityDto(
                    false,
                    false,
                    BigDecimal.ZERO,
                    estimatedFare,
                    "You are not enrolled in an active corporate account.",
                    null,
                    null,
                    null
            );
        }

        CompanyMember member = optMember.get();
        Company company = member.getCompany();

        if (company.getStatus() != CompanyStatus.ACTIVE) {
            return new CorporateDtos.CorporateBookingEligibilityDto(
                    false,
                    false,
                    BigDecimal.ZERO,
                    estimatedFare,
                    "Your company account (" + company.getName() + ") is currently suspended.",
                    company.getName(),
                    company.getId(),
                    member.getRole().name()
            );
        }

        BigDecimal remainingBudget = member.getMonthlyBudget().subtract(member.getCurrentMonthSpent()).max(BigDecimal.ZERO);
        if (remainingBudget.compareTo(estimatedFare) < 0) {
            return new CorporateDtos.CorporateBookingEligibilityDto(
                    false,
                    false,
                    remainingBudget,
                    estimatedFare,
                    "Insufficient corporate monthly allowance. Remaining: ₹" + remainingBudget + ", Estimated fare: ₹" + estimatedFare,
                    company.getName(),
                    company.getId(),
                    member.getRole().name()
            );
        }

        // Check if approval is required
        boolean requiresApproval = false;
        String reason = "Corporate allowance available.";

        if (member.getRole() == CompanyMemberRole.EMPLOYEE && estimatedFare.compareTo(company.getApprovalThreshold()) > 0) {
            requiresApproval = true;
            reason = "Ride exceeds standard policy threshold (₹" + company.getApprovalThreshold() + ") and requires manager approval.";
        }

        return new CorporateDtos.CorporateBookingEligibilityDto(
                true,
                requiresApproval,
                remainingBudget,
                estimatedFare,
                reason,
                company.getName(),
                company.getId(),
                member.getRole().name()
        );
    }

    @Transactional
    public RideApprovalRequest createApprovalRequest(Ride ride, User employee, BigDecimal estimatedFare, String reason) {
        CompanyMember member = memberRepository.findByUserIdAndStatus(employee.getId(), CompanyMemberStatus.ACTIVE)
                .orElseThrow(() -> new BadRequestException("Employee is not linked to an active corporate account"));

        Company company = member.getCompany();

        RideApprovalRequest request = RideApprovalRequest.builder()
                .id(UUID.randomUUID().toString())
                .ride(ride)
                .company(company)
                .employee(employee)
                .status(ApprovalStatus.PENDING)
                .estimatedFare(estimatedFare)
                .reason(reason != null && !reason.isBlank() ? reason : "Corporate ride booking approval")
                .requestedAt(LocalDateTime.now())
                .build();

        RideApprovalRequest saved = approvalRepository.save(request);

        // Notify company managers and admins
        List<CompanyMember> managersAndAdmins = memberRepository.findByCompanyId(company.getId()).stream()
                .filter(m -> m.getRole() == CompanyMemberRole.MANAGER || m.getRole() == CompanyMemberRole.ADMIN)
                .toList();

        for (CompanyMember mgr : managersAndAdmins) {
            notificationService.sendNotification(
                    mgr.getUser().getId(),
                    "Ride Approval Required",
                    employee.getFullName() + " requested a corporate ride for ₹" + estimatedFare + ". Action required.",
                    NotificationType.SYSTEM
            );
        }

        return saved;
    }

    @Transactional
    public CorporateDtos.RideApprovalRequestDto reviewApprovalRequest(User reviewer, String requestId, CorporateDtos.ReviewApprovalRequest req) {
        RideApprovalRequest request = approvalRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Approval request not found"));

        Company company = request.getCompany();

        // Check reviewer is ADMIN or MANAGER of this company
        CompanyMember reviewerMember = memberRepository.findByCompanyIdAndUserId(company.getId(), reviewer.getId())
                .orElseThrow(() -> new ForbiddenException("You are not authorized to review requests for this company"));

        if (reviewerMember.getRole() != CompanyMemberRole.ADMIN && reviewerMember.getRole() != CompanyMemberRole.MANAGER) {
            throw new ForbiddenException("Only managers or corporate admins can approve or reject ride requests");
        }

        if (request.getStatus() != ApprovalStatus.PENDING) {
            throw new BadRequestException("Request is already " + request.getStatus());
        }

        request.setStatus(req.approved() ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED);
        request.setApprover(reviewer);
        request.setRejectionReason(req.rejectionReason());
        request.setReviewedAt(LocalDateTime.now());
        RideApprovalRequest updated = approvalRepository.save(request);

        // Update ride if linked
        if (request.getRide() != null) {
            Ride ride = request.getRide();
            if (req.approved()) {
                ride.setCorporateApprovalStatus(CorporateApprovalStatus.APPROVED);
                if (rideService != null) {
                    rideService.onCorporateRideApproved(ride.getId());
                }
            } else {
                ride.setCorporateApprovalStatus(CorporateApprovalStatus.REJECTED);
                ride.setStatus(RideStatus.CANCELLED);
                if (rideService != null) {
                    rideService.onCorporateRideRejected(ride.getId(), req.rejectionReason());
                }
            }
        }

        notificationService.sendNotification(
                request.getEmployee().getId(),
                req.approved() ? "Corporate Ride Approved!" : "Corporate Ride Rejected",
                req.approved()
                        ? "Your corporate trip request for ₹" + request.getEstimatedFare() + " has been approved by " + reviewer.getFullName() + "."
                        : "Your corporate trip request was rejected. Reason: " + req.rejectionReason(),
                NotificationType.RIDE_UPDATE
        );

        return mapToApprovalDto(updated);
    }

    @Transactional
    public void deductCorporateBudget(String companyId, String employeeId, BigDecimal finalFare) {
        if (companyId == null || employeeId == null || finalFare == null || finalFare.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        memberRepository.findByCompanyIdAndUserId(companyId, employeeId).ifPresent(member -> {
            memberRepository.incrementMonthlySpent(member.getId(), finalFare);
            companyRepository.incrementUsedCredit(companyId, finalFare);
            log.info("Deducted corporate allowance for member {} in company {}: ₹{}", member.getId(), companyId, finalFare);
        });
    }

    public CorporateDtos.CorporateDashboardOverviewDto getCorporateDashboard(User user) {
        CompanyMember callerMember = memberRepository.findByUserIdAndStatus(user.getId(), CompanyMemberStatus.ACTIVE)
                .orElse(null);

        Company company;
        if (callerMember != null) {
            company = callerMember.getCompany();
        } else if (user.getRole() == Role.ROLE_ADMIN) {
            company = companyRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("No corporate accounts registered"));
        } else {
            throw new ResourceNotFoundException("You are not part of an active corporate account");
        }

        List<CompanyMember> members = memberRepository.findByCompanyId(company.getId());
        List<CorporateDtos.CompanyMemberDto> memberDtos = members.stream()
                .map(this::mapToMemberDto)
                .toList();

        List<CorporateDtos.RideApprovalRequestDto> pendingApprovals = approvalRepository
                .findByCompanyIdAndStatusOrderByRequestedAtDesc(company.getId(), ApprovalStatus.PENDING).stream()
                .map(this::mapToApprovalDto)
                .toList();

        List<CorporateDtos.CorporateInvoiceDto> invoices = invoiceRepository
                .findByCompanyIdOrderByBillingPeriodEndDesc(company.getId()).stream()
                .map(this::mapToInvoiceDto)
                .toList();

        long totalRides = rideRepository.countByCompanyId(company.getId());

        BigDecimal totalMonthSpent = members.stream()
                .map(CompanyMember::getCurrentMonthSpent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        CorporateDtos.CompanyDto companyDto = mapToCompanyDto(company, members.size(), pendingApprovals.size());

        return new CorporateDtos.CorporateDashboardOverviewDto(
                companyDto,
                memberDtos,
                pendingApprovals,
                invoices,
                totalRides,
                totalMonthSpent
        );
    }

    public List<CorporateDtos.CompanyDto> getAllCompanies(CompanyStatus status) {
        List<Company> list = status != null ? companyRepository.findByStatus(status) : companyRepository.findAll();
        return list.stream().map(c -> {
            long memberCount = memberRepository.findByCompanyId(c.getId()).size();
            long pendingApprovals = approvalRepository.findByCompanyIdAndStatusOrderByRequestedAtDesc(c.getId(), ApprovalStatus.PENDING).size();
            return mapToCompanyDto(c, memberCount, pendingApprovals);
        }).toList();
    }

    @Transactional
    public CorporateDtos.CompanyDto registerCompany(User adminUser, CorporateDtos.CreateCompanyRequest req) {
        CompanyStatus initialStatus = adminUser.getRole() == com.velogo.domain.enums.Role.ROLE_ADMIN
                ? CompanyStatus.ACTIVE
                : CompanyStatus.PENDING_VERIFICATION;

        Company company = Company.builder()
                .id(UUID.randomUUID().toString())
                .name(req.name())
                .taxId(req.taxId())
                .billingAddress(req.billingAddress())
                .domain(req.domain() != null ? req.domain().trim().toLowerCase() : null)
                .contactEmail(req.contactEmail())
                .creditLimit(req.creditLimit() != null ? req.creditLimit() : new BigDecimal("50000.00"))
                .usedCredit(BigDecimal.ZERO)
                .status(initialStatus)
                .approvalThreshold(req.approvalThreshold() != null ? req.approvalThreshold() : new BigDecimal("500.00"))
                .build();

        Company savedCompany = companyRepository.save(company);

        // Link admin user as corporate ADMIN
        CompanyMember member = CompanyMember.builder()
                .id(UUID.randomUUID().toString())
                .company(savedCompany)
                .user(adminUser)
                .role(CompanyMemberRole.ADMIN)
                .monthlyBudget(new BigDecimal("25000.00"))
                .currentMonthSpent(BigDecimal.ZERO)
                .status(CompanyMemberStatus.ACTIVE)
                .build();

        memberRepository.save(member);

        return mapToCompanyDto(savedCompany, 1, 0);
    }

    @Transactional
    public CorporateDtos.CompanyDto verifyCompanyRegistration(String companyId, CompanyStatus newStatus, String reason) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + companyId));

        company.setStatus(newStatus);
        Company updated = companyRepository.save(company);

        userRepository.findByEmail(company.getContactEmail()).ifPresent(adminUser -> {
            notificationService.sendNotification(
                    adminUser.getId(),
                    newStatus == CompanyStatus.ACTIVE ? "Corporate Account Verified!" : "Corporate Account " + newStatus,
                    newStatus == CompanyStatus.ACTIVE
                            ? "Your enterprise account " + company.getName() + " has been verified and activated by VeloGo platform admin."
                            : "Your enterprise registration status was updated to " + newStatus + (reason != null ? ". Reason: " + reason : ""),
                    NotificationType.SYSTEM
            );
        });

        long memberCount = memberRepository.findByCompanyId(companyId).size();
        long pendingApprovals = approvalRepository.findByCompanyIdAndStatusOrderByRequestedAtDesc(companyId, ApprovalStatus.PENDING).size();
        return mapToCompanyDto(updated, memberCount, pendingApprovals);
    }

    @Transactional
    public void checkAndAutoJoinCompanyByEmail(User user) {
        if (user == null || user.getEmail() == null || !user.getEmail().contains("@")) {
            return;
        }

        // Already enrolled?
        if (memberRepository.findByUserIdAndStatus(user.getId(), CompanyMemberStatus.ACTIVE).isPresent()) {
            return;
        }

        String domain = user.getEmail().substring(user.getEmail().indexOf('@') + 1).toLowerCase();
        if (domain.equals("gmail.com") || domain.equals("yahoo.com") || domain.equals("hotmail.com") || domain.equals("outlook.com") || domain.equals("velogo.com")) {
            return;
        }

        companyRepository.findByDomainIgnoreCaseAndStatus(domain, CompanyStatus.ACTIVE).ifPresent(company -> {
            CompanyMember member = CompanyMember.builder()
                    .id(UUID.randomUUID().toString())
                    .company(company)
                    .user(user)
                    .role(CompanyMemberRole.EMPLOYEE)
                    .monthlyBudget(new BigDecimal("5000.00"))
                    .currentMonthSpent(BigDecimal.ZERO)
                    .status(CompanyMemberStatus.ACTIVE)
                    .build();
            memberRepository.save(member);
            log.info("Auto-joined employee {} to company {} via domain {}", user.getEmail(), company.getName(), domain);

            notificationService.sendNotification(
                    user.getId(),
                    "Corporate Account Activated",
                    "Welcome to " + company.getName() + "! You have been automatically linked to your corporate travel profile with ₹5,000 monthly allowance.",
                    NotificationType.PROMO
            );
        });
    }

    @Transactional
    public CorporateDtos.CompanyMemberDto addMember(User caller, String companyId, CorporateDtos.AddMemberRequest req) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));

        CompanyMember callerMember = memberRepository.findByCompanyIdAndUserId(companyId, caller.getId())
                .orElseThrow(() -> new ForbiddenException("You are not part of this company"));

        if (callerMember.getRole() != CompanyMemberRole.ADMIN && callerMember.getRole() != CompanyMemberRole.MANAGER) {
            throw new ForbiddenException("Only company admins or managers can invite new members");
        }

        User targetUser = userRepository.findByEmail(req.userEmail().trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("No VeloGo user found with email " + req.userEmail()));

        if (memberRepository.findByCompanyIdAndUserId(companyId, targetUser.getId()).isPresent()) {
            throw new BadRequestException("User is already a member of this company");
        }

        CompanyMember newMember = CompanyMember.builder()
                .id(UUID.randomUUID().toString())
                .company(company)
                .user(targetUser)
                .role(req.role())
                .monthlyBudget(req.monthlyBudget())
                .currentMonthSpent(BigDecimal.ZERO)
                .status(CompanyMemberStatus.ACTIVE)
                .build();

        CompanyMember saved = memberRepository.save(newMember);

        notificationService.sendNotification(
                targetUser.getId(),
                "Enrolled in Corporate Account",
                "You have been added to " + company.getName() + " with a monthly travel budget of ₹" + req.monthlyBudget(),
                NotificationType.SYSTEM
        );

        return mapToMemberDto(saved);
    }

    @Transactional
    public CorporateDtos.CompanyMemberDto updateMember(User caller, String companyId, String memberId, CorporateDtos.UpdateMemberBudgetRequest req) {
        CompanyMember callerMember = memberRepository.findByCompanyIdAndUserId(companyId, caller.getId())
                .orElseThrow(() -> new ForbiddenException("You are not part of this company"));

        if (callerMember.getRole() != CompanyMemberRole.ADMIN) {
            throw new ForbiddenException("Only company admins can update member budget and roles");
        }

        CompanyMember target = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Company member not found"));

        if (!target.getCompany().getId().equals(companyId)) {
            throw new BadRequestException("Member does not belong to specified company");
        }

        if (req.monthlyBudget() != null) {
            target.setMonthlyBudget(req.monthlyBudget());
        }
        if (req.role() != null) {
            target.setRole(req.role());
        }
        if (req.status() != null) {
            target.setStatus(req.status());
        }

        CompanyMember updated = memberRepository.save(target);
        return mapToMemberDto(updated);
    }

    // Monthly Invoicing Engine - runs automatically at midnight on the 1st of every month
    @Scheduled(cron = "0 0 0 1 * *")
    @Transactional
    public void generateMonthlyInvoicesScheduled() {
        LocalDateTime now = LocalDateTime.now();
        YearMonth lastMonth = YearMonth.from(now.minusMonths(1));
        LocalDateTime periodStart = lastMonth.atDay(1).atStartOfDay();
        LocalDateTime periodEnd = lastMonth.atEndOfMonth().atTime(23, 59, 59);

        log.info("Starting monthly corporate invoice aggregation for period {} to {}", periodStart, periodEnd);
        List<Company> companies = companyRepository.findAll();

        for (Company company : companies) {
            generateInvoiceForCompany(company, periodStart, periodEnd);
            // Reset monthly spent for all members for the fresh month
            List<CompanyMember> members = memberRepository.findByCompanyId(company.getId());
            for (CompanyMember m : members) {
                m.setCurrentMonthSpent(BigDecimal.ZERO);
                memberRepository.save(m);
            }
        }
    }

    @Transactional
    public CorporateDtos.CorporateInvoiceDto generateInvoiceManually(String companyId, LocalDateTime start, LocalDateTime end) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
        CorporateInvoice invoice = generateInvoiceForCompany(company, start, end);
        return mapToInvoiceDto(invoice);
    }

    private CorporateInvoice generateInvoiceForCompany(Company company, LocalDateTime start, LocalDateTime end) {
        List<Ride> rides = rideRepository.findByCompanyIdAndStatusAndCompletedAtBetween(
                company.getId(), RideStatus.COMPLETED, start, end
        );

        BigDecimal subtotal = rides.stream()
                .map(r -> r.getFinalFare() != null ? r.getFinalFare() : r.getEstimatedFare())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal tax = subtotal.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(tax);

        String invoiceNumber = "INV-VELO-" + YearMonth.from(start).format(DateTimeFormatter.ofPattern("yyyy-MM")) + "-" +
                company.getId().substring(0, Math.min(6, company.getId().length())).toUpperCase();

        CorporateInvoice invoice = CorporateInvoice.builder()
                .id(UUID.randomUUID().toString())
                .company(company)
                .invoiceNumber(invoiceNumber)
                .billingPeriodStart(start)
                .billingPeriodEnd(end)
                .subtotalAmount(subtotal)
                .taxAmount(tax)
                .totalAmount(total)
                .ridesCount(rides.size())
                .status(InvoiceStatus.ISSUED)
                .invoiceUrl("/invoices/" + invoiceNumber.toLowerCase() + ".pdf")
                .dueDate(LocalDateTime.now().plusDays(15))
                .build();

        CorporateInvoice saved = invoiceRepository.save(invoice);
        log.info("Generated corporate invoice {} for company {}: total ₹{}, rides: {}",
                invoiceNumber, company.getName(), total, rides.size());

        return saved;
    }

    private CorporateDtos.CompanyDto mapToCompanyDto(Company c, long memberCount, long pendingApprovals) {
        BigDecimal available = c.getCreditLimit().subtract(c.getUsedCredit()).max(BigDecimal.ZERO);
        return new CorporateDtos.CompanyDto(
                c.getId(),
                c.getName(),
                c.getTaxId(),
                c.getBillingAddress(),
                c.getDomain(),
                c.getContactEmail(),
                c.getCreditLimit(),
                c.getUsedCredit(),
                available,
                c.getStatus(),
                c.getApprovalThreshold(),
                memberCount,
                pendingApprovals,
                c.getCreatedAt()
        );
    }

    private CorporateDtos.CompanyMemberDto mapToMemberDto(CompanyMember m) {
        BigDecimal remaining = m.getMonthlyBudget().subtract(m.getCurrentMonthSpent()).max(BigDecimal.ZERO);
        return new CorporateDtos.CompanyMemberDto(
                m.getId(),
                m.getCompany().getId(),
                m.getUser().getId(),
                m.getUser().getFullName(),
                m.getUser().getEmail(),
                m.getUser().getPhone(),
                m.getRole(),
                m.getMonthlyBudget(),
                m.getCurrentMonthSpent(),
                remaining,
                m.getStatus(),
                m.getCreatedAt()
        );
    }

    private CorporateDtos.RideApprovalRequestDto mapToApprovalDto(RideApprovalRequest r) {
        return new CorporateDtos.RideApprovalRequestDto(
                r.getId(),
                r.getRide() != null ? r.getRide().getId() : null,
                r.getCompany().getId(),
                r.getCompany().getName(),
                r.getEmployee().getId(),
                r.getEmployee().getFullName(),
                r.getEmployee().getEmail(),
                r.getApprover() != null ? r.getApprover().getId() : null,
                r.getApprover() != null ? r.getApprover().getFullName() : null,
                r.getStatus(),
                r.getEstimatedFare(),
                r.getRide() != null ? r.getRide().getPickupAddress() : null,
                r.getRide() != null ? r.getRide().getDestAddress() : null,
                r.getReason(),
                r.getRejectionReason(),
                r.getRequestedAt(),
                r.getReviewedAt()
        );
    }

    private CorporateDtos.CorporateInvoiceDto mapToInvoiceDto(CorporateInvoice i) {
        return new CorporateDtos.CorporateInvoiceDto(
                i.getId(),
                i.getCompany().getId(),
                i.getCompany().getName(),
                i.getInvoiceNumber(),
                i.getBillingPeriodStart(),
                i.getBillingPeriodEnd(),
                i.getSubtotalAmount(),
                i.getTaxAmount(),
                i.getTotalAmount(),
                i.getRidesCount(),
                i.getStatus(),
                i.getInvoiceUrl(),
                i.getDueDate(),
                i.getPaidAt(),
                i.getCreatedAt()
        );
    }
}
