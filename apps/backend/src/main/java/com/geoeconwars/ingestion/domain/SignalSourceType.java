package com.geoeconwars.ingestion.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum SignalSourceType {
    API("api"),
    SCRAPED("scraped");

    private final String value;

    SignalSourceType(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }
}
