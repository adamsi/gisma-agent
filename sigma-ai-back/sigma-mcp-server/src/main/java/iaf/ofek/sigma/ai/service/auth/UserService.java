package iaf.ofek.sigma.ai.service.auth;

import iaf.ofek.sigma.ai.dto.RegisterUserDto;
import iaf.ofek.sigma.ai.entity.Role;
import iaf.ofek.sigma.ai.entity.User;
import iaf.ofek.sigma.ai.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@AllArgsConstructor
@Service
public class UserService {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    @Transactional
    public User createOrUpdateUser(String email, String name, String provider, String oauthId, String picture) {
        return userRepository.findByEmail(email)
                .map(existingUser -> {
                    existingUser.setUsername(name);
                    existingUser.setOauthProvider(provider);
                    existingUser.setOauthId(oauthId);
                    existingUser.setPicture(picture);

                    return userRepository.save(existingUser);
                })
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setUsername(name);
                    newUser.setRole(Role.USER);
                    newUser.setOauthProvider(provider);
                    newUser.setOauthId(oauthId);
                    newUser.setPicture(picture);

                    return userRepository.save(newUser);
                });
    }

    public Optional<User> findUserByUsernameOrEmail(String userIdentifier) {
        return userRepository.findByEmailOrUsername(userIdentifier, userIdentifier);
    }

    public User getUserById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException(String.format("User with id %s not found", userId)));
    }

    public User createUser(RegisterUserDto user) {
        String email = user.getEmail();
        User newUser = new User();
        newUser.setUsername(user.getUsername());
        newUser.setEmail(email);
        newUser.setRole(Role.USER);
        newUser.setPassword(passwordEncoder.encode(user.getPassword()));

        return userRepository.save(newUser);
    }

}
