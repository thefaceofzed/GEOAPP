package com.geoeconwars.ingestion.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum SignalSentiment {
    POSITIVE("positive"),
    NEUTRAL("neutral"),
    NEGATIVE("negative");

    private final String value;

    SignalSentiment(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }
}
