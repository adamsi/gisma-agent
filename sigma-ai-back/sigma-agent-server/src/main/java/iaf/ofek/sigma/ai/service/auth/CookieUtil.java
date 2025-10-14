package iaf.ofek.sigma.ai.service.auth;

import iaf.ofek.sigma.ai.filter.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class CookieUtil {

    private final JwtUtil jwtUtil;

    private final Map<String, Integer> cookies;

    public CookieUtil(JwtUtil jwtUtil,
                      @Value("${sa.jwt.access-expiration-ms}") Integer accessTokenExpirationMs,
                      @Value("${sa.jwt.refresh-expiration-ms}") Integer refreshTokenExpirationMs) {
        this.jwtUtil = jwtUtil;
        cookies = Map.of(
                Token.ACCESS_TOKEN, accessTokenExpirationMs,
                Token.REFRESH_TOKEN, refreshTokenExpirationMs);
    }

    public void addCookies(final HttpServletResponse httpServletResponse, UUID userId) {
        operateCookies(httpServletResponse, this::setAuthCookie, userId);
    }

    public void removeCookies(final HttpServletResponse httpServletResponse) {
        operateCookies(httpServletResponse, this::clearAuthCookie, null);
    }

    private void operateCookies(final HttpServletResponse response, CookieGenerator generator, UUID userId) {
        cookies.forEach((cookie, expirationMs) -> generator.generate(response, userId, cookie, expirationMs));
    }

    private void setAuthCookie(final HttpServletResponse response, final UUID userId, final String cookieName, final Integer expirationMs) {
        String jwt = jwtUtil.generateToken(userId, expirationMs);
        ResponseCookie cookie = ResponseCookie.from(cookieName, jwt)
                .httpOnly(true)
                .path("/")
                .secure(true)
                .sameSite("Lax")
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    private void clearAuthCookie(HttpServletResponse response, final UUID name, final String cookieName, final Integer expirationMs) {
        Cookie cookie = new Cookie(cookieName, null);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(expirationMs);
        response.addCookie(cookie);
    }

    public UUID extractUserId(String refreshToken) {
        return jwtUtil.extractUserId(refreshToken);
    }

    @FunctionalInterface
    interface CookieGenerator {
        void generate(final HttpServletResponse response, final UUID userId, final String cookieName, final Integer expirationMs);
    }

}
