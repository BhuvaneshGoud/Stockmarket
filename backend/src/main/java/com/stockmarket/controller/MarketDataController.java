package com.stockmarket.controller;

import com.stockmarket.dto.CandleDTO;
import com.stockmarket.service.MarketDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketDataController {

    private final MarketDataService marketDataService;

    @GetMapping("/{symbol}")
    public List<CandleDTO> getLiveData(@PathVariable String symbol) {
        return marketDataService.getIntradayData(symbol);
    }

    @GetMapping("/{symbol}/delivery")
    public List<CandleDTO> getDeliveryData(@PathVariable String symbol) {
        return marketDataService.getDeliveryData(symbol);
    }
}
