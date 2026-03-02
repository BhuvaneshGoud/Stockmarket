package com.stockmarket.service;

import com.stockmarket.dto.AuthResponse;
import com.stockmarket.dto.LoginRequest;
import com.stockmarket.dto.RegisterRequest;
import com.stockmarket.entity.User;
import com.stockmarket.entity.Wallet;
import com.stockmarket.repository.UserRepository;
import com.stockmarket.repository.WalletRepository;
import com.stockmarket.security.JwtTokenProvider;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final JwtTokenProvider jwtTokenProvider;

    // 🔥 REGISTER
    public AuthResponse register(RegisterRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setRole("USER");
        user.setBalance(0.0); // 🔥 IMPORTANT FIX
        user.setCreatedAt(LocalDateTime.now());

        User savedUser = userRepository.save(user);

        Wallet wallet = new Wallet();
        wallet.setUser(savedUser);
        wallet.setBalance(BigDecimal.ZERO);
        walletRepository.save(wallet);

        String token = jwtTokenProvider.generateToken(savedUser.getEmail());

        return new AuthResponse(
                token,
                savedUser.getId(),
                savedUser.getEmail()
        );
    }

    // 🔥 LOGIN
    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Accept plain-text password and migrate legacy BCrypt hashes to plain text.
        if (!request.getPassword().equals(user.getPassword())) {
            BCryptPasswordEncoder legacyEncoder = new BCryptPasswordEncoder();
            if (legacyEncoder.matches(request.getPassword(), user.getPassword())) {
                user.setPassword(request.getPassword());
                userRepository.save(user);
            } else {
                throw new RuntimeException("Invalid password");
            }
        }

        String token = jwtTokenProvider.generateToken(user.getEmail());

        return new AuthResponse(
                token,
                user.getId(),
                user.getEmail()
        );
    }
}
