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
public class WalletService {

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

    public BigDecimal addMoney(Long userId, Double amount) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Wallet wallet = walletRepository.findByUser_Id(userId)
                .orElseGet(() -> {
                    Wallet newWallet = new Wallet();
                    newWallet.setUser(user);
                    newWallet.setBalance(BigDecimal.ZERO);
                    return newWallet;
                });

        wallet.setBalance(
                wallet.getBalance().add(BigDecimal.valueOf(amount))
        );

        walletRepository.save(wallet);

        return wallet.getBalance();
    }

    public BigDecimal getBalance(Long userId) {

        return walletRepository.findByUser_Id(userId)
                .map(Wallet::getBalance)
                .orElse(BigDecimal.ZERO);
    }
}