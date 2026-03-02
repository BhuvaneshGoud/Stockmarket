package com.stockmarket.service;

import com.stockmarket.dto.OrderRequest;
import com.stockmarket.dto.OrderResponse;
import com.stockmarket.entity.*;
import com.stockmarket.enums.TransactionType;
import com.stockmarket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PortfolioService {

    private final UserRepository userRepository;
    private final StockRepository stockRepository;
    private final HoldingRepository holdingRepository;
    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final MarketDataService marketDataService;
    private final FinnhubService finnhubService;

    private BigDecimal getLivePrice(String symbol) {
        BigDecimal candlePrice = marketDataService.getLatestClosePrice(symbol)
                .map(BigDecimal::valueOf)
                .orElse(null);
        if (isValidPrice(candlePrice)) {
            return candlePrice;
        }

        try {
            Map<String, Object> quote = finnhubService.getQuote(symbol);
            Object current = quote == null ? null : quote.get("c");
            BigDecimal quotePrice = current == null ? null : BigDecimal.valueOf(Double.parseDouble(current.toString()));
            if (isValidPrice(quotePrice)) {
                return quotePrice;
            }
        } catch (Exception ignored) {
        }

        BigDecimal dbPrice = stockRepository.findBySymbolIgnoreCase(symbol)
                .map(Stock::getCurrentPrice)
                .orElse(null);
        if (isValidPrice(dbPrice)) {
            return dbPrice;
        }

        throw new RuntimeException("Live price unavailable");
    }

    private boolean isValidPrice(BigDecimal price) {
        return price != null && price.compareTo(BigDecimal.ZERO) > 0;
    }

    private Stock getOrCreateStock(String symbol) {
        return stockRepository.findBySymbolIgnoreCase(symbol)
                .orElseGet(() -> {
                    Stock stock = new Stock();
                    stock.setSymbol(symbol.toUpperCase());
                    stock.setName(symbol.toUpperCase());
                    stock.setCurrentPrice(getLivePrice(symbol));
                    stock.setPreviousClose(stock.getCurrentPrice());
                    stock.setPriceChange(BigDecimal.ZERO);
                    stock.setPriceChangePercent(BigDecimal.ZERO);
                    return stockRepository.save(stock);
                });
    }

    public List<Holding> getUserPortfolio(Long userId) {
        return holdingRepository.findByUserId(userId);
    }

    @Transactional
    public OrderResponse buyStock(OrderRequest request) {

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Stock stock = getOrCreateStock(request.getSymbol());

        Wallet wallet = walletRepository.findByUser_Id(user.getId())
                .orElseGet(() -> {
                    Wallet newWallet = new Wallet();
                    newWallet.setUser(user);
                    newWallet.setBalance(BigDecimal.ZERO);
                    return walletRepository.save(newWallet);
                });

        BigDecimal livePrice = getLivePrice(stock.getSymbol());

        BigDecimal totalAmount = livePrice.multiply(
                BigDecimal.valueOf(request.getQuantity())
        );

        if (wallet.getBalance().compareTo(totalAmount) < 0) {
            return new OrderResponse(false,
                    "Insufficient balance",
                    BigDecimal.ZERO,
                    0,
                    stock.getSymbol());
        }

        wallet.setBalance(wallet.getBalance().subtract(totalAmount));
        walletRepository.save(wallet);

        Holding holding = holdingRepository
                .findByUserAndStock(user, stock)
                .orElse(null);

        if (holding != null) {

            BigDecimal totalCost =
                    holding.getAveragePrice()
                            .multiply(BigDecimal.valueOf(holding.getQuantity()))
                            .add(totalAmount);

            int newQty = holding.getQuantity() + request.getQuantity();

            holding.setQuantity(newQty);
            holding.setAveragePrice(
                    totalCost.divide(BigDecimal.valueOf(newQty), 2, RoundingMode.HALF_UP)
            );

        } else {

            holding = new Holding();
            holding.setUser(user);
            holding.setStock(stock);
            holding.setQuantity(request.getQuantity());
            holding.setAveragePrice(livePrice);
        }

        holdingRepository.save(holding);

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setStock(stock);
        transaction.setType(TransactionType.BUY);
        transaction.setQuantity(request.getQuantity());
        transaction.setPrice(livePrice);
        transaction.setTotalAmount(totalAmount);

        transactionRepository.save(transaction);

        return new OrderResponse(true,
                "Stock purchased successfully",
                totalAmount,
                request.getQuantity(),
                stock.getSymbol());
    }

    @Transactional
    public OrderResponse sellStock(OrderRequest request) {

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Stock stock = getOrCreateStock(request.getSymbol());

        Wallet wallet = walletRepository.findByUser_Id(user.getId())
                .orElseGet(() -> {
                    Wallet newWallet = new Wallet();
                    newWallet.setUser(user);
                    newWallet.setBalance(BigDecimal.ZERO);
                    return walletRepository.save(newWallet);
                });

        Holding holding = holdingRepository
                .findByUserAndStock(user, stock)
                .orElseThrow(() -> new RuntimeException("You don't own this stock"));

        if (holding.getQuantity() < request.getQuantity()) {
            return new OrderResponse(false,
                    "Insufficient shares",
                    BigDecimal.ZERO,
                    0,
                    stock.getSymbol());
        }

        BigDecimal livePrice = getLivePrice(stock.getSymbol());

        BigDecimal totalAmount =
                livePrice.multiply(BigDecimal.valueOf(request.getQuantity()));

        wallet.setBalance(wallet.getBalance().add(totalAmount));
        walletRepository.save(wallet);

        holding.setQuantity(holding.getQuantity() - request.getQuantity());

        if (holding.getQuantity() == 0) {
            holdingRepository.delete(holding);
        } else {
            holdingRepository.save(holding);
        }

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setStock(stock);
        transaction.setType(TransactionType.SELL);
        transaction.setQuantity(request.getQuantity());
        transaction.setPrice(livePrice);
        transaction.setTotalAmount(totalAmount);

        transactionRepository.save(transaction);

        return new OrderResponse(true,
                "Stock sold successfully",
                totalAmount,
                request.getQuantity(),
                stock.getSymbol());
    }

    public BigDecimal getPortfolioValue(Long userId) {

        List<Holding> holdings = holdingRepository.findByUserId(userId);

        BigDecimal totalValue = BigDecimal.ZERO;

        for (Holding holding : holdings) {

            BigDecimal livePrice =
                    getLivePrice(holding.getStock().getSymbol());

            totalValue = totalValue.add(
                    livePrice.multiply(
                            BigDecimal.valueOf(holding.getQuantity())
                    )
            );
        }

        return totalValue;
    }

    public BigDecimal getTotalInvested(Long userId) {

        List<Holding> holdings = holdingRepository.findByUserId(userId);

        BigDecimal totalInvested = BigDecimal.ZERO;

        for (Holding holding : holdings) {
            totalInvested = totalInvested.add(
                    holding.getAveragePrice()
                            .multiply(BigDecimal.valueOf(holding.getQuantity()))
            );
        }

        return totalInvested;
    }

    public List<Transaction> getUserTransactions(Long userId) {
        return transactionRepository
                .findByUserIdOrderByCreatedAtDesc(userId);
    }

    public User getUserDetails(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
