package br.com.estanteindie.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.PageableHandlerMethodArgumentResolverCustomizer;

@Configuration
public class PaginationConfig {

    @Value("${app.pagination.max-page-size:100}")
    private int maxPageSize;

    @Bean
    public PageableHandlerMethodArgumentResolverCustomizer pageableLimitsCustomizer() {
        return resolver -> resolver.setMaxPageSize(maxPageSize);
    }
}
