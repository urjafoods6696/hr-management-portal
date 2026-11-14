package com.company.hr.dto;

import com.company.hr.entity.Candidate;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateRequest {

    @NotBlank(message = "Candidate name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Mobile number is required")
    private String mobile;

    private BigDecimal experienceYears;
    private String currentEmployer;
    private String currentDesignation;
    private BigDecimal currentCtc;
    private BigDecimal expectedCtc;
    private Integer noticePeriodDays;
    private String primarySkills;
    private String linkedinUrl;
    private String professionalSummary;
    private String workExperience;
    private String educationDetails;
    private String certifications;
    private String hrNotes;
    private Candidate.CandidateSource source;

    private Long requisitionId;
    private String departmentName;
    private String location;
}
