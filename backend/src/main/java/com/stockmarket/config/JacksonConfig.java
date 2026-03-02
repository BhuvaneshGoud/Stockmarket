package com.stockmarket.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {

        ObjectMapper mapper = new ObjectMapper();

        // ✅ Support LocalDateTime
        mapper.registerModule(new JavaTimeModule());

        // ✅ Avoid scientific notation for BigDecimal
        mapper.enable(JsonGenerator.Feature.WRITE_BIGDECIMAL_AS_PLAIN);

        // ✅ Proper date format (ISO)
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // ✅ Ignore unknown JSON fields (important for Alpha Vantage API)
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

        // ✅ Do not serialize null values
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);

        // ✅ Prevent empty bean errors
        mapper.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);

        return mapper;
    }
}