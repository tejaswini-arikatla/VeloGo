package com.velogo.repository;

import com.velogo.domain.SubscriptionUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubscriptionUsageRepository extends JpaRepository<SubscriptionUsage, String> {

    List<SubscriptionUsage> findByUserSubscriptionIdOrderByUsedAtDesc(String userSubscriptionId);

    long countByUserSubscriptionId(String userSubscriptionId);
}
