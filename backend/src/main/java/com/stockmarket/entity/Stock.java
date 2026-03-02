package com.stockmarket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stocks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Stock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String symbol;

    @Column(nullable = false)
    private String name;

    private String sector;

    @Column(name = "current_price", nullable = false, precision = 19, scale = 4)
    private BigDecimal currentPrice;

    @Column(name = "previous_close", precision = 19, scale = 4)
    private BigDecimal previousClose;

    @Column(name = "price_change", precision = 19, scale = 4)
    private BigDecimal priceChange;

    @Column(name = "price_change_percent", precision = 10, scale = 4)
    private BigDecimal priceChangePercent;

    @Column(name = "daily_gain", precision = 10, scale = 4)
    private BigDecimal dailyGain;

    @Column(name = "monthly_gain", precision = 10, scale = 4)
    private BigDecimal monthlyGain;

    @Column(name = "pe_ratio", precision = 10, scale = 4)
    private BigDecimal peRatio;

    @Column(name = "pb_ratio", precision = 10, scale = 4)
    private BigDecimal pbRatio;

    @Column(name = "dividend_yield", precision = 10, scale = 4)
    private BigDecimal dividendYield;

    @Column(name = "eps", precision = 10, scale = 4)
    private BigDecimal eps;

    @Column(name = "book_value", precision = 10, scale = 4)
    private BigDecimal bookValue;

    @Column(name = "roe", precision = 10, scale = 4)
    private BigDecimal roe;

    private Long volume;

    @Column(name = "market_cap", precision = 19, scale = 2)
    private BigDecimal marketCap;

    // 🔥 NEW FIELD — For Smart API Caching
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @Transient
    private String logoUrl;
}
