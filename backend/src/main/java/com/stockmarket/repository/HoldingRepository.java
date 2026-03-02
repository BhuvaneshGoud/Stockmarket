package com.stockmarket.repository;

import com.stockmarket.entity.Holding;
import com.stockmarket.entity.Stock;
import com.stockmarket.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HoldingRepository extends JpaRepository<Holding, Long> {

    List<Holding> findByUserId(Long userId);

    Optional<Holding> findByUserAndStock(User user, Stock stock);
}