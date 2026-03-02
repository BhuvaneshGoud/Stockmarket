package com.stockmarket.controller;

import com.stockmarket.dto.AddMoneyRequest;
import com.stockmarket.repository.UserRepository;
import com.stockmarket.service.WalletService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;
    private final UserRepository userRepository;

    // 🔐 Extract userId from JWT
    private Long getUserId(Authentication authentication) {
        String principal = authentication.getName();
        try {
            return Long.parseLong(principal);
        } catch (NumberFormatException ignored) {
            return userRepository.findByEmail(principal)
                    .map(user -> user.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }
    }

    // 🔥 ADD MONEY (SECURE)
    @PostMapping("/add")
    public ResponseEntity<?> addMoney(@Valid @RequestBody AddMoneyRequest request,
                                      Authentication authentication) {

        try {

            Long userId = getUserId(authentication);

            BigDecimal newBalance =
                    walletService.addMoney(userId, request.getAmount());

            return ResponseEntity.ok(Map.of("newBalance", newBalance));

        } catch (Exception e) {

            log.error("Add money error: {}", e.getMessage());

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 🔥 GET BALANCE (SECURE)
    @GetMapping
    public ResponseEntity<?> getBalance(Authentication authentication) {

        try {

            Long userId = getUserId(authentication);

            BigDecimal balance = walletService.getBalance(userId);

            return ResponseEntity.ok(Map.of("balance", balance));

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
