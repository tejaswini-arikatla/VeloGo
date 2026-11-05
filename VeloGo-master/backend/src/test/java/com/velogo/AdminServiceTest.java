package com.velogo;

import com.velogo.domain.*;
import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import com.velogo.dto.AdminDtos;
import com.velogo.repository.*;
import com.velogo.service.AdminService;
import com.velogo.service.NotificationService;
import com.velogo.service.RideService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private CaptainProfileRepository captainRepository;
    @Mock private RideRepository rideRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private FareConfigurationRepository fareConfigRepository;
    @Mock private CouponRepository couponRepository;
    @Mock private AdminAuditLogRepository auditLogRepository;
    @Mock private NotificationService notificationService;
    @Mock private VehicleRepository vehicleRepository;
    @Mock private RideService rideService;

    @InjectMocks private AdminService adminService;

    private User admin;
    private User customer;
    private CaptainProfile captain;

    @BeforeEach
    void setUp() {
        admin = User.builder()
                .id("u-admin-1")
                .fullName("System Admin")
                .email("admin@velogo.com")
                .role(Role.ROLE_ADMIN)
                .build();

        customer = User.builder()
                .id("u-cust-1")
                .fullName("Regular User")
                .email("user@example.com")
                .role(Role.ROLE_CUSTOMER)
                .active(true)
                .build();

        captain = CaptainProfile.builder()
                .id("cp-1")
                .user(customer)
                .drivingLicenseNumber("DL-12345")
                .verificationStatus(VerificationStatus.PENDING)
                .online(false)
                .available(false)
                .build();
    }

    @Test
    @DisplayName("Should query audit logs with action filter and map to DTOs")
    void testGetAuditLogs_WithActionFilter() {
        AdminAuditLog logEntry = AdminAuditLog.builder()
                .id("audit-1")
                .admin(admin)
                .action("VERIFY_CAPTAIN")
                .targetEntity("CaptainProfile")
                .targetId("cp-1")
                .details("Approved captain")
                .createdAt(LocalDateTime.now())
                .build();

        Page<AdminAuditLog> page = new PageImpl<>(List.of(logEntry));
        when(auditLogRepository.findByActionOrderByCreatedAtDesc(eq("VERIFY_CAPTAIN"), any()))
                .thenReturn(page);

        Page<AdminDtos.AdminAuditLogDto> result = adminService.getAuditLogs("VERIFY_CAPTAIN", null, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        AdminDtos.AdminAuditLogDto dto = result.getContent().get(0);
        assertEquals("audit-1", dto.id());
        assertEquals("VERIFY_CAPTAIN", dto.action());
        assertEquals("System Admin", dto.adminName());
        assertEquals("admin@velogo.com", dto.adminEmail());
    }

    @Test
    @DisplayName("Should verify captain and persist admin audit log")
    void testVerifyCaptain_RecordsAuditLog() {
        when(captainRepository.findById("cp-1")).thenReturn(Optional.of(captain));
        when(captainRepository.save(any(CaptainProfile.class))).thenAnswer(i -> i.getArgument(0));

        CaptainProfile verified = adminService.verifyCaptain(admin, "cp-1", VerificationStatus.APPROVED, null);

        assertEquals(VerificationStatus.APPROVED, verified.getVerificationStatus());
        verify(auditLogRepository).save(argThat(log ->
                "VERIFY_CAPTAIN".equals(log.getAction()) &&
                "CaptainProfile".equals(log.getTargetEntity()) &&
                "cp-1".equals(log.getTargetId())
        ));
        verify(notificationService).sendNotification(eq("u-cust-1"), contains("APPROVED"), anyString(), any());
    }

    @Test
    @DisplayName("Should update customer active status and record audit log")
    void testUpdateCustomerStatus_RecordsAuditLog() {
        when(userRepository.findById("u-cust-1")).thenReturn(Optional.of(customer));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User updated = adminService.updateCustomerStatus(admin, "u-cust-1", false, "Terms of service violation");

        assertFalse(updated.isActive());
        verify(auditLogRepository).save(argThat(log ->
                "SUSPEND_USER".equals(log.getAction()) &&
                "User".equals(log.getTargetEntity())
        ));
    }
}
