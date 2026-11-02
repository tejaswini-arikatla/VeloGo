package com.velogo.controller;

import com.velogo.domain.User;
import com.velogo.dto.SubscriptionDtos;
import com.velogo.exception.ResourceNotFoundException;
import com.velogo.repository.UserRepository;
import com.velogo.security.CustomUserDetails;
import com.velogo.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Subscriptions", description = "Commuter passes, tier-based subscription plans, and recurring renewals")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final UserRepository userRepository;

    @GetMapping("/plans")
    @Operation(summary = "List all active subscription plans and commuter passes")
    public ResponseEntity<List<SubscriptionDtos.SubscriptionPlanDto>> getActivePlans() {
        return ResponseEntity.ok(subscriptionService.getActivePlans());
    }

    @GetMapping("/portal")
    @Operation(summary = "Get user account subscription portal data including active plan, savings, and history")
    public ResponseEntity<SubscriptionDtos.UserSubscriptionPortalDto> getUserPortal(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(subscriptionService.getUserSubscriptionPortal(user));
    }

    @PostMapping("/subscribe")
    @Operation(summary = "Subscribe or upgrade to a subscription pass")
    public ResponseEntity<SubscriptionDtos.UserSubscriptionDto> subscribe(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SubscriptionDtos.SubscribeRequest req
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(subscriptionService.subscribeToPlan(user, req));
    }

    @PostMapping("/order")
    @Operation(summary = "Create payment order for subscription plan checkout")
    public ResponseEntity<SubscriptionDtos.CreateSubscriptionOrderResponse> createOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam String planId
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(subscriptionService.createSubscriptionOrder(user, planId));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify subscription payment signature and activate pass")
    public ResponseEntity<SubscriptionDtos.UserSubscriptionDto> verifyPayment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SubscriptionDtos.VerifySubscriptionPaymentRequest req
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(subscriptionService.verifySubscriptionPayment(user, req));
    }

    @PostMapping("/webhook")
    @Operation(summary = "Subscription billing gateway webhook")
    public ResponseEntity<String> handleWebhook(@RequestBody SubscriptionDtos.SubscriptionWebhookRequest req) {
        subscriptionService.handleWebhookEvent(req);
        return ResponseEntity.ok("OK");
    }

    @PostMapping("/{subscriptionId}/toggle-autorenew")
    @Operation(summary = "Toggle auto-renewal for active subscription pass")
    public ResponseEntity<SubscriptionDtos.UserSubscriptionDto> toggleAutoRenew(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String subscriptionId
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(subscriptionService.toggleAutoRenew(user, subscriptionId));
    }

    @PostMapping("/{subscriptionId}/cancel")
    @Operation(summary = "Cancel active subscription at period end")
    public ResponseEntity<SubscriptionDtos.UserSubscriptionDto> cancelSubscription(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String subscriptionId
    ) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(subscriptionService.cancelSubscription(user, subscriptionId));
    }
}
