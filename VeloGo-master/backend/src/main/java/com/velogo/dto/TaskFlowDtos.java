package com.velogo.dto;

import com.velogo.domain.enums.Priority;
import com.velogo.domain.enums.ProjectStatus;
import com.velogo.domain.enums.Role;
import com.velogo.domain.enums.TaskStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class TaskFlowDtos {

    // ==========================================
    // User DTOs
    // ==========================================
    public record UserSummaryDto(
            String id,
            String email,
            String phone,
            String fullName,
            Role role,
            boolean active,
            String avatarUrl,
            String department,
            String jobTitle
    ) {}

    public record CreateUserRequest(
            @NotBlank @Email String email,
            @NotBlank String phone,
            @NotBlank String password,
            @NotBlank String fullName,
            @NotNull Role role,
            String department,
            String jobTitle
    ) {}

    public record UpdateUserRequest(
            @NotBlank String fullName,
            String phone,
            String department,
            String jobTitle,
            Role role
    ) {}

    public record UpdateUserStatusRequest(
            boolean active,
            String reason
    ) {}

    // ==========================================
    // Team DTOs
    // ==========================================
    public record TeamDto(
            String id,
            String name,
            String description,
            UserSummaryDto leader,
            int memberCount,
            int projectCount,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    public record CreateTeamRequest(
            @NotBlank String name,
            String description,
            String leaderId
    ) {}

    public record UpdateTeamRequest(
            @NotBlank String name,
            String description,
            String leaderId
    ) {}

    public record TeamMemberDto(
            String id,
            String teamId,
            UserSummaryDto user,
            String roleInTeam,
            LocalDateTime joinedAt
    ) {}

    public record AddTeamMemberRequest(
            @NotBlank String userId,
            String roleInTeam
    ) {}

    // ==========================================
    // Project DTOs
    // ==========================================
    public record ProjectDto(
            String id,
            String name,
            String description,
            String objectives,
            ProjectStatus status,
            Priority priority,
            LocalDateTime startDate,
            LocalDateTime targetDeadline,
            UserSummaryDto owner,
            TeamDto team,
            int memberCount,
            int taskCount,
            int completedTaskCount,
            double progressPercentage,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    public record CreateProjectRequest(
            @NotBlank String name,
            String description,
            String objectives,
            @NotNull Priority priority,
            @NotNull ProjectStatus status,
            LocalDateTime startDate,
            LocalDateTime targetDeadline,
            String teamId,
            List<String> memberUserIds
    ) {}

    public record UpdateProjectRequest(
            @NotBlank String name,
            String description,
            String objectives,
            @NotNull Priority priority,
            @NotNull ProjectStatus status,
            LocalDateTime startDate,
            LocalDateTime targetDeadline,
            String ownerId,
            String teamId
    ) {}

    public record ProjectMilestoneDto(
            String id,
            String projectId,
            String title,
            String description,
            LocalDateTime dueDate,
            boolean completed,
            LocalDateTime completedAt,
            LocalDateTime createdAt
    ) {}

    public record CreateMilestoneRequest(
            @NotBlank String title,
            String description,
            LocalDateTime dueDate
    ) {}

    // ==========================================
    // Task DTOs
    // ==========================================
    public record TaskDto(
            String id,
            String projectId,
            String projectName,
            String title,
            String description,
            String acceptanceCriteria,
            Priority priority,
            TaskStatus status,
            UserSummaryDto assignedTo,
            UserSummaryDto createdBy,
            LocalDateTime startDate,
            LocalDateTime dueDate,
            BigDecimal estimatedHours,
            BigDecimal actualHours,
            String blockerReason,
            String reviewNotes,
            int subtaskCount,
            int completedSubtaskCount,
            int commentCount,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            LocalDateTime completedAt
    ) {}

    public record CreateTaskRequest(
            @NotBlank String title,
            String description,
            String acceptanceCriteria,
            @NotNull Priority priority,
            @NotNull TaskStatus status,
            String assignedToId,
            LocalDateTime startDate,
            LocalDateTime dueDate,
            BigDecimal estimatedHours
    ) {}

    public record UpdateTaskRequest(
            @NotBlank String title,
            String description,
            String acceptanceCriteria,
            @NotNull Priority priority,
            @NotNull TaskStatus status,
            String assignedToId,
            LocalDateTime startDate,
            LocalDateTime dueDate,
            BigDecimal estimatedHours,
            BigDecimal actualHours,
            String blockerReason,
            String reviewNotes
    ) {}

    public record UpdateTaskStatusRequest(
            @NotNull TaskStatus status,
            String notes
    ) {}

    public record SubmitReviewRequest(
            String reviewNotes,
            BigDecimal actualHours
    ) {}

    public record ReviewTaskActionRequest(
            boolean approve,
            String feedback
    ) {}

    public record ReportBlockerRequest(
            @NotBlank String blockerReason
    ) {}

    public record AssignTaskRequest(
            String assignedToId
    ) {}

    // ==========================================
    // Subtask DTOs
    // ==========================================
    public record SubtaskDto(
            String id,
            String taskId,
            String title,
            boolean completed,
            UserSummaryDto assignedTo,
            LocalDateTime createdAt
    ) {}

    public record CreateSubtaskRequest(
            @NotBlank String title,
            String assignedToId
    ) {}

    public record UpdateSubtaskRequest(
            @NotBlank String title,
            boolean completed,
            String assignedToId
    ) {}

    // ==========================================
    // Comments & Activities DTOs
    // ==========================================
    public record TaskCommentDto(
            String id,
            String taskId,
            UserSummaryDto author,
            String content,
            LocalDateTime createdAt
    ) {}

    public record CreateCommentRequest(
            @NotBlank String content
    ) {}

    public record TaskActivityDto(
            String id,
            String taskId,
            UserSummaryDto actor,
            String action,
            String details,
            LocalDateTime createdAt
    ) {}

    // ==========================================
    // Analytics & Dashboard DTOs
    // ==========================================
    public record WeeklyTrendPoint(
            String weekLabel,
            int completedTasks,
            int createdTasks,
            BigDecimal effortHours
    ) {}

    public record EmployeeWorkloadDto(
            String userId,
            String fullName,
            String avatarUrl,
            String jobTitle,
            int assignedTasks,
            int inProgressTasks,
            int overdueTasks,
            BigDecimal totalEstimatedHours,
            BigDecimal totalActualHours,
            int completedTasks
    ) {}

    public record ProjectWorkload(
            String projectId,
            String projectName,
            int taskCount
    ) {}

    public record AdminDashboardDto(
            long totalUsers,
            long activeTeamLeaders,
            long activeEmployees,
            long totalProjects,
            long activeProjects,
            long completedProjects,
            long totalTasks,
            long pendingTasks,
            long overdueTasks,
            double overallCompletionRate,
            List<WeeklyTrendPoint> weeklyTrends,
            Map<String, Long> projectStatusDistribution,
            Map<String, Long> priorityDistribution,
            List<TaskFlowDtos.AuditLogDto> recentAuditLogs
    ) {}

    public record AuditLogDto(
            String id,
            UserSummaryDto admin,
            String action,
            String targetEntity,
            String targetId,
            String details,
            LocalDateTime createdAt
    ) {}

    public record LeaderDashboardDto(
            int managedProjectsCount,
            int activeProjectsCount,
            int tasksAssignedCount,
            int tasksCompletedThisWeek,
            int pendingTasksCount,
            int overdueTasksCount,
            int blockedTasksCount,
            double teamCompletionRate,
            int currentVelocityTasks,
            BigDecimal currentVelocityHours,
            List<ProjectDto> projects,
            List<TeamMemberDto> teamMembers,
            List<EmployeeWorkloadDto> workloadSummary,
            List<WeeklyTrendPoint> velocityHistory,
            List<TaskDto> upcomingDeadlines
    ) {}

    public record EmployeeDashboardDto(
            int myAssignedTasksCount,
            int dueTodayCount,
            int dueThisWeekCount,
            int overdueCount,
            int inProgressCount,
            int awaitingReviewCount,
            int completedCount,
            double myCompletionRate,
            List<TaskDto> tasks,
            List<WeeklyTrendPoint> personalTrends,
            List<ProjectWorkload> workloadByProject,
            List<TaskActivityDto> recentActivities
    ) {}

    public record NotificationDto(
            String id,
            String title,
            String message,
            String type,
            boolean isRead,
            String linkUrl,
            LocalDateTime createdAt
    ) {}
}
