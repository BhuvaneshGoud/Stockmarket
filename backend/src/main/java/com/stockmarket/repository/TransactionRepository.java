package com.stockmarket.repository;

import com.stockmarket.entity.Transaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}