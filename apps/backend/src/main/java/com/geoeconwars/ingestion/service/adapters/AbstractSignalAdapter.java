package com.geoeconwars.ingestion.service.adapters;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.shared.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

abstract class AbstractSignalAdapter {

    protected final Logger logger = LoggerFactory.getLogger(getClass());
    protected final RestClient restClient;
    protected final ObjectMapper objectMapper;
    protected final AppProperties properties;

    protected AbstractSignalAdapter(ObjectMapper objectMapper, AppProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.USER_AGENT, properties.ingestion().userAgent())
                .build();
    }

    protected int maxSignalsPerSource() {
        return properties.ingestion().maxSignalsPerSource();
    }
}
