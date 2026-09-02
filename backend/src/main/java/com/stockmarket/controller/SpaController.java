package com.stockmarket.controller;

import java.util.Map;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class SpaController {

    @GetMapping({"/", "/register", "/dashboard", "/markets", "/portfolio", "/transactions",
            "/watchlist", "/wallet", "/stock/{symbol}"})
    public String index() {
        return "forward:/index.html";
    }

    @GetMapping("/health")
    @ResponseBody
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
