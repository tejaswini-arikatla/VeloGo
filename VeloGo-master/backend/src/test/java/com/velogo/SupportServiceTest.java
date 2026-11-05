package com.velogo;

import com.velogo.domain.Ride;
import com.velogo.domain.SupportTicket;
import com.velogo.domain.User;
import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.TicketCategory;
import com.velogo.domain.enums.TicketStatus;
import com.velogo.dto.SupportDtos;
import com.velogo.repository.CaptainProfileRepository;
import com.velogo.repository.CustomerProfileRepository;
import com.velogo.repository.RatingRepository;
import com.velogo.repository.RideRepository;
import com.velogo.repository.SupportTicketRepository;
import com.velogo.service.NotificationService;
import com.velogo.service.SupportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SupportServiceTest {

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private SupportTicketRepository ticketRepository;

    @Mock
    private RideRepository rideRepository;

    @Mock
    private CaptainProfileRepository captainRepository;

    @Mock
    private CustomerProfileRepository customerRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private SupportService supportService;

    private User rider;
    private Ride ride;

    @BeforeEach
    void setUp() {
        rider = User.builder()
                .id("u-rider-1")
                .fullName("John Rider")
                .email("rider@test.com")
                .role(Role.ROLE_CUSTOMER)
                .build();

        ride = Ride.builder()
                .id("ride-sos-100")
                .customer(rider)
                .pickupAddress("123 MG Road, Bangalore")
                .destAddress("456 Outer Ring Road, Bangalore")
                .build();
    }

    @Test
    @DisplayName("Should trigger SOS emergency alert and create high-priority ticket")
    void testTriggerSosEmergency() {
        when(rideRepository.findById("ride-sos-100")).thenReturn(Optional.of(ride));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> {
            SupportTicket t = invocation.getArgument(0);
            t.setCreatedAt(LocalDateTime.now());
            return t;
        });

        SupportDtos.TriggerSosRequest req = new SupportDtos.TriggerSosRequest(
                "ride-sos-100",
                12.9716,
                77.5946,
                "Driver deviating route"
        );

        SupportDtos.SosAlertResponse response = supportService.triggerSosEmergency(rider, req);

        assertNotNull(response);
        assertEquals("ride-sos-100", response.rideId());
        assertEquals("DISPATCHED", response.status());
        assertNotNull(response.ticketId());
        verify(ticketRepository).save(any(SupportTicket.class));
        verify(notificationService).sendNotification(eq("u-rider-1"), contains("SOS"), anyString(), any());
    }

    @Test
    @DisplayName("Should create standard customer support ticket")
    void testCreateTicket() {
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> {
            SupportTicket t = invocation.getArgument(0);
            t.setCreatedAt(LocalDateTime.now());
            return t;
        });

        SupportDtos.CreateTicketRequest req = new SupportDtos.CreateTicketRequest(
                null,
                "Billing issue with refund",
                TicketCategory.BILLING,
                "Did not receive credit"
        );

        SupportDtos.TicketDto ticketDto = supportService.createTicket(rider, req);

        assertNotNull(ticketDto);
        assertEquals(TicketCategory.BILLING, ticketDto.category());
        assertEquals(TicketStatus.OPEN, ticketDto.status());
        verify(notificationService).sendNotification(eq("u-rider-1"), contains("Ticket"), anyString(), any());
    }
}
