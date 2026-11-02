package com.velogo;

import com.velogo.domain.*;
import com.velogo.domain.enums.*;
import com.velogo.dto.CorporateDtos;
import com.velogo.repository.*;
import com.velogo.service.CorporateService;
import com.velogo.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CorporateServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private CompanyMemberRepository memberRepository;

    @Mock
    private RideApprovalRequestRepository approvalRepository;

    @Mock
    private CorporateInvoiceRepository invoiceRepository;

    @Mock
    private RideRepository rideRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private com.velogo.service.RideService rideService;

    @InjectMocks
    private CorporateService corporateService;

    private User employee;
    private User manager;
    private Company company;
    private CompanyMember employeeMember;
    private CompanyMember managerMember;

    @BeforeEach
    void setUp() {
        employee = User.builder()
                .id("u-emp-1")
                .fullName("John Doe")
                .email("john@corp.com")
                .phone("+919000000001")
                .role(Role.ROLE_CUSTOMER)
                .build();

        manager = User.builder()
                .id("u-mgr-1")
                .fullName("Jane Smith")
                .email("jane@corp.com")
                .phone("+919000000002")
                .role(Role.ROLE_CUSTOMER)
                .build();

        company = Company.builder()
                .id("comp-1")
                .name("Acme Corp")
                .taxId("GSTIN123456")
                .billingAddress("123 Tech Park")
                .domain("corp.com")
                .contactEmail("admin@corp.com")
                .creditLimit(new BigDecimal("100000.00"))
                .usedCredit(new BigDecimal("5000.00"))
                .status(CompanyStatus.ACTIVE)
                .approvalThreshold(new BigDecimal("500.00"))
                .build();

        employeeMember = CompanyMember.builder()
                .id("cm-1")
                .company(company)
                .user(employee)
                .role(CompanyMemberRole.EMPLOYEE)
                .monthlyBudget(new BigDecimal("3000.00"))
                .currentMonthSpent(new BigDecimal("500.00"))
                .status(CompanyMemberStatus.ACTIVE)
                .build();

        managerMember = CompanyMember.builder()
                .id("cm-2")
                .company(company)
                .user(manager)
                .role(CompanyMemberRole.MANAGER)
                .monthlyBudget(new BigDecimal("10000.00"))
                .currentMonthSpent(BigDecimal.ZERO)
                .status(CompanyMemberStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("Should allow booking when employee has sufficient allowance below approval threshold")
    void testEligibility_AllowedNoApproval() {
        when(memberRepository.findByUserIdAndStatus("u-emp-1", CompanyMemberStatus.ACTIVE))
                .thenReturn(Optional.of(employeeMember));

        CorporateDtos.CorporateBookingEligibilityDto result =
                corporateService.checkCorporateBookingEligibility(employee, new BigDecimal("250.00"));

        assertTrue(result.eligible());
        assertFalse(result.requiresApproval());
        assertEquals(new BigDecimal("2500.00"), result.remainingBudget());
    }

    @Test
    @DisplayName("Should require approval when ride fare exceeds company approval threshold")
    void testEligibility_RequiresApprovalOverThreshold() {
        when(memberRepository.findByUserIdAndStatus("u-emp-1", CompanyMemberStatus.ACTIVE))
                .thenReturn(Optional.of(employeeMember));

        CorporateDtos.CorporateBookingEligibilityDto result =
                corporateService.checkCorporateBookingEligibility(employee, new BigDecimal("650.00"));

        assertTrue(result.eligible());
        assertTrue(result.requiresApproval());
        assertTrue(result.reason().contains("exceeds standard policy threshold"));
    }

    @Test
    @DisplayName("Should reject booking when employee allowance is insufficient")
    void testEligibility_InsufficientBudget() {
        when(memberRepository.findByUserIdAndStatus("u-emp-1", CompanyMemberStatus.ACTIVE))
                .thenReturn(Optional.of(employeeMember));

        CorporateDtos.CorporateBookingEligibilityDto result =
                corporateService.checkCorporateBookingEligibility(employee, new BigDecimal("2800.00"));

        assertFalse(result.eligible());
        assertTrue(result.reason().contains("Insufficient corporate monthly allowance"));
    }

    @Test
    @DisplayName("Should successfully review and approve ride request")
    void testReviewApproval_Approved() {
        Ride ride = Ride.builder()
                .id("ride-1")
                .status(RideStatus.REQUESTED)
                .corporateApprovalStatus(CorporateApprovalStatus.PENDING)
                .build();

        RideApprovalRequest request = RideApprovalRequest.builder()
                .id("req-1")
                .ride(ride)
                .company(company)
                .employee(employee)
                .status(ApprovalStatus.PENDING)
                .estimatedFare(new BigDecimal("600.00"))
                .requestedAt(LocalDateTime.now())
                .build();

        when(approvalRepository.findById("req-1")).thenReturn(Optional.of(request));
        when(memberRepository.findByCompanyIdAndUserId("comp-1", "u-mgr-1")).thenReturn(Optional.of(managerMember));
        when(approvalRepository.save(any(RideApprovalRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CorporateDtos.ReviewApprovalRequest reviewReq = new CorporateDtos.ReviewApprovalRequest(true, null);
        CorporateDtos.RideApprovalRequestDto response = corporateService.reviewApprovalRequest(manager, "req-1", reviewReq);

        assertEquals(ApprovalStatus.APPROVED, response.status());
        assertEquals(CorporateApprovalStatus.APPROVED, ride.getCorporateApprovalStatus());
        verify(notificationService).sendNotification(eq("u-emp-1"), contains("Approved"), anyString(), eq(NotificationType.RIDE_UPDATE));
    }
}
