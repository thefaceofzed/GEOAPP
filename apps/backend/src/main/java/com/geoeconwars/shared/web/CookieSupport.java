package com.geoeconwars.shared.web;

import com.geoeconwars.shared.config.AppProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieSupport {

    public static final String REFRESH_COOKIE = "geoecon_refresh";

    private final AppProperties properties;

    public CookieSupport(AppProperties properties) {
        this.properties = properties;
    }

    public String refreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
                .httpOnly(true)
                .secure(properties.refreshCookieSecure())
                .path("/api/auth")
                .sameSite(properties.refreshCookieSecure() ? "None" : "Lax")
                .maxAge(properties.refreshTokenDays() * 24L * 60L * 60L)
                .build()
                .toString();
    }

    public String clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(properties.refreshCookieSecure())
                .path("/api/auth")
                .sameSite(properties.refreshCookieSecure() ? "None" : "Lax")
                .maxAge(0)
                .build()
                .toString();
    }

    public void attachRefreshCookie(org.springframework.http.ResponseEntity.BodyBuilder builder, String token) {
        builder.header(HttpHeaders.SET_COOKIE, refreshCookie(token));
    }
}
