package com.velogo.repository;

import com.velogo.domain.Subtask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubtaskRepository extends JpaRepository<Subtask, String> {
    List<Subtask> findByTaskId(String taskId);
    List<Subtask> findByTaskIdOrderByCreatedAtAsc(String taskId);
}
