package iaf.ofek.sigma.ai.service.auth;

import iaf.ofek.sigma.ai.dto.VerificationInfoDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class TokenCacheService {

    private final StringRedisTemplate redisTemplate;

    @Value("${spring.data.redis.token.expiration-min}")
    private Integer TOKEN_EXPIRATION_MINUTES;

    public VerificationInfoDto storeToken(String data, String token) {
        redisTemplate.opsForValue().set(token, data, Duration.ofMinutes(TOKEN_EXPIRATION_MINUTES));

        return new VerificationInfoDto(TOKEN_EXPIRATION_MINUTES);
    }

    public String getDataByToken(String token) {
        String data = redisTemplate.opsForValue().get(token);

        if (data == null) {
            throw new IllegalArgumentException("Invalid or expired token");
        }

        return data;
    }

    public void deleteToken(String token) {
        redisTemplate.delete(token);
    }

}