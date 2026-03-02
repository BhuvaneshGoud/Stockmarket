package com.stockmarket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandleDTO {

    private long time;
    private double open;
    private double high;
    private double low;
    private double close;
    private double volume;
}
