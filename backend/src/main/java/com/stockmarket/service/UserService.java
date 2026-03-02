package com.stockmarket.service;

import com.stockmarket.entity.User;
import com.stockmarket.entity.Wallet;
import com.stockmarket.repository.UserRepository;
import com.stockmarket.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;

    public User register(User user) {

        User savedUser = userRepository.save(user);

        Wallet wallet = new Wallet();
        wallet.setUser(savedUser);
        wallet.setBalance(BigDecimal.ZERO);   // ✅ Use BigDecimal, not 0.0

        walletRepository.save(wallet);

        return savedUser;
    }
}