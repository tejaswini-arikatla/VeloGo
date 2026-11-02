package com.velogo.repository;

import com.velogo.domain.Ride;
import com.velogo.domain.enums.RideStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface RideRepository extends JpaRepository<Ride, String> {

    Page<Ride> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);
    List<Ride> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    Page<Ride> findByCaptainIdOrderByCreatedAtDesc(String captainId, Pageable pageable);
    List<Ride> findByCaptainIdOrderByCreatedAtDesc(String captainId);

    Page<Ride> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(RideStatus status);

    @Query("SELECT r FROM Ride r WHERE r.customer.id = :customerId " +
           "AND r.status IN (com.velogo.domain.enums.RideStatus.REQUESTED, " +
           "com.velogo.domain.enums.RideStatus.SEARCHING, " +
           "com.velogo.domain.enums.RideStatus.ACCEPTED, " +
           "com.velogo.domain.enums.RideStatus.ARRIVING, " +
           "com.velogo.domain.enums.RideStatus.ARRIVED, " +
           "com.velogo.domain.enums.RideStatus.IN_PROGRESS) " +
           "ORDER BY r.createdAt DESC")
    List<Ride> findActiveRidesForCustomer(@Param("customerId") String customerId);

    @Query("SELECT r FROM Ride r WHERE r.captain.id = :captainId " +
           "AND r.status IN (com.velogo.domain.enums.RideStatus.ACCEPTED, " +
           "com.velogo.domain.enums.RideStatus.ARRIVING, " +
           "com.velogo.domain.enums.RideStatus.ARRIVED, " +
           "com.velogo.domain.enums.RideStatus.IN_PROGRESS) " +
           "ORDER BY r.createdAt DESC")
    List<Ride> findActiveRidesForCaptain(@Param("captainId") String captainId);

    @Query("SELECT COALESCE(SUM(r.finalFare), 0) FROM Ride r WHERE r.status = com.velogo.domain.enums.RideStatus.COMPLETED")
    BigDecimal calculateTotalGrossBookingValue();

    List<Ride> findByCompanyIdAndStatusAndCompletedAtBetween(String companyId, RideStatus status, java.time.LocalDateTime start, java.time.LocalDateTime end);

    List<Ride> findByCompanyIdOrderByCreatedAtDesc(String companyId);

    long countByCompanyId(String companyId);
}
