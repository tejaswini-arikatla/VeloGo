package com.velogo.repository;

import com.velogo.domain.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, String> {
    Optional<Coupon> findByCodeIgnoreCaseAndActiveTrue(String code);
    Optional<Coupon> findByCodeIgnoreCase(String code);
}
