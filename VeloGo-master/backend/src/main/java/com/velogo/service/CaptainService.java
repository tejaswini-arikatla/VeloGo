package com.velogo.service;

import com.velogo.domain.CaptainProfile;
import com.velogo.domain.Ride;
import com.velogo.domain.enums.NotificationType;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import com.velogo.dto.AuthDtos;
import com.velogo.dto.CaptainDtos;
import com.velogo.exception.BadRequestException;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.CaptainProfileRepository;
import com.velogo.repository.RideRepository;
import com.velogo.websocket.RideEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CaptainService {

    private final CaptainProfileRepository captainRepository;
    private final RideRepository rideRepository;
    private final RideEventPublisher eventPublisher;
    private final NotificationService notificationService;

    @Transactional
    public void updateLocation(String captainUserId, CaptainDtos.UpdateLocationRequest req) {
        if (req.latitude().doubleValue() < -90 || req.latitude().doubleValue() > 90 ||
            req.longitude().doubleValue() < -180 || req.longitude().doubleValue() > 180) {
            throw new BadRequestException("Coordinates out of valid geographical bounds.");
        }

        CaptainProfile captain = captainRepository.findByUserId(captainUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Captain profile not found"));

        captain.setCurrentLatitude(req.latitude());
        captain.setCurrentLongitude(req.longitude());
        captain.setLastLocationUpdate(LocalDateTime.now());
        captainRepository.save(captain);

        // If captain has active ride, broadcast location to customer
        List<Ride> activeRides = rideRepository.findActiveRidesForCaptain(captain.getId());
        if (!activeRides.isEmpty()) {
            Ride activeRide = activeRides.get(0);
            Map<String, Object> locPayload = new HashMap<>();
            locPayload.put("rideId", activeRide.getId());
            locPayload.put("captainId", captain.getId());
            locPayload.put("latitude", req.latitude());
            locPayload.put("longitude", req.longitude());
            locPayload.put("heading", req.heading() != null ? req.heading() : BigDecimal.ZERO);
            locPayload.put("timestamp", LocalDateTime.now().toString());

            eventPublisher.publishCaptainLocation(activeRide.getId(), locPayload);
        }
    }

    @Transactional
    public AuthDtos.CaptainSummaryDto toggleAvailability(String captainUserId, boolean online) {
        CaptainProfile captain = captainRepository.findByUserId(captainUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Captain profile not found"));

        if (online && captain.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new BadRequestException("Cannot go online. Account verification status is: " + captain.getVerificationStatus());
        }

        captain.setOnline(online);
        captain.setAvailable(online);
        CaptainProfile saved = captainRepository.save(captain);

        return toCaptainSummaryDto(saved);
    }

    @Transactional
    public AuthDtos.CaptainSummaryDto applyForWomenOnly(String captainUserId, CaptainDtos.ApplyWomenOnlyRequest req) {
        if (!Boolean.TRUE.equals(req.demoDeclarationAcknowledged())) {
            throw new BadRequestException("You must acknowledge the demo self-declaration terms.");
        }

        CaptainProfile captain = captainRepository.findByUserId(captainUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Captain profile not found for user: " + captainUserId));

        if (captain.getVehicle() == null || captain.getVehicle().getCategory() != VehicleCategory.BIKE) {
            throw new BadRequestException("Only two-wheeler / bike captains can apply for the Women-Only Bike program.");
        }

        captain.setWomenOnlyStatus("APPLIED");
        captain.setWomenOnlyEligible(false); // submission does not automatically grant eligibility
        captain.setWomenOnlyDeclarationDate(LocalDateTime.now());
        CaptainProfile saved = captainRepository.save(captain);

        notificationService.sendNotification(
                captainUserId,
                "Women-Only Bike Program Application Received",
                "Your application has been submitted for admin verification. Note: This is a demo self-declaration workflow.",
                NotificationType.VERIFICATION
        );

        return toCaptainSummaryDto(saved);
    }

    @Transactional(readOnly = true)
    public AuthDtos.CaptainSummaryDto getProfile(String captainUserId) {
        CaptainProfile captain = captainRepository.findByUserId(captainUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Captain profile not found"));
        return toCaptainSummaryDto(captain);
    }

    public AuthDtos.CaptainSummaryDto toCaptainSummaryDto(CaptainProfile cp) {
        AuthDtos.VehicleDto vDto = null;
        if (cp.getVehicle() != null) {
            vDto = new AuthDtos.VehicleDto(
                    cp.getVehicle().getId(),
                    cp.getVehicle().getCategory(),
                    cp.getVehicle().getModel(),
                    cp.getVehicle().getRegistrationNumber(),
                    cp.getVehicle().getColor()
            );
        }

        return new AuthDtos.CaptainSummaryDto(
                cp.getId(),
                cp.getVerificationStatus(),
                cp.getRejectionReason(),
                cp.isOnline(),
                cp.isAvailable(),
                cp.isWomenOnlyEligible(),
                cp.getWomenOnlyStatus(),
                cp.getCurrentLatitude(),
                cp.getCurrentLongitude(),
                cp.getRatingAvg(),
                cp.getTotalRides(),
                cp.getTotalEarnings(),
                vDto
        );
    }
}
