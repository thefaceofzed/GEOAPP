package com.geoeconwars.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.IngestedSignal;
import com.geoeconwars.ingestion.domain.IngestedSignalRepository;
import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CoreFlowsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private IngestedSignalRepository ingestedSignalRepository;

    @Test
    void guestCanRunSimulationFetchHistoryAndOpenReplay() throws Exception {
        MvcResult guestResult = mockMvc.perform(post("/api/auth/guest"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("geoecon_refresh"))
                .andExpect(jsonPath("$.subjectType").value("GUEST"))
                .andExpect(jsonPath("$.simulationsRemaining").value(3))
                .andReturn();

        JsonNode guestBody = bodyOf(guestResult);
        String accessToken = guestBody.get("accessToken").asText();

        MvcResult simulationResult = mockMvc.perform(post("/api/simulations/war")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "countryCode": "MA",
                                  "actionKey": "war",
                                  "durationHours": 168,
                                  "allyCodes": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.countryCode").value("MA"))
                .andExpect(jsonPath("$.actionKey").value("war"))
                .andExpect(jsonPath("$.replayToken").isNotEmpty())
                .andExpect(jsonPath("$.simulationsRemaining").value(2))
                .andReturn();

        JsonNode simulationBody = bodyOf(simulationResult);
        String simulationId = simulationBody.get("simulationId").asText();
        String replayToken = simulationBody.get("replayToken").asText();

        mockMvc.perform(get("/api/history")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].simulationId").value(simulationId));

        mockMvc.perform(get("/api/simulations/{id}", simulationId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayToken").value(replayToken));

        mockMvc.perform(get("/api/replays/{token}", replayToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.countryCode").value("MA"))
                .andExpect(jsonPath("$.replayToken").value(replayToken));
    }

    @Test
    void guestIsBlockedOnTheFourthSimulation() throws Exception {
        String accessToken = createGuestAccessToken();

        for (int index = 0; index < 3; index++) {
            mockMvc.perform(post("/api/simulations/war")
                            .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(simulationPayload("cyberattack")))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/simulations/war")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(simulationPayload("cyberattack")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Simulation quota exhausted"));
    }

    @Test
    void freeUserGetsDailyQuotaAndInvalidRefreshIsUnauthorized() throws Exception {
        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "analyst@example.com",
                                  "password": "Password123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjectType").value("USER"))
                .andExpect(jsonPath("$.planTier").value("FREE"))
                .andReturn();

        String accessToken = bodyOf(registerResult).get("accessToken").asText();

        for (int index = 0; index < 3; index++) {
            mockMvc.perform(post("/api/simulations/war")
                            .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(simulationPayload("embargo")))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/simulations/war")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(simulationPayload("embargo")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Simulation quota exhausted"));

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "refreshToken": "not-a-real-token"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid refresh token"));
    }

    @Test
    void logoutClearsRefreshCookie() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("geoecon_refresh", 0));
    }

    @Test
    void invalidAccessTokenReturnsUnauthorizedInsteadOfServerError() throws Exception {
        mockMvc.perform(post("/api/simulations/war")
                        .header(HttpHeaders.AUTHORIZATION, bearer("not-a-real-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(simulationPayload("war")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid access token"));
    }

    @Test
    void simulationResponseIncludesRelevantSupportingSignals() throws Exception {
        ingestedSignalRepository.deleteAll();

        IngestedSignal signal = new IngestedSignal();
        signal.setSourceName("GDELT");
        signal.setSourceType(SignalSourceType.API);
        signal.setUrl("https://example.test/news/ma-sanctions");
        signal.setPublishedAt(Instant.now());
        signal.setCountryCodesJson("[\"MA\",\"DZ\"]");
        signal.setTopicTagsJson("[\"sanctions\",\"trade\"]");
        signal.setSignalType(SignalType.SANCTIONS_SIGNAL);
        signal.setSentiment(SignalSentiment.NEGATIVE);
        signal.setSeverityScore(BigDecimal.valueOf(84));
        signal.setExtractedSummary("Morocco faces new sanctions pressure across regional trade corridors.");
        signal.setRawReferenceId("gdelt:ma-sanctions");
        signal.setDedupeHash("dedupe-ma-sanctions");
        ingestedSignalRepository.save(signal);

        String accessToken = createGuestAccessToken();

        mockMvc.perform(post("/api/simulations/war")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(simulationPayload("sanctions")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supportingSignals.length()").value(1))
                .andExpect(jsonPath("$.supportingSignals[0].sourceName").value("GDELT"))
                .andExpect(jsonPath("$.supportingSignals[0].signalType").value("sanctions-signal"))
                .andExpect(jsonPath("$.supportingSignals[0].relevanceScore").isNotEmpty());
    }

    @Test
    void publicObservedAndForecastEndpointsReturnLiveIntelligence() throws Exception {
        ingestedSignalRepository.deleteAll();

        IngestedSignal signal = new IngestedSignal();
        signal.setSourceName("OFAC");
        signal.setSourceType(SignalSourceType.API);
        signal.setUrl("https://example.test/ofac/ma-1");
        signal.setPublishedAt(Instant.now());
        signal.setCountryCodesJson("[\"MA\",\"DZ\"]");
        signal.setTopicTagsJson("[\"sanctions\",\"trade\"]");
        signal.setSignalType(SignalType.SANCTIONS_SIGNAL);
        signal.setSentiment(SignalSentiment.NEGATIVE);
        signal.setSeverityScore(BigDecimal.valueOf(88));
        signal.setExtractedSummary("Morocco and nearby trade corridors face a new sanctions-related compliance shock.");
        signal.setRawReferenceId("ofac:ma:1");
        signal.setDedupeHash("dedupe-ofac-ma-1");
        ingestedSignalRepository.save(signal);

        mockMvc.perform(get("/api/intelligence/observed")
                        .queryParam("countryCode", "MA")
                        .queryParam("actionKey", "sanctions")
                        .queryParam("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.countryCode").value("MA"))
                .andExpect(jsonPath("$.actionKey").value("sanctions"))
                .andExpect(jsonPath("$.signalCount").value(1))
                .andExpect(jsonPath("$.signals[0].sourceName").value("OFAC"))
                .andExpect(jsonPath("$.signals[0].confidenceScore").isNotEmpty());

        mockMvc.perform(get("/api/intelligence/forecast")
                        .queryParam("countryCode", "MA")
                        .queryParam("actionKey", "sanctions")
                        .queryParam("horizonDays", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.countryCode").value("MA"))
                .andExpect(jsonPath("$.actionKey").value("sanctions"))
                .andExpect(jsonPath("$.riskLabel").isNotEmpty())
                .andExpect(jsonPath("$.drivers.length()").value(1))
                .andExpect(jsonPath("$.drivers[0].sourceName").value("OFAC"));
    }

    private String createGuestAccessToken() throws Exception {
        MvcResult guestResult = mockMvc.perform(post("/api/auth/guest"))
                .andExpect(status().isOk())
                .andReturn();
        return bodyOf(guestResult).get("accessToken").asText();
    }

    private JsonNode bodyOf(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String bearer(String accessToken) {
        return "Bearer " + accessToken;
    }

    private String simulationPayload(String actionKey) {
        return """
                {
                  "countryCode": "MA",
                  "actionKey": "%s",
                  "durationHours": 72,
                  "allyCodes": []
                }
                """.formatted(actionKey);
    }
}
