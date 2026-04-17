package com.geoeconwars.ingestion.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum SignalType {
    NEWS_HEADLINE("news-headline"),
    COMMODITY_PRICE("commodity-price"),
    FX_RATE("fx-rate"),
    MACRO_EVENT("macro-event"),
    SANCTIONS_SIGNAL("sanctions-signal"),
    CONFLICT_SIGNAL("conflict-signal"),
    TRADE_EXPOSURE("trade-exposure");

    private final String value;

    SignalType(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }
}
