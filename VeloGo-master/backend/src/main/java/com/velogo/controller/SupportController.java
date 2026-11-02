package com.velogo.controller;

import com.velogo.domain.Rating;
import com.velogo.domain.User;
import com.velogo.dto.SupportDtos;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.UserRepository;
import com.velogo.security.CustomUserDetails;
import com.velogo.service.SupportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/support")
@RequiredArgsConstructor
@Tag(name = "Support & Safety", description = "Ride ratings, customer support tickets, and safety incidents")
public class SupportController {

    private final SupportService supportService;
    private final UserRepository userRepository;

    @PostMapping("/rating")
    @Operation(summary = "Submit a 1-5 star rating and feedback for a ride")
    public ResponseEntity<SupportDtos.RatingDto> submitRating(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SupportDtos.SubmitRatingRequest req
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(supportService.submitRating(user, req));
    }

    @PostMapping("/tickets")
    @Operation(summary = "Create customer/captain support ticket")
    public ResponseEntity<SupportDtos.TicketDto> createTicket(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SupportDtos.CreateTicketRequest req
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(supportService.createTicket(user, req));
    }

    @GetMapping("/tickets/me")
    @Operation(summary = "List current user support tickets")
    public ResponseEntity<List<SupportDtos.TicketDto>> getMyTickets(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(supportService.getUserTickets(userDetails.getId()));
    }

    @GetMapping("/admin/tickets")
    @Operation(summary = "Admin: list all support tickets")
    public ResponseEntity<Page<SupportDtos.TicketDto>> getAllTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(supportService.getAllTickets(PageRequest.of(page, size)));
    }

    @PatchMapping("/admin/tickets/{ticketId}")
    @Operation(summary = "Admin: respond to and update support ticket")
    public ResponseEntity<SupportDtos.TicketDto> respondTicket(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String ticketId,
            @Valid @RequestBody SupportDtos.RespondTicketRequest req
    ) {
        User admin = userRepository.findById(userDetails.getId()).orElseThrow();
        return ResponseEntity.ok(supportService.respondTicket(admin, ticketId, req));
    }
}
