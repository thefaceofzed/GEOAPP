package com.geoeconwars;

import com.geoeconwars.shared.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(AppProperties.class)
public class GeoEconWarsApplication {

    public static void main(String[] args) {
        SpringApplication.run(GeoEconWarsApplication.class, args);
    }
}
