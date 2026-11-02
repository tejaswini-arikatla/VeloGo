-- V6: Corporate Accounts, B2B Billing, and Subscription Plans Schema Expansion & Seed Data
-- Compatible with PostgreSQL and H2 (PostgreSQL Mode)

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    tax_id VARCHAR(50) NOT NULL,
    billing_address TEXT NOT NULL,
    domain VARCHAR(100),
    contact_email VARCHAR(150) NOT NULL,
    credit_limit NUMERIC(12, 2) DEFAULT 50000.00 NOT NULL,
    used_credit NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    approval_threshold NUMERIC(10, 2) DEFAULT 500.00 NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- 2. Create company_members table
CREATE TABLE IF NOT EXISTS company_members (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) DEFAULT 'EMPLOYEE' NOT NULL,
    monthly_budget NUMERIC(10, 2) DEFAULT 5000.00 NOT NULL,
    current_month_spent NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_member_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_company_member_user UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_member_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_comp_member_role ON company_members(company_id, role);

-- 3. Create corporate_invoices table
CREATE TABLE IF NOT EXISTS corporate_invoices (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    billing_period_start TIMESTAMP NOT NULL,
    billing_period_end TIMESTAMP NOT NULL,
    subtotal_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    rides_count INT DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'ISSUED' NOT NULL,
    invoice_url VARCHAR(255),
    due_date TIMESTAMP NOT NULL,
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_invoice_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoice_company_status ON corporate_invoices(company_id, status);

-- 4. Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    tier VARCHAR(20) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    plan_interval VARCHAR(20) DEFAULT 'MONTHLY' NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    max_discount_per_ride NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    free_rides_count INT DEFAULT 0 NOT NULL,
    priority_matching BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- 5. Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE NOT NULL,
    payment_method_id VARCHAR(50),
    remaining_free_rides INT DEFAULT 0 NOT NULL,
    total_discount_saved NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total_rides_taken INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_user_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_sub_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_user_sub_user_status ON user_subscriptions(user_id, status);

-- 6. Alter rides table to support Corporate accounts & Subscriptions
ALTER TABLE rides ADD COLUMN IF NOT EXISTS billing_profile VARCHAR(20) DEFAULT 'PERSONAL' NOT NULL;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS company_id VARCHAR(36);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS corporate_approval_status VARCHAR(20) DEFAULT 'NOT_REQUIRED' NOT NULL;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(36);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS subscription_discount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS is_subscription_free_ride BOOLEAN DEFAULT FALSE NOT NULL;

-- 7. Create ride_approval_requests table (after rides is updated)
CREATE TABLE IF NOT EXISTS ride_approval_requests (
    id VARCHAR(36) PRIMARY KEY,
    ride_id VARCHAR(36),
    company_id VARCHAR(36) NOT NULL,
    employee_id VARCHAR(36) NOT NULL,
    approver_id VARCHAR(36),
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    estimated_fare NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    rejection_reason TEXT,
    requested_at TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP,
    CONSTRAINT fk_approval_ride FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_comp_status ON ride_approval_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_employee ON ride_approval_requests(employee_id);

-- 8. Create subscription_usages table
CREATE TABLE IF NOT EXISTS subscription_usages (
    id VARCHAR(36) PRIMARY KEY,
    user_subscription_id VARCHAR(36) NOT NULL,
    ride_id VARCHAR(36),
    discount_applied NUMERIC(10, 2) NOT NULL,
    was_free_ride BOOLEAN DEFAULT FALSE NOT NULL,
    used_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_sub_usage_sub FOREIGN KEY (user_subscription_id) REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_usage_ride FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_usage_sub ON subscription_usages(user_subscription_id);

-- 9. Seed Corporate Account Demo Data
INSERT INTO users (id, email, phone, password_hash, full_name, role, is_active, avatar_url, gender, created_at, updated_at)
VALUES
('u-corp-001', 'corpadmin@acme.corp', '+919876543290', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Neha Gupta (Acme Corp Admin)', 'ROLE_CUSTOMER', TRUE, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'FEMALE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO companies (id, name, tax_id, billing_address, domain, contact_email, credit_limit, used_credit, status, approval_threshold, created_at, updated_at)
VALUES
('comp-001', 'Acme Technologies India Pvt Ltd', '29AABCA1234F1Z8', 'Prestige Tech Park, Outer Ring Road, Marathahalli, Bengaluru, Karnataka 560103', 'acme.corp', 'corpadmin@acme.corp', 150000.00, 4350.00, 'ACTIVE', 400.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO company_members (id, company_id, user_id, role, monthly_budget, current_month_spent, status, created_at, updated_at)
VALUES
('cm-001', 'comp-001', 'u-corp-001', 'ADMIN', 30000.00, 0.00, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cm-002', 'comp-001', 'u-cust-002', 'MANAGER', 15000.00, 3100.00, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cm-003', 'comp-001', 'u-cust-001', 'EMPLOYEE', 5000.00, 1250.00, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO corporate_invoices (id, company_id, invoice_number, billing_period_start, billing_period_end, subtotal_amount, tax_amount, total_amount, rides_count, status, invoice_url, due_date, paid_at, created_at, updated_at)
VALUES
('inv-001', 'comp-001', 'INV-VELO-2026-09-001', CURRENT_TIMESTAMP - INTERVAL '30' DAY, CURRENT_TIMESTAMP - INTERVAL '1' DAY, 3900.00, 195.00, 4095.00, 18, 'PAID', '/invoices/inv-velo-2026-09-001.pdf', CURRENT_TIMESTAMP - INTERVAL '15' DAY, CURRENT_TIMESTAMP - INTERVAL '16' DAY, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 10. Seed Subscription Plans & User Subscription
INSERT INTO subscription_plans (id, name, description, tier, price, plan_interval, discount_percentage, max_discount_per_ride, free_rides_count, priority_matching, status, created_at, updated_at)
VALUES
('plan-001', 'VeloGo Commuter Pass', 'Ideal for daily city commuters. 20% discount on every ride plus 5 completely free rides each month.', 'COMMUTER', 299.00, 'MONTHLY', 20.00, 50.00, 5, FALSE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan-002', 'VeloGo Pro Rider', 'For high-frequency professionals. 35% discount per trip, 15 free rides, and priority captain dispatch.', 'PRO', 699.00, 'MONTHLY', 35.00, 100.00, 15, TRUE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan-003', 'VeloGo VIP Elite Annual', 'The ultimate enterprise-class mobility pass. 40% discount, 50 free rides, and 24/7 dedicated concierge assistance.', 'VIP', 4999.00, 'ANNUAL', 40.00, 150.00, 50, TRUE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed an active subscription for Priya Kapoor (u-cust-002)
INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, auto_renew, payment_method_id, remaining_free_rides, total_discount_saved, total_rides_taken, created_at, updated_at)
VALUES
('usub-001', 'u-cust-002', 'plan-001', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '5' DAY, CURRENT_TIMESTAMP + INTERVAL '25' DAY, TRUE, 'pm_card_demo_4242', 4, 185.00, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

