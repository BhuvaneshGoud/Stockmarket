package com.stockmarket.config;

import com.stockmarket.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        @Bean
        public WebSecurityCustomizer webSecurityCustomizer() {
                return web -> web.ignoring().requestMatchers(
                                "/api/auth/**", "/health", "/", "/register", "/favicon.ico", "/assets/**");
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                http
                                // The React app is served by this same Spring Boot service in production.
                                .cors(AbstractHttpConfigurer::disable)
                                .csrf(csrf -> csrf.disable())
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(
                                                                new AntPathRequestMatcher("/api/auth/register", "POST"),
                                                                new AntPathRequestMatcher("/api/auth/login", "POST"),
                                                                new AntPathRequestMatcher("/health", "GET"),
                                                                new AntPathRequestMatcher("/", "GET"),
                                                                new AntPathRequestMatcher("/register", "GET"),
                                                                new AntPathRequestMatcher("/favicon.ico", "GET"),
                                                                new AntPathRequestMatcher("/assets/**", "GET"),
                                                                new AntPathRequestMatcher("/ws/**"))
                                                .permitAll()
                                                .anyRequest().authenticated())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .addFilterBefore(jwtAuthenticationFilter,
                                                UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }
}
