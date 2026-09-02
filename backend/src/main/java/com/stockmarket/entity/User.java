package com.stockmarket.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;   // or username (whichever you use)

    @Column(unique = true)
    private String email;

    private String password;

    private String role;

    @Column(nullable = false)
    private Double balance = 0.0;   // ✅ ADD THIS

    private LocalDateTime createdAt;

    @Version
    private Long version;
}
