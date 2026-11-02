package com.velogo.repository;

import com.velogo.domain.UserSubscription;
import com.velogo.domain.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, String> {

    List<UserSubscription> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<UserSubscription> findFirstByUserIdAndStatusOrderByCreatedAtDesc(String userId, SubscriptionStatus status);

    default Optional<UserSubscription> findByUserIdAndStatus(String userId, SubscriptionStatus status) {
        return findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, status);
    }

    @Query("SELECT us FROM UserSubscription us WHERE us.user.id = :userId AND us.status = com.velogo.domain.enums.SubscriptionStatus.ACTIVE AND us.currentPeriodEnd >= CURRENT_TIMESTAMP ORDER BY us.createdAt DESC")
    List<UserSubscription> findActiveSubscriptionsByUserId(@Param("userId") String userId);

    @Query("SELECT us FROM UserSubscription us WHERE us.status = com.velogo.domain.enums.SubscriptionStatus.ACTIVE AND us.currentPeriodEnd BETWEEN :now AND :soon")
    List<UserSubscription> findExpiringSubscriptions(@Param("now") LocalDateTime now, @Param("soon") LocalDateTime soon);

    @Query("SELECT us FROM UserSubscription us WHERE us.status = com.velogo.domain.enums.SubscriptionStatus.ACTIVE AND us.currentPeriodEnd < :now")
    List<UserSubscription> findExpiredSubscriptions(@Param("now") LocalDateTime now);
}
