package com.velogo.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class FeatureDataDtos {

    private FeatureDataDtos() {
    }

    public record SaveRequest(
            @NotBlank @Size(max = 60) String featureKey,
            @Size(max = 140) String title,
            @NotNull JsonNode payload
    ) {
    }

    public record FeatureDataResponse(
            String id,
            String featureKey,
            String title,
            JsonNode payload,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }
}
