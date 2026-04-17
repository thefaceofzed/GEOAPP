package com.geoeconwars.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "app.intelligence.rate-limit.requests-per-window=2",
        "app.intelligence.rate-limit.window-ms=60000"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class IntelligenceRateLimitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicIntelligenceEndpointsEnforceRateLimits() throws Exception {
        mockMvc.perform(observedRequest())
                .andExpect(status().isOk())
                .andExpect(header().string("X-RateLimit-Limit", "2"));

        mockMvc.perform(observedRequest())
                .andExpect(status().isOk());

        mockMvc.perform(observedRequest())
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.message").value("Intelligence request rate limit exceeded"));
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder observedRequest() {
        return get("/api/intelligence/observed")
                .queryParam("countryCode", "MA")
                .queryParam("actionKey", "sanctions")
                .with(request -> {
                    request.setRemoteAddr("203.0.113.42");
                    return request;
                });
    }
}
