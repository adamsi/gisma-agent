package iaf.ofek.sigma.ai.controller;

import iaf.ofek.sigma.ai.dto.LoginUserDto;
import iaf.ofek.sigma.ai.dto.RegisterUserDto;
import iaf.ofek.sigma.ai.dto.UserInfoDto;
import iaf.ofek.sigma.ai.dto.VerificationInfoDto;
import iaf.ofek.sigma.ai.entity.User;
import iaf.ofek.sigma.ai.mapper.UserMapper;
import iaf.ofek.sigma.ai.service.auth.*;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    private final RegisterVerificationService registerVerificationService;

    private final CookieUtil cookieUtil;

    private final UserService userService;

    private final UserMapper userMapper;

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody LoginUserDto loginUserDto, HttpServletResponse response) {
        UUID userId = authService.authenticate(loginUserDto);
        cookieUtil.addCookies(response, userId);

        return ResponseEntity.ok()
                .body("Login success");
    }

    @PostMapping("/signup")
    public ResponseEntity<VerificationInfoDto> registerUser(@RequestBody @Valid RegisterUserDto user) {
        VerificationInfoDto verificationInfo = registerVerificationService.sendVerificationEmail(user);

        return new ResponseEntity<>(verificationInfo, HttpStatus.OK);
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam String token, HttpServletResponse response) {
        UUID userId = registerVerificationService.verifyAndSaveUser(token).getId();
        cookieUtil.addCookies(response, userId);

        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@CookieValue(name = Token.REFRESH_TOKEN) String refreshToken, HttpServletResponse response) {
        UUID userId = cookieUtil.extractUserId(refreshToken);
        cookieUtil.addCookies(response, userId);

        return ResponseEntity.ok()
                .body("Refresh token success");
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        cookieUtil.removeCookies(response);

        return ResponseEntity.ok()
                .body("Logout success");
    }

    @GetMapping("/me")
    public ResponseEntity<UserInfoDto> getUserInfo(@CookieValue(Token.ACCESS_TOKEN) String accessToken) {
        UUID userId = cookieUtil.extractUserId(accessToken);
        User user = userService.getUserById(userId);
        UserInfoDto userInfo = userMapper.toDto(user);

        return ResponseEntity.ok(userInfo);
    }


}
