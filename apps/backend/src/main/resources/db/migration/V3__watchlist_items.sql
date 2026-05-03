CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    subject_type VARCHAR(50) NOT NULL,
    subject_id UUID NOT NULL,
    country_code VARCHAR(8) NOT NULL,
    action_key VARCHAR(120) NOT NULL,
    preferred_mode VARCHAR(32) NOT NULL
);

ALTER TABLE watchlist_items
    ADD CONSTRAINT uq_watchlist_items_subject_country_action
    UNIQUE (subject_type, subject_id, country_code, action_key);

CREATE INDEX idx_watchlist_items_subject_created
    ON watchlist_items(subject_type, subject_id, created_at DESC);
