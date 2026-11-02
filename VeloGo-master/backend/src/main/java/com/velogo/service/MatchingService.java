package com.velogo.service;

import com.velogo.domain.CaptainProfile;
import com.velogo.domain.Ride;
import com.velogo.domain.enums.RideStatus;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.dto.CaptainDtos;
import com.velogo.repository.CaptainProfileRepository;
import com.velogo.repository.RideRepository;
import com.velogo.websocket.RideEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

    private final CaptainProfileRepository captainRepository;
    private final RideRepository rideRepository;
    private final RideEventPublisher eventPublisher;

    @Value("${app.dispatch.matching-radius-km:15.0}")
    private double matchingRadiusKm;

    @Value("${app.dispatch.request-timeout-seconds:45}")
    private int requestTimeoutSeconds;

    public record CandidateCaptain(CaptainProfile captain, double distanceKm) {}

    @Transactional(readOnly = true)
    public List<CandidateCaptain> findNearbyCaptains(
            VehicleCategory category,
            BigDecimal pickupLat,
            BigDecimal pickupLng
    ) {
        List<CaptainProfile> eligibleCaptains = (category == VehicleCategory.WOMEN_BIKE)
                ? captainRepository.findAvailableCaptainsForWomenOnly()
                : captainRepository.findAvailableCaptainsByCategory(category);

        return eligibleCaptains.stream()
                .filter(c -> c.getCurrentLatitude() != null && c.getCurrentLongitude() != null)
                .map(c -> {
                    double dist = RoutingService.calculateHaversineDistance(
                            pickupLat.doubleValue(), pickupLng.doubleValue(),
                            c.getCurrentLatitude().doubleValue(), c.getCurrentLongitude().doubleValue()
                    );
                    return new CandidateCaptain(c, dist);
                })
                .filter(cc -> cc.distanceKm <= matchingRadiusKm)
                .sorted(Comparator.comparingDouble(CandidateCaptain::distanceKm))
                .toList();
    }

    public synchronized boolean dispatchRideToCaptain(Ride ride, CaptainProfile captain) {
        if (!captain.isOnline() || !captain.isAvailable()) {
            log.info("Captain {} is no longer available for dispatch", captain.getId());
            return false;
        }

        String displayName = (ride.isForSomeoneElse() && ride.getTravelerName() != null && !ride.getTravelerName().isBlank())
                ? ride.getTravelerName() + " (" + (ride.getTravelerRelationship() != null ? ride.getTravelerRelationship() : "Traveler") + ")"
                : ride.getCustomer().getFullName();

        CaptainDtos.IncomingRideDispatchDto dispatchDto = new CaptainDtos.IncomingRideDispatchDto(
                UUID.randomUUID().toString(),
                ride.getId(),
                ride.getVehicleCategory(),
                ride.getPickupAddress(),
                ride.getPickupLatitude(),
                ride.getPickupLongitude(),
                ride.getDestAddress(),
                ride.getDestLatitude(),
                ride.getDestLongitude(),
                ride.getDistanceKm(),
                ride.getDurationMinutes(),
                ride.getEstimatedFare(),
                requestTimeoutSeconds,
                displayName,
                new BigDecimal("4.90"),
                ride.isForSomeoneElse(),
                ride.getTravelerName(),
                ride.getTravelerRelationship()
        );

        eventPublisher.publishCaptainDispatch(captain.getId(), dispatchDto);
        return true;
    }
}
