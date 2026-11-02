package com.velogo.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishRideUpdate(String rideId, Object event) {
        log.debug("Broadcasting ride update to /topic/ride/{}", rideId);
        messagingTemplate.convertAndSend("/topic/ride/" + rideId, event);
    }

    public void publishCaptainLocation(String rideId, Object locationPayload) {
        messagingTemplate.convertAndSend("/topic/ride/" + rideId + "/location", locationPayload);
    }

    public void publishCaptainDispatch(String captainId, Object dispatchPayload) {
        log.debug("Dispatching ride offer to /topic/captain/{}/dispatch", captainId);
        messagingTemplate.convertAndSend("/topic/captain/" + captainId + "/dispatch", dispatchPayload);
    }

    public void publishUserNotification(String userId, Object notificationPayload) {
        messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", notificationPayload);
    }
}
