package com.velogo.repository;

import com.velogo.domain.Project;
import com.velogo.domain.enums.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByOwnerId(String ownerId);
    List<Project> findByTeamId(String teamId);
    Page<Project> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByStatus(ProjectStatus status);
}
