package com.stockmarket.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class StockLiveService {

    private final SimpMessagingTemplate messagingTemplate;
    private final StockService stockService;

    public StockLiveService(SimpMessagingTemplate messagingTemplate,
                            StockService stockService,
                            FinnhubService finnhubService) {
        this.messagingTemplate = messagingTemplate;
        this.stockService = stockService;
    }

    @Scheduled(fixedRate = 15000)
    public void broadcastStockUpdates() {
        messagingTemplate.convertAndSend("/topic/stocks", stockService.refreshLiveStocks());
    }
}
