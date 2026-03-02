package com.stockmarket.repository;

import com.stockmarket.entity.Stock;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {

    Optional<Stock> findBySymbolIgnoreCase(String symbol);

    List<Stock> findBySectorIgnoreCase(String sector);

    List<Stock> findByNameContainingIgnoreCaseOrSymbolContainingIgnoreCase(
            String name,
            String symbol
    );
}