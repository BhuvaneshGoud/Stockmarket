package com.stockmarket.controller;

import com.stockmarket.dto.OrderRequest;
import com.stockmarket.dto.OrderResponse;
import com.stockmarket.entity.Holding;
import com.stockmarket.entity.Transaction;
import com.stockmarket.repository.UserRepository;
import com.stockmarket.service.PortfolioService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;
    private final UserRepository userRepository;

    // 🔐 GET USER FROM JWT
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

    // 🔥 GET PORTFOLIO
    @GetMapping
    public ResponseEntity<?> getPortfolio(Authentication authentication) {

        try {
            Long userId = getUserId(authentication);
            List<Holding> holdings = portfolioService.getUserPortfolio(userId);
            return ResponseEntity.ok(holdings);

        } catch (Exception e) {
            log.error("Portfolio error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 🔥 GET PORTFOLIO VALUE
    @GetMapping("/value")
    public ResponseEntity<?> getPortfolioValue(Authentication authentication) {

        try {
            Long userId = getUserId(authentication);

            BigDecimal value = portfolioService.getPortfolioValue(userId);
            BigDecimal invested = portfolioService.getTotalInvested(userId);
            BigDecimal profit = value.subtract(invested);

            return ResponseEntity.ok(Map.of(
                    "value", value,
                    "invested", invested,
                    "profit", profit
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 🔥 BUY STOCK
    @PostMapping("/buy")
    public ResponseEntity<?> buyStock(@Valid @RequestBody OrderRequest request,
                                      Authentication authentication) {

        try {
            Long userId = getUserId(authentication);
            request.setUserId(userId); // enforce correct user

            OrderResponse response = portfolioService.buyStock(request);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 🔥 SELL STOCK
    @PostMapping("/sell")
    public ResponseEntity<?> sellStock(@Valid @RequestBody OrderRequest request,
                                       Authentication authentication) {

        try {
            Long userId = getUserId(authentication);
            request.setUserId(userId);

            OrderResponse response = portfolioService.sellStock(request);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 🔥 TRANSACTIONS
    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(Authentication authentication) {

        try {
            Long userId = getUserId(authentication);
            List<Transaction> transactions = portfolioService.getUserTransactions(userId);
            return ResponseEntity.ok(transactions);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
