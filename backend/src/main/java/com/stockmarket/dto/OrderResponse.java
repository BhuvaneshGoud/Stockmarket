package com.stockmarket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private boolean success;
    private String message;
    private BigDecimal totalAmount;
    private Integer quantity;
    private String symbol;
}
