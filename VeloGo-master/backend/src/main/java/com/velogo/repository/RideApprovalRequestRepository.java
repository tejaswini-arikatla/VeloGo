package com.velogo.repository;

import com.velogo.domain.RideApprovalRequest;
import com.velogo.domain.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RideApprovalRequestRepository extends JpaRepository<RideApprovalRequest, String> {

    List<RideApprovalRequest> findByCompanyIdOrderByRequestedAtDesc(String companyId);

    List<RideApprovalRequest> findByCompanyIdAndStatusOrderByRequestedAtDesc(String companyId, ApprovalStatus status);

    List<RideApprovalRequest> findByEmployeeIdOrderByRequestedAtDesc(String employeeId);

    Optional<RideApprovalRequest> findByRideId(String rideId);

    @Query("SELECT COUNT(r) FROM RideApprovalRequest r WHERE r.company.id = :companyId AND r.status = com.velogo.domain.enums.ApprovalStatus.PENDING")
    long countPendingByCompanyId(@Param("companyId") String companyId);
}
