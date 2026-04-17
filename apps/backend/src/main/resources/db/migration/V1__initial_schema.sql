CREATE TABLE users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    role VARCHAR(50) NOT NULL,
    plan_tier VARCHAR(50) NOT NULL
);

CREATE TABLE guest_sessions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    anonymous_token VARCHAR(255) NOT NULL UNIQUE,
    simulations_used INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE daily_usage (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    subject_type VARCHAR(50) NOT NULL,
    subject_id UUID NOT NULL,
    usage_date DATE NOT NULL,
    simulations_used INTEGER NOT NULL,
    CONSTRAINT uq_daily_usage UNIQUE (subject_type, subject_id, usage_date)
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE,
    last_event_id VARCHAR(255)
);

CREATE TABLE simulations (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    subject_type VARCHAR(50) NOT NULL,
    subject_id UUID NOT NULL,
    country_code VARCHAR(8) NOT NULL,
    action_key VARCHAR(120) NOT NULL,
    duration_hours INTEGER NOT NULL,
    allies_json TEXT NOT NULL,
    rules_version VARCHAR(40) NOT NULL,
    severity_score NUMERIC(5, 2) NOT NULL,
    impacts_json TEXT NOT NULL,
    narrative_json TEXT NOT NULL,
    affected_countries_json TEXT NOT NULL,
    request_hash VARCHAR(128) NOT NULL,
    cached BOOLEAN NOT NULL
);

CREATE INDEX idx_simulations_subject_created ON simulations(subject_type, subject_id, created_at DESC);
CREATE INDEX idx_simulations_request_hash ON simulations(request_hash);

CREATE TABLE replay_links (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    simulation_id UUID NOT NULL UNIQUE REFERENCES simulations(id),
    public_token VARCHAR(255) NOT NULL UNIQUE,
    is_public BOOLEAN NOT NULL
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(120) NOT NULL,
    actor_type VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL,
    metadata_json TEXT NOT NULL
);
