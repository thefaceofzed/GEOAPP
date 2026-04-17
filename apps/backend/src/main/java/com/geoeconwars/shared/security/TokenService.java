package com.geoeconwars.shared.security;

import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

    private final AppProperties properties;

    public TokenService(AppProperties properties) {
        this.properties = properties;
    }

    public String createAccessToken(UUID subjectId, SubjectType subjectType, PlanTier planTier, String email) {
        return buildToken(subjectId, subjectType, planTier, email, JwtTokenType.ACCESS, properties.accessTokenMinutes(), ChronoUnit.MINUTES);
    }

    public String createRefreshToken(UUID subjectId, SubjectType subjectType, PlanTier planTier, String email) {
        return buildToken(subjectId, subjectType, planTier, email, JwtTokenType.REFRESH, properties.refreshTokenDays(), ChronoUnit.DAYS);
    }

    public TokenPayload parseAccessToken(String token) {
        return parse(token, properties.jwt().accessSecret(), JwtTokenType.ACCESS);
    }

    public TokenPayload parseRefreshToken(String token) {
        return parse(token, properties.jwt().refreshSecret(), JwtTokenType.REFRESH);
    }

    private String buildToken(UUID subjectId, SubjectType subjectType, PlanTier planTier, String email, JwtTokenType tokenType, int amount, ChronoUnit unit) {
        Instant now = Instant.now();
        SecretKey secretKey = keyFor(tokenType == JwtTokenType.ACCESS ? properties.jwt().accessSecret() : properties.jwt().refreshSecret());
        return Jwts.builder()
                .subject(subjectId.toString())
                .claim("subjectType", subjectType.name())
                .claim("planTier", planTier.name())
                .claim("email", email)
                .claim("tokenType", tokenType.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(amount, unit)))
                .signWith(secretKey)
                .compact();
    }

    private TokenPayload parse(String token, String secret, JwtTokenType expectedType) {
        Claims claims = Jwts.parser()
                .verifyWith(keyFor(secret))
                .build()
                .parseSignedClaims(token)
                .getPayload();
        JwtTokenType tokenType = JwtTokenType.valueOf(claims.get("tokenType", String.class));
        if (tokenType != expectedType) {
            throw new IllegalArgumentException("Invalid token type");
        }
        String email = claims.get("email", String.class);
        return new TokenPayload(
                UUID.fromString(claims.getSubject()),
                SubjectType.valueOf(claims.get("subjectType", String.class)),
                PlanTier.valueOf(claims.get("planTier", String.class)),
                email,
                tokenType
        );
    }

    private SecretKey keyFor(String rawSecret) {
        byte[] bytes = rawSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(bytes.length >= 32 ? bytes : pad(bytes));
    }

    private byte[] pad(byte[] bytes) {
        byte[] padded = new byte[32];
        for (int index = 0; index < padded.length; index++) {
            padded[index] = index < bytes.length ? bytes[index] : (byte) 'x';
        }
        return padded;
    }
}
