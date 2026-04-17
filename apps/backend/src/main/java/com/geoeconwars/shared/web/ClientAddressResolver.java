package com.geoeconwars.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class ClientAddressResolver {

    public String resolve(HttpServletRequest request) {
        String forwardedFor = sanitize(firstHeaderValue(request.getHeader("X-Forwarded-For")));
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor;
        }

        String realIp = sanitize(request.getHeader("X-Real-IP"));
        if (StringUtils.hasText(realIp)) {
            return realIp;
        }

        String remoteAddress = sanitize(request.getRemoteAddr());
        return StringUtils.hasText(remoteAddress) ? remoteAddress : "unknown";
    }

    private String firstHeaderValue(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        int separatorIndex = value.indexOf(',');
        return separatorIndex >= 0 ? value.substring(0, separatorIndex) : value;
    }

    private String sanitize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() > 64) {
            trimmed = trimmed.substring(0, 64);
        }
        return trimmed.replaceAll("[^0-9A-Fa-f:._-]", "");
    }
}
