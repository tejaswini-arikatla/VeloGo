package com.velogo.service;

import com.velogo.domain.*;
import com.velogo.domain.enums.NotificationType;
import com.velogo.domain.enums.PaymentMethod;
import com.velogo.domain.enums.PaymentStatus;
import com.velogo.domain.enums.RideStatus;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import com.velogo.dto.CorporateDtos;
import com.velogo.dto.RideDtos;
import com.velogo.dto.SubscriptionDtos;
import com.velogo.exception.BadRequestException;
import com.velogo.exception.ForbiddenException;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.*;
import com.velogo.websocket.RideEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideService {

    private final RideRepository rideRepository;
    private final RideStatusHistoryRepository historyRepository;
    private final CaptainProfileRepository captainRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final FareConfigurationRepository fareConfigRepository;
    private final PaymentRepository paymentRepository;
    private final RoutingService routingService;
    private final FareCalculationService fareCalculationService;
    private final MatchingService matchingService;
    private final NotificationService notificationService;
    private final RideEventPublisher eventPublisher;
    private final SubscriptionService subscriptionService;
    private final CorporateService corporateService;
    private final CompanyRepository companyRepository;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional(readOnly = true)
    public RideDtos.FareEstimateResponse estimateFares(RideDtos.FareEstimateRequest req) {
        return estimateFares(req, null);
    }

    @Transactional(readOnly = true)
    public RideDtos.FareEstimateResponse estimateFares(RideDtos.FareEstimateRequest req, String userId) {
        RoutingService.RouteInfo route = routingService.getRoute(
                req.pickupLat(), req.pickupLng(),
                req.destLat(), req.destLng()
        );

        List<RideDtos.CategoryEstimateDto> estimates = new ArrayList<>();

        for (VehicleCategory cat : VehicleCategory.values()) {
            FareCalculationService.FareBreakdown breakdown = fareCalculationService.calculateFare(
                    cat, route.distanceKm(), route.durationMinutes(), req.couponCode()
            );

            // Check if there are available captains in area
            List<MatchingService.CandidateCaptain> nearby = matchingService.findNearbyCaptains(cat, req.pickupLat(), req.pickupLng());
            boolean available = !nearby.isEmpty();

            String etaText = available ? (int) Math.max(2, Math.round(nearby.get(0).distanceKm() * 3)) + " mins away" : "No Captains";
            String catName = switch (cat) {
                case BIKE -> "VeloGo Bike";
                case AUTO -> "VeloGo Auto";
                case CAB -> "VeloGo Prime Cab";
                case WOMEN_BIKE -> "Women-Only Bike";
            };

            BigDecimal subscriptionDiscount = BigDecimal.ZERO;
            boolean isFreeRide = false;
            BigDecimal payableFare = breakdown.totalFare();

            if (userId != null) {
                SubscriptionDtos.SubscriptionDiscountCalculationDto subDiscount =
                        subscriptionService.calculateDiscountForFare(userId, breakdown.totalFare());
                if (subDiscount != null && subDiscount.discountAmount().compareTo(BigDecimal.ZERO) > 0) {
                    subscriptionDiscount = subDiscount.discountAmount();
                    isFreeRide = subDiscount.isFreeRide();
                    payableFare = subDiscount.finalFare();
                }
            }

            estimates.add(new RideDtos.CategoryEstimateDto(
                    cat,
                    catName,
                    etaText,
                    route.distanceKm(),
                    route.durationMinutes(),
                    breakdown.baseFare(),
                    breakdown.distanceCharge(),
                    breakdown.timeCharge(),
                    breakdown.bookingFee(),
                    breakdown.taxAmount(),
                    breakdown.discountAmount(),
                    payableFare,
                    available,
                    subscriptionDiscount,
                    isFreeRide
            ));
        }

        RideDtos.CouponAppliedDto couponApplied = null;
        if (req.couponCode() != null && !req.couponCode().isBlank()) {
            couponApplied = fareCalculationService.validateCoupon(req.couponCode(), estimates.get(0).totalFare());
        }

        List<RideDtos.RouteStepDto> stepDtos = route.steps() != null
                ? route.steps().stream().map(s -> new RideDtos.RouteStepDto(
                        s.instruction(), s.streetName(), s.maneuver(), s.distanceMeters(), s.durationSeconds()
                )).toList()
                : List.of();
        return new RideDtos.FareEstimateResponse(route.distanceKm(), route.durationMinutes(), estimates, couponApplied, route.geometry(), stepDtos);
    }

    @Transactional
    public RideDtos.RideDto bookRide(User customer, RideDtos.BookRideRequest req) {
        // Prevent multiple concurrent active rides
        List<Ride> activeRides = rideRepository.findActiveRidesForCustomer(customer.getId());
        if (!activeRides.isEmpty()) {
            throw new BadRequestException("You already have an active ride in progress. Ride ID: " + activeRides.get(0).getId());
        }

        // Validate Women-Only Bike passenger eligibility & demo self-declaration
        boolean isForSomeoneElse = Boolean.TRUE.equals(req.isForSomeoneElse());
        String travelerName = isForSomeoneElse && req.travelerName() != null ? req.travelerName().trim() : customer.getFullName();
        String travelerPhone = isForSomeoneElse && req.travelerPhone() != null ? req.travelerPhone().trim() : customer.getPhone();
        String travelerRelationship = isForSomeoneElse && req.travelerRelationship() != null ? req.travelerRelationship().trim() : "Self";
        String travelerGender = isForSomeoneElse && req.travelerGender() != null
                ? req.travelerGender().trim().toUpperCase()
                : (customer.getGender() != null && !customer.getGender().isBlank() ? customer.getGender().trim().toUpperCase() : "UNSPECIFIED");

        if (req.vehicleCategory() == VehicleCategory.WOMEN_BIKE) {
            if (!Boolean.TRUE.equals(req.passengerDeclarationAcknowledged())) {
                throw new BadRequestException("Demo self-declaration must be acknowledged for Women-Only Bike bookings.");
            }

            if (isForSomeoneElse) {
                if (req.travelerName() == null || req.travelerName().trim().isBlank()) {
                    throw new BadRequestException("Traveler name is required when booking for someone else.");
                }
                if (req.travelerPhone() == null || req.travelerPhone().trim().isBlank()) {
                    throw new BadRequestException("Traveler phone number is required when booking for someone else.");
                }
                if (req.travelerRelationship() == null || req.travelerRelationship().trim().isBlank()) {
                    throw new BadRequestException("Traveler relationship is required (e.g., Wife, Mother, Sister, Friend).");
                }
                if (req.travelerGender() == null || !req.travelerGender().trim().equalsIgnoreCase("FEMALE")) {
                    throw new BadRequestException("Women-Only Bike bookings are reserved exclusively for women passengers. The designated traveler must be female. Please choose standard Bike, Auto, or Cab, or update traveler details.");
                }
                travelerGender = "FEMALE";
            } else {
                // Booking for self
                String declaredGender = (req.travelerGender() != null && !req.travelerGender().isBlank())
                        ? req.travelerGender().trim().toUpperCase()
                        : (customer.getGender() != null ? customer.getGender().trim().toUpperCase() : "UNSPECIFIED");

                if (!"FEMALE".equals(declaredGender)) {
                    throw new BadRequestException("Women-Only Bike bookings are reserved exclusively for women passengers. If you are booking for a female relative or friend, please select 'Book for Someone Else' and enter their details.");
                }
                travelerGender = "FEMALE";
            }
        }

        RoutingService.RouteInfo route = routingService.getRoute(
                req.pickupLat(), req.pickupLng(),
                req.destLat(), req.destLng()
        );

        FareCalculationService.FareBreakdown fare = fareCalculationService.calculateFare(
                req.vehicleCategory(), route.distanceKm(), route.durationMinutes(), req.couponCode()
        );

        // Find candidate captains
        List<MatchingService.CandidateCaptain> nearbyCaptains = matchingService.findNearbyCaptains(
                req.vehicleCategory(), req.pickupLat(), req.pickupLng()
        );

        // Strict availability guard for Women-Only: NEVER silently fall back
        if (req.vehicleCategory() == VehicleCategory.WOMEN_BIKE && nearbyCaptains.isEmpty()) {
            throw new BadRequestException("No verified Women-Only Bike captains are currently available in your pickup area. Please try again in a few moments or choose a standard ride category.");
        }

        String otp = String.format("%04d", secureRandom.nextInt(10000));

        // Corporate Account check
        boolean isCorporate = req.billingProfile() == com.velogo.domain.enums.BillingProfile.CORPORATE;
        Company corporateCompany = null;
        boolean requiresCorporateApproval = false;

        if (isCorporate && corporateService != null) {
            CorporateDtos.CorporateBookingEligibilityDto eligibility = corporateService.checkCorporateBookingEligibility(customer, fare.totalFare());
            if (!eligibility.eligible()) {
                throw new BadRequestException("Corporate ride booking failed: " + eligibility.reason());
            }
            corporateCompany = companyRepository != null ? companyRepository.findById(eligibility.companyId()).orElse(null) : null;
            requiresCorporateApproval = eligibility.requiresApproval();
        }

        // Subscription discount check (only for personal rides)
        UserSubscription userSubscription = null;
        BigDecimal subscriptionDiscount = BigDecimal.ZERO;
        boolean isFreeRide = false;

        if (!isCorporate && subscriptionService != null) {
            Optional<SubscriptionService.SubscriptionDiscountResult> subDiscount = subscriptionService.evaluateSubscriptionDiscount(customer.getId(), fare.totalFare());
            if (subDiscount.isPresent()) {
                SubscriptionService.SubscriptionDiscountResult res = subDiscount.get();
                userSubscription = res.subscription();
                subscriptionDiscount = res.discountAmount();
                isFreeRide = res.isFreeRide();
            }
        }

        BigDecimal calculatedFinalFare = fare.totalFare().subtract(subscriptionDiscount).max(BigDecimal.ZERO);

        RideStatus initialRideStatus = requiresCorporateApproval ? RideStatus.REQUESTED : RideStatus.SEARCHING;
        com.velogo.domain.enums.CorporateApprovalStatus initialApprovalStatus = isCorporate
                ? (requiresCorporateApproval ? com.velogo.domain.enums.CorporateApprovalStatus.PENDING : com.velogo.domain.enums.CorporateApprovalStatus.APPROVED)
                : com.velogo.domain.enums.CorporateApprovalStatus.NOT_REQUIRED;

        Ride ride = Ride.builder()
                .id(UUID.randomUUID().toString())
                .customer(customer)
                .vehicleCategory(req.vehicleCategory())
                .status(initialRideStatus)
                .pickupAddress(req.pickupAddress())
                .pickupLatitude(req.pickupLat())
                .pickupLongitude(req.pickupLng())
                .destAddress(req.destAddress())
                .destLatitude(req.destLat())
                .destLongitude(req.destLng())
                .distanceKm(route.distanceKm())
                .durationMinutes(route.durationMinutes())
                .estimatedFare(fare.totalFare())
                .finalFare(calculatedFinalFare)
                .discountAmount(fare.discountAmount().add(subscriptionDiscount))
                .taxAmount(fare.taxAmount())
                .couponCode(fare.couponCode())
                .otpCode(otp)
                .isForSomeoneElse(isForSomeoneElse)
                .travelerName(travelerName)
                .travelerPhone(travelerPhone)
                .travelerRelationship(travelerRelationship)
                .travelerGender(travelerGender)
                .passengerDeclarationAcknowledged(Boolean.TRUE.equals(req.passengerDeclarationAcknowledged()))
                .billingProfile(isCorporate ? com.velogo.domain.enums.BillingProfile.CORPORATE : com.velogo.domain.enums.BillingProfile.PERSONAL)
                .company(corporateCompany)
                .corporateApprovalStatus(initialApprovalStatus)
                .requiresApproval(requiresCorporateApproval)
                .subscription(userSubscription)
                .subscriptionDiscount(subscriptionDiscount)
                .isSubscriptionFreeRide(isFreeRide)
                .build();

        Ride savedRide = rideRepository.save(ride);

        if (requiresCorporateApproval && corporateService != null) {
            corporateService.createApprovalRequest(savedRide, customer, fare.totalFare(), req.corporateReason());
            recordStatusHistory(savedRide, null, RideStatus.REQUESTED, "Ride requested and submitted for corporate manager approval");
            return toRideDto(savedRide);
        }

        // Record history
        recordStatusHistory(savedRide, null, RideStatus.SEARCHING, "Customer requested ride and searching for nearby captains");

        // Create initial pending payment record
        Payment payment = Payment.builder()
                .id(UUID.randomUUID().toString())
                .ride(savedRide)
                .customer(customer)
                .amount(fare.totalFare())
                .currency("INR")
                .method(req.paymentMethod())
                .status(PaymentStatus.PENDING)
                .idempotencyKey("idem-" + savedRide.getId())
                .build();
        paymentRepository.save(payment);

        // Notify customer
        notificationService.sendNotification(
                customer.getId(),
                "Searching for Captain",
                "Looking for the nearest " + req.vehicleCategory() + " captain for your trip.",
                NotificationType.RIDE_UPDATE
        );

        // Dispatch to candidate captains
        if (!nearbyCaptains.isEmpty()) {
            for (MatchingService.CandidateCaptain candidate : nearbyCaptains) {
                matchingService.dispatchRideToCaptain(savedRide, candidate.captain());
            }
        }

        return toRideDto(savedRide);
    }

    @Transactional
    public synchronized RideDtos.RideDto captainAcceptRide(String captainUserId, String rideId) {
        CaptainProfile captain = captainRepository.findByUserId(captainUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Captain profile not found for user: " + captainUserId));

        if (captain.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new BadRequestException("Captain account is not approved yet.");
        }

        if (!captain.isOnline() || !captain.isAvailable()) {
            throw new BadRequestException("You are currently offline or already assigned to a ride.");
        }

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found with id: " + rideId));

        if (ride.getStatus() != RideStatus.SEARCHING && ride.getStatus() != RideStatus.REQUESTED) {
            throw new BadRequestException("This ride has already been accepted or is no longer available.");
        }

        // Women-Only authorization check
        if (ride.getVehicleCategory() == VehicleCategory.WOMEN_BIKE) {
            if (!captain.isWomenOnlyEligible() || !"APPROVED".equals(captain.getWomenOnlyStatus())) {
                throw new BadRequestException("This is a Women-Only Bike booking. Only admin-approved Women-Only captains can accept this ride.");
            }
        }

        // Assign captain and transition to ACCEPTED
        ride.setCaptain(captain);
        ride.setStatus(RideStatus.ACCEPTED);
        ride.setAcceptedAt(LocalDateTime.now());
        Ride updatedRide = rideRepository.save(ride);

        // Lock captain availability
        captain.setAvailable(false);
        captainRepository.save(captain);

        recordStatusHistory(updatedRide, RideStatus.SEARCHING, RideStatus.ACCEPTED,
                "Accepted by Captain " + captain.getUser().getFullName());

        // Notify customer
        notificationService.sendNotification(
                ride.getCustomer().getId(),
                "Captain Assigned!",
                captain.getUser().getFullName() + " has accepted your ride and is heading your way.",
                NotificationType.RIDE_UPDATE
        );

        // Publish live update to customer
        RideDtos.RideDto dto = toRideDto(updatedRide);
        eventPublisher.publishRideUpdate(rideId, dto);

        return dto;
    }

    @Transactional
    public RideDtos.RideDto captainArriveAtPickup(String captainUserId, String rideId) {
        Ride ride = getRideAndVerifyCaptain(captainUserId, rideId);

        if (ride.getStatus() != RideStatus.ACCEPTED && ride.getStatus() != RideStatus.ARRIVING) {
            throw new BadRequestException("Cannot mark arrival for ride in status: " + ride.getStatus());
        }

        ride.setStatus(RideStatus.ARRIVED);
        Ride updated = rideRepository.save(ride);

        recordStatusHistory(updated, ride.getStatus(), RideStatus.ARRIVED, "Captain arrived at pickup location");

        notificationService.sendNotification(
                ride.getCustomer().getId(),
                "Captain Arrived!",
                "Your captain has arrived at the pickup location. Share OTP " + ride.getOtpCode() + " to start the trip.",
                NotificationType.RIDE_UPDATE
        );

        RideDtos.RideDto dto = toRideDto(updated);
        eventPublisher.publishRideUpdate(rideId, dto);
        return dto;
    }

    @Transactional
    public RideDtos.RideDto captainStartTrip(String captainUserId, String rideId, String otpCode) {
        Ride ride = getRideAndVerifyCaptain(captainUserId, rideId);

        if (ride.getStatus() != RideStatus.ARRIVED && ride.getStatus() != RideStatus.ACCEPTED) {
            throw new BadRequestException("Trip can only be started once captain has arrived or accepted.");
        }

        if (otpCode == null || !otpCode.trim().equals(ride.getOtpCode())) {
            throw new BadRequestException("Invalid OTP code. Please enter the 4-digit OTP provided by the customer.");
        }

        ride.setStatus(RideStatus.IN_PROGRESS);
        ride.setStartedAt(LocalDateTime.now());
        Ride updated = rideRepository.save(ride);

        recordStatusHistory(updated, RideStatus.ARRIVED, RideStatus.IN_PROGRESS, "Trip started successfully after OTP verification");

        notificationService.sendNotification(
                ride.getCustomer().getId(),
                "Trip Started",
                "Your trip to " + ride.getDestAddress() + " has begun. Ride safely!",
                NotificationType.RIDE_UPDATE
        );

        RideDtos.RideDto dto = toRideDto(updated);
        eventPublisher.publishRideUpdate(rideId, dto);
        return dto;
    }

    @Transactional
    public RideDtos.RideDto captainCompleteTrip(String captainUserId, String rideId) {
        Ride ride = getRideAndVerifyCaptain(captainUserId, rideId);

        if (ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new BadRequestException("Cannot complete a ride that is not IN_PROGRESS. Current status: " + ride.getStatus());
        }

        ride.setStatus(RideStatus.COMPLETED);
        ride.setCompletedAt(LocalDateTime.now());
        ride.setFinalFare(ride.getEstimatedFare());
        Ride updated = rideRepository.save(ride);

        // Release captain and update captain stats
        CaptainProfile captain = ride.getCaptain();
        captain.setAvailable(true);
        captain.setTotalRides(captain.getTotalRides() + 1);
        captain.setTotalEarnings(captain.getTotalEarnings().add(ride.getFinalFare()));
        captainRepository.save(captain);

        // Update customer profile stats
        customerProfileRepository.findByUserId(ride.getCustomer().getId()).ifPresent(cp -> {
            cp.setTotalRides(cp.getTotalRides() + 1);
            customerProfileRepository.save(cp);
        });

        // Deduct from corporate budget if applicable
        if (updated.getBillingProfile() == com.velogo.domain.enums.BillingProfile.CORPORATE && updated.getCompany() != null) {
            corporateService.deductCorporateBudget(updated.getCompany().getId(), updated.getCustomer().getId(), updated.getFinalFare());
            paymentRepository.findByRideId(updated.getId()).ifPresent(p -> {
                p.setStatus(PaymentStatus.SUCCESS);
                p.setMethod(PaymentMethod.CORPORATE);
                p.setCompletedAt(LocalDateTime.now());
                paymentRepository.save(p);
            });
        }

        // Record subscription usage if applied
        if (updated.getSubscription() != null) {
            subscriptionService.recordUsage(updated.getSubscription(), updated, updated.getSubscriptionDiscount(), updated.isSubscriptionFreeRide());
            if (updated.isSubscriptionFreeRide()) {
                paymentRepository.findByRideId(updated.getId()).ifPresent(p -> {
                    p.setStatus(PaymentStatus.SUCCESS);
                    p.setMethod(PaymentMethod.SUBSCRIPTION_PASS);
                    p.setCompletedAt(LocalDateTime.now());
                    paymentRepository.save(p);
                });
            }
        }

        recordStatusHistory(updated, RideStatus.IN_PROGRESS, RideStatus.COMPLETED,
                "Trip completed successfully. Final fare: ₹" + ride.getFinalFare());

        notificationService.sendNotification(
                ride.getCustomer().getId(),
                "Trip Completed!",
                "You have arrived at your destination. Total fare: ₹" + ride.getFinalFare() + ". Please complete payment.",
                NotificationType.RIDE_UPDATE
        );

        RideDtos.RideDto dto = toRideDto(updated);
        eventPublisher.publishRideUpdate(rideId, dto);
        return dto;
    }

    @Transactional
    public RideDtos.RideDto cancelRide(String userId, String rideId, String reason) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found with id: " + rideId));

        boolean isCustomer = ride.getCustomer().getId().equals(userId);
        boolean isCaptain = ride.getCaptain() != null && ride.getCaptain().getUser().getId().equals(userId);

        if (!isCustomer && !isCaptain) {
            throw new ForbiddenException("You are not authorized to cancel this ride.");
        }

        if (ride.getStatus() == RideStatus.IN_PROGRESS || ride.getStatus() == RideStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel a trip that is already in progress or completed.");
        }

        RideStatus prevStatus = ride.getStatus();
        ride.setStatus(RideStatus.CANCELLED);
        ride.setCancellationReason(reason);
        ride.setCancelledBy(isCustomer ? "CUSTOMER" : "CAPTAIN");
        Ride updated = rideRepository.save(ride);

        // Release captain if one was assigned
        if (ride.getCaptain() != null) {
            CaptainProfile captain = ride.getCaptain();
            captain.setAvailable(true);
            captainRepository.save(captain);
        }

        recordStatusHistory(updated, prevStatus, RideStatus.CANCELLED,
                "Ride cancelled by " + (isCustomer ? "customer" : "captain") + ". Reason: " + reason);

        String notifyUserId = isCustomer && ride.getCaptain() != null ? ride.getCaptain().getUser().getId() : ride.getCustomer().getId();
        notificationService.sendNotification(
                notifyUserId,
                "Ride Cancelled",
                "Ride was cancelled by " + (isCustomer ? "the customer" : "the captain") + ". Reason: " + reason,
                NotificationType.RIDE_UPDATE
        );

        RideDtos.RideDto dto = toRideDto(updated);
        eventPublisher.publishRideUpdate(rideId, dto);
        return dto;
    }

    @Transactional(readOnly = true)
    public RideDtos.RideDto getRideDetails(String rideId, String userId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found with id: " + rideId));

        // Also allow admin to view any ride
        return toRideDto(ride);
    }

    @Transactional(readOnly = true)
    public List<RideDtos.RideDto> getCustomerRides(String customerId) {
        return rideRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream().map(this::toRideDto).toList();
    }

    @Transactional(readOnly = true)
    public List<RideDtos.RideDto> getCaptainRides(String captainUserId) {
        CaptainProfile captain = captainRepository.findByUserId(captainUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Captain profile not found"));
        return rideRepository.findByCaptainIdOrderByCreatedAtDesc(captain.getId())
                .stream().map(this::toRideDto).toList();
    }

    @Transactional(readOnly = true)
    public RideDtos.RideDto getActiveCustomerRide(String customerId) {
        List<Ride> active = rideRepository.findActiveRidesForCustomer(customerId);
        return active.isEmpty() ? null : toRideDto(active.get(0));
    }

    @Transactional(readOnly = true)
    public RideDtos.RideDto getActiveCaptainRide(String captainUserId) {
        CaptainProfile captain = captainRepository.findByUserId(captainUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Captain profile not found"));
        List<Ride> active = rideRepository.findActiveRidesForCaptain(captain.getId());
        return active.isEmpty() ? null : toRideDto(active.get(0));
    }

    private Ride getRideAndVerifyCaptain(String captainUserId, String rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found with id: " + rideId));

        if (ride.getCaptain() == null || !ride.getCaptain().getUser().getId().equals(captainUserId)) {
            throw new ForbiddenException("This ride is not assigned to you.");
        }
        return ride;
    }

    private void recordStatusHistory(Ride ride, RideStatus fromStatus, RideStatus toStatus, String notes) {
        RideStatusHistory history = RideStatusHistory.builder()
                .id(UUID.randomUUID().toString())
                .ride(ride)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .notes(notes)
                .build();
        historyRepository.save(history);
    }

    public RideDtos.RideDto toRideDto(Ride r) {
        DateTimeFormatter dtf = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

        String captainName = null;
        String captainPhone = null;
        String captainAvatar = null;
        BigDecimal captainRating = null;
        String captainId = null;
        String vehicleModel = null;
        String regNumber = null;
        String vehicleColor = null;
        BigDecimal captainCurrentLat = null;
        BigDecimal captainCurrentLng = null;

        if (r.getCaptain() != null) {
            CaptainProfile cp = r.getCaptain();
            captainId = cp.getId();
            captainName = cp.getUser().getFullName();
            captainPhone = cp.getUser().getPhone();
            captainAvatar = cp.getUser().getAvatarUrl();
            captainRating = cp.getRatingAvg();
            captainCurrentLat = cp.getCurrentLatitude();
            captainCurrentLng = cp.getCurrentLongitude();

            if (cp.getVehicle() != null) {
                vehicleModel = cp.getVehicle().getModel();
                regNumber = cp.getVehicle().getRegistrationNumber();
                vehicleColor = cp.getVehicle().getColor();
            }
        }

        Payment payment = paymentRepository.findByRideId(r.getId()).orElse(null);
        PaymentMethod paymentMethod = payment != null ? payment.getMethod() : PaymentMethod.CASH;
        PaymentStatus paymentStatus = payment != null ? payment.getStatus() : PaymentStatus.PENDING;

        return new RideDtos.RideDto(
                r.getId(),
                r.getCustomer().getId(),
                r.getCustomer().getFullName(),
                r.getCustomer().getPhone(),
                r.getCustomer().getAvatarUrl(),
                captainId,
                captainName,
                captainPhone,
                captainAvatar,
                captainRating,
                r.getVehicleCategory(),
                vehicleModel,
                regNumber,
                vehicleColor,
                r.getStatus(),
                r.getPickupAddress(),
                r.getPickupLatitude(),
                r.getPickupLongitude(),
                r.getDestAddress(),
                r.getDestLatitude(),
                r.getDestLongitude(),
                r.getDistanceKm(),
                r.getDurationMinutes(),
                r.getEstimatedFare(),
                r.getFinalFare(),
                r.getDiscountAmount(),
                r.getTaxAmount(),
                r.getCouponCode(),
                r.getOtpCode(),
                paymentMethod,
                paymentStatus,
                captainCurrentLat,
                captainCurrentLng,
                r.getCancellationReason(),
                r.getCancelledBy(),
                r.isForSomeoneElse(),
                r.getTravelerName(),
                r.getTravelerPhone(),
                r.getTravelerRelationship(),
                r.getTravelerGender(),
                r.isPassengerDeclarationAcknowledged(),
                r.getCreatedAt() != null ? r.getCreatedAt().format(dtf) : null,
                r.getAcceptedAt() != null ? r.getAcceptedAt().format(dtf) : null,
                r.getStartedAt() != null ? r.getStartedAt().format(dtf) : null,
                r.getCompletedAt() != null ? r.getCompletedAt().format(dtf) : null,
                r.getBillingProfile() != null ? r.getBillingProfile() : com.velogo.domain.enums.BillingProfile.PERSONAL,
                r.getCompany() != null ? r.getCompany().getId() : null,
                r.getCompany() != null ? r.getCompany().getName() : null,
                r.getCorporateApprovalStatus() != null ? r.getCorporateApprovalStatus() : com.velogo.domain.enums.CorporateApprovalStatus.NOT_REQUIRED,
                r.isRequiresApproval(),
                r.getSubscriptionDiscount() != null ? r.getSubscriptionDiscount() : BigDecimal.ZERO,
                r.isSubscriptionFreeRide()
        );
    }

    @Transactional
    public void onCorporateRideApproved(String rideId) {
        Ride ride = rideRepository.findById(rideId).orElse(null);
        if (ride == null) return;
        ride.setCorporateApprovalStatus(com.velogo.domain.enums.CorporateApprovalStatus.APPROVED);
        ride.setStatus(RideStatus.SEARCHING);
        Ride saved = rideRepository.save(ride);
        recordStatusHistory(saved, RideStatus.REQUESTED, RideStatus.SEARCHING, "Corporate ride approved by manager, searching for captains");

        // Dispatch to candidate captains
        List<MatchingService.CandidateCaptain> nearbyCaptains = matchingService.findNearbyCaptains(
                saved.getVehicleCategory(), saved.getPickupLatitude(), saved.getPickupLongitude()
        );
        for (MatchingService.CandidateCaptain candidate : nearbyCaptains) {
            matchingService.dispatchRideToCaptain(saved, candidate.captain());
        }

        RideDtos.RideDto dto = toRideDto(saved);
        eventPublisher.publishRideUpdate(ride.getId(), dto);
    }

    @Transactional
    public void onCorporateRideRejected(String rideId, String reason) {
        Ride ride = rideRepository.findById(rideId).orElse(null);
        if (ride == null) return;
        ride.setCorporateApprovalStatus(com.velogo.domain.enums.CorporateApprovalStatus.REJECTED);
        ride.setStatus(RideStatus.CANCELLED);
        ride.setCancellationReason("Corporate ride request rejected by manager: " + (reason != null ? reason : "Policy non-compliance"));
        ride.setCancelledBy("MANAGER");
        Ride saved = rideRepository.save(ride);
        recordStatusHistory(saved, RideStatus.REQUESTED, RideStatus.CANCELLED, "Corporate ride rejected by manager");

        RideDtos.RideDto dto = toRideDto(saved);
        eventPublisher.publishRideUpdate(ride.getId(), dto);
    }
}
