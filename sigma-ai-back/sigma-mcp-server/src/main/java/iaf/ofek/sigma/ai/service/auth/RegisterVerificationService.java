package iaf.ofek.sigma.ai.service.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import iaf.ofek.sigma.ai.dto.RegisterUserDto;
import iaf.ofek.sigma.ai.dto.VerificationInfoDto;
import iaf.ofek.sigma.ai.entity.User;
import iaf.ofek.sigma.ai.exception.TokenProcessingException;
import jakarta.persistence.EntityExistsException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegisterVerificationService {

    private final EmailService emailService;

    private final TokenCacheService tokenCacheService;

    private final UserService userService;

    private final ObjectMapper objectMapper;

    @Value("${lc.client.url}")
    private String clientUrl;

    public VerificationInfoDto sendVerificationEmail(RegisterUserDto registerUserDTO) {
        String email = registerUserDTO.getEmail();
        userService.findUserByUsernameOrEmail(email).ifPresent(existingUser -> {
            throw new EntityExistsException(String.format("Email '%s' is already registered.", email));
        });

        String token = UUID.randomUUID().toString();

        try {
            String userJson = objectMapper.writeValueAsString(registerUserDTO);
            VerificationInfoDto verificationInfo = tokenCacheService.storeToken(userJson, token);
            String verificationUrl = clientUrl + "/?register-token=" + token;
            String message = "<p>Click the link below to verify your email:</p>"
                    + "<a href='" + verificationUrl + "'>Verify Email</a>";
            emailService.sendEmail(registerUserDTO.getEmail(), "Verify Your Email", message);

            return verificationInfo;
        } catch (JsonProcessingException e) {
            throw new TokenProcessingException(e.getMessage());
        }
    }

    public User verifyAndSaveUser(String token) {
        String data = tokenCacheService.getDataByToken(token);

        try {
            RegisterUserDto user = objectMapper.readValue(data, RegisterUserDto.class);
            User savedUser = userService.createUser(user);
            tokenCacheService.deleteToken(token);

            return savedUser;
        } catch (JsonProcessingException e) {
            throw new TokenProcessingException(e.getMessage());
        }
    }

}