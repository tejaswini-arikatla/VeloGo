package com.velogo.repository;

import com.velogo.domain.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {
    Optional<Vehicle> findByCaptainId(String captainId);
    boolean existsByRegistrationNumber(String registrationNumber);
}
