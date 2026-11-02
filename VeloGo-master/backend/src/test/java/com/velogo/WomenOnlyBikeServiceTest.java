package com.velogo;

import com.velogo.domain.*;
import com.velogo.domain.enums.PaymentMethod;
import com.velogo.domain.enums.RideStatus;
import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import com.velogo.dto.AdminDtos;
import com.velogo.dto.CaptainDtos;
import com.velogo.dto.RideDtos;
import com.velogo.exception.BadRequestException;
import com.velogo.repository.*;
import com.velogo.service.*;
import com.velogo.websocket.RideEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WomenOnlyBikeServiceTest {

    @Mock private RideRepository rideRepository;
    @Mock private RideStatusHistoryRepository historyRepository;
    @Mock private CaptainProfileRepository captainRepository;
    @Mock private CustomerProfileRepository customerProfileRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private RoutingService routingService;
    @Mock private FareCalculationService fareCalculationService;
    @Mock private MatchingService matchingService;
    @Mock private NotificationService notificationService;
    @Mock private RideEventPublisher eventPublisher;
    @Mock private AdminAuditLogRepository auditLogRepository;

    @InjectMocks private RideService rideService;

    private CaptainService captainService;
    private AdminService adminService;

    private User femaleCustomer;
    private User maleCustomer;
    private User adminUser;
    private User captainUser;
    private CaptainProfile eligibleCaptain;
    private CaptainProfile standardCaptain;
    private Vehicle bikeVehicle;

    @BeforeEach
    void setUp() {
        captainService = new CaptainService(captainRepository, rideRepository, eventPublisher, notificationService);
        adminService = new AdminService(
                null, captainRepository, rideRepository, paymentRepository,
                null, null, auditLogRepository, notificationService, null, null
        );

        femaleCustomer = User.builder()
                .id("cust-female-1")
                .email("priya.k@velogo.com")
                .phone("+919876543211")
                .fullName("Priya Kapoor")
                .gender("FEMALE")
                .role(Role.ROLE_CUSTOMER)
                .active(true)
                .build();

        maleCustomer = User.builder()
                .id("cust-male-1")
                .email("arun.s@velogo.com")
                .phone("+919876543210")
                .fullName("Arun Sharma")
                .gender("MALE")
                .role(Role.ROLE_CUSTOMER)
                .active(true)
                .build();

        adminUser = User.builder()
                .id("admin-1")
                .email("admin@velogo.com")
                .fullName("Admin User")
                .role(Role.ROLE_ADMIN)
                .build();

        captainUser = User.builder()
                .id("capt-u-1")
                .email("anita.r@velogo.com")
                .phone("+919876543224")
                .fullName("Anita Roy")
                .gender("FEMALE")
                .role(Role.ROLE_CAPTAIN)
                .active(true)
                .build();

        eligibleCaptain = CaptainProfile.builder()
                .id("cp-women-1")
                .user(captainUser)
                .drivingLicenseNumber("DL-KA-01-2023005")
                .verificationStatus(VerificationStatus.APPROVED)
                .online(true)
                .available(true)
                .womenOnlyEligible(true)
                .womenOnlyStatus("APPROVED")
                .ratingAvg(new BigDecimal("4.95"))
                .totalRides(50)
                .totalEarnings(new BigDecimal("5000.00"))
                .build();

        standardCaptain = CaptainProfile.builder()
                .id("cp-std-1")
                .user(captainUser)
                .drivingLicenseNumber("DL-KA-01-2022001")
                .verificationStatus(VerificationStatus.APPROVED)
                .online(true)
                .available(true)
                .womenOnlyEligible(false)
                .womenOnlyStatus("NOT_APPLIED")
                .ratingAvg(new BigDecimal("4.90"))
                .totalRides(20)
                .totalEarnings(new BigDecimal("2000.00"))
                .build();

        bikeVehicle = Vehicle.builder()
                .id("veh-1")
                .captain(eligibleCaptain)
                .category(VehicleCategory.BIKE)
                .model("Honda Activa")
                .registrationNumber("KA-01-EQ-1234")
                .color("Yellow")
                .build();

        eligibleCaptain.setVehicle(bikeVehicle);
        standardCaptain.setVehicle(bikeVehicle);
    }

    private void mockRoutingAndFare() {
        when(routingService.getRoute(any(), any(), any(), any())).thenReturn(
                new RoutingService.RouteInfo(new BigDecimal("5.0"), 15, Collections.emptyList())
        );
        when(fareCalculationService.calculateFare(any(), any(), any(), any())).thenReturn(
                new FareCalculationService.FareBreakdown(
                        new BigDecimal("25.00"), new BigDecimal("45.00"), new BigDecimal("22.50"),
                        new BigDecimal("5.00"), new BigDecimal("97.50"), BigDecimal.ZERO,
                        new BigDecimal("4.88"), new BigDecimal("102.38"), null
                )
        );
    }

    @Test
    void testEligibleFemalePassengerBookingForSelf_Success() {
        mockRoutingAndFare();
        when(matchingService.findNearbyCaptains(eq(VehicleCategory.WOMEN_BIKE), any(), any()))
                .thenReturn(List.of(new MatchingService.CandidateCaptain(eligibleCaptain, 1.5)));
        when(rideRepository.save(any(Ride.class))).thenAnswer(i -> i.getArgument(0));

        RideDtos.BookRideRequest req = new RideDtos.BookRideRequest(
                new BigDecimal("12.9716"), new BigDecimal("77.5946"), "MG Road",
                new BigDecimal("12.9352"), new BigDecimal("77.6245"), "Koramangala",
                VehicleCategory.WOMEN_BIKE, PaymentMethod.CASH, null,
                false, null, null, null, null, true
        );

        RideDtos.RideDto result = rideService.bookRide(femaleCustomer, req);

        assertNotNull(result);
        assertEquals(VehicleCategory.WOMEN_BIKE, result.vehicleCategory());
        assertEquals("Priya Kapoor", result.travelerName());
        assertEquals("FEMALE", result.travelerGender());
        assertFalse(result.isForSomeoneElse());
        verify(matchingService, times(1)).dispatchRideToCaptain(any(), eq(eligibleCaptain));
    }

    @Test
    void testMalePassengerBookingWomenOnlyForSelf_BlockedWithClearMessage() {
        RideDtos.BookRideRequest req = new RideDtos.BookRideRequest(
                new BigDecimal("12.9716"), new BigDecimal("77.5946"), "MG Road",
                new BigDecimal("12.9352"), new BigDecimal("77.6245"), "Koramangala",
                VehicleCategory.WOMEN_BIKE, PaymentMethod.CASH, null,
                false, null, null, null, null, true
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                rideService.bookRide(maleCustomer, req)
        );
        assertTrue(ex.getMessage().contains("reserved exclusively for women passengers"));
    }

    @Test
    void testMalePassengerBookingForFemaleTraveler_Success() {
        mockRoutingAndFare();
        when(matchingService.findNearbyCaptains(eq(VehicleCategory.WOMEN_BIKE), any(), any()))
                .thenReturn(List.of(new MatchingService.CandidateCaptain(eligibleCaptain, 2.0)));
        when(rideRepository.save(any(Ride.class))).thenAnswer(i -> i.getArgument(0));

        RideDtos.BookRideRequest req = new RideDtos.BookRideRequest(
                new BigDecimal("12.9716"), new BigDecimal("77.5946"), "MG Road",
                new BigDecimal("12.9352"), new BigDecimal("77.6245"), "Koramangala",
                VehicleCategory.WOMEN_BIKE, PaymentMethod.CASH, null,
                true, "Sunita Sharma", "+919876543299", "Sister", "FEMALE", true
        );

        RideDtos.RideDto result = rideService.bookRide(maleCustomer, req);

        assertNotNull(result);
        assertTrue(result.isForSomeoneElse());
        assertEquals("Sunita Sharma", result.travelerName());
        assertEquals("+919876543299", result.travelerPhone());
        assertEquals("Sister", result.travelerRelationship());
        assertEquals("FEMALE", result.travelerGender());
        verify(matchingService, times(1)).dispatchRideToCaptain(any(), eq(eligibleCaptain));
    }

    @Test
    void testBookingForSomeoneElseWithNonFemaleTraveler_Blocked() {
        RideDtos.BookRideRequest req = new RideDtos.BookRideRequest(
                new BigDecimal("12.9716"), new BigDecimal("77.5946"), "MG Road",
                new BigDecimal("12.9352"), new BigDecimal("77.6245"), "Koramangala",
                VehicleCategory.WOMEN_BIKE, PaymentMethod.CASH, null,
                true, "Rohan Sharma", "+919876543290", "Brother", "MALE", true
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                rideService.bookRide(femaleCustomer, req)
        );
        assertTrue(ex.getMessage().contains("designated traveler must be female"));
    }

    @Test
    void testBookingForSomeoneElseWithMissingTravelerDetails_Blocked() {
        RideDtos.BookRideRequest req = new RideDtos.BookRideRequest(
                new BigDecimal("12.9716"), new BigDecimal("77.5946"), "MG Road",
                new BigDecimal("12.9352"), new BigDecimal("77.6245"), "Koramangala",
                VehicleCategory.WOMEN_BIKE, PaymentMethod.CASH, null,
                true, "", "+919876543290", "Sister", "FEMALE", true
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                rideService.bookRide(femaleCustomer, req)
        );
        assertTrue(ex.getMessage().contains("Traveler name is required"));
    }

    @Test
    void testWomenOnlyBookingWithoutDemoDeclaration_Blocked() {
        RideDtos.BookRideRequest req = new RideDtos.BookRideRequest(
                new BigDecimal("12.9716"), new BigDecimal("77.5946"), "MG Road",
                new BigDecimal("12.9352"), new BigDecimal("77.6245"), "Koramangala",
                VehicleCategory.WOMEN_BIKE, PaymentMethod.CASH, null,
                false, null, null, null, null, false // Declaration false
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                rideService.bookRide(femaleCustomer, req)
        );
        assertTrue(ex.getMessage().contains("Demo self-declaration must be acknowledged"));
    }

    @Test
    void testWomenOnlyBookingWithNoEligibleCaptainsAvailable_ThrowsClearExceptionAndNeverFallsBack() {
        mockRoutingAndFare();
        // Return empty list of nearby captains
        when(matchingService.findNearbyCaptains(eq(VehicleCategory.WOMEN_BIKE), any(), any()))
                .thenReturn(Collections.emptyList());

        RideDtos.BookRideRequest req = new RideDtos.BookRideRequest(
                new BigDecimal("12.9716"), new BigDecimal("77.5946"), "MG Road",
                new BigDecimal("12.9352"), new BigDecimal("77.6245"), "Koramangala",
                VehicleCategory.WOMEN_BIKE, PaymentMethod.CASH, null,
                false, null, null, null, null, true
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                rideService.bookRide(femaleCustomer, req)
        );
        assertTrue(ex.getMessage().contains("No verified Women-Only Bike captains are currently available"));
        // Ensure no fallback dispatch occurred
        verify(matchingService, never()).dispatchRideToCaptain(any(), any());
    }

    @Test
    void testNonEligibleCaptainCannotAcceptWomenOnlyRide() {
        Ride ride = Ride.builder()
                .id("ride-women-123")
                .customer(femaleCustomer)
                .vehicleCategory(VehicleCategory.WOMEN_BIKE)
                .status(RideStatus.SEARCHING)
                .build();

        when(captainRepository.findByUserId("capt-u-1")).thenReturn(Optional.of(standardCaptain));
        when(rideRepository.findById("ride-women-123")).thenReturn(Optional.of(ride));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                rideService.captainAcceptRide("capt-u-1", "ride-women-123")
        );
        assertTrue(ex.getMessage().contains("Only admin-approved Women-Only captains can accept this ride"));
    }

    @Test
    void testEligibleApprovedCaptainCanAcceptWomenOnlyRide() {
        Ride ride = Ride.builder()
                .id("ride-women-123")
                .customer(femaleCustomer)
                .vehicleCategory(VehicleCategory.WOMEN_BIKE)
                .status(RideStatus.SEARCHING)
                .build();

        when(captainRepository.findByUserId("capt-u-1")).thenReturn(Optional.of(eligibleCaptain));
        when(rideRepository.findById("ride-women-123")).thenReturn(Optional.of(ride));
        when(rideRepository.save(any(Ride.class))).thenAnswer(i -> i.getArgument(0));

        RideDtos.RideDto dto = rideService.captainAcceptRide("capt-u-1", "ride-women-123");

        assertNotNull(dto);
        assertEquals(RideStatus.ACCEPTED, dto.status());
        assertFalse(eligibleCaptain.isAvailable());
    }

    @Test
    void testCaptainAppliesForWomenOnly_StatusBecomesAppliedNotEligibleAutomatically() {
        when(captainRepository.findByUserId("capt-u-1")).thenReturn(Optional.of(standardCaptain));
        when(captainRepository.save(any(CaptainProfile.class))).thenAnswer(i -> i.getArgument(0));

        CaptainDtos.ApplyWomenOnlyRequest req = new CaptainDtos.ApplyWomenOnlyRequest(true);
        var result = captainService.applyForWomenOnly("capt-u-1", req);

        assertEquals("APPLIED", result.womenOnlyStatus());
        assertFalse(result.womenOnlyEligible()); // Not auto-granted!
        verify(notificationService, times(1)).sendNotification(eq("capt-u-1"), any(), any(), any());
    }

    @Test
    void testAdminApprovesWomenOnlyCaptain_StatusBecomesApprovedAndEligible() {
        standardCaptain.setWomenOnlyStatus("APPLIED");
        when(captainRepository.findById("cp-std-1")).thenReturn(Optional.of(standardCaptain));
        when(captainRepository.save(any(CaptainProfile.class))).thenAnswer(i -> i.getArgument(0));

        CaptainProfile approved = adminService.verifyWomenOnlyCaptain(adminUser, "cp-std-1", "APPROVED", null);

        assertTrue(approved.isWomenOnlyEligible());
        assertEquals("APPROVED", approved.getWomenOnlyStatus());
        assertNull(approved.getWomenOnlyRejectionReason());
        verify(auditLogRepository, times(1)).save(any(AdminAuditLog.class));
    }

    @Test
    void testAdminRejectsWomenOnlyCaptain_StatusBecomesRejected() {
        standardCaptain.setWomenOnlyStatus("APPLIED");
        when(captainRepository.findById("cp-std-1")).thenReturn(Optional.of(standardCaptain));
        when(captainRepository.save(any(CaptainProfile.class))).thenAnswer(i -> i.getArgument(0));

        CaptainProfile rejected = adminService.verifyWomenOnlyCaptain(adminUser, "cp-std-1", "REJECTED", "Demo vehicle did not qualify");

        assertFalse(rejected.isWomenOnlyEligible());
        assertEquals("REJECTED", rejected.getWomenOnlyStatus());
        assertEquals("Demo vehicle did not qualify", rejected.getWomenOnlyRejectionReason());
        verify(auditLogRepository, times(1)).save(any(AdminAuditLog.class));
    }
}
