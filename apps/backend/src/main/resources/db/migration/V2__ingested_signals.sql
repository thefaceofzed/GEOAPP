CREATE TABLE ingested_signals (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    source_name VARCHAR(160) NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    url TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    country_codes_json TEXT NOT NULL,
    topic_tags_json TEXT NOT NULL,
    signal_type VARCHAR(64) NOT NULL,
    sentiment VARCHAR(32) NOT NULL,
    severity_score NUMERIC(5, 2) NOT NULL,
    extracted_summary TEXT NOT NULL,
    raw_reference_id VARCHAR(255) NOT NULL,
    dedupe_hash VARCHAR(128) NOT NULL
);

ALTER TABLE ingested_signals
    ADD CONSTRAINT uq_ingested_signals_dedupe_hash UNIQUE (dedupe_hash);

CREATE INDEX idx_ingested_signals_published_at ON ingested_signals(published_at DESC);
CREATE INDEX idx_ingested_signals_signal_type ON ingested_signals(signal_type, published_at DESC);
