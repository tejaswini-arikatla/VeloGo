package com.velogo.service;

import com.velogo.domain.Rating;
import com.velogo.domain.Ride;
import com.velogo.domain.SupportTicket;
import com.velogo.domain.User;
import com.velogo.domain.enums.NotificationType;
import com.velogo.domain.enums.Role;
import com.velogo.dto.SupportDtos;
import com.velogo.exception.BadRequestException;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.CaptainProfileRepository;
import com.velogo.repository.CustomerProfileRepository;
import com.velogo.repository.RatingRepository;
import com.velogo.repository.RideRepository;
import com.velogo.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupportService {

    private final RatingRepository ratingRepository;
    private final SupportTicketRepository ticketRepository;
    private final RideRepository rideRepository;
    private final CaptainProfileRepository captainRepository;
    private final CustomerProfileRepository customerRepository;
    private final NotificationService notificationService;

    @Transactional
    public SupportDtos.RatingDto submitRating(User fromUser, SupportDtos.SubmitRatingRequest req) {
        Ride ride = rideRepository.findById(req.rideId())
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found with id: " + req.rideId()));

        User toUser;
        if (fromUser.getRole() == Role.ROLE_CUSTOMER) {
            if (ride.getCaptain() == null) {
                throw new BadRequestException("No captain was assigned to this ride.");
            }
            toUser = ride.getCaptain().getUser();
        } else {
            toUser = ride.getCustomer();
        }

        if (ratingRepository.findByRideIdAndFromUserId(req.rideId(), fromUser.getId()).isPresent()) {
            throw new BadRequestException("You have already rated this ride.");
        }

        Rating rating = Rating.builder()
                .id(UUID.randomUUID().toString())
                .ride(ride)
                .fromUser(fromUser)
                .toUser(toUser)
                .score(req.score())
                .feedback(req.feedback())
                .build();
        Rating saved = ratingRepository.save(rating);

        // Update average rating
        List<Rating> allRatings = ratingRepository.findByToUserIdOrderByCreatedAtDesc(toUser.getId());
        double avg = allRatings.stream().mapToInt(Rating::getScore).average().orElse(5.0);
        BigDecimal newAvg = BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP);

        if (toUser.getRole() == Role.ROLE_CAPTAIN) {
            captainRepository.findByUserId(toUser.getId()).ifPresent(cp -> {
                cp.setRatingAvg(newAvg);
                captainRepository.save(cp);
            });
        } else {
            customerRepository.findByUserId(toUser.getId()).ifPresent(cp -> {
                cp.setRatingAvg(newAvg);
                customerRepository.save(cp);
            });
        }

        return new SupportDtos.RatingDto(
                saved.getId(),
                ride.getId(),
                fromUser.getId(),
                toUser.getId(),
                saved.getScore(),
                saved.getFeedback(),
                saved.getCreatedAt().toString()
        );
    }

    @Transactional
    public SupportDtos.TicketDto createTicket(User user, SupportDtos.CreateTicketRequest req) {
        Ride ride = null;
        if (req.rideId() != null && !req.rideId().isBlank()) {
            ride = rideRepository.findById(req.rideId()).orElse(null);
        }

        SupportTicket ticket = SupportTicket.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .ride(ride)
                .subject(req.subject())
                .category(req.category())
                .description(req.description())
                .build();

        SupportTicket saved = ticketRepository.save(ticket);

        notificationService.sendNotification(
                user.getId(),
                "Support Ticket Created",
                "Your ticket #" + saved.getId().substring(0, 8) + " has been logged. Our safety & support team will respond shortly.",
                NotificationType.RIDE_UPDATE
        );

        return toTicketDto(saved);
    }

    @Transactional
    public SupportDtos.TicketDto respondTicket(User admin, String ticketId, SupportDtos.RespondTicketRequest req) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        ticket.setAdminResponse(req.adminResponse());
        ticket.setStatus(req.status());
        SupportTicket saved = ticketRepository.save(ticket);

        notificationService.sendNotification(
                ticket.getUser().getId(),
                "Support Ticket Updated",
                "Your ticket #" + ticket.getId().substring(0, 8) + " was updated: " + req.adminResponse(),
                NotificationType.RIDE_UPDATE
        );

        return toTicketDto(saved);
    }

    @Transactional(readOnly = true)
    public List<SupportDtos.TicketDto> getUserTickets(String userId) {
        return ticketRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toTicketDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<SupportDtos.TicketDto> getAllTickets(Pageable pageable) {
        return ticketRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toTicketDto);
    }

    private SupportDtos.TicketDto toTicketDto(SupportTicket t) {
        return new SupportDtos.TicketDto(
                t.getId(),
                t.getUser().getId(),
                t.getUser().getFullName(),
                t.getUser().getEmail(),
                t.getRide() != null ? t.getRide().getId() : null,
                t.getSubject(),
                t.getCategory(),
                t.getDescription(),
                t.getStatus(),
                t.getAdminResponse(),
                t.getCreatedAt().toString(),
                t.getUpdatedAt() != null ? t.getUpdatedAt().toString() : t.getCreatedAt().toString()
        );
    }
}
