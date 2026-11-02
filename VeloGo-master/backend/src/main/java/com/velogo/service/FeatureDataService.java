package com.velogo.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.velogo.domain.FeatureData;
import com.velogo.dto.FeatureDataDtos;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.exception.BadRequestException;
import com.velogo.repository.FeatureDataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeatureDataService {

    private static final Pattern FEATURE_KEY = Pattern.compile("^[a-z][a-z0-9-]{1,59}$");
    private static final int MAX_PAYLOAD_CHARS = 100_000;

    private final FeatureDataRepository repository;
    private final ObjectMapper objectMapper;

    public List<FeatureDataDtos.FeatureDataResponse> list(String userId, String featureKey) {
        List<FeatureData> records = featureKey == null || featureKey.isBlank()
                ? repository.findAllByUserIdOrderByUpdatedAtDesc(userId)
                : repository.findAllByUserIdAndFeatureKeyOrderByUpdatedAtDesc(userId, normalizeKey(featureKey));
        return records.stream().map(this::toResponse).toList();
    }

    public FeatureDataDtos.FeatureDataResponse get(String userId, String id) {
        return toResponse(findOwnedRecord(userId, id));
    }

    @Transactional
    public FeatureDataDtos.FeatureDataResponse create(String userId, FeatureDataDtos.SaveRequest request) {
        String key = normalizeKey(request.featureKey());
        String payload = serialize(request.payload());
        FeatureData entity = FeatureData.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .featureKey(key)
                .title(cleanTitle(request.title()))
                .payloadJson(payload)
                .build();
        return toResponse(repository.save(entity));
    }

    @Transactional
    public FeatureDataDtos.FeatureDataResponse update(
            String userId, String id, FeatureDataDtos.SaveRequest request) {
        FeatureData entity = findOwnedRecord(userId, id);
        entity.setFeatureKey(normalizeKey(request.featureKey()));
        entity.setTitle(cleanTitle(request.title()));
        entity.setPayloadJson(serialize(request.payload()));
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(String userId, String id) {
        FeatureData entity = findOwnedRecord(userId, id);
        repository.delete(entity);
    }

    private FeatureData findOwnedRecord(String userId, String id) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Feature record was not found."));
    }

    private String normalizeKey(String key) {
        String normalized = key == null ? "" : key.trim().toLowerCase();
        if (!FEATURE_KEY.matcher(normalized).matches()) {
            throw new BadRequestException(
                    "featureKey must start with a letter and contain 2-60 lowercase letters, numbers, or hyphens.");
        }
        return normalized;
    }

    private String cleanTitle(String title) {
        if (title == null || title.isBlank()) return null;
        return title.trim();
    }

    private String serialize(JsonNode payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            if (json.length() > MAX_PAYLOAD_CHARS) {
                throw new BadRequestException("Feature payload must be 100 KB or smaller.");
            }
            return json;
        } catch (JsonProcessingException exception) {
            throw new BadRequestException("Feature payload must be valid JSON.");
        }
    }

    private FeatureDataDtos.FeatureDataResponse toResponse(FeatureData entity) {
        try {
            return new FeatureDataDtos.FeatureDataResponse(
                    entity.getId(),
                    entity.getFeatureKey(),
                    entity.getTitle(),
                    objectMapper.readTree(entity.getPayloadJson()),
                    entity.getCreatedAt(),
                    entity.getUpdatedAt()
            );
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored feature data could not be read.", exception);
        }
    }
}
