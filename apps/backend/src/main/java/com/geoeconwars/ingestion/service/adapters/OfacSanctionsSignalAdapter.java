package com.geoeconwars.ingestion.service.adapters;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.service.RawSignalRecord;
import com.geoeconwars.ingestion.service.SignalAdapter;
import com.geoeconwars.shared.config.AppProperties;
import java.math.BigDecimal;
import java.io.StringReader;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

@Component
public class OfacSanctionsSignalAdapter extends AbstractSignalAdapter implements SignalAdapter {

    public OfacSanctionsSignalAdapter(ObjectMapper objectMapper, AppProperties properties) {
        super(objectMapper, properties);
    }

    @Override
    public String sourceName() {
        return "OFAC";
    }

    @Override
    public String sourceKey() {
        return "sanctions";
    }

    @Override
    public boolean isEnabled() {
        return properties.ingestion().sanctions().enabled();
    }

    @Override
    public List<RawSignalRecord> fetchSignals() {
        String url = properties.ingestion().sanctions().baseUrl();
        String body = restClient.get().uri(url).retrieve().body(String.class);
        return parseBody(body, Instant.now(), url);
    }

    List<RawSignalRecord> parseBody(String body, Instant fetchedAt, String requestUrl) {
        try {
            Document document = secureDocument(body);
            NodeList entries = document.getElementsByTagName("sdnEntry");
            List<RawSignalRecord> signals = new ArrayList<>();
            for (int index = 0; index < Math.min(entries.getLength(), maxSignalsPerSource()); index++) {
                Element entry = (Element) entries.item(index);
                String uid = childText(entry, "uid");
                String firstName = childText(entry, "firstName");
                String lastName = childText(entry, "lastName");
                String program = joinChildren(entry, "program");
                String remarks = childText(entry, "remarks");
                String name = (firstName + " " + lastName).trim();
                if (name.isBlank()) {
                    name = childText(entry, "sdnType");
                }
                String summary = (name + " appears in OFAC sanctions programs " + blankSafe(program) + ". " + blankSafe(remarks)).trim();

                signals.add(new RawSignalRecord(
                        sourceName(),
                        SignalSourceType.SCRAPED,
                        requestUrl,
                        fetchedAt,
                        List.of(),
                        topicTags(program),
                        SignalType.SANCTIONS_SIGNAL,
                        SignalSentiment.NEGATIVE,
                        BigDecimal.valueOf(78),
                        "OFAC sanctions update: " + name,
                        summary.replaceAll("\\s+", " ").trim(),
                        uid == null || uid.isBlank() ? requestUrl + "#" + index : uid
                ));
            }
            return signals;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse OFAC response", exception);
        }
    }

    private Document secureDocument(String xmlBody) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setExpandEntityReferences(false);
        factory.setXIncludeAware(false);
        factory.setNamespaceAware(false);
        return factory.newDocumentBuilder().parse(new InputSource(new StringReader(xmlBody)));
    }

    private List<String> topicTags(String program) {
        Set<String> tags = new LinkedHashSet<>();
        tags.add("sanctions");
        tags.add("ofac");
        if (program != null && !program.isBlank()) {
            tags.add(program.toLowerCase(Locale.ROOT).replace(' ', '-'));
        }
        return List.copyOf(tags);
    }

    private String joinChildren(Element parent, String childName) {
        NodeList nodes = parent.getElementsByTagName(childName);
        List<String> values = new ArrayList<>();
        for (int index = 0; index < nodes.getLength(); index++) {
            Node node = nodes.item(index);
            if (node.getTextContent() != null && !node.getTextContent().isBlank()) {
                values.add(node.getTextContent().trim());
            }
        }
        return String.join(", ", values);
    }

    private String childText(Element parent, String childName) {
        NodeList nodes = parent.getElementsByTagName(childName);
        if (nodes.getLength() == 0 || nodes.item(0).getTextContent() == null) {
            return "";
        }
        return nodes.item(0).getTextContent().trim();
    }

    private String blankSafe(String value) {
        return value == null ? "" : value.trim();
    }
}
