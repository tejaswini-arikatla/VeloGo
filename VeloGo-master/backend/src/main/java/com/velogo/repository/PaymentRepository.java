package com.velogo.repository;

import com.velogo.domain.Payment;
import com.velogo.domain.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {
    Optional<Payment> findByRideId(String rideId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
    Page<Payment> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);
    Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = com.velogo.domain.enums.PaymentStatus.SUCCESS")
    BigDecimal calculateTotalCollectedPayments();
}
