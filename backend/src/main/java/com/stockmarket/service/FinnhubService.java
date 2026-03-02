package com.stockmarket.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinnhubService {

    @Value("${finnhub.api.key}")
    private String apiKey;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> getQuote(String symbol) {
        return get("/quote", symbol);
    }

    public Map<String, Object> getCompanyProfile(String symbol) {
        return get("/stock/profile2", symbol);
    }

    private Map<String, Object> get(String endpoint, String symbol) {
        String url = UriComponentsBuilder
                .fromHttpUrl("https://finnhub.io/api/v1" + endpoint)
                .queryParam("symbol", symbol == null ? "" : symbol.toUpperCase())
                .queryParam("token", apiKey)
                .toUriString();

        try {
            String response = restTemplate.getForObject(url, String.class);
            if (response == null || response.isBlank()) {
                return Map.of();
            }

            JsonNode root = objectMapper.readTree(response);
            return objectMapper.convertValue(root, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            log.warn("Finnhub request failed for endpoint {} symbol {}", endpoint, symbol, e);
            return Map.of();
        }
    }
}
