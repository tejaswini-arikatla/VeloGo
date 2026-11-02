package com.velogo.dto;

import com.velogo.domain.enums.TicketCategory;
import com.velogo.domain.enums.TicketStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SupportDtos {

    public record CreateTicketRequest(
            String rideId,
            @NotBlank String subject,
            @NotNull TicketCategory category,
            @NotBlank String description
    ) {}

    public record RespondTicketRequest(
            @NotBlank String adminResponse,
            @NotNull TicketStatus status
    ) {}

    public record SubmitRatingRequest(
            @NotBlank String rideId,
            @NotNull @Min(1) @Max(5) Integer score,
            String feedback
    ) {}

    public record RatingDto(
            String id,
            String rideId,
            String fromUserId,
            String toUserId,
            Integer score,
            String feedback,
            String createdAt
    ) {}

    public record TicketDto(
            String id,
            String userId,
            String userName,
            String userEmail,
            String rideId,
            String subject,
            TicketCategory category,
            String description,
            TicketStatus status,
            String adminResponse,
            String createdAt,
            String updatedAt
    ) {}
}
