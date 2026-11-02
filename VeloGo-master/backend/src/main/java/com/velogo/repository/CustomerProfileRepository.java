package com.velogo.repository;

import com.velogo.domain.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, String> {
    Optional<CustomerProfile> findByUserId(String userId);
    Optional<CustomerProfile> findByUserEmail(String email);
}
