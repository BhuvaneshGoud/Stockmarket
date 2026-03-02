package com.stockmarket.dto;

import com.stockmarket.enums.OrderType;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OrderRequest {

    @NotBlank(message = "Stock symbol is required")
    private String symbol;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @NotNull(message = "Order type is required")
    private OrderType orderType;

    // 🔐 userId will be set internally from JWT
    private Long userId;
}