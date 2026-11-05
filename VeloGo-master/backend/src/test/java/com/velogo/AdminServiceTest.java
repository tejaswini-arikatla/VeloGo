package com.velogo;

import com.velogo.domain.*;
import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import com.velogo.dto.AdminDtos;
import com.velogo.exception.BadRequestException;
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

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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

    @BeforeEach
    void setUp() {
        admin = User.builder()
                .id("u-admin-1")
                .fullName("System Admin")
                .email("admin@velogo.com")
                .role(Role.ROLE_ADMIN)
                .build();
    }

    @Test
    @DisplayName("Should successfully update fare configuration when parameters are within valid bounds")
    void testUpdateFareConfig_Success() {
        FareConfiguration existing = FareConfiguration.builder()
                .id("fc-bike")
                .category(VehicleCategory.BIKE)
                .baseFare(new BigDecimal("25.00"))
                .minFare(new BigDecimal("35.00"))
                .perKmRate(new BigDecimal("12.00"))
                .perMinRate(new BigDecimal("1.50"))
                .bookingFee(new BigDecimal("5.00"))
                .taxRatePercent(new BigDecimal("5.00"))
                .active(true)
                .build();

        when(fareConfigRepository.findByCategory(VehicleCategory.BIKE)).thenReturn(Optional.of(existing));
        when(fareConfigRepository.save(any(FareConfiguration.class))).thenAnswer(i -> i.getArgument(0));

        AdminDtos.UpdateFareConfigRequest req = new AdminDtos.UpdateFareConfigRequest(
                new BigDecimal("30.00"),
                new BigDecimal("40.00"),
                new BigDecimal("14.00"),
                new BigDecimal("2.00"),
                new BigDecimal("5.00"),
                new BigDecimal("5.00"),
                true
        );

        FareConfiguration updated = adminService.updateFareConfig(admin, VehicleCategory.BIKE, req);

        assertNotNull(updated);
        assertEquals(new BigDecimal("30.00"), updated.getBaseFare());
        assertEquals(new BigDecimal("40.00"), updated.getMinFare());
        assertEquals(new BigDecimal("14.00"), updated.getPerKmRate());
        verify(auditLogRepository).save(any(AdminAuditLog.class));
    }

    @Test
    @DisplayName("Should reject fare configuration update when minimum fare is less than base fare")
    void testUpdateFareConfig_RejectsMinFareLessThanBaseFare() {
        AdminDtos.UpdateFareConfigRequest req = new AdminDtos.UpdateFareConfigRequest(
                new BigDecimal("50.00"), // Base fare 50
                new BigDecimal("30.00"), // Min fare 30 (invalid: min fare < base fare)
                new BigDecimal("15.00"),
                new BigDecimal("2.00"),
                new BigDecimal("5.00"),
                new BigDecimal("5.00"),
                true
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminService.updateFareConfig(admin, VehicleCategory.BIKE, req)
        );

        assertTrue(ex.getMessage().contains("cannot be less than base fare"));
        verify(fareConfigRepository, never()).save(any());
    }
}
