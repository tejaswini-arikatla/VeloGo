package com.velogo.security;

import com.velogo.domain.User;
import com.velogo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Can be email or phone
        User user = userRepository.findByEmail(username)
                .or(() -> userRepository.findByPhone(username))
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email or phone: " + username));

        return new CustomUserDetails(user);
    }

    public UserDetails loadUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));

        return new CustomUserDetails(user);
    }
}
