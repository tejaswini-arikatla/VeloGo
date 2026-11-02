package com.velogo.service;

import com.velogo.domain.Notification;
import com.velogo.domain.User;
import com.velogo.domain.enums.NotificationType;
import com.velogo.repository.NotificationRepository;
import com.velogo.repository.UserRepository;
import com.velogo.websocket.RideEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final RideEventPublisher eventPublisher;

    @Transactional
    public Notification sendNotification(String userId, String title, String message, NotificationType type) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("Cannot send notification to non-existent user {}", userId);
            return null;
        }

        Notification notification = Notification.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .read(false)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Broadcast to user websocket topic
        eventPublisher.publishUserNotification(userId, saved);

        return saved;
    }
}
