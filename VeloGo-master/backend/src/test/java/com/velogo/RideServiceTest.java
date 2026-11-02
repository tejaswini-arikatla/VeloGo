package com.velogo;

import com.velogo.domain.*;
import com.velogo.domain.enums.RideStatus;
import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
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
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RideServiceTest {

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

    @InjectMocks private RideService rideService;

    private User customer;
    private User captainUser;
    private CaptainProfile captainProfile;
    private Vehicle vehicle;

    @BeforeEach
    void setUp() {
        customer = User.builder()
                .id("cust-1")
                .email("cust@velogo.com")
                .phone("+919876543210")
                .fullName("Customer One")
                .role(Role.ROLE_CUSTOMER)
                .active(true)
                .build();

        captainUser = User.builder()
                .id("capt-u-1")
                .email("captain@velogo.com")
                .phone("+919876543220")
                .fullName("Captain Rahul")
                .role(Role.ROLE_CAPTAIN)
                .active(true)
                .build();

        captainProfile = CaptainProfile.builder()
                .id("capt-1")
                .user(captainUser)
                .drivingLicenseNumber("DL-123")
                .verificationStatus(VerificationStatus.APPROVED)
                .online(true)
                .available(true)
                .ratingAvg(new BigDecimal("4.90"))
                .totalRides(10)
                .totalEarnings(new BigDecimal("1000.00"))
                .build();

        vehicle = Vehicle.builder()
                .id("veh-1")
                .captain(captainProfile)
                .category(VehicleCategory.BIKE)
                .model("Honda Activa")
                .registrationNumber("KA-01-AB-1234")
                .color("Yellow")
                .build();

        captainProfile.setVehicle(vehicle);
    }

    @Test
    void testCaptainAcceptsRideSuccessfully() {
        Ride ride = Ride.builder()
                .id("ride-123")
                .customer(customer)
                .vehicleCategory(VehicleCategory.BIKE)
                .status(RideStatus.SEARCHING)
                .pickupAddress("MG Road")
                .pickupLatitude(new BigDecimal("12.9716"))
                .pickupLongitude(new BigDecimal("77.5946"))
                .destAddress("Indiranagar")
                .destLatitude(new BigDecimal("12.9785"))
                .destLongitude(new BigDecimal("77.6010"))
                .distanceKm(new BigDecimal("4.5"))
                .durationMinutes(15)
                .estimatedFare(new BigDecimal("85.00"))
                .otpCode("5678")
                .build();

        when(captainRepository.findByUserId("capt-u-1")).thenReturn(Optional.of(captainProfile));
        when(rideRepository.findById("ride-123")).thenReturn(Optional.of(ride));
        when(rideRepository.save(any(Ride.class))).thenAnswer(i -> i.getArgument(0));

        RideDtos.RideDto dto = rideService.captainAcceptRide("capt-u-1", "ride-123");

        assertNotNull(dto);
        assertEquals(RideStatus.ACCEPTED, dto.status());
        assertFalse(captainProfile.isAvailable()); // Captain marked busy
        verify(eventPublisher, times(1)).publishRideUpdate(eq("ride-123"), any());
    }

    @Test
    void testCaptainStartTripValidatesOtpCorrectly() {
        Ride ride = Ride.builder()
                .id("ride-123")
                .customer(customer)
                .captain(captainProfile)
                .vehicleCategory(VehicleCategory.BIKE)
                .status(RideStatus.ARRIVED)
                .otpCode("9876")
                .pickupAddress("MG Road")
                .pickupLatitude(new BigDecimal("12.9716"))
                .pickupLongitude(new BigDecimal("77.5946"))
                .destAddress("Indiranagar")
                .destLatitude(new BigDecimal("12.9785"))
                .destLongitude(new BigDecimal("77.6010"))
                .distanceKm(new BigDecimal("4.5"))
                .durationMinutes(15)
                .estimatedFare(new BigDecimal("85.00"))
                .build();

        when(rideRepository.findById("ride-123")).thenReturn(Optional.of(ride));

        // Wrong OTP should throw BadRequestException
        assertThrows(BadRequestException.class, () ->
                rideService.captainStartTrip("capt-u-1", "ride-123", "0000")
        );

        // Correct OTP should transition to IN_PROGRESS
        when(rideRepository.save(any(Ride.class))).thenAnswer(i -> i.getArgument(0));
        RideDtos.RideDto dto = rideService.captainStartTrip("capt-u-1", "ride-123", "9876");

        assertEquals(RideStatus.IN_PROGRESS, dto.status());
    }

    @Test
    void testCaptainCompletesTripReleasesAvailability() {
        Ride ride = Ride.builder()
                .id("ride-123")
                .customer(customer)
                .captain(captainProfile)
                .vehicleCategory(VehicleCategory.BIKE)
                .status(RideStatus.IN_PROGRESS)
                .otpCode("9876")
                .pickupAddress("MG Road")
                .pickupLatitude(new BigDecimal("12.9716"))
                .pickupLongitude(new BigDecimal("77.5946"))
                .destAddress("Indiranagar")
                .destLatitude(new BigDecimal("12.9785"))
                .destLongitude(new BigDecimal("77.6010"))
                .distanceKm(new BigDecimal("4.5"))
                .durationMinutes(15)
                .estimatedFare(new BigDecimal("85.00"))
                .build();

        captainProfile.setAvailable(false);

        when(rideRepository.findById("ride-123")).thenReturn(Optional.of(ride));
        when(rideRepository.save(any(Ride.class))).thenAnswer(i -> i.getArgument(0));
        when(customerProfileRepository.findByUserId("cust-1")).thenReturn(Optional.empty());

        RideDtos.RideDto dto = rideService.captainCompleteTrip("capt-u-1", "ride-123");

        assertEquals(RideStatus.COMPLETED, dto.status());
        assertTrue(captainProfile.isAvailable()); // Captain freed up
        assertEquals(11, captainProfile.getTotalRides());
        assertEquals(new BigDecimal("1085.00"), captainProfile.getTotalEarnings());
    }
}
