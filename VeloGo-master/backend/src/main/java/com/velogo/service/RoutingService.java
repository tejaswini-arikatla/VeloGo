package com.velogo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

@Service
@Slf4j
public class RoutingService {

    @Value("${app.routing.osrm-url:https://router.project-osrm.org}")
    private String osrmUrl;

    @Value("${app.routing.use-fallback-haversine:true}")
    private boolean useFallbackHaversine;

    private final RestTemplate restTemplate = new RestTemplate();

    public record RouteStep(
            String instruction,
            String streetName,
            String maneuver,
            double distanceMeters,
            int durationSeconds
    ) {}

    public record RouteInfo(
            BigDecimal distanceKm,
            Integer durationMinutes,
            List<List<Double>> geometry,
            List<RouteStep> steps
    ) {
        public RouteInfo(BigDecimal distanceKm, Integer durationMinutes, List<List<Double>> geometry) {
            this(distanceKm, durationMinutes, geometry, List.of());
        }
    }

    public RouteInfo getRoute(BigDecimal fromLat, BigDecimal fromLng, BigDecimal toLat, BigDecimal toLng) {
        if (osrmUrl != null && !osrmUrl.isBlank()) {
            try {
                // OSRM coordinates format: {lon},{lat};{lon},{lat}
                String url = String.format(java.util.Locale.US,
                        "%s/route/v1/driving/%f,%f;%f,%f?overview=full&geometries=geojson&steps=true",
                        osrmUrl, fromLng.doubleValue(), fromLat.doubleValue(), toLng.doubleValue(), toLat.doubleValue());

                Map<?, ?> response = restTemplate.getForObject(url, Map.class);
                if (response != null && "Ok".equalsIgnoreCase((String) response.get("code"))) {
                    List<?> routes = (List<?>) response.get("routes");
                    if (routes != null && !routes.isEmpty()) {
                        Map<?, ?> firstRoute = (Map<?, ?>) routes.get(0);
                        double distanceMeters = ((Number) firstRoute.get("distance")).doubleValue();
                        double durationSeconds = ((Number) firstRoute.get("duration")).doubleValue();

                        BigDecimal km = BigDecimal.valueOf(distanceMeters / 1000.0).setScale(2, RoundingMode.HALF_UP);
                        int mins = (int) Math.ceil(durationSeconds / 60.0);

                        // Extract road polyline geometry: OSRM gives [[lng, lat], ...] -> convert to [[lat, lng], ...]
                        List<List<Double>> latLngGeometry = new ArrayList<>();
                        Map<?, ?> geometryMap = (Map<?, ?>) firstRoute.get("geometry");
                        if (geometryMap != null && geometryMap.get("coordinates") instanceof List<?> coordsList) {
                            for (Object pt : coordsList) {
                                if (pt instanceof List<?> pair && pair.size() >= 2) {
                                    double lng = ((Number) pair.get(0)).doubleValue();
                                    double lat = ((Number) pair.get(1)).doubleValue();
                                    latLngGeometry.add(List.of(lat, lng));
                                }
                            }
                        }

                        if (latLngGeometry.isEmpty()) {
                            latLngGeometry.add(List.of(fromLat.doubleValue(), fromLng.doubleValue()));
                            latLngGeometry.add(List.of(toLat.doubleValue(), toLng.doubleValue()));
                        }

                        // Extract real turn-by-turn navigation steps
                        List<RouteStep> routeSteps = new ArrayList<>();
                        if (firstRoute.get("legs") instanceof List<?> legsList && !legsList.isEmpty()) {
                            Map<?, ?> firstLeg = (Map<?, ?>) legsList.get(0);
                            if (firstLeg.get("steps") instanceof List<?> rawSteps) {
                                for (Object sObj : rawSteps) {
                                    if (sObj instanceof Map<?, ?> stepMap) {
                                        String street = stepMap.get("name") != null ? stepMap.get("name").toString() : "";
                                        double dist = stepMap.get("distance") instanceof Number n ? n.doubleValue() : 0.0;
                                        double dur = stepMap.get("duration") instanceof Number n ? n.doubleValue() : 0.0;
                                        String maneuverType = "continue";
                                        String modifier = "";
                                        if (stepMap.get("maneuver") instanceof Map<?, ?> manMap) {
                                            if (manMap.get("type") != null) maneuverType = manMap.get("type").toString();
                                            if (manMap.get("modifier") != null) modifier = manMap.get("modifier").toString();
                                        }

                                        String instruction;
                                        if ("depart".equalsIgnoreCase(maneuverType)) {
                                            instruction = "Depart on " + (street.isBlank() ? "road" : street);
                                        } else if ("arrive".equalsIgnoreCase(maneuverType)) {
                                            instruction = "Arrive at destination";
                                        } else if ("turn".equalsIgnoreCase(maneuverType)) {
                                            instruction = "Turn " + modifier + " onto " + (street.isBlank() ? "road" : street);
                                        } else {
                                            instruction = "Continue on " + (street.isBlank() ? "road" : street);
                                        }
                                        String maneuverStr = maneuverType + (modifier.isBlank() ? "" : " " + modifier);
                                        routeSteps.add(new RouteStep(instruction, street, maneuverStr, dist, (int) Math.round(dur)));
                                    }
                                }
                            }
                        }

                        if (routeSteps.isEmpty()) {
                            routeSteps.add(new RouteStep("Depart from pickup location", "Origin", "depart", 0, 0));
                            routeSteps.add(new RouteStep("Arrive at destination", "Destination", "arrive", km.doubleValue() * 1000, mins * 60));
                        }

                        return new RouteInfo(km, Math.max(1, mins), latLngGeometry, routeSteps);
                    }
                }
            } catch (Exception e) {
                log.warn("OSRM routing call failed ({}), falling back to urban Haversine model.", e.getMessage());
            }
        }

        // Accurate Haversine road-network calculation (with 1.35x urban street winding factor)
        double distanceKm = calculateHaversineDistance(
                fromLat.doubleValue(), fromLng.doubleValue(),
                toLat.doubleValue(), toLng.doubleValue()
        ) * 1.35; // urban road circuity factor

        BigDecimal finalKm = BigDecimal.valueOf(Math.max(0.5, distanceKm)).setScale(2, RoundingMode.HALF_UP);

        // Average city traffic speed ~ 22 km/h + 2 min pickup buffer
        double travelHours = finalKm.doubleValue() / 22.0;
        int durationMins = (int) Math.ceil(travelHours * 60) + 2;

        List<List<Double>> fallbackGeom = List.of(
                List.of(fromLat.doubleValue(), fromLng.doubleValue()),
                List.of(toLat.doubleValue(), toLng.doubleValue())
        );

        List<RouteStep> fallbackSteps = List.of(
                new RouteStep("Head toward destination via local streets", "City Route", "depart", 0, 0),
                new RouteStep("Arrive at destination", "Destination", "arrive", finalKm.doubleValue() * 1000, durationMins * 60)
        );

        return new RouteInfo(finalKm, Math.max(3, durationMins), fallbackGeom, fallbackSteps);
    }

    public static double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
