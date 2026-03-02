package com.stockmarket.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockmarket.dto.CandleDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketDataService {

    @Value("${finnhub.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    private final Map<String, CachedResponse> cache = new ConcurrentHashMap<>();
    private static final long INTRADAY_CACHE_SECONDS = 30L;
    private static final long DELIVERY_CACHE_SECONDS = 300L;

    public List<CandleDTO> getIntradayData(String symbol) {
        symbol = symbol.toUpperCase();
        long now = Instant.now().getEpochSecond();
        long oneHourAgo = now - 3600;
        List<CandleDTO> intraday = fetchCandles(symbol, "1", oneHourAgo, now, INTRADAY_CACHE_SECONDS);
        if (!intraday.isEmpty()) {
            return intraday;
        }

        // Fallback for non-market hours / sparse intraday data.
        long oneWeekAgo = now - (7L * 24 * 3600);
        return fetchCandles(symbol, "5", oneWeekAgo, now, INTRADAY_CACHE_SECONDS);
    }

    public List<CandleDTO> getDeliveryData(String symbol) {
        symbol = symbol.toUpperCase();
        long now = Instant.now().getEpochSecond();
        long thirtyDaysAgo = now - (30L * 24 * 3600);
        return fetchCandles(symbol, "D", thirtyDaysAgo, now, DELIVERY_CACHE_SECONDS);
    }

    public Optional<Double> getLatestClosePrice(String symbol) {
        List<CandleDTO> candles = getIntradayData(symbol);
        if (candles.isEmpty()) {
            return Optional.empty();
        }
        CandleDTO latest = candles.get(candles.size() - 1);
        return Optional.of(latest.getClose());
    }

    private List<CandleDTO> fetchCandles(String symbol,
                                         String resolution,
                                         long from,
                                         long to,
                                         long ttlSeconds) {
        String cacheKey = symbol + ":" + resolution;
        CachedResponse cached = cache.get(cacheKey);
        if (cached != null && Instant.now().minusSeconds(ttlSeconds).isBefore(cached.timestamp)) {
            return cached.data;
        }

        String url = "https://finnhub.io/api/v1/stock/candle?symbol="
                + symbol
                + "&resolution=" + resolution
                + "&from=" + from
                + "&to=" + to
                + "&token=" + apiKey;

        try {
            String response = restTemplate.getForObject(url, String.class);
            JsonNode root = mapper.readTree(response);

            if (!root.has("s") || !"ok".equals(root.get("s").asText())) {
                log.warn("Finnhub returned no candle data for {} ({})", symbol, resolution);
                return Collections.emptyList();
            }

            JsonNode t = root.get("t");
            JsonNode o = root.get("o");
            JsonNode h = root.get("h");
            JsonNode l = root.get("l");
            JsonNode c = root.get("c");
            JsonNode v = root.get("v");

            List<CandleDTO> candles = new ArrayList<>();
            for (int i = 0; i < t.size(); i++) {
                candles.add(new CandleDTO(
                        t.get(i).asLong(),
                        o.get(i).asDouble(),
                        h.get(i).asDouble(),
                        l.get(i).asDouble(),
                        c.get(i).asDouble(),
                        v != null && v.size() > i ? v.get(i).asDouble() : 0d
                ));
            }

            cache.put(cacheKey, new CachedResponse(candles, Instant.now()));
            return candles;
        } catch (Exception e) {
            log.error("Market data fetch error for {} ({})", symbol, resolution, e);
            return Collections.emptyList();
        }
    }

    private static class CachedResponse {
        List<CandleDTO> data;
        Instant timestamp;

        CachedResponse(List<CandleDTO> data, Instant timestamp) {
            this.data = data;
            this.timestamp = timestamp;
        }
    }
}
