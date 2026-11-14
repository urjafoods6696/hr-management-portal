package com.company.hr.service;

import com.company.hr.dto.CandidateProfileResponseDto.ParsedResumeDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Service
public class ResumeExtractionService {

    private static final Pattern SUMMARY_HEADING = Pattern.compile(
            "^(?:professional\\s+summary|career\\s+summary|executive\\s+summary|summary|profile|about\\s+me|career\\s+objective|objective)[:\\s-]*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern EXPERIENCE_HEADING = Pattern.compile(
            "^(?:work\\s+experience|professional\\s+experience|employment\\s+history|experience|work\\s+history|career\\s+history)[:\\s-]*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern EDUCATION_HEADING = Pattern.compile(
            "^(?:education|educational\\s+qualifications?|academic\\s+background|academic\\s+qualifications?|qualifications)[:\\s-]*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern CERTIFICATION_HEADING = Pattern.compile(
            "^(?:certifications?|licenses?\\s*(?:&|and)?\\s*certifications?|professional\\s+certifications?|courses\\s*(?:&|and)?\\s*certifications?)[:\\s-]*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SKILLS_HEADING = Pattern.compile(
            "^(?:skills|technical\\s+skills|core\\s+competencies|competencies|key\\s+skills|skills\\s*(?:&|and)?\\s*competencies)[:\\s-]*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern OTHER_SECTION_HEADING = Pattern.compile(
            "^(?:projects?|achievements?|awards?|languages?|references?|declarations?|personal\\s+details?|interests?|hobbies?)[:\\s-]*$",
            Pattern.CASE_INSENSITIVE);

    /**
     * Extract authentic plain text from the actual uploaded file bytes without inventing any content.
     */
    public String extractText(byte[] bytes, String fileName) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        String lowerName = fileName != null ? fileName.toLowerCase(Locale.ROOT) : "";

        try {
            if (lowerName.endsWith(".pdf")) {
                try (PDDocument doc = Loader.loadPDF(bytes)) {
                    String text = new PDFTextStripper().getText(doc);
                    return normalizeExtractedText(text);
                }
            }
            if (lowerName.endsWith(".docx")) {
                try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes));
                     XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
                    return normalizeExtractedText(extractor.getText());
                }
            }
            if (lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".csv")) {
                return normalizeExtractedText(new String(bytes, StandardCharsets.UTF_8));
            }
        } catch (Exception ex) {
            log.warn("Could not extract text from uploaded file {}: {}", fileName, ex.getMessage());
        }
        return null;
    }

    public String extractTextFromFile(Path path, String fileName) {
        if (path == null || !Files.exists(path)) {
            return null;
        }
        try {
            return extractText(Files.readAllBytes(path), fileName);
        } catch (Exception ex) {
            log.warn("Could not read file {}: {}", path, ex.getMessage());
            return null;
        }
    }

    /**
     * Parse ONLY sections explicitly labeled inside the uploaded document text.
     * Sections absent from the uploaded file stay null — never fabricated.
     */
    public ParsedResumeDto parseSections(String rawText) {
        String normalized = normalizeExtractedText(rawText);
        if (normalized == null) {
            return ParsedResumeDto.builder().build();
        }

        Map<String, List<String>> sections = new LinkedHashMap<>();
        String currentSection = null;

        for (String rawLine : normalized.split("\\r?\\n")) {
            String line = rawLine.trim();
            if (line.isEmpty()) {
                if (currentSection != null) {
                    List<String> buf = sections.get(currentSection);
                    if (buf != null && !buf.isEmpty() && !buf.get(buf.size() - 1).isEmpty()) {
                        buf.add("");
                    }
                }
                continue;
            }

            String matchedSection = matchSectionHeading(line);
            if (matchedSection != null) {
                currentSection = matchedSection;
                sections.computeIfAbsent(currentSection, k -> new ArrayList<>());
                continue;
            }

            // Support inline heading format like "Skills: Java, Spring Boot, SQL"
            String inlineKey = matchInlineSectionPrefix(line);
            if (inlineKey != null) {
                int colonIdx = line.indexOf(':');
                String remainder = line.substring(colonIdx + 1).trim();
                currentSection = inlineKey;
                List<String> list = sections.computeIfAbsent(currentSection, k -> new ArrayList<>());
                if (!remainder.isEmpty()) {
                    list.add(remainder);
                }
                continue;
            }

            if (currentSection != null && !"other".equals(currentSection)) {
                sections.computeIfAbsent(currentSection, k -> new ArrayList<>()).add(line);
            }
        }

        String skillsBlock = joinSection(sections.get("skills"));
        List<String> skillItems = splitSkills(skillsBlock);

        return ParsedResumeDto.builder()
                .rawText(normalized)
                .summary(joinSection(sections.get("summary")))
                .workExperience(joinSection(sections.get("experience")))
                .education(joinSection(sections.get("education")))
                .certifications(joinSection(sections.get("certifications")))
                .skills(skillsBlock)
                .skillItems(skillItems)
                .build();
    }

    private String matchSectionHeading(String line) {
        if (SUMMARY_HEADING.matcher(line).matches()) return "summary";
        if (EXPERIENCE_HEADING.matcher(line).matches()) return "experience";
        if (EDUCATION_HEADING.matcher(line).matches()) return "education";
        if (CERTIFICATION_HEADING.matcher(line).matches()) return "certifications";
        if (SKILLS_HEADING.matcher(line).matches()) return "skills";
        if (OTHER_SECTION_HEADING.matcher(line).matches()) return "other";
        return null;
    }

    private String matchInlineSectionPrefix(String line) {
        int colonIdx = line.indexOf(':');
        if (colonIdx <= 0 || colonIdx > 40) return null;
        String prefix = line.substring(0, colonIdx).trim();
        return matchSectionHeading(prefix);
    }

    private String joinSection(List<String> lines) {
        if (lines == null || lines.isEmpty()) return null;
        String joined = String.join("\n", lines).trim();
        return joined.isEmpty() ? null : joined;
    }

    private List<String> splitSkills(String skillsText) {
        if (skillsText == null || skillsText.isBlank()) return List.of();
        List<String> result = new ArrayList<>();
        for (String token : skillsText.split("[,;|•\\r\\n]+")) {
            String cleaned = token.trim();
            if (!cleaned.isEmpty() && cleaned.length() <= 60) {
                result.add(cleaned);
            }
        }
        return result;
    }

    private String normalizeExtractedText(String text) {
        if (text == null) return null;
        String trimmed = text.replace("\u0000", "").trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

