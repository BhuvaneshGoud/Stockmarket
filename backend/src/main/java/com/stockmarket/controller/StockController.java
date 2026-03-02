package com.stockmarket.controller;

import com.stockmarket.entity.Stock;
import com.stockmarket.service.StockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    // GET ALL STOCKS (live with short cache)
    @GetMapping
    public ResponseEntity<List<Stock>> getAllStocks() {
        return ResponseEntity.ok(stockService.getAllStocks());
    }

    // GET SINGLE STOCK (live update)
    @GetMapping("/{symbol}")
    public ResponseEntity<?> getStockBySymbol(@PathVariable String symbol) {
        try {
            Stock stock = stockService.getStockBySymbol(symbol.toUpperCase());
            return ResponseEntity.ok(stock);
        } catch (Exception e) {
            log.error("Stock fetch error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Stock not found"));
        }
    }

    // SEARCH STOCKS
    @GetMapping("/search")
    public ResponseEntity<List<Stock>> searchStocks(@RequestParam String q) {
        return ResponseEntity.ok(stockService.searchStocks(q));
    }

    // FILTER BY SECTOR
    @GetMapping("/sector/{sector}")
    public ResponseEntity<List<Stock>> getStocksBySector(@PathVariable String sector) {
        return ResponseEntity.ok(stockService.getStocksBySector(sector));
    }
}
