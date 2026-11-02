package com.velogo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class GeocodingService {

    @Value("${app.geocoding.nominatim-url:https://nominatim.openstreetmap.org}")
    private String nominatimUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // Cache with TTL to respect Nominatim policy and provide instantaneous response
    private final Map<String, CacheEntry<List<GeoSearchResult>>> searchCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<GeoReverseResult>> reverseCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 3600000L; // 1 hour

    private record CacheEntry<T>(T data, long expiresAt) {
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }

    public record GeoSearchResult(
            String placeId,
            String name,
            String displayName,
            Double latitude,
            Double longitude,
            String type
    ) {}

    public record GeoReverseResult(
            String displayName,
            Double latitude,
            Double longitude,
            String street,
            String suburb,
            String city,
            String state,
            String postalCode
    ) {}

    public List<GeoSearchResult> searchLocations(String query, Double nearLat, Double nearLng) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }

        String cacheKey = query.trim().toLowerCase() + "_" +
                (nearLat != null ? Math.round(nearLat * 10) : 0) + "_" +
                (nearLng != null ? Math.round(nearLng * 10) : 0);

        CacheEntry<List<GeoSearchResult>> cached = searchCache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return cached.data();
        }

        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(nominatimUrl + "/search")
                    .queryParam("format", "json")
                    .queryParam("q", query.trim())
                    .queryParam("addressdetails", 1)
                    .queryParam("limit", 6);

            if (nearLat != null && nearLng != null) {
                // Bias search near user location (+/- 0.5 deg ~ 55km)
                double minLon = nearLng - 0.5;
                double maxLon = nearLng + 0.5;
                double minLat = nearLat - 0.5;
                double maxLat = nearLat + 0.5;
                builder.queryParam("viewbox", String.format(Locale.US, "%f,%f,%f,%f", minLon, maxLat, maxLon, minLat));
                builder.queryParam("bounded", 0);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "VeloGo-Mobility/1.0 (contact@velogo.com)");
            HttpEntity<?> entity = new HttpEntity<>(headers);

            ResponseEntity<List> response = restTemplate.exchange(
                    builder.build().toUri(),
                    HttpMethod.GET,
                    entity,
                    List.class
            );

            List<GeoSearchResult> results = new ArrayList<>();
            if (response.getBody() != null) {
                for (Object item : response.getBody()) {
                    if (item instanceof Map<?, ?> map) {
                        String placeId = String.valueOf(map.get("place_id"));
                        String displayName = (String) map.get("display_name");
                        Double lat = map.get("lat") != null ? Double.parseDouble((String) map.get("lat")) : null;
                        Double lon = map.get("lon") != null ? Double.parseDouble((String) map.get("lon")) : null;
                        String type = (String) map.get("type");

                        // Extract short title from name or first token of display_name
                        String name = (String) map.get("name");
                        if (name == null || name.isBlank()) {
                            name = displayName != null ? displayName.split(",")[0].trim() : "Location";
                        }

                        if (lat != null && lon != null && displayName != null) {
                            results.add(new GeoSearchResult(placeId, name, displayName, lat, lon, type));
                        }
                    }
                }
            }

            searchCache.put(cacheKey, new CacheEntry<>(results, System.currentTimeMillis() + CACHE_TTL_MS));
            return results;
        } catch (Exception e) {
            log.warn("Nominatim location search failed for '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    public GeoReverseResult reverseGeocode(Double lat, Double lng) {
        if (lat == null || lng == null) {
            return null;
        }

        // Cache by rounded coords (~11 meters)
        String cacheKey = String.format(Locale.US, "%.4f_%.4f", lat, lng);
        CacheEntry<GeoReverseResult> cached = reverseCache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return cached.data();
        }

        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(nominatimUrl + "/reverse")
                    .queryParam("format", "json")
                    .queryParam("lat", String.format(Locale.US, "%f", lat))
                    .queryParam("lon", String.format(Locale.US, "%f", lng))
                    .queryParam("addressdetails", 1);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "VeloGo-Mobility/1.0 (contact@velogo.com)");
            HttpEntity<?> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    builder.build().toUri(),
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            if (response.getBody() != null) {
                Map<?, ?> body = response.getBody();
                String displayName = (String) body.get("display_name");

                Map<?, ?> addr = (Map<?, ?>) body.get("address");
                String road = addr != null && addr.get("road") != null ? addr.get("road").toString() : null;
                String suburb = addr != null && addr.get("suburb") != null ? addr.get("suburb").toString() : null;
                String city = null;
                if (addr != null) {
                    if (addr.get("city") != null) {
                        city = addr.get("city").toString();
                    } else if (addr.get("town") != null) {
                        city = addr.get("town").toString();
                    } else if (addr.get("county") != null) {
                        city = addr.get("county").toString();
                    }
                }
                String state = addr != null && addr.get("state") != null ? addr.get("state").toString() : null;
                String postcode = addr != null && addr.get("postcode") != null ? addr.get("postcode").toString() : null;

                // Format a concise, clean address
                StringBuilder concise = new StringBuilder();
                if (road != null && !road.isBlank()) concise.append(road).append(", ");
                if (suburb != null && !suburb.isBlank()) concise.append(suburb).append(", ");
                if (city != null && !city.isBlank()) concise.append(city);

                String formatted = concise.length() > 0 ? concise.toString() : displayName;

                GeoReverseResult result = new GeoReverseResult(
                        formatted != null ? formatted : String.format(Locale.US, "Lat: %.4f, Lng: %.4f", lat, lng),
                        lat,
                        lng,
                        road,
                        suburb,
                        city,
                        state,
                        postcode
                );

                reverseCache.put(cacheKey, new CacheEntry<>(result, System.currentTimeMillis() + CACHE_TTL_MS));
                return result;
            }
        } catch (Exception e) {
            log.warn("Nominatim reverse geocode failed for ({}, {}): {}", lat, lng, e.getMessage());
        }

        return new GeoReverseResult(
                String.format(Locale.US, "Location (%.4f, %.4f)", lat, lng),
                lat, lng, null, null, null, null, null
        );
    }
}
