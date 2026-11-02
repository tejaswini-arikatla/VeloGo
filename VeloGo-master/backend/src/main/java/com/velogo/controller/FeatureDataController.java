package com.velogo.controller;

import com.velogo.dto.FeatureDataDtos;
import com.velogo.security.CustomUserDetails;
import com.velogo.service.FeatureDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@PreAuthorize("hasAuthority('ROLE_CUSTOMER')")
@RequestMapping("/api/v1/features/data")
@RequiredArgsConstructor
@Tag(name = "Feature Suite Data", description = "Account-scoped cloud persistence for optional VeloGo planning features")
public class FeatureDataController {

    private final FeatureDataService featureDataService;

    @GetMapping
    @Operation(summary = "List the signed-in user's feature records")
    public ResponseEntity<List<FeatureDataDtos.FeatureDataResponse>> list(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) String featureKey) {
        return ResponseEntity.ok(featureDataService.list(principal.getId(), featureKey));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one feature record owned by the signed-in user")
    public ResponseEntity<FeatureDataDtos.FeatureDataResponse> get(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id) {
        return ResponseEntity.ok(featureDataService.get(principal.getId(), id));
    }

    @PostMapping
    @Operation(summary = "Create a feature record in the signed-in user's account")
    public ResponseEntity<FeatureDataDtos.FeatureDataResponse> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody FeatureDataDtos.SaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(featureDataService.create(principal.getId(), request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a feature record owned by the signed-in user")
    public ResponseEntity<FeatureDataDtos.FeatureDataResponse> update(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @Valid @RequestBody FeatureDataDtos.SaveRequest request) {
        return ResponseEntity.ok(featureDataService.update(principal.getId(), id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a feature record owned by the signed-in user")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id) {
        featureDataService.delete(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
