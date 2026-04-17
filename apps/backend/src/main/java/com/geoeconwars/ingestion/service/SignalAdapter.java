package com.geoeconwars.ingestion.service;

import java.util.List;
import java.util.Locale;

public interface SignalAdapter {

    String sourceName();

    default String sourceKey() {
        return sourceName().trim().toLowerCase(Locale.ROOT);
    }

    boolean isEnabled();

    List<RawSignalRecord> fetchSignals();
}
