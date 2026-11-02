-- TaskFlow Seed Data
-- Default password for all users: "password123"
-- BCrypt hash: $2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy

-- 1. Insert TaskFlow Users
INSERT INTO users (id, email, phone, password_hash, full_name, role, is_active, avatar_url, department, job_title, created_at, updated_at)
VALUES
('u-admin-tf', 'admin@taskflow.com', '+14155550100', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Elena Vance', 'ROLE_ADMIN', TRUE, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'Executive Leadership', 'VP of Engineering & Operations', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('u-lead-001', 'sarah.leader@taskflow.com', '+14155550101', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Sarah Jenkins', 'ROLE_TEAM_LEADER', TRUE, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'Engineering', 'Staff Engineering Manager', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('u-lead-002', 'marcus.leader@taskflow.com', '+14155550102', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Marcus Brody', 'ROLE_TEAM_LEADER', TRUE, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Design & UX', 'Principal Product Designer & UX Lead', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('u-emp-001', 'alex.dev@taskflow.com', '+14155550103', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Alex Rivera', 'ROLE_EMPLOYEE', TRUE, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'Engineering', 'Senior Full Stack Engineer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('u-emp-002', 'maria.design@taskflow.com', '+14155550104', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Maria Chen', 'ROLE_EMPLOYEE', TRUE, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Design & UX', 'Senior UI/UX Designer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('u-emp-003', 'david.qa@taskflow.com', '+14155550105', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'David Kim', 'ROLE_EMPLOYEE', TRUE, 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', 'Engineering', 'Lead QA Automation Engineer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('u-emp-004', 'olivia.dev@taskflow.com', '+14155550106', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Olivia Patel', 'ROLE_EMPLOYEE', TRUE, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'Engineering', 'Cloud Infrastructure Engineer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Insert Teams
INSERT INTO teams (id, name, description, leader_id, created_at, updated_at)
VALUES
('team-001', 'Core Platform Engineering', 'Responsible for backend microservices, distributed workflows, high-availability architecture, and cloud deployment pipelines.', 'u-lead-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('team-002', 'Product Design & UX', 'Crafting user experiences, accessible enterprise design systems, design tokens, and user research workflows.', 'u-lead-002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Insert Team Members
INSERT INTO team_members (id, team_id, user_id, role_in_team, joined_at)
VALUES
('tm-001', 'team-001', 'u-emp-001', 'Senior Full Stack Engineer', CURRENT_TIMESTAMP),
('tm-002', 'team-001', 'u-emp-003', 'Lead QA Engineer', CURRENT_TIMESTAMP),
('tm-003', 'team-001', 'u-emp-004', 'Cloud Infrastructure Specialist', CURRENT_TIMESTAMP),
('tm-004', 'team-002', 'u-emp-002', 'Senior UI/UX Designer', CURRENT_TIMESTAMP);

-- 4. Insert Projects
INSERT INTO projects (id, name, description, objectives, status, priority, start_date, target_deadline, owner_id, team_id, created_at, updated_at)
VALUES
('proj-001', 'Cloud Microservices Architecture', 'Decompose monolithic core services into scalable, event-driven Spring Boot microservices deployed on Kubernetes.', '1. Achieve sub-50ms API p99 latency.\n2. Enable horizontal auto-scaling.\n3. Implement distributed tracing.', 'ACTIVE', 'HIGH', CURRENT_TIMESTAMP - INTERVAL '14' DAY, CURRENT_TIMESTAMP + INTERVAL '30' DAY, 'u-lead-001', 'team-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('proj-002', 'Enterprise Design System 2.0', 'Unified cross-platform design token architecture, high-contrast dark/light mode, and accessible component library.', '1. Complete WCAG 2.1 AA compliance.\n2. Ship Figma token bridge.\n3. Publish documented React component library.', 'ACTIVE', 'URGENT', CURRENT_TIMESTAMP - INTERVAL '10' DAY, CURRENT_TIMESTAMP + INTERVAL '18' DAY, 'u-lead-002', 'team-002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('proj-003', 'Automated Security Audit & Compliance', 'SOC2 Type II compliance readiness and OWASP automated pipeline security scans.', '1. Integrate SAST/DAST in CI/CD.\n2. Complete penetration testing remediation.\n3. Secure audit logging for all admin operations.', 'PLANNING', 'MEDIUM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '45' DAY, 'u-lead-001', 'team-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('proj-004', 'Legacy Monolith Database Optimization', 'Indexing overhaul and query optimization for high-throughput reporting tables.', '1. Eliminate slow full-table scans.\n2. Introduce read replicas.\n3. Reduce CPU load by 40%.', 'COMPLETED', 'MEDIUM', CURRENT_TIMESTAMP - INTERVAL '60' DAY, CURRENT_TIMESTAMP - INTERVAL '5' DAY, 'u-lead-001', 'team-001', CURRENT_TIMESTAMP - INTERVAL '60' DAY, CURRENT_TIMESTAMP - INTERVAL '5' DAY);

-- 5. Insert Project Members
INSERT INTO project_members (id, project_id, user_id, role_in_project, joined_at)
VALUES
('pm-001', 'proj-001', 'u-emp-001', 'Core Contributor', CURRENT_TIMESTAMP),
('pm-002', 'proj-001', 'u-emp-003', 'QA Contributor', CURRENT_TIMESTAMP),
('pm-003', 'proj-001', 'u-emp-004', 'Infra Contributor', CURRENT_TIMESTAMP),
('pm-004', 'proj-002', 'u-emp-002', 'Lead Designer', CURRENT_TIMESTAMP),
('pm-005', 'proj-003', 'u-emp-003', 'Security QA', CURRENT_TIMESTAMP),
('pm-006', 'proj-003', 'u-emp-001', 'Backend Contributor', CURRENT_TIMESTAMP);

-- 6. Insert Milestones
INSERT INTO project_milestones (id, project_id, title, description, due_date, is_completed, completed_at, created_at)
VALUES
('ms-001', 'proj-001', 'Architecture & Schema Definition', 'Complete system design diagram and database partitioning strategy.', CURRENT_TIMESTAMP - INTERVAL '7' DAY, TRUE, CURRENT_TIMESTAMP - INTERVAL '6' DAY, CURRENT_TIMESTAMP - INTERVAL '14' DAY),
('ms-002', 'proj-001', 'Event Streaming Cluster Deployment', 'Kafka cluster setup with dead-letter queue topics.', CURRENT_TIMESTAMP + INTERVAL '10' DAY, FALSE, NULL, CURRENT_TIMESTAMP),
('ms-003', 'proj-002', 'Design Tokens & Figma Token Bridge', 'Establish unified spacing, typography, and color tokens.', CURRENT_TIMESTAMP - INTERVAL '3' DAY, TRUE, CURRENT_TIMESTAMP - INTERVAL '2' DAY, CURRENT_TIMESTAMP - INTERVAL '10' DAY),
('ms-004', 'proj-002', 'Component Library v2.0 Candidate Release', 'Deliver button, table, modal, and drawer components.', CURRENT_TIMESTAMP + INTERVAL '12' DAY, FALSE, NULL, CURRENT_TIMESTAMP);

-- 7. Insert Tasks
INSERT INTO tasks (id, project_id, title, description, acceptance_criteria, priority, status, assigned_to, created_by, start_date, due_date, estimated_hours, actual_hours, blocker_reason, review_notes, created_at, updated_at, completed_at)
VALUES
('task-001', 'proj-001', 'Design Event-Driven Kafka Consumer Cluster', 'Set up idempotent Spring Kafka consumers with transactional outbox pattern to guarantee exactly-once delivery.', '1. Handles consumer group rebalance gracefully.\n2. Dead-letter queue for deserialization errors.\n3. End-to-end integration test passes.', 'HIGH', 'IN_PROGRESS', 'u-emp-001', 'u-lead-001', CURRENT_TIMESTAMP - INTERVAL '3' DAY, CURRENT_TIMESTAMP + INTERVAL '2' DAY, 16.00, 8.50, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '4' DAY, CURRENT_TIMESTAMP, NULL),

('task-002', 'proj-001', 'Implement JWT Refresh Token Rotation with Redis Revocation', 'Secure session revocation mechanism that blacklists stale refresh tokens and supports fast token exchange.', '1. Rotation invalidates old token upon generation.\n2. Revoked token reuse triggers safety lockout.\n3. Response time under 15ms.', 'URGENT', 'IN_REVIEW', 'u-emp-004', 'u-lead-001', CURRENT_TIMESTAMP - INTERVAL '4' DAY, CURRENT_TIMESTAMP + INTERVAL '1' DAY, 12.00, 11.00, NULL, 'Submitted code with test suite. 98% coverage on token provider and filter chain.', CURRENT_TIMESTAMP - INTERVAL '5' DAY, CURRENT_TIMESTAMP, NULL),

('task-003', 'proj-001', 'Automated Load Testing with Gatling for 20k RPS', 'Simulate heavy concurrent load on order processing and reporting endpoints.', '1. Load profile reaches 20,000 sustained RPS.\n2. Error rate below 0.05%.\n3. Automated HTML performance report generated.', 'HIGH', 'BLOCKED', 'u-emp-003', 'u-lead-001', CURRENT_TIMESTAMP - INTERVAL '2' DAY, CURRENT_TIMESTAMP + INTERVAL '4' DAY, 20.00, 6.00, 'Staging environment VPN gateway timing out under sustained simulated load; awaiting DevOps network rule expansion.', NULL, CURRENT_TIMESTAMP - INTERVAL '3' DAY, CURRENT_TIMESTAMP, NULL),

('task-004', 'proj-001', 'Migrate Legacy User Profile Endpoints to Spring Data JPA', 'Refactor raw queries into clean repository interfaces with pagination and query projection.', '1. Zero regressions in customer/captain fetch.\n2. Execution time reduced by at least 25%.\n3. Unit tests cover all sorting combinations.', 'MEDIUM', 'COMPLETED', 'u-emp-001', 'u-lead-001', CURRENT_TIMESTAMP - INTERVAL '10' DAY, CURRENT_TIMESTAMP - INTERVAL '3' DAY, 8.00, 7.50, NULL, 'Verified and approved by Sarah Jenkins. Clean migration.', CURRENT_TIMESTAMP - INTERVAL '11' DAY, CURRENT_TIMESTAMP - INTERVAL '3' DAY, CURRENT_TIMESTAMP - INTERVAL '3' DAY),

('task-005', 'proj-002', 'Accessibility (a11y) Contrast Audit across Design Tokens', 'Audit all light and dark theme foreground/background pairings to guarantee WCAG 2.1 AA compliance.', '1. Color contrast ratio >= 4.5:1 for normal text.\n2. Contrast ratio >= 3:1 for large text.\n3. Zero color-blindness ambiguities in error badges.', 'HIGH', 'IN_PROGRESS', 'u-emp-002', 'u-lead-002', CURRENT_TIMESTAMP - INTERVAL '2' DAY, CURRENT_TIMESTAMP + INTERVAL '3' DAY, 10.00, 5.00, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '3' DAY, CURRENT_TIMESTAMP, NULL),

('task-006', 'proj-002', 'Dark Theme Color Matrix & Typography Scale', 'Build responsive scale and HSL color variables with high-contrast accents.', '1. 8-point baseline grid alignment.\n2. Modular typographic hierarchy.\n3. Tailwind CSS custom config integration.', 'MEDIUM', 'COMPLETED', 'u-emp-002', 'u-lead-002', CURRENT_TIMESTAMP - INTERVAL '8' DAY, CURRENT_TIMESTAMP - INTERVAL '2' DAY, 14.00, 13.00, NULL, 'Excellent work! Colors feel sleek and modern.', CURRENT_TIMESTAMP - INTERVAL '9' DAY, CURRENT_TIMESTAMP - INTERVAL '2' DAY, CURRENT_TIMESTAMP - INTERVAL '2' DAY),

('task-007', 'proj-003', 'OWASP Top 10 Static Code Analysis Pipeline Setup', 'Integrate SonarQube / Semgrep analysis directly into GitHub Actions workflow.', '1. Automatic PR blocking on critical vulnerabilities.\n2. Secrets scanning enabled.\n3. License compliance scanner active.', 'HIGH', 'TODO', 'u-emp-003', 'u-lead-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7' DAY, 15.00, 0.00, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),

('task-008', 'proj-001', 'Containerize Microservices with Multi-Stage Dockerfile', 'Produce hardened distroless Docker images under 150MB with non-root security context.', '1. Multi-stage build separates build and runtime.\n2. Non-root user with UID 10001.\n3. Docker image vulnerability scan passes clean.', 'MEDIUM', 'COMPLETED', 'u-emp-004', 'u-lead-001', CURRENT_TIMESTAMP - INTERVAL '12' DAY, CURRENT_TIMESTAMP - INTERVAL '7' DAY, 6.00, 5.50, NULL, 'Approved. Image size dropped from 480MB to 118MB.', CURRENT_TIMESTAMP - INTERVAL '13' DAY, CURRENT_TIMESTAMP - INTERVAL '7' DAY, CURRENT_TIMESTAMP - INTERVAL '7' DAY);

-- 8. Insert Subtasks
INSERT INTO subtasks (id, task_id, title, is_completed, assigned_to, created_at)
VALUES
('sub-001', 'task-001', 'Define Avro schemas for order lifecycle events', TRUE, 'u-emp-001', CURRENT_TIMESTAMP),
('sub-002', 'task-001', 'Configure Kafka consumer concurrency and batch listener', TRUE, 'u-emp-001', CURRENT_TIMESTAMP),
('sub-003', 'task-001', 'Implement retry backoff with ExponentialRandomBackOff', FALSE, 'u-emp-001', CURRENT_TIMESTAMP),
('sub-004', 'task-002', 'Create Redis token blacklist key structure with TTL', TRUE, 'u-emp-004', CURRENT_TIMESTAMP),
('sub-005', 'task-002', 'Write unit tests for replay attack detection', TRUE, 'u-emp-004', CURRENT_TIMESTAMP),
('sub-006', 'task-003', 'Configure test injectors on AWS ECS cluster', FALSE, 'u-emp-003', CURRENT_TIMESTAMP),
('sub-007', 'task-005', 'Generate automated contrast matrix in Figma', TRUE, 'u-emp-002', CURRENT_TIMESTAMP),
('sub-008', 'task-005', 'Update semantic CSS utility classes for warning states', FALSE, 'u-emp-002', CURRENT_TIMESTAMP);

-- 9. Insert Task Comments
INSERT INTO task_comments (id, task_id, author_id, content, created_at)
VALUES
('tc-001', 'task-001', 'u-lead-001', 'Alex, please ensure consumer offset commits are made only after the transactional outbox confirms persistence.', CURRENT_TIMESTAMP - INTERVAL '2' DAY),
('tc-002', 'task-001', 'u-emp-001', 'Understood! I added a transactional listener that only ACKs the Kafka record once the DB commit succeeds.', CURRENT_TIMESTAMP - INTERVAL '1' DAY),
('tc-003', 'task-002', 'u-emp-004', 'Review request: submitted PR with Redis TTL synchronized to access token lifetime.', CURRENT_TIMESTAMP - INTERVAL '6' HOUR),
('tc-004', 'task-003', 'u-emp-003', 'Flagging blocker: The VPC security group for staging load testing is dropping TCP packets above 5000 concurrent sockets.', CURRENT_TIMESTAMP - INTERVAL '1' DAY),
('tc-005', 'task-003', 'u-lead-001', 'Escalated to DevOps infra on-call. Will have the quota increased by 2 PM.', CURRENT_TIMESTAMP - INTERVAL '18' HOUR);

-- 10. Insert Task Activities
INSERT INTO task_activities (id, task_id, actor_id, action, details, created_at)
VALUES
('ta-001', 'task-001', 'u-lead-001', 'TASK_CREATED', 'Created task and assigned to Alex Rivera', CURRENT_TIMESTAMP - INTERVAL '4' DAY),
('ta-002', 'task-001', 'u-emp-001', 'STATUS_CHANGE', 'Status changed from TODO to IN_PROGRESS', CURRENT_TIMESTAMP - INTERVAL '3' DAY),
('ta-003', 'task-002', 'u-emp-004', 'SUBMITTED_FOR_REVIEW', 'Submitted deliverable for team leader review', CURRENT_TIMESTAMP - INTERVAL '6' HOUR),
('ta-004', 'task-003', 'u-emp-003', 'BLOCKER_REPORTED', 'Marked task as BLOCKED: Staging VPN gateway timeout', CURRENT_TIMESTAMP - INTERVAL '1' DAY),
('ta-005', 'task-004', 'u-lead-001', 'TASK_APPROVED', 'Approved deliverable and marked task as COMPLETED', CURRENT_TIMESTAMP - INTERVAL '3' DAY);

-- 11. Insert TaskFlow Notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
VALUES
('nt-tf-001', 'u-lead-001', 'Task Submitted for Review', 'Olivia Patel submitted "Implement JWT Refresh Token Rotation" for review.', 'SECURITY', FALSE, '/leader', CURRENT_TIMESTAMP - INTERVAL '6' HOUR),
('nt-tf-002', 'u-lead-001', 'Blocker Reported by David Kim', 'Task "Automated Load Testing with Gatling" is BLOCKED.', 'SECURITY', FALSE, '/leader', CURRENT_TIMESTAMP - INTERVAL '1' DAY),
('nt-tf-003', 'u-emp-001', 'New Task Assigned', 'Sarah Jenkins assigned "Design Event-Driven Kafka Consumer Cluster" to you.', 'RIDE_UPDATE', FALSE, '/employee', CURRENT_TIMESTAMP - INTERVAL '4' DAY),
('nt-tf-004', 'u-emp-002', 'Sprint Milestone Achieved', 'Milestone "Design Tokens & Figma Token Bridge" marked completed.', 'PROMO', TRUE, '/employee', CURRENT_TIMESTAMP - INTERVAL '2' DAY);

-- 12. Insert TaskFlow Admin Audit Logs
INSERT INTO admin_audit_logs (id, admin_id, action, target_entity, target_id, details, created_at)
VALUES
('al-tf-001', 'u-admin-tf', 'CREATE_TEAM', 'Team', 'team-001', 'Created team "Core Platform Engineering" and assigned Sarah Jenkins as Team Leader.', CURRENT_TIMESTAMP - INTERVAL '15' DAY),
('al-tf-002', 'u-admin-tf', 'CREATE_TEAM', 'Team', 'team-002', 'Created team "Product Design & UX" and assigned Marcus Brody as Team Leader.', CURRENT_TIMESTAMP - INTERVAL '15' DAY),
('al-tf-003', 'u-admin-tf', 'ASSIGN_MEMBERS', 'TeamMember', 'tm-001', 'Assigned Alex Rivera, David Kim, and Olivia Patel to Core Platform Engineering.', CURRENT_TIMESTAMP - INTERVAL '14' DAY),
('al-tf-004', 'u-admin-tf', 'ROLE_VERIFIED', 'User', 'u-lead-001', 'Elevated Sarah Jenkins account permissions to ROLE_TEAM_LEADER.', CURRENT_TIMESTAMP - INTERVAL '14' DAY);
