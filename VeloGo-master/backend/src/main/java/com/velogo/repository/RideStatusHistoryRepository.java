package com.velogo.repository;

import com.velogo.domain.RideStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RideStatusHistoryRepository extends JpaRepository<RideStatusHistory, String> {
    List<RideStatusHistory> findByRideIdOrderByCreatedAtAsc(String rideId);
}
