-- VeloGo Database Initial Schema
-- Compatible with PostgreSQL and H2 (PostgreSQL Mode)

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS customer_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    rating_avg NUMERIC(3,2) DEFAULT 5.00 NOT NULL,
    total_rides INT DEFAULT 0 NOT NULL,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS captain_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    driving_license_number VARCHAR(50) NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    rejection_reason TEXT,
    is_online BOOLEAN DEFAULT FALSE NOT NULL,
    is_available BOOLEAN DEFAULT FALSE NOT NULL,
    current_latitude NUMERIC(10, 7),
    current_longitude NUMERIC(10, 7),
    last_location_update TIMESTAMP,
    rating_avg NUMERIC(3,2) DEFAULT 5.00 NOT NULL,
    total_rides INT DEFAULT 0 NOT NULL,
    total_earnings NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_captain_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_captain_status ON captain_profiles(verification_status, is_online, is_available);
CREATE INDEX idx_captain_location ON captain_profiles(current_latitude, current_longitude);

CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(36) PRIMARY KEY,
    captain_id VARCHAR(36) NOT NULL UNIQUE,
    category VARCHAR(20) NOT NULL,
    model VARCHAR(100) NOT NULL,
    registration_number VARCHAR(30) NOT NULL UNIQUE,
    color VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_vehicle_captain FOREIGN KEY (captain_id) REFERENCES captain_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_vehicle_category ON vehicles(category);

CREATE TABLE IF NOT EXISTS captain_documents (
    id VARCHAR(36) PRIMARY KEY,
    captain_id VARCHAR(36) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_url VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    uploaded_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_doc_captain FOREIGN KEY (captain_id) REFERENCES captain_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_areas (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    center_latitude NUMERIC(10, 7) NOT NULL,
    center_longitude NUMERIC(10, 7) NOT NULL,
    radius_km NUMERIC(5, 2) DEFAULT 25.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS fare_configurations (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(20) NOT NULL UNIQUE,
    base_fare NUMERIC(10, 2) NOT NULL,
    min_fare NUMERIC(10, 2) NOT NULL,
    per_km_rate NUMERIC(10, 2) NOT NULL,
    per_min_rate NUMERIC(10, 2) NOT NULL,
    booking_fee NUMERIC(10, 2) NOT NULL,
    tax_rate_percent NUMERIC(5, 2) DEFAULT 5.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(255),
    discount_percent NUMERIC(5, 2) NOT NULL,
    max_discount NUMERIC(10, 2) NOT NULL,
    min_ride_amount NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    expiry_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS rides (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    captain_id VARCHAR(36),
    vehicle_category VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_latitude NUMERIC(10, 7) NOT NULL,
    pickup_longitude NUMERIC(10, 7) NOT NULL,
    dest_address TEXT NOT NULL,
    dest_latitude NUMERIC(10, 7) NOT NULL,
    dest_longitude NUMERIC(10, 7) NOT NULL,
    distance_km NUMERIC(6, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    estimated_fare NUMERIC(10, 2) NOT NULL,
    final_fare NUMERIC(10, 2),
    coupon_code VARCHAR(30),
    discount_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20),
    created_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT fk_ride_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_ride_captain FOREIGN KEY (captain_id) REFERENCES captain_profiles(id)
);

CREATE INDEX idx_rides_customer ON rides(customer_id);
CREATE INDEX idx_rides_captain ON rides(captain_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_created_at ON rides(created_at);

CREATE TABLE IF NOT EXISTS ride_status_history (
    id VARCHAR(36) PRIMARY KEY,
    ride_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_rsh_ride FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

CREATE INDEX idx_rsh_ride_id ON ride_status_history(ride_id);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    ride_id VARCHAR(36) NOT NULL UNIQUE,
    customer_id VARCHAR(36) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    CONSTRAINT fk_payment_ride FOREIGN KEY (ride_id) REFERENCES rides(id),
    CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES users(id)
);

CREATE INDEX idx_payment_status ON payments(status);
CREATE INDEX idx_payment_customer ON payments(customer_id);

CREATE TABLE IF NOT EXISTS ratings (
    id VARCHAR(36) PRIMARY KEY,
    ride_id VARCHAR(36) NOT NULL,
    from_user_id VARCHAR(36) NOT NULL,
    to_user_id VARCHAR(36) NOT NULL,
    score INT NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_rating_ride FOREIGN KEY (ride_id) REFERENCES rides(id),
    CONSTRAINT fk_rating_from_user FOREIGN KEY (from_user_id) REFERENCES users(id),
    CONSTRAINT fk_rating_to_user FOREIGN KEY (to_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    ride_id VARCHAR(36),
    subject VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN' NOT NULL,
    admin_response TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_ticket_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_ticket_ride FOREIGN KEY (ride_id) REFERENCES rides(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notif_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    admin_id VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_created ON admin_audit_logs(created_at);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_token_user ON refresh_tokens(user_id);
