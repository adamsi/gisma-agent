package iaf.ofek.gisma.ai.service.auth;

import iaf.ofek.gisma.ai.dto.auth.LoginUserDto;
import iaf.ofek.gisma.ai.entity.auth.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

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
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .defaultIfEmpty("user").block();
    }


}
