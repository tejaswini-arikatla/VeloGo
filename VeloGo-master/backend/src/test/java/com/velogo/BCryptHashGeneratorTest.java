package com.velogo;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BCryptHashGeneratorTest {
    @Test
    void printHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("password123");
        System.out.println("VERIFIED_BCRYPT_HASH_FOR_PASSWORD123: " + hash);
        boolean matches = encoder.matches("password123", hash);
        System.out.println("MATCHES: " + matches);
        org.junit.jupiter.api.Assertions.assertTrue(matches);
    }
}
