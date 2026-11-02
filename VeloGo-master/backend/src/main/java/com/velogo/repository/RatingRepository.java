package com.velogo.repository;

import com.velogo.domain.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, String> {
    Optional<Rating> findByRideIdAndFromUserId(String rideId, String fromUserId);
    List<Rating> findByToUserIdOrderByCreatedAtDesc(String toUserId);
}
