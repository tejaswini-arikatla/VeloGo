package com.velogo.repository;

import com.velogo.domain.FareConfiguration;
import com.velogo.domain.enums.VehicleCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FareConfigurationRepository extends JpaRepository<FareConfiguration, String> {
    Optional<FareConfiguration> findByCategory(VehicleCategory category);
    List<FareConfiguration> findAllByActiveTrue();
}
