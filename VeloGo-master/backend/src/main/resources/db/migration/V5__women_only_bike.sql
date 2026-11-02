-- V5: Women-Only Bike Feature Schema Expansion & Seed Data
-- Compatible with PostgreSQL and H2 (PostgreSQL Mode)

-- 1. Alter users table to add gender
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'UNSPECIFIED';

-- 2. Alter captain_profiles to add Women-Only application and approval fields
ALTER TABLE captain_profiles ADD COLUMN IF NOT EXISTS women_only_eligible BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE captain_profiles ADD COLUMN IF NOT EXISTS women_only_status VARCHAR(20) DEFAULT 'NOT_APPLIED' NOT NULL;
ALTER TABLE captain_profiles ADD COLUMN IF NOT EXISTS women_only_declaration_date TIMESTAMP;
ALTER TABLE captain_profiles ADD COLUMN IF NOT EXISTS women_only_rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_captain_women_only ON captain_profiles(women_only_eligible, women_only_status);

-- 3. Alter rides table to support traveler details and demo self-declaration
ALTER TABLE rides ADD COLUMN IF NOT EXISTS is_for_someone_else BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS traveler_name VARCHAR(100);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS traveler_phone VARCHAR(20);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS traveler_relationship VARCHAR(50);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS traveler_gender VARCHAR(20);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS passenger_declaration_acknowledged BOOLEAN DEFAULT FALSE NOT NULL;

-- 4. Seed Fare Configuration for WOMEN_BIKE category
INSERT INTO fare_configurations (id, category, base_fare, min_fare, per_km_rate, per_min_rate, booking_fee, tax_rate_percent, is_active, updated_at)
VALUES
('fc-004', 'WOMEN_BIKE', 25.00, 35.00, 9.00, 1.50, 5.00, 5.00, TRUE, CURRENT_TIMESTAMP);

-- 5. Update seed customer accounts with gender
UPDATE users SET gender = 'MALE' WHERE id = 'u-cust-001';
UPDATE users SET gender = 'FEMALE' WHERE id = 'u-cust-002';

-- 6. Seed a dedicated approved Women-Only Bike captain for testing
INSERT INTO users (id, email, phone, password_hash, full_name, role, is_active, avatar_url, gender, created_at, updated_at)
VALUES
('u-capt-005', 'captain.anita@velogo.com', '+919876543224', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Anita Roy (Women-Only Captain)', 'ROLE_CAPTAIN', TRUE, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'FEMALE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO captain_profiles (id, user_id, driving_license_number, verification_status, rejection_reason, is_online, is_available, current_latitude, current_longitude, last_location_update, rating_avg, total_rides, total_earnings, women_only_eligible, women_only_status, women_only_declaration_date, created_at, updated_at)
VALUES
('cp-005', 'u-capt-005', 'DL-KA-01-2023005', 'APPROVED', NULL, TRUE, TRUE, 12.9720000, 77.5950000, CURRENT_TIMESTAMP, 4.96, 88, 12400.00, TRUE, 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO vehicles (id, captain_id, category, model, registration_number, color, created_at, updated_at)
VALUES
('v-005', 'cp-005', 'BIKE', 'TVS Jupiter 125', 'KA-01-WO-5678', 'Purple Silver', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO captain_documents (id, captain_id, document_type, document_url, is_verified, uploaded_at)
VALUES
('doc-005', 'cp-005', 'DRIVING_LICENSE', '/documents/license_cp005.pdf', TRUE, CURRENT_TIMESTAMP);
