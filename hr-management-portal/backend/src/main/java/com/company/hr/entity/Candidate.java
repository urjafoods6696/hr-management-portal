package com.company.hr.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "candidates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "candidate_code", nullable = false, unique = true, length = 50)
    private String candidateCode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 30)
    private String mobile;

    @Column(name = "experience_years", precision = 4, scale = 1)
    private BigDecimal experienceYears;

    @Column(name = "current_employer", length = 150)
    private String currentEmployer;

    @Column(name = "current_designation", length = 150)
    private String currentDesignation;

    @Column(name = "current_ctc", precision = 12, scale = 2)
    private BigDecimal currentCtc;

    @Column(name = "expected_ctc", precision = 12, scale = 2)
    private BigDecimal expectedCtc;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays;

    @Column(name = "primary_skills", columnDefinition = "TEXT")
    private String primarySkills;

    @Column(name = "linkedin_url", length = 300)
    private String linkedinUrl;

    @Column(name = "professional_summary", columnDefinition = "TEXT")
    private String professionalSummary;

    @Column(name = "work_experience", columnDefinition = "TEXT")
    private String workExperience;

    @Column(name = "education_details", columnDefinition = "TEXT")
    private String educationDetails;

    @Column(name = "certifications", columnDefinition = "TEXT")
    private String certifications;

    @Column(name = "hr_notes", columnDefinition = "TEXT")
    private String hrNotes;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private CandidateSource source;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "assignedRecruiter", "replacementForEmployee"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requisition_id", nullable = true)
    @NotFound(action = NotFoundAction.IGNORE)
    private Requisition requisition;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "department_name", length = 150)
    private String storedDepartment;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "location", length = 150)
    private String storedLocation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 35)
    @Builder.Default
    private CandidateStatus status = CandidateStatus.APPLIED;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "verified_by", length = 150)
    private String verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    @JsonProperty("requisitionId")
    public Long getAssignedRequisitionId() {
        try { return requisition != null ? requisition.getId() : null; } catch (Exception e) { return null; }
    }

    @Transient
    @JsonProperty("jobTitle")
    public String getJobTitle() {
        try {
            if (requisition != null && requisition.getJobTitle() != null && !requisition.getJobTitle().isBlank()) {
                return requisition.getJobTitle();
            }
        } catch (Exception ignored) {
        }
        return (currentDesignation != null && !currentDesignation.isBlank()) ? currentDesignation : null;
    }

    @Transient
    @JsonProperty("departmentName")
    public String getDepartmentName() {
        if (storedDepartment != null && !storedDepartment.isBlank()) {
            return storedDepartment;
        }
        try {
            if (requisition != null && requisition.getDepartment() != null
                    && requisition.getDepartment().getDepartmentName() != null
                    && !requisition.getDepartment().getDepartmentName().isBlank()) {
                return requisition.getDepartment().getDepartmentName();
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Transient
    @JsonProperty("location")
    public String getLocation() {
        return (storedLocation != null && !storedLocation.isBlank()) ? storedLocation : null;
    }

    @Transient
    @JsonProperty("appliedDate")
    public String getAppliedDate() {
        if (createdAt != null) {
            return createdAt.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy"));
        }
        return "";
    }

    @Transient
    @JsonProperty("currentStage")
    public String getCurrentStage() {
        if (status == null) return "Application Received";
        return switch (status) {
            case APPLIED -> "Application Received";
            case SCREENING -> "Screening";
            case SHORTLISTED -> "HR Round";
            case INTERVIEW_SCHEDULED, INTERVIEW_IN_PROGRESS -> "Technical Round";
            case OFFER_EXTENDED, OFFER_ACCEPTED, JOINING_SCHEDULED -> "Offer Released";
            case JOINED -> "Joined";
            case REJECTED, WITHDRAWN -> "Not Selected";
        };
    }

    @Transient
    @JsonProperty("displayStatus")
    public String getDisplayStatus() {
        if (status == null) return "New";
        return switch (status) {
            case APPLIED -> "New";
            case SCREENING, SHORTLISTED -> "In Progress";
            case INTERVIEW_SCHEDULED, INTERVIEW_IN_PROGRESS -> "Interview";
            case OFFER_EXTENDED, OFFER_ACCEPTED, JOINING_SCHEDULED -> "Offer";
            case JOINED -> "Joined";
            case REJECTED, WITHDRAWN -> "Rejected";
        };
    }

    @Transient
    @JsonProperty("avatar")
    public String getAvatar() {
        return null;
    }

    public enum CandidateSource {
        LINKEDIN,
        NAUKRI,
        REFERRAL,
        COMPANY_CAREERS,
        CAMPUS,
        HEADHUNTER
    }

    public enum CandidateStatus {
        APPLIED,
        SCREENING,
        SHORTLISTED,
        INTERVIEW_SCHEDULED,
        INTERVIEW_IN_PROGRESS,
        OFFER_EXTENDED,
        OFFER_ACCEPTED,
        JOINING_SCHEDULED,
        JOINED,
        REJECTED,
        WITHDRAWN
    }
}
