-- VeloGo Initial Seed Data
-- Default password for all users: "password123"
-- BCrypt hash: $2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy

-- 1. Users
INSERT INTO users (id, email, phone, password_hash, full_name, role, is_active, avatar_url, created_at, updated_at)
VALUES
('u-admin-001', 'admin@velogo.com', '+919999999999', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'VeloGo System Admin', 'ROLE_ADMIN', TRUE, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('u-cust-001', 'customer@velogo.com', '+919876543210', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Arun Sharma', 'ROLE_CUSTOMER', TRUE, 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('u-cust-002', 'priya.k@velogo.com', '+919876543211', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Priya Kapoor', 'ROLE_CUSTOMER', TRUE, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('u-capt-001', 'captain.rahul@velogo.com', '+919876543220', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Rahul Verma (Bike Captain)', 'ROLE_CAPTAIN', TRUE, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('u-capt-002', 'captain.suresh@velogo.com', '+919876543221', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Suresh Gowda (Auto Captain)', 'ROLE_CAPTAIN', TRUE, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('u-capt-003', 'captain.anand@velogo.com', '+919876543222', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Anand Kumar (Cab Captain)', 'ROLE_CAPTAIN', TRUE, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('u-capt-004', 'captain.vikram@velogo.com', '+919876543223', '$2a$10$qa20aLkdh8xRrGpSf2FdiOBbcGYduvSu4b1wy825TlpK/BoCMj8wy', 'Vikram Rathore (Pending)', 'ROLE_CAPTAIN', TRUE, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Customer Profiles
INSERT INTO customer_profiles (id, user_id, rating_avg, total_rides, emergency_contact_name, emergency_contact_phone, created_at, updated_at)
VALUES
('cp-cust-001', 'u-cust-001', 4.95, 12, 'Sunita Sharma', '+919876543299', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cp-cust-002', 'u-cust-002', 4.88, 5, 'Raj Kapoor', '+919876543298', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Captain Profiles
INSERT INTO captain_profiles (id, user_id, driving_license_number, verification_status, rejection_reason, is_online, is_available, current_latitude, current_longitude, last_location_update, rating_avg, total_rides, total_earnings, created_at, updated_at)
VALUES
('cp-001', 'u-capt-001', 'DL-KA-01-2022001', 'APPROVED', NULL, TRUE, TRUE, 12.9716000, 77.5946000, CURRENT_TIMESTAMP, 4.92, 142, 18500.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cp-002', 'u-capt-002', 'DL-KA-02-2021002', 'APPROVED', NULL, TRUE, TRUE, 12.9785000, 77.6010000, CURRENT_TIMESTAMP, 4.85, 98, 14200.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cp-003', 'u-capt-003', 'DL-KA-05-2020003', 'APPROVED', NULL, TRUE, TRUE, 12.9650000, 77.6025000, CURRENT_TIMESTAMP, 4.90, 210, 39500.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cp-004', 'u-capt-004', 'DL-KA-04-2023004', 'PENDING', NULL, FALSE, FALSE, 12.9500000, 77.5800000, CURRENT_TIMESTAMP, 5.00, 0, 0.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. Vehicles
INSERT INTO vehicles (id, captain_id, category, model, registration_number, color, created_at, updated_at)
VALUES
('v-001', 'cp-001', 'BIKE', 'Honda Activa 6G', 'KA-01-EQ-1234', 'Matte Yellow', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('v-002', 'cp-002', 'AUTO', 'Bajaj Compact RE', 'KA-03-FA-5678', 'Yellow & Green', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('v-003', 'cp-003', 'CAB', 'Maruti Suzuki Dzire', 'KA-05-MM-9012', 'Silver White', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('v-004', 'cp-004', 'BIKE', 'Hero Splendor Plus', 'KA-04-AB-3456', 'Glossy Black', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 5. Captain Documents
INSERT INTO captain_documents (id, captain_id, document_type, document_url, is_verified, uploaded_at)
VALUES
('doc-001', 'cp-001', 'DRIVING_LICENSE', '/documents/license_cp001.pdf', TRUE, CURRENT_TIMESTAMP),
('doc-002', 'cp-001', 'VEHICLE_RC', '/documents/rc_cp001.pdf', TRUE, CURRENT_TIMESTAMP),
('doc-003', 'cp-002', 'DRIVING_LICENSE', '/documents/license_cp002.pdf', TRUE, CURRENT_TIMESTAMP),
('doc-004', 'cp-004', 'DRIVING_LICENSE', '/documents/license_cp004.pdf', FALSE, CURRENT_TIMESTAMP);

-- 6. Service Area
INSERT INTO service_areas (id, name, center_latitude, center_longitude, radius_km, is_active, created_at)
VALUES
('sa-001', 'Bengaluru Urban & Metro', 12.9716000, 77.5946000, 50.00, TRUE, CURRENT_TIMESTAMP);

-- 7. Fare Configurations
INSERT INTO fare_configurations (id, category, base_fare, min_fare, per_km_rate, per_min_rate, booking_fee, tax_rate_percent, is_active, updated_at)
VALUES
('fc-001', 'BIKE', 25.00, 35.00, 9.00, 1.50, 5.00, 5.00, TRUE, CURRENT_TIMESTAMP),
('fc-002', 'AUTO', 35.00, 50.00, 13.00, 2.00, 8.00, 5.00, TRUE, CURRENT_TIMESTAMP),
('fc-003', 'CAB', 70.00, 100.00, 18.00, 3.00, 15.00, 5.00, TRUE, CURRENT_TIMESTAMP);

-- 8. Coupons
INSERT INTO coupons (id, code, description, discount_percent, max_discount, min_ride_amount, is_active, expiry_date, created_at)
VALUES
('cpn-001', 'VELO50', 'Get 50% OFF up to ₹50 on city rides', 50.00, 50.00, 60.00, TRUE, CURRENT_TIMESTAMP + INTERVAL '90' DAY, CURRENT_TIMESTAMP),
('cpn-002', 'FIRSTGO', 'Special 30% OFF for welcome ride up to ₹75', 30.00, 75.00, 50.00, TRUE, CURRENT_TIMESTAMP + INTERVAL '90' DAY, CURRENT_TIMESTAMP),
('cpn-003', 'FREERIDE', 'Promotional 100% OFF up to ₹100', 100.00, 100.00, 0.00, TRUE, CURRENT_TIMESTAMP + INTERVAL '90' DAY, CURRENT_TIMESTAMP);

-- 9. Sample Past Completed Ride for demonstration
INSERT INTO rides (id, customer_id, captain_id, vehicle_category, status, pickup_address, pickup_latitude, pickup_longitude, dest_address, dest_latitude, dest_longitude, distance_km, duration_minutes, estimated_fare, final_fare, coupon_code, discount_amount, tax_amount, otp_code, created_at, accepted_at, started_at, completed_at)
VALUES
('ride-past-001', 'u-cust-001', 'cp-001', 'BIKE', 'COMPLETED', 'MG Road Metro Station, Bengaluru', 12.9756000, 77.6066000, 'Koramangala 5th Block, Bengaluru', 12.9352000, 77.6245000, 5.80, 18, 92.00, 92.00, 'FIRSTGO', 27.60, 4.60, '4289', CURRENT_TIMESTAMP - INTERVAL '2' HOUR, CURRENT_TIMESTAMP - INTERVAL '2' HOUR, CURRENT_TIMESTAMP - INTERVAL '1' HOUR, CURRENT_TIMESTAMP - INTERVAL '1' HOUR);

-- 10. Sample Completed Payment
INSERT INTO payments (id, ride_id, customer_id, amount, currency, method, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, idempotency_key, created_at, completed_at)
VALUES
('pay-001', 'ride-past-001', 'u-cust-001', 69.00, 'INR', 'CASH', 'SUCCESS', 'order_demo_past_001', 'pay_demo_past_001', 'sig_demo_past_001', 'idem-pay-001', CURRENT_TIMESTAMP - INTERVAL '1' HOUR, CURRENT_TIMESTAMP - INTERVAL '1' HOUR);

-- 11. Sample Rating
INSERT INTO ratings (id, ride_id, from_user_id, to_user_id, score, feedback, created_at)
VALUES
('rat-001', 'ride-past-001', 'u-cust-001', 'u-capt-001', 5, 'Super fast bike ride, wore helmet and drove safely!', CURRENT_TIMESTAMP - INTERVAL '1' HOUR);

-- 12. Sample Notification
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
VALUES
('notif-001', 'u-cust-001', 'Welcome to VeloGo!', 'Use code VELO50 on your rides to get 50% discount.', 'PROMO', FALSE, CURRENT_TIMESTAMP);
