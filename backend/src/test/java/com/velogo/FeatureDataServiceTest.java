package com.velogo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.velogo.domain.FeatureData;
import com.velogo.dto.FeatureDataDtos;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.FeatureDataRepository;
import com.velogo.service.FeatureDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeatureDataServiceTest {

    @Mock
    private FeatureDataRepository repository;

    private FeatureDataService service;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new FeatureDataService(repository, objectMapper);
    }

    @Test
    void createStoresRecordAgainstAuthenticatedUser() throws Exception {
        var payload = objectMapper.readTree("{\"items\":[{\"name\":\"Office\"}]}");
        when(repository.save(any(FeatureData.class))).thenAnswer(invocation -> {
            FeatureData saved = invocation.getArgument(0);
            saved.setCreatedAt(java.time.LocalDateTime.now());
            saved.setUpdatedAt(java.time.LocalDateTime.now());
            return saved;
        });

        var response = service.create(
                "customer-123",
                new FeatureDataDtos.SaveRequest("favorite-places", "My places", payload)
        );

        assertEquals("favorite-places", response.featureKey());
        assertEquals("My places", response.title());
        assertEquals("Office", response.payload().path("items").get(0).path("name").asText());
        verify(repository).save(any(FeatureData.class));
    }

    @Test
    void getCannotReadAnotherUsersRecord() {
        when(repository.findByIdAndUserId("record-1", "customer-123"))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.get("customer-123", "record-1"));
    }
}
