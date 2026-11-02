package com.velogo.repository;

import com.velogo.domain.TaskActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskActivityRepository extends JpaRepository<TaskActivity, String> {
    List<TaskActivity> findByTaskIdOrderByCreatedAtDesc(String taskId);
}
