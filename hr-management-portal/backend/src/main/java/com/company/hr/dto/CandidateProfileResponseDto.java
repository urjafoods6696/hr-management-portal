package com.company.hr.dto;

import com.company.hr.entity.Candidate;
import com.company.hr.entity.CandidateDocument;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateProfileResponseDto {

    private Candidate candidate;
    private List<CandidateDocumentDto> documents;
    private ResumeContentDto resumeContent;
    private List<InterviewItemDto> interviews;
    private List<FeedbackItemDto> feedbacks;
    private List<HistoryItemDto> history;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandidateDocumentDto {
        private Long id;
        private CandidateDocument.DocumentType documentType;
        private String fileName;
        private Long fileSizeBytes;
        private LocalDateTime createdAt;
        private boolean hasExtractedText;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParsedResumeDto {
        private String rawText;
        private String summary;
        private String workExperience;
        private String education;
        private String certifications;
        private String skills;
        private List<String> skillItems;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResumeContentDto {
        private Long documentId;
        private String fileName;
        private Long fileSizeBytes;
        private LocalDateTime uploadedAt;
        private boolean textExtracted;
        private String rawText;
        private String summary;
        private String workExperience;
        private String education;
        private String certifications;
        private String skills;
        private List<String> skillItems;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InterviewItemDto {
        private Long id;
        private String round;
        private LocalDateTime scheduledAt;
        private Integer durationMinutes;
        private String mode;
        private String meetingLink;
        private String meetingLocation;
        private String status;
        private String interviewerName;
        private String jobTitle;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedbackItemDto {
        private Long id;
        private Long interviewId;
        private String round;
        private String interviewerName;
        private Integer technicalRating;
        private Integer communicationRating;
        private Integer cultureFitRating;
        private BigDecimal overallRating;
        private String recommendation;
        private String strengths;
        private String weaknesses;
        private String detailedComments;
        private LocalDateTime submittedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryItemDto {
        private LocalDateTime timestamp;
        private String title;
        private String description;
        private String actorName;
        private String sourceType;
    }
}

