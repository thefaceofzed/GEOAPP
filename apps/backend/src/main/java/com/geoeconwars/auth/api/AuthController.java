package com.geoeconwars.auth.api;

import com.geoeconwars.auth.service.AuthService;
import com.geoeconwars.shared.web.CookieSupport;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CookieSupport cookieSupport;

    public AuthController(AuthService authService, CookieSupport cookieSupport) {
        this.authService = authService;
        this.cookieSupport = cookieSupport;
    }

    @PostMapping("/guest")
    public ResponseEntity<AuthResponse> guest() {
        return responseWithRefreshCookie(authService.createGuest());
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return responseWithRefreshCookie(authService.register(request.email(), request.password()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return responseWithRefreshCookie(authService.login(request.email(), request.password()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody(required = false) RefreshRequest request,
            @CookieValue(name = CookieSupport.REFRESH_COOKIE, required = false) String refreshCookie
    ) {
        String refreshToken = refreshCookie != null ? refreshCookie : request == null ? null : request.refreshToken();
        return responseWithRefreshCookie(authService.refresh(refreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookieSupport.clearRefreshCookie())
                .build();
    }

    private ResponseEntity<AuthResponse> responseWithRefreshCookie(AuthService.AuthSession session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieSupport.refreshCookie(session.refreshToken()))
                .body(new AuthResponse(
                        session.accessToken(),
                        session.subjectType().name(),
                        session.subjectId().toString(),
                        session.planTier().name(),
                        session.role() == null ? null : session.role().name(),
                        session.email(),
                        session.simulationsRemaining(),
                        session.unlimited()
                ));
    }

    public record RegisterRequest(
            @Email @NotBlank String email,
            @NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$", message = "Password must be at least 8 characters and include letters and numbers") String password
    ) {
    }

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {
    }

    public record RefreshRequest(
            String refreshToken
    ) {
    }

    public record AuthResponse(
            String accessToken,
            String subjectType,
            String subjectId,
            String planTier,
            String role,
            String email,
            Integer simulationsRemaining,
            boolean unlimited
    ) {
    }
}
