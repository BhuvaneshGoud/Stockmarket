package com.stockmarket.service;

import com.stockmarket.entity.Stock;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class StockService {

    private final FinnhubService finnhubService;
    @Value("${stocks.live.symbols:}")
    private String configuredSymbols;
    private final Map<String, Stock> liveStocksCache = new ConcurrentHashMap<>();
    private final Map<String, Instant> cacheTime = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> companyProfileCache = new ConcurrentHashMap<>();
    private final Map<String, Instant> companyProfileCacheTime = new ConcurrentHashMap<>();

    private static final long CACHE_SECONDS = 15L;
    private static final long PROFILE_CACHE_SECONDS = 86400L;
    private static final List<String> DEFAULT_TRACKED_SYMBOLS = List.of(
            "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM",
            "NFLX", "AMD", "INTC", "ORCL", "CRM", "IBM", "ADBE", "CSCO",
            "QCOM", "AVGO", "TXN", "PYPL", "UBER", "SHOP", "BABA", "DIS",
            "SPY", "QQQ", "DIA", "IWM", "VOO",
            "GLD", "SLV", "USO", "UNG", "DBA", "CPER"
    );

    public List<Stock> getAllStocks() {
        return getTrackedSymbols().stream()
                .map(this::getFreshStockOrNull)
                .filter(Objects::nonNull)
                .toList();
    }

    public List<Stock> refreshLiveStocks() {
        return getTrackedSymbols().stream()
                .map(this::getFreshStockOrNull)
                .filter(Objects::nonNull)
                .toList();
    }

    public Stock getStockBySymbol(String symbol) {
        return getFreshStock(symbol);
    }

    public List<Stock> searchStocks(String query) {
        String normalized = query == null ? "" : query.toLowerCase(Locale.ROOT);
        return getTrackedSymbols().stream()
                .filter(symbol -> symbol.toLowerCase(Locale.ROOT).contains(normalized))
                .map(this::getFreshStockOrNull)
                .filter(Objects::nonNull)
                .toList();
    }

    public List<Stock> getStocksBySector(String sector) {
        String normalized = sector == null ? "" : sector.toLowerCase(Locale.ROOT);
        return getTrackedSymbols().stream()
                .map(this::getFreshStockOrNull)
                .filter(Objects::nonNull)
                .filter(stock -> stock.getSector() != null
                        && stock.getSector().toLowerCase(Locale.ROOT).equals(normalized))
                .toList();
    }

    public void initializeStocks() {
        refreshLiveStocks();
    }

    private List<String> getTrackedSymbols() {
        List<String> fromConfig = Arrays.stream(configuredSymbols.split(","))
                .map(String::trim)
                .filter(symbol -> !symbol.isBlank())
                .map(symbol -> symbol.toUpperCase(Locale.ROOT))
                .distinct()
                .toList();

        if (!fromConfig.isEmpty()) {
            return fromConfig;
        }

        Set<String> merged = new TreeSet<>(DEFAULT_TRACKED_SYMBOLS);
        merged.addAll(
                liveStocksCache.keySet().stream()
                        .map(symbol -> symbol.toUpperCase(Locale.ROOT))
                        .toList()
        );
        return merged.stream().toList();
    }

    private Stock getFreshStock(String symbol) {
        String normalized = symbol.toUpperCase(Locale.ROOT);
        Stock cached = liveStocksCache.get(normalized);
        Instant updatedAt = cacheTime.get(normalized);

        if (cached != null && updatedAt != null && Instant.now().minusSeconds(CACHE_SECONDS).isBefore(updatedAt)) {
            return cloneStock(cached);
        }

        Stock live = fetchLatestStock(normalized);
        if (live != null) {
            return live;
        }

        if (cached != null) {
            return cloneStock(cached);
        }

        throw new RuntimeException("Stock not found: " + normalized);
    }

    private Stock getFreshStockOrNull(String symbol) {
        try {
            return getFreshStock(symbol);
        } catch (Exception ignored) {
            return buildFallbackStock(symbol);
        }
    }

    private Stock fetchLatestStock(String symbol) {
        try {
            Map<String, Object> quote = finnhubService.getQuote(symbol);
            if (quote == null || quote.get("c") == null) {
                return null;
            }
            Map<String, Object> profile = getCompanyProfile(symbol);

            BigDecimal currentPrice = toMoney(quote.get("c"));
            BigDecimal previousClose = toMoney(quote.get("pc"));
            BigDecimal change = toMoney(quote.get("d"));
            BigDecimal changePercent = toMoney(quote.get("dp"));

            Stock stock = new Stock();
            stock.setSymbol(symbol);
            stock.setName(stringOrDefault(profile.get("name"), symbol));
            stock.setSector(stringOrDefault(profile.get("finnhubIndustry"), "Unknown"));
            stock.setLogoUrl(getProfileLogo(profile));
            stock.setCurrentPrice(currentPrice);
            stock.setPreviousClose(previousClose);
            stock.setPriceChange(change);
            stock.setPriceChangePercent(changePercent);
            stock.setVolume(parseLong(quote.get("v")));
            stock.setLastUpdated(LocalDateTime.now());

            liveStocksCache.put(symbol, stock);
            cacheTime.put(symbol, Instant.now());
            return cloneStock(stock);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Map<String, Object> getCompanyProfile(String symbol) {
        Map<String, Object> cached = companyProfileCache.get(symbol);
        Instant updatedAt = companyProfileCacheTime.get(symbol);

        if (cached != null && updatedAt != null
                && Instant.now().minusSeconds(PROFILE_CACHE_SECONDS).isBefore(updatedAt)) {
            return cached;
        }

        try {
            Map<String, Object> profile = finnhubService.getCompanyProfile(symbol);
            if (profile != null) {
                companyProfileCache.put(symbol, profile);
                companyProfileCacheTime.put(symbol, Instant.now());
                return profile;
            }
        } catch (Exception ignored) {
        }

        return cached == null ? Map.of() : cached;
    }

    private String stringOrDefault(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? fallback : text;
    }

    private BigDecimal toMoney(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal number = BigDecimal.valueOf(Double.parseDouble(value.toString()));
        return number.setScale(2, RoundingMode.HALF_UP);
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Double.valueOf(value.toString()).longValue();
        } catch (Exception ignored) {
            return null;
        }
    }

    private Stock cloneStock(Stock source) {
        if (source == null) {
            return null;
        }
        Stock clone = new Stock();
        clone.setId(source.getId());
        clone.setSymbol(source.getSymbol());
        clone.setName(source.getName());
        clone.setSector(source.getSector());
        clone.setCurrentPrice(source.getCurrentPrice());
        clone.setPreviousClose(source.getPreviousClose());
        clone.setPriceChange(source.getPriceChange());
        clone.setPriceChangePercent(source.getPriceChangePercent());
        clone.setVolume(source.getVolume());
        clone.setLastUpdated(source.getLastUpdated());
        clone.setLogoUrl(source.getLogoUrl());
        return clone;
    }

    private Stock buildFallbackStock(String symbol) {
        String normalized = symbol.toUpperCase(Locale.ROOT);
        Stock cached = liveStocksCache.get(normalized);
        if (cached != null) {
            return cloneStock(cached);
        }

        Map<String, Object> profile = getCompanyProfile(normalized);
        Stock stock = new Stock();
        stock.setSymbol(normalized);
        stock.setName(stringOrDefault(profile.get("name"), normalized));
        stock.setSector(stringOrDefault(profile.get("finnhubIndustry"), "Unknown"));
        stock.setLogoUrl(getProfileLogo(profile));
        stock.setCurrentPrice(BigDecimal.ZERO);
        stock.setPreviousClose(BigDecimal.ZERO);
        stock.setPriceChange(BigDecimal.ZERO);
        stock.setPriceChangePercent(BigDecimal.ZERO);
        stock.setVolume(0L);
        stock.setLastUpdated(LocalDateTime.now());
        return stock;
    }

    private String getProfileLogo(Map<String, Object> profile) {
        if (profile == null || profile.get("logo") == null) {
            return null;
        }
        String logo = profile.get("logo").toString().trim();
        return logo.isEmpty() ? null : logo;
    }

}
