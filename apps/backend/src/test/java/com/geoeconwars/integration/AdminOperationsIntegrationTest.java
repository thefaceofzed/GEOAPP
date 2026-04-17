package com.geoeconwars.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.domain.UserRole;
import com.geoeconwars.shared.security.TokenService;
import com.geoeconwars.users.domain.User;
import com.geoeconwars.users.domain.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminOperationsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TokenService tokenService;

    @Test
    void adminCanInspectRefreshAndInvalidateIntelligenceState() throws Exception {
        String adminToken = tokenForUser(UserRole.ADMIN, PlanTier.ADMIN);

        mockMvc.perform(post("/api/admin/intelligence/cache/invalidate")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/intelligence/observed")
                        .queryParam("countryCode", "MA")
                        .queryParam("actionKey", "sanctions"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/intelligence/forecast")
                        .queryParam("countryCode", "MA")
                        .queryParam("actionKey", "sanctions"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/intelligence/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cache.observedEntries").value(1))
                .andExpect(jsonPath("$.cache.forecastEntries").value(1))
                .andExpect(jsonPath("$.stream.maxConcurrentStreams").isNotEmpty());

        mockMvc.perform(post("/api/admin/intelligence/cache/invalidate")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "countryCode": "MA",
                                  "actionKey": "sanctions"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invalidation.countryCode").value("MA"))
                .andExpect(jsonPath("$.invalidation.actionKey").value("sanctions"))
                .andExpect(jsonPath("$.invalidation.observedEntriesRemoved").value(1))
                .andExpect(jsonPath("$.invalidation.forecastEntriesRemoved").value(1))
                .andExpect(jsonPath("$.cache.observedEntries").value(0))
                .andExpect(jsonPath("$.cache.forecastEntries").value(0));

        mockMvc.perform(post("/api/admin/ingestion/refresh")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.adapterCount").value(0))
                .andExpect(jsonPath("$.refreshState.inProgress").value(false));

        mockMvc.perform(post("/api/admin/ingestion/refresh")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sourceKey": "news"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceKey").value("news"))
                .andExpect(jsonPath("$.summary.adapterCount").value(0));

        mockMvc.perform(get("/api/admin/ingestion/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ingestion.enabled").value(false))
                .andExpect(jsonPath("$.ingestion.adapters[0].sourceKey").isNotEmpty())
                .andExpect(jsonPath("$.ingestion.lastRefresh.summary.adapterCount").value(0))
                .andExpect(jsonPath("$.intelligenceCache.ttlMs").isNotEmpty());
    }

    @Test
    void nonAdminCannotAccessAdminOperations() throws Exception {
        String userToken = tokenForUser(UserRole.USER, PlanTier.FREE);

        mockMvc.perform(get("/api/admin/ingestion/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(userToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Admin access required"));
    }

    private String tokenForUser(UserRole role, PlanTier planTier) {
        User user = new User();
        user.setEmail(role.name().toLowerCase() + "-" + UUID.randomUUID() + "@example.com");
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setPlanTier(planTier);
        userRepository.save(user);
        return tokenService.createAccessToken(user.getId(), SubjectType.USER, user.getPlanTier(), user.getEmail());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
