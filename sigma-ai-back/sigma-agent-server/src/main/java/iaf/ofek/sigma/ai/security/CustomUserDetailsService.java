package iaf.ofek.sigma.ai.security;

import iaf.ofek.sigma.ai.entity.User;
import iaf.ofek.sigma.ai.service.auth.UserService;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserService userService;

    public CustomUserDetailsService(UserService userService) {
        this.userService = userService;
    }

    @Override
    public UserDetails loadUserByUsername(String name) {
        final String GRANTED_AUTH_PREFIX = "ROLE_";
        User user = userService.findUserByUsernameOrEmail(name)
                .orElseThrow(() -> new UsernameNotFoundException(String.format("user `%s` not found", name)));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword() == null ? "" : user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority(GRANTED_AUTH_PREFIX + user.getRole()))
        );
    }

}
