package com.velogo.repository;

import com.velogo.domain.SubscriptionPlan;
import com.velogo.domain.enums.PlanStatus;
import com.velogo.domain.enums.SubscriptionTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, String> {

    List<SubscriptionPlan> findByStatusOrderByPriceAsc(PlanStatus status);

    Optional<SubscriptionPlan> findByTierAndStatus(SubscriptionTier tier, PlanStatus status);
}
