-- TaskFlow Schema Expansion
-- Compatible with PostgreSQL and H2 (PostgreSQL Mode)

-- 1. Alter Users to add department and job_title
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);

-- 2. Alter Notifications to add link_url
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link_url VARCHAR(255);

-- 3. Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    leader_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_team_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_teams_leader ON teams(leader_id);

-- 4. Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
    id VARCHAR(36) PRIMARY KEY,
    team_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role_in_team VARCHAR(50) DEFAULT 'MEMBER' NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_team_user UNIQUE (team_id, user_id)
);

CREATE INDEX idx_tm_team ON team_members(team_id);
CREATE INDEX idx_tm_user ON team_members(user_id);

-- 5. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    objectives TEXT,
    status VARCHAR(30) NOT NULL,
    priority VARCHAR(30) NOT NULL,
    start_date TIMESTAMP,
    target_deadline TIMESTAMP,
    owner_id VARCHAR(36) NOT NULL,
    team_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_proj_owner FOREIGN KEY (owner_id) REFERENCES users(id),
    CONSTRAINT fk_proj_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_team ON projects(team_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deadline ON projects(target_deadline);

-- 6. Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role_in_project VARCHAR(50) DEFAULT 'CONTRIBUTOR' NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX idx_pm_project ON project_members(project_id);
CREATE INDEX idx_pm_user ON project_members(user_id);

-- 7. Project Milestones Table
CREATE TABLE IF NOT EXISTS project_milestones (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_milestone_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_milestones_proj ON project_milestones(project_id);

-- 8. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    priority VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    assigned_to VARCHAR(36),
    created_by VARCHAR(36) NOT NULL,
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    estimated_hours NUMERIC(6, 2),
    actual_hours NUMERIC(6, 2),
    blocker_reason TEXT,
    review_notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    CONSTRAINT fk_task_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_task_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- 9. Subtasks Table
CREATE TABLE IF NOT EXISTS subtasks (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    assigned_to VARCHAR(36),
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_subtask_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_subtask_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_subtasks_task ON subtasks(task_id);

-- 10. Task Comments Table
CREATE TABLE IF NOT EXISTS task_comments (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_tc_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_tc_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tc_task ON task_comments(task_id);

-- 11. Task Activities Table
CREATE TABLE IF NOT EXISTS task_activities (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_ta_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_ta_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ta_task ON task_activities(task_id);
