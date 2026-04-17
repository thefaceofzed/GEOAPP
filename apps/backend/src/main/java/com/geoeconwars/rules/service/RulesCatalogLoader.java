package com.geoeconwars.rules.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.exception.NotFoundException;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

@Service
public class RulesCatalogLoader {

    private final ObjectMapper objectMapper;
    private final AppProperties properties;
    private List<RulesCatalog> catalogs = List.of();

    public RulesCatalogLoader(ObjectMapper objectMapper, AppProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @PostConstruct
    void loadCatalogs() throws IOException {
        Path path = Path.of(properties.rulesPath()).toAbsolutePath().normalize();
        List<RulesCatalog> loaded = Files.exists(path)
                ? loadFromFileSystem(path)
                : loadFromClasspath();

        if (loaded.isEmpty()) {
            throw new IllegalStateException("No rules files found in filesystem path or classpath fallback");
        }
        catalogs = List.copyOf(loaded);
    }

    private List<RulesCatalog> loadFromFileSystem(Path path) throws IOException {
        List<RulesCatalog> loaded = new ArrayList<>();
        try (var stream = Files.list(path)) {
            stream.filter(candidate -> candidate.getFileName().toString().endsWith(".json"))
                    .sorted(Comparator.comparing(Path::toString))
                    .forEach(candidate -> {
                        try {
                            loaded.add(objectMapper.readValue(candidate.toFile(), RulesCatalog.class));
                        } catch (IOException exception) {
                            throw new IllegalStateException("Failed to load rules file: " + candidate, exception);
                        }
                    });
        }
        return loaded;
    }

    private List<RulesCatalog> loadFromClasspath() throws IOException {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        List<RulesCatalog> loaded = new ArrayList<>();
        for (var resource : resolver.getResources("classpath*:scenario-rules/*.json")) {
            try (InputStream stream = resource.getInputStream()) {
                loaded.add(objectMapper.readValue(stream, RulesCatalog.class));
            }
        }
        return loaded;
    }

    public RulesCatalog activeCatalog() {
        return catalogs.stream()
                .max(Comparator.comparing(RulesCatalog::version))
                .orElseThrow(() -> new NotFoundException("No active rules catalog"));
    }
}
