package com.velogo.repository;

import com.velogo.domain.FeatureData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FeatureDataRepository extends JpaRepository<FeatureData, String> {

    List<FeatureData> findAllByUserIdOrderByUpdatedAtDesc(String userId);

    List<FeatureData> findAllByUserIdAndFeatureKeyOrderByUpdatedAtDesc(String userId, String featureKey);

    Optional<FeatureData> findByIdAndUserId(String id, String userId);

    boolean existsByUserIdAndFeatureKeyAndTitleIgnoreCase(String userId, String featureKey, String title);
}
