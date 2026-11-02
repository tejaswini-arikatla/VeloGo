package com.velogo.repository;

import com.velogo.domain.CaptainProfile;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaptainProfileRepository extends JpaRepository<CaptainProfile, String> {
    Optional<CaptainProfile> findByUserId(String userId);
    Optional<CaptainProfile> findByUserEmail(String email);
    Page<CaptainProfile> findByVerificationStatus(VerificationStatus status, Pageable pageable);
    long countByVerificationStatus(VerificationStatus status);
    long countByOnlineTrue();

    @Query("SELECT c FROM CaptainProfile c JOIN FETCH c.vehicle v JOIN FETCH c.user u " +
           "WHERE c.verificationStatus = com.velogo.domain.enums.VerificationStatus.APPROVED " +
           "AND c.online = true AND c.available = true AND v.category = :category")
    List<CaptainProfile> findAvailableCaptainsByCategory(@Param("category") VehicleCategory category);

    @Query("SELECT c FROM CaptainProfile c JOIN FETCH c.vehicle v JOIN FETCH c.user u " +
           "WHERE c.verificationStatus = com.velogo.domain.enums.VerificationStatus.APPROVED " +
           "AND c.online = true AND c.available = true " +
           "AND c.womenOnlyEligible = true " +
           "AND (v.category = com.velogo.domain.enums.VehicleCategory.BIKE OR v.category = com.velogo.domain.enums.VehicleCategory.WOMEN_BIKE)")
    List<CaptainProfile> findAvailableCaptainsForWomenOnly();
}
