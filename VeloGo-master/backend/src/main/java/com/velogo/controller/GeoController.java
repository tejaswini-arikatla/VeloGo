package com.velogo.controller;

import com.velogo.service.GeocodingService;
import com.velogo.service.RoutingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/geo")
@RequiredArgsConstructor
@Tag(name = "Geospatial & Mapping", description = "Address search, reverse geocoding, and road route calculation")
public class GeoController {

    private final GeocodingService geocodingService;
    private final RoutingService routingService;

    @GetMapping("/search")
    @Operation(summary = "Search real places, landmarks, and addresses with autocomplete")
    public ResponseEntity<List<GeocodingService.GeoSearchResult>> searchLocations(
            @RequestParam String q,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng
    ) {
        return ResponseEntity.ok(geocodingService.searchLocations(q, lat, lng));
    }

    @GetMapping("/reverse")
    @Operation(summary = "Reverse geocode coordinates into a human-readable address")
    public ResponseEntity<GeocodingService.GeoReverseResult> reverseGeocode(
            @RequestParam Double lat,
            @RequestParam Double lng
    ) {
        GeocodingService.GeoReverseResult result = geocodingService.reverseGeocode(lat, lng);
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/route")
    @Operation(summary = "Calculate driving road route distance, duration, and road geometry")
    public ResponseEntity<RoutingService.RouteInfo> getRoute(
            @RequestParam BigDecimal fromLat,
            @RequestParam BigDecimal fromLng,
            @RequestParam BigDecimal toLat,
            @RequestParam BigDecimal toLng
    ) {
        return ResponseEntity.ok(routingService.getRoute(fromLat, fromLng, toLat, toLng));
    }
}
