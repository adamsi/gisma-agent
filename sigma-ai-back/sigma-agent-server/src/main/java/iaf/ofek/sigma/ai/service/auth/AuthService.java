package iaf.ofek.sigma.ai.service.auth;

import iaf.ofek.sigma.ai.dto.auth.LoginUserDto;
import iaf.ofek.sigma.ai.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;

    private final UserService userService;

    @Transactional(readOnly=true)
    public UUID authenticate(LoginUserDto loginUserDto) {
        String username = loginUserDto.getUsername();
        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(username, loginUserDto.getPassword());
        authenticationManager.authenticate(token);
        User user = userService.findUserByUsernameOrEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException(String.format("user `%s` not found", username)));

        return user.getId();
    }

    public String getCurrentUserId() {
        try {
           return SecurityContextHolder.getContext()
                    .getAuthentication()
                    .getPrincipal()
                    .toString();
        } catch (Exception e) {
            return "user";
        }
    }

}
