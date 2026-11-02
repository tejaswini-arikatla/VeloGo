package com.velogo.repository;

import com.velogo.domain.Task;
import com.velogo.domain.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByProjectId(String projectId);
    List<Task> findByProjectIdOrderByCreatedAtDesc(String projectId);
    List<Task> findByProjectIdIn(List<String> projectIds);
    List<Task> findByProjectIdInOrderByCreatedAtDesc(List<String> projectIds);
    Page<Task> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Task> findByAssignedToId(String assignedToId);
    List<Task> findByAssignedToIdOrderByDueDateAsc(String assignedToId);
    List<Task> findByAssignedToIdOrderByCreatedAtDesc(String assignedToId);

    List<Task> findByCreatedById(String createdById);

    long countByStatus(TaskStatus status);
    long countByAssignedToIdAndStatus(String assignedToId, TaskStatus status);
    long countByProjectIdAndStatus(String projectId, TaskStatus status);

    List<Task> findByStatusAndCompletedAtBetween(TaskStatus status, LocalDateTime start, LocalDateTime end);
    List<Task> findByAssignedToIdAndStatusAndCompletedAtBetween(String assignedToId, TaskStatus status, LocalDateTime start, LocalDateTime end);
}
