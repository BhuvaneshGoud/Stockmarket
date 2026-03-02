package com.stockmarket.controller;

import com.stockmarket.dto.AuthResponse;
import com.stockmarket.dto.LoginRequest;
import com.stockmarket.dto.RegisterRequest;
import com.stockmarket.service.AuthService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // 🔥 REGISTER
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {

        try {
            AuthResponse response = authService.register(request);

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {

            log.error("Registration error: {}", e.getMessage());

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 🔥 LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {

        try {
            AuthResponse response = authService.login(request);

            return ResponseEntity.ok(response);

        } catch (Exception e) {

            log.error("Login error: {}", e.getMessage());

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }
    }
}