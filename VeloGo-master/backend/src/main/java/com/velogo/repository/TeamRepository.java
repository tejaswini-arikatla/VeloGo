package com.velogo.repository;

import com.velogo.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRepository extends JpaRepository<Team, String> {
    List<Team> findByLeaderId(String leaderId);
    Optional<Team> findByName(String name);
    boolean existsByName(String name);
}
