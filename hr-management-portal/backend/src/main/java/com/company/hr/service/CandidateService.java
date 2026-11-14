package com.company.hr.service;

import com.company.hr.dto.CandidateProfileResponseDto;
import com.company.hr.dto.CandidateRequest;
import com.company.hr.dto.CandidateStatsDto;
import com.company.hr.entity.AuditLog;
import com.company.hr.entity.Candidate;
import com.company.hr.entity.CandidateDocument;
import com.company.hr.entity.Interview;
import com.company.hr.entity.InterviewFeedback;
import com.company.hr.entity.Requisition;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.AuditLogRepository;
import com.company.hr.repository.CandidateDocumentRepository;
import com.company.hr.repository.CandidateRepository;
import com.company.hr.repository.InterviewRepository;
import com.company.hr.repository.RequisitionRepository;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final RequisitionRepository requisitionRepository;
    private final CandidateDocumentRepository candidateDocumentRepository;
    private final InterviewRepository interviewRepository;
    private final AccessPolicyService accessPolicyService;
    private final ResumeExtractionService resumeExtractionService;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;

    private static final List<Candidate.CandidateStatus> SCREENING_STATUSES = List.of(
            Candidate.CandidateStatus.SCREENING,
            Candidate.CandidateStatus.SHORTLISTED);
    private static final List<Candidate.CandidateStatus> INTERVIEW_STATUSES = List.of(
            Candidate.CandidateStatus.INTERVIEW_SCHEDULED,
            Candidate.CandidateStatus.INTERVIEW_IN_PROGRESS);
    private static final List<Candidate.CandidateStatus> OFFER_STATUSES = List.of(
            Candidate.CandidateStatus.OFFER_EXTENDED,
            Candidate.CandidateStatus.OFFER_ACCEPTED);
    private static final List<Candidate.CandidateStatus> REJECTED_STATUSES = List.of(
            Candidate.CandidateStatus.REJECTED,
            Candidate.CandidateStatus.WITHDRAWN);

    @Transactional
    public Candidate createCandidate(CandidateRequest request) {
        Requisition requisition = null;
        if (request.getRequisitionId() != null) {
            requisition = requisitionRepository.findById(request.getRequisitionId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Requisition not found with ID: " + request.getRequisitionId()));
        }

        String resolvedDepartment = (request.getDepartmentName() != null && !request.getDepartmentName().isBlank())
                ? request.getDepartmentName().trim()
                : (requisition != null && requisition.getDepartment() != null
                        ? requisition.getDepartment().getDepartmentName()
                        : null);
        String resolvedLocation = (request.getLocation() != null && !request.getLocation().isBlank())
                ? request.getLocation().trim()
                : null;

        String code = "CAN-" + LocalDate.now().getYear() + "-"
                + UUID.randomUUID().toString().substring(0, 5).toUpperCase();

        Candidate candidate = Candidate.builder()
                .candidateCode(code)
                .name(request.getName().trim())
                .email(request.getEmail().trim())
                .mobile(request.getMobile().trim())
                .experienceYears(request.getExperienceYears())
                .currentEmployer(blankToNull(request.getCurrentEmployer()))
                .currentDesignation(blankToNull(request.getCurrentDesignation()))
                .currentCtc(request.getCurrentCtc())
                .expectedCtc(request.getExpectedCtc())
                .noticePeriodDays(request.getNoticePeriodDays())
                .primarySkills(blankToNull(request.getPrimarySkills()))
                .linkedinUrl(blankToNull(request.getLinkedinUrl()))
                .professionalSummary(blankToNull(request.getProfessionalSummary()))
                .workExperience(blankToNull(request.getWorkExperience()))
                .educationDetails(blankToNull(request.getEducationDetails()))
                .certifications(blankToNull(request.getCertifications()))
                .hrNotes(blankToNull(request.getHrNotes()))
                .source(request.getSource())
                .requisition(requisition)
                .storedDepartment(resolvedDepartment)
                .storedLocation(resolvedLocation)
                .status(Candidate.CandidateStatus.APPLIED)
                .isVerified(false)
                .build();

        Candidate saved = candidateRepository.save(candidate);
        auditService.logAction(null, null, "CANDIDATE_CREATED", "Candidate", String.valueOf(saved.getId()), null, null, null);
        return saved;
    }

    @Transactional
    public Candidate updateCandidate(Long id, CandidateRequest request) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + id));

        candidate.setName(request.getName().trim());
        candidate.setEmail(request.getEmail().trim());
        candidate.setMobile(request.getMobile().trim());
        candidate.setExperienceYears(request.getExperienceYears());
        candidate.setCurrentEmployer(blankToNull(request.getCurrentEmployer()));
        candidate.setCurrentDesignation(blankToNull(request.getCurrentDesignation()));
        candidate.setCurrentCtc(request.getCurrentCtc());
        candidate.setExpectedCtc(request.getExpectedCtc());
        candidate.setNoticePeriodDays(request.getNoticePeriodDays());
        candidate.setPrimarySkills(blankToNull(request.getPrimarySkills()));
        candidate.setLinkedinUrl(blankToNull(request.getLinkedinUrl()));
        candidate.setProfessionalSummary(blankToNull(request.getProfessionalSummary()));
        candidate.setWorkExperience(blankToNull(request.getWorkExperience()));
        candidate.setEducationDetails(blankToNull(request.getEducationDetails()));
        candidate.setCertifications(blankToNull(request.getCertifications()));
        candidate.setHrNotes(blankToNull(request.getHrNotes()));
        candidate.setSource(request.getSource());
        candidate.setStoredDepartment(blankToNull(request.getDepartmentName()));
        candidate.setStoredLocation(blankToNull(request.getLocation()));

        if (request.getRequisitionId() != null) {
            Long currentReqId = candidate.getRequisition() != null ? candidate.getRequisition().getId() : null;
            if (!request.getRequisitionId().equals(currentReqId)) {
                Requisition newReq = requisitionRepository.findById(request.getRequisitionId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Requisition not found with ID: " + request.getRequisitionId()));
                candidate.setRequisition(newReq);
            }
        }

        Candidate saved = candidateRepository.save(candidate);
        auditService.logAction(null, null, "CANDIDATE_UPDATED", "Candidate", String.valueOf(saved.getId()), null, null, null);
        return saved;
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Transactional(readOnly = true)
    public Page<Candidate> getAllCandidates(Pageable pageable) {
        return candidateRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Candidate> filterCandidates(String search, Long reqId, String dept, String statusStr, String sourceStr,
            UserPrincipal currentUser, Pageable pageable) {
        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");

            // IT Admin check: must have policy permission to view candidate business
            // records
            if (isITAdmin && !isHRAdmin && !accessPolicyService.canItAdminAccessCandidates()) {
                return Page.empty(pageable);
            }
        }

        List<String> statusNames = List.of();
        if (statusStr != null && !statusStr.isBlank() && !statusStr.equalsIgnoreCase("ALL")) {
            String normalized = statusStr.trim().toUpperCase().replace(" ", "_");
            switch (normalized) {
                case "NEW", "NEW_APPLICATIONS", "APPLIED" -> statusNames = List.of(Candidate.CandidateStatus.APPLIED.name());
                case "IN_PROGRESS", "IN_SCREENING", "SCREENING" ->
                    statusNames = SCREENING_STATUSES.stream().map(Enum::name).toList();
                case "INTERVIEW", "IN_INTERVIEW", "INTERVIEW_SCHEDULED" ->
                    statusNames = INTERVIEW_STATUSES.stream().map(Enum::name).toList();
                case "OFFER", "OFFER_STAGE", "OFFER_EXTENDED" ->
                    statusNames = OFFER_STATUSES.stream().map(Enum::name).toList();
                case "REJECTED" ->
                    statusNames = REJECTED_STATUSES.stream().map(Enum::name).toList();
                default -> {
                    try {
                        statusNames = List.of(Candidate.CandidateStatus.valueOf(normalized).name());
                    } catch (Exception ignored) {
                    }
                }
            }
        }

        Candidate.CandidateSource source = null;
        if (sourceStr != null && !sourceStr.isBlank() && !sourceStr.equalsIgnoreCase("ALL")) {
            try {
                String s = sourceStr.trim().toUpperCase().replace(" ", "_");
                if (s.contains("WEBSITE") || s.contains("CAREERS"))
                    source = Candidate.CandidateSource.COMPANY_CAREERS;
                else
                    source = Candidate.CandidateSource.valueOf(s);
            } catch (Exception ignored) {
            }
        }

        String searchKeyword = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        String deptName = (dept != null && !dept.isBlank() && !dept.equalsIgnoreCase("ALL")) ? dept.trim() : null;
        Long deptRestrictionId = null;

        Long recruiterId = null;
        Long interviewerId = null;

        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            boolean isRecruiter = roles.contains("ROLE_HR_RECRUITER");
            boolean isInterviewer = roles.contains("ROLE_INTERVIEWER");

            if (!isHRAdmin && !isITAdmin && roles.contains("ROLE_DEPT_HEAD")) {
                deptRestrictionId = currentUser.getDepartmentRestrictionId();
            }

            if (isRecruiter && !isHRAdmin) {
                recruiterId = currentUser.getId();
            } else if (isInterviewer && !isHRAdmin) {
                interviewerId = currentUser.getId();
            }
        }

        boolean hasStatus = !statusNames.isEmpty();
        List<String> statusesParam = hasStatus ? statusNames : List.of("__NONE__");
        String sourceStrParam = source != null ? source.name() : null;

        if (recruiterId != null || interviewerId != null) {
            return candidateRepository.filterCandidatesWithRoleScope(searchKeyword, reqId, deptName, hasStatus,
                    statusesParam, sourceStrParam, deptRestrictionId, recruiterId, interviewerId, pageable);
        }

        return candidateRepository.filterCandidates(searchKeyword, reqId, deptName, hasStatus, statusesParam,
                sourceStrParam, deptRestrictionId, pageable);
    }

    @Transactional(readOnly = true)
    public CandidateStatsDto getCandidateStats(UserPrincipal currentUser) {
        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
            boolean isRecruiter = roles.contains("ROLE_HR_RECRUITER");
            boolean isInterviewer = roles.contains("ROLE_INTERVIEWER");

            if (isITAdmin && !isHRAdmin && !accessPolicyService.canItAdminAccessCandidates()) {
                return CandidateStatsDto.builder().totalCandidates(0L).newApplications(0L).newThisWeek(0L)
                        .inScreening(0L).inInterview(0L).offerStage(0L).rejected(0L).build();
            }

            if (isRecruiter && !isHRAdmin) {
                java.time.LocalDateTime sevenDaysAgo = java.time.LocalDateTime.now().minusDays(7);
                long total = candidateRepository.countByRequisitionAssignedRecruiterId(currentUser.getId());
                long newApps = candidateRepository.countByRequisitionAssignedRecruiterIdAndStatus(currentUser.getId(),
                        Candidate.CandidateStatus.APPLIED);
                long newThisWeek = candidateRepository.countNewSinceForRecruiter(sevenDaysAgo, currentUser.getId());
                long screening = candidateRepository.countByRequisitionAssignedRecruiterIdAndStatusIn(currentUser.getId(),
                        SCREENING_STATUSES);
                long interview = candidateRepository.countByRequisitionAssignedRecruiterIdAndStatusIn(currentUser.getId(),
                        INTERVIEW_STATUSES);
                long offer = candidateRepository.countByRequisitionAssignedRecruiterIdAndStatusIn(currentUser.getId(),
                        OFFER_STATUSES);
                long rejected = candidateRepository.countByRequisitionAssignedRecruiterIdAndStatusIn(currentUser.getId(),
                        REJECTED_STATUSES);

                return CandidateStatsDto.builder()
                        .totalCandidates(total)
                        .newApplications(newApps)
                        .newThisWeek(newThisWeek)
                        .inScreening(screening)
                        .inInterview(interview)
                        .offerStage(offer)
                        .rejected(rejected)
                        .build();
            }

            if (isInterviewer && !isHRAdmin) {
                long interviewCount = interviewRepository.countByInterviewerId(currentUser.getId());
                return CandidateStatsDto.builder()
                        .totalCandidates(interviewCount)
                        .newApplications(0L)
                        .newThisWeek(0L)
                        .inScreening(0L)
                        .inInterview(interviewCount)
                        .offerStage(0L)
                        .rejected(0L)
                        .build();
            }
        }

        Long deptRestrictionId = null;
        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            if (!isHRAdmin && !isITAdmin && roles.contains("ROLE_DEPT_HEAD")) {
                deptRestrictionId = currentUser.getDepartmentRestrictionId();
            }
        }
        boolean isDeptHead = deptRestrictionId != null;
        java.time.LocalDateTime sevenDaysAgo = java.time.LocalDateTime.now().minusDays(7);

        if (isDeptHead) {
            long total = candidateRepository.countTotal(deptRestrictionId);
            long newApps = candidateRepository.countByStatusAndDept(Candidate.CandidateStatus.APPLIED,
                    deptRestrictionId);
            long newThisWeek = candidateRepository.countNewSince(sevenDaysAgo, deptRestrictionId);
            long screening = candidateRepository.countByStatusInAndDept(SCREENING_STATUSES, deptRestrictionId);
            long interview = candidateRepository.countByStatusInAndDept(INTERVIEW_STATUSES, deptRestrictionId);
            long offer = candidateRepository.countByStatusInAndDept(OFFER_STATUSES, deptRestrictionId);
            long rejected = candidateRepository.countByStatusInAndDept(REJECTED_STATUSES, deptRestrictionId);

            return CandidateStatsDto.builder()
                    .totalCandidates(total)
                    .newApplications(newApps)
                    .newThisWeek(newThisWeek)
                    .inScreening(screening)
                    .inInterview(interview)
                    .offerStage(offer)
                    .rejected(rejected)
                    .build();
        }

        long total = candidateRepository.count();
        long newApps = candidateRepository.countByStatus(Candidate.CandidateStatus.APPLIED);
        long newThisWeek = candidateRepository.countByCreatedAtGreaterThanEqual(sevenDaysAgo);
        long screening = candidateRepository.countByStatusIn(SCREENING_STATUSES);
        long interview = candidateRepository.countByStatusIn(INTERVIEW_STATUSES);
        long offer = candidateRepository.countByStatusIn(OFFER_STATUSES);
        long rejected = candidateRepository.countByStatusIn(REJECTED_STATUSES);

        return CandidateStatsDto.builder()
                .totalCandidates(total)
                .newApplications(newApps)
                .newThisWeek(newThisWeek)
                .inScreening(screening)
                .inInterview(interview)
                .offerStage(offer)
                .rejected(rejected)
                .build();
    }

    @Transactional(readOnly = true)
    public List<Candidate> getCandidatesByRequisition(Long requisitionId) {
        return candidateRepository.findByRequisitionId(requisitionId);
    }

    @Transactional(readOnly = true)
    public Candidate getCandidateById(Long id, UserPrincipal currentUser) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + id));

        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
            boolean isRecruiter = roles.contains("ROLE_HR_RECRUITER");
            boolean isInterviewer = roles.contains("ROLE_INTERVIEWER");

            if (!isHRAdmin) {
                boolean isAssigned = interviewRepository.existsByCandidateIdAndInterviewerId(id, currentUser.getId());
                if (isAssigned) {
                    return candidate;
                }

                if (isITAdmin && !accessPolicyService.canItAdminAccessCandidates()) {
                    throw new AccessDeniedException(
                            "IT Administrator is restricted from accessing candidate records by security policy");
                }

                if (isRecruiter) {
                    Long recruiterId = (candidate.getRequisition() != null
                            && candidate.getRequisition().getAssignedRecruiter() != null)
                                    ? candidate.getRequisition().getAssignedRecruiter().getId()
                                    : null;
                    if (recruiterId != null && recruiterId.equals(currentUser.getId())) {
                        return candidate;
                    }
                }

                throw new AccessDeniedException(
                        "Access denied: You are only authorized to view candidate records assigned to your interview schedule or requisitions");
            }
        }

        return candidate;
    }

    @Transactional
    public Candidate updateStatus(Long id, Candidate.CandidateStatus status) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + id));
        Candidate.CandidateStatus prev = candidate.getStatus();
        candidate.setStatus(status);
        Candidate saved = candidateRepository.save(candidate);
        auditService.logAction(
                null,
                null,
                "CANDIDATE_STAGE_UPDATED",
                "Candidate",
                String.valueOf(id),
                prev != null ? "\"" + prev.name() + "\"" : null,
                "\"" + status.name() + "\"",
                null);
        return saved;
    }

    @Transactional
    public Candidate verifyCandidate(Long id, boolean verified, UserPrincipal currentUser) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + id));
        String actorName = currentUser != null ? currentUser.getName() : "HR Administrator";
        Long actorId = currentUser != null ? currentUser.getId() : null;

        candidate.setIsVerified(verified);
        if (verified) {
            candidate.setVerifiedBy(actorName);
            candidate.setVerifiedAt(LocalDateTime.now());
        } else {
            candidate.setVerifiedBy(null);
            candidate.setVerifiedAt(null);
        }

        Candidate saved = candidateRepository.save(candidate);
        auditService.logAction(
                actorId,
                actorName,
                verified ? "CANDIDATE_VERIFIED" : "CANDIDATE_UNVERIFIED",
                "Candidate",
                String.valueOf(id),
                null,
                null,
                null);
        return saved;
    }

    @Transactional(readOnly = true)
    public CandidateProfileResponseDto getCandidateProfile(Long id, UserPrincipal currentUser) {
        Candidate candidate = getCandidateById(id, currentUser);

        boolean canViewResumes = true;
        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
            if (isITAdmin && !isHRAdmin && !accessPolicyService.canItAdminAccessResumes()) {
                canViewResumes = false;
            }
        }

        List<CandidateDocument> docs = canViewResumes
                ? candidateDocumentRepository.findByCandidateId(id)
                : List.of();

        List<CandidateProfileResponseDto.CandidateDocumentDto> docDtos = docs.stream()
                .sorted(Comparator.comparing(CandidateDocument::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(d -> CandidateProfileResponseDto.CandidateDocumentDto.builder()
                        .id(d.getId())
                        .documentType(d.getDocumentType())
                        .fileName(d.getFileName())
                        .fileSizeBytes(d.getFileSizeBytes())
                        .createdAt(d.getCreatedAt())
                        .hasExtractedText(d.getExtractedText() != null && !d.getExtractedText().isBlank())
                        .build())
                .toList();

        CandidateDocument primaryResume = docs.stream()
                .filter(d -> d.getDocumentType() == CandidateDocument.DocumentType.RESUME)
                .max(Comparator.comparing(CandidateDocument::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);

        CandidateProfileResponseDto.ResumeContentDto resumeContent = null;
        if (primaryResume != null) {
            String rawText = primaryResume.getExtractedText();
            if ((rawText == null || rawText.isBlank()) && primaryResume.getStorageKey() != null) {
                rawText = resumeExtractionService.extractTextFromFile(
                        Paths.get(primaryResume.getStorageKey()), primaryResume.getFileName());
            }
            CandidateProfileResponseDto.ParsedResumeDto parsed = resumeExtractionService.parseSections(rawText);
            resumeContent = CandidateProfileResponseDto.ResumeContentDto.builder()
                    .documentId(primaryResume.getId())
                    .fileName(primaryResume.getFileName())
                    .fileSizeBytes(primaryResume.getFileSizeBytes())
                    .uploadedAt(primaryResume.getCreatedAt())
                    .textExtracted(parsed.getRawText() != null && !parsed.getRawText().isBlank())
                    .rawText(parsed.getRawText())
                    .summary(parsed.getSummary())
                    .workExperience(parsed.getWorkExperience())
                    .education(parsed.getEducation())
                    .certifications(parsed.getCertifications())
                    .skills(parsed.getSkills())
                    .skillItems(parsed.getSkillItems())
                    .build();
        }

        List<Interview> candidateInterviews = interviewRepository.findByCandidateId(id);
        List<CandidateProfileResponseDto.InterviewItemDto> interviewItems = candidateInterviews.stream()
                .sorted(Comparator.comparing(Interview::getScheduledAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(i -> CandidateProfileResponseDto.InterviewItemDto.builder()
                        .id(i.getId())
                        .round(i.getRound() != null ? i.getRound().name() : null)
                        .scheduledAt(i.getScheduledAt())
                        .durationMinutes(i.getDurationMinutes())
                        .mode(i.getMode() != null ? i.getMode().name() : null)
                        .meetingLink(i.getMeetingLink())
                        .meetingLocation(i.getMeetingLocation())
                        .status(i.getStatus() != null ? i.getStatus().name() : null)
                        .interviewerName(i.getInterviewer() != null ? i.getInterviewer().getName() : null)
                        .jobTitle(i.getRequisition() != null ? i.getRequisition().getJobTitle() : candidate.getJobTitle())
                        .build())
                .toList();

        List<CandidateProfileResponseDto.FeedbackItemDto> feedbackItems = candidateInterviews.stream()
                .filter(i -> i.getFeedback() != null)
                .map(i -> {
                    InterviewFeedback fb = i.getFeedback();
                    return CandidateProfileResponseDto.FeedbackItemDto.builder()
                            .id(fb.getId())
                            .interviewId(i.getId())
                            .round(i.getRound() != null ? i.getRound().name() : null)
                            .interviewerName(i.getInterviewer() != null ? i.getInterviewer().getName() : null)
                            .technicalRating(fb.getTechnicalRating())
                            .communicationRating(fb.getCommunicationRating())
                            .cultureFitRating(fb.getCultureFitRating())
                            .overallRating(fb.getOverallRating())
                            .recommendation(fb.getRecommendation() != null ? fb.getRecommendation().name() : null)
                            .strengths(fb.getStrengths())
                            .weaknesses(fb.getWeaknesses())
                            .detailedComments(fb.getDetailedComments())
                            .submittedAt(fb.getSubmittedAt())
                            .build();
                })
                .sorted(Comparator.comparing(CandidateProfileResponseDto.FeedbackItemDto::getSubmittedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        List<CandidateProfileResponseDto.HistoryItemDto> historyItems = new ArrayList<>();
        if (candidate.getCreatedAt() != null) {
            historyItems.add(CandidateProfileResponseDto.HistoryItemDto.builder()
                    .timestamp(candidate.getCreatedAt())
                    .title("Candidate Registered")
                    .description("Candidate profile created (" + candidate.getCandidateCode() + ")"
                            + (candidate.getSource() != null ? " via " + candidate.getSource().name() : ""))
                    .sourceType("Candidate Record")
                    .build());
        }
        for (CandidateDocument d : docs) {
            historyItems.add(CandidateProfileResponseDto.HistoryItemDto.builder()
                    .timestamp(d.getCreatedAt())
                    .title("Document Uploaded")
                    .description(d.getDocumentType().name() + ": " + d.getFileName())
                    .sourceType("Uploaded Document")
                    .build());
        }
        if (Boolean.TRUE.equals(candidate.getIsVerified()) && candidate.getVerifiedAt() != null) {
            historyItems.add(CandidateProfileResponseDto.HistoryItemDto.builder()
                    .timestamp(candidate.getVerifiedAt())
                    .title("Candidate Verified")
                    .description("Profile explicitly verified by " + (candidate.getVerifiedBy() != null ? candidate.getVerifiedBy() : "HR Admin"))
                    .actorName(candidate.getVerifiedBy())
                    .sourceType("HR Verification")
                    .build());
        }
        for (Interview i : candidateInterviews) {
            historyItems.add(CandidateProfileResponseDto.HistoryItemDto.builder()
                    .timestamp(i.getCreatedAt() != null ? i.getCreatedAt() : i.getScheduledAt())
                    .title("Interview Scheduled")
                    .description((i.getRound() != null ? i.getRound().name() : "Interview")
                            + (i.getInterviewer() != null ? " with " + i.getInterviewer().getName() : ""))
                    .sourceType("Interview")
                    .build());
        }
        List<AuditLog> logs = auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc("Candidate", String.valueOf(id));
        for (AuditLog logEntry : logs) {
            if ("CANDIDATE_CREATED".equals(logEntry.getAction())
                    || "RESUME_UPLOADED".equals(logEntry.getAction())
                    || "CANDIDATE_VERIFIED".equals(logEntry.getAction())) {
                continue;
            }
            historyItems.add(CandidateProfileResponseDto.HistoryItemDto.builder()
                    .timestamp(logEntry.getTimestamp())
                    .title(logEntry.getAction().replace("_", " "))
                    .description(logEntry.getNewValue() != null ? "Updated to " + logEntry.getNewValue().replace("\"", "") : "Candidate record updated")
                    .actorName(logEntry.getActorName())
                    .sourceType("Audit Trail")
                    .build());
        }
        historyItems.sort(Comparator.comparing(CandidateProfileResponseDto.HistoryItemDto::getTimestamp,
                Comparator.nullsLast(Comparator.reverseOrder())));

        return CandidateProfileResponseDto.builder()
                .candidate(candidate)
                .documents(docDtos)
                .resumeContent(resumeContent)
                .interviews(interviewItems)
                .feedbacks(feedbackItems)
                .history(historyItems)
                .build();
    }

    @Transactional(readOnly = true)
    public CandidateDocument getResumeDocumentForDownload(Long candidateId, Long documentId, UserPrincipal currentUser) {
        getCandidateById(candidateId, currentUser);
        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
            if (isITAdmin && !isHRAdmin && !accessPolicyService.canItAdminAccessResumes()) {
                throw new AccessDeniedException(
                        "IT Administrator is restricted from downloading or viewing candidate resumes");
            }
        }
        List<CandidateDocument> docs = candidateDocumentRepository.findByCandidateId(candidateId);
        if (documentId != null) {
            return docs.stream()
                    .filter(d -> d.getId().equals(documentId))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Document not found for candidate ID: " + candidateId));
        }
        return docs.stream()
                .filter(d -> d.getDocumentType() == CandidateDocument.DocumentType.RESUME)
                .max(Comparator.comparing(CandidateDocument::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElseThrow(() -> new ResourceNotFoundException("No resume uploaded by this candidate."));
    }

    @Transactional
    public void deleteCandidate(Long id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + id));
        candidateRepository.delete(candidate);
    }

    @Transactional
    public CandidateDocument uploadResume(Long candidateId, MultipartFile file, UserPrincipal currentUser)
            throws IOException {
        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");

            if (isITAdmin && !isHRAdmin && !accessPolicyService.canItAdminAccessResumes()) {
                throw new AccessDeniedException(
                        "IT Administrator is restricted from uploading or viewing candidate resumes");
            }
        }

        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + candidateId));

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume.pdf";
        String uploadDir = "uploads/resumes/";
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        byte[] fileBytes = file.getBytes();
        String storageFileName = "candidate_" + candidateId + "_" + System.currentTimeMillis() + "_" + originalFilename;
        Path targetLocation = uploadPath.resolve(storageFileName);
        Files.write(targetLocation, fileBytes);

        String extractedText = resumeExtractionService.extractText(fileBytes, originalFilename);

        CandidateDocument doc = CandidateDocument.builder()
                .candidate(candidate)
                .requisition(candidate.getRequisition())
                .documentType(CandidateDocument.DocumentType.RESUME)
                .fileName(originalFilename)
                .storageKey(targetLocation.toString())
                .fileSizeBytes(file.getSize())
                .extractedText(extractedText)
                .build();

        CandidateDocument savedDoc = candidateDocumentRepository.save(doc);
        auditService.logAction(
                currentUser != null ? currentUser.getId() : null,
                currentUser != null ? currentUser.getName() : null,
                "RESUME_UPLOADED",
                "Candidate",
                String.valueOf(candidateId),
                null,
                null,
                null);
        return savedDoc;
    }
}
