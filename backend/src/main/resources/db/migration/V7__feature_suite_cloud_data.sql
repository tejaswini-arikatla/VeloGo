-- Account-scoped persistence for the optional customer feature suite.
-- Payloads are JSON documents so feature modules can evolve independently.
CREATE TABLE IF NOT EXISTS feature_data (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    feature_key VARCHAR(60) NOT NULL,
    title VARCHAR(140),
    payload_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_feature_data_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_data_owner_key
    ON feature_data(user_id, feature_key);

CREATE INDEX IF NOT EXISTS idx_feature_data_updated
    ON feature_data(updated_at);
