package com.velogo.repository;

import com.velogo.domain.ProjectMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectMilestoneRepository extends JpaRepository<ProjectMilestone, String> {
    List<ProjectMilestone> findByProjectIdOrderByDueDateAsc(String projectId);
}
