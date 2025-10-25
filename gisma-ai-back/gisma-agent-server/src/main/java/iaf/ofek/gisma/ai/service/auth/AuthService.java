package iaf.ofek.gisma.ai.service.auth;

import iaf.ofek.gisma.ai.dto.auth.LoginUserDto;
import iaf.ofek.gisma.ai.entity.auth.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;

    private final UserService userService;

    public UUID authenticate(LoginUserDto loginUserDto) {
        String username = loginUserDto.getUsername();
        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(username, loginUserDto.getPassword());
        try {
            authenticationManager.authenticate(token);
        } catch (Exception e) {
        throw new BadCredentialsException("Bad credentials", e);
        }

        User user = userService.getUser(username);

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
