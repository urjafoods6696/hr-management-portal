package com.company.hr.service;

import com.company.hr.dto.DashboardSummaryResponse;
import com.company.hr.dto.PersonalizedDashboardResponse;
import com.company.hr.dto.RequisitionResponse;
import com.company.hr.dto.TatSummaryResponse;
import com.company.hr.entity.*;
import com.company.hr.repository.*;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final RequisitionRepository requisitionRepository;
    private final CandidateRepository candidateRepository;
    private final InterviewRepository interviewRepository;
    private final UserRepository userRepository;
    private final RecruitmentTaskRepository taskRepository;
    private final AuditLogRepository auditLogRepository;
    private final AccessPolicyRepository accessPolicyRepository;
    private final TatCalculationService tatCalculationService;
    private final RequisitionService requisitionService;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary() {
        long openVacancies = requisitionRepository.countByStatusIn(List.of(
                Requisition.RequisitionStatus.APPROVED,
                Requisition.RequisitionStatus.RECRUITER_ASSIGNED,
                Requisition.RequisitionStatus.SOURCING,
                Requisition.RequisitionStatus.INTERVIEWING,
                Requisition.RequisitionStatus.OFFER_IN_PROGRESS
        ));

        long pendingApprovals = requisitionRepository.countByStatusIn(List.of(
                Requisition.RequisitionStatus.PENDING_HR_REVIEW,
                Requisition.RequisitionStatus.PENDING_DEPT_APPROVAL,
                Requisition.RequisitionStatus.PENDING_SENIOR_APPROVAL
        ));

        long totalCandidates = candidateRepository.count();

        long completedInterviews = interviewRepository.countByStatus(Interview.InterviewStatus.COMPLETED);
        long scheduledInterviews = interviewRepository.countByStatus(Interview.InterviewStatus.SCHEDULED);

        long offersReleased = candidateRepository.countByStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
        long offersAccepted = candidateRepository.countByStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
        double offerRatio = (offersReleased > 0) ? ((double) offersAccepted / offersReleased) * 100.0 : 0.0;

        List<TatSummaryResponse> tatAlertsList = requisitionService.getOverdueRequisitions();
        long tatAlertCount = tatAlertsList.size();

        Map<String, Long> statusBreakdown = new HashMap<>();
        List<Object[]> statusCounts = requisitionRepository.countRequisitionsByStatus();
        for (Object[] row : statusCounts) {
            statusBreakdown.put(row[0].toString(), (Long) row[1]);
        }

        Map<String, Long> pipelineBreakdown = new HashMap<>();
        List<Object[]> pipelineCounts = candidateRepository.countCandidatesByPipelineStage();
        for (Object[] row : pipelineCounts) {
            pipelineBreakdown.put(row[0].toString(), (Long) row[1]);
        }

        Map<String, Long> deptBreakdown = new HashMap<>();
        List<Object[]> deptCounts = requisitionRepository.countVacanciesByDepartment();
        for (Object[] row : deptCounts) {
            deptBreakdown.put((String) row[0], ((Number) row[2]).longValue());
        }

        List<RequisitionResponse> recent = requisitionRepository.findAll(
                PageRequest.of(0, 5, Sort.by("createdAt").descending())
        ).stream().map(requisitionService::mapToResponse).collect(Collectors.toList());

        double avgTat = 0.0;
        List<Requisition> allReqs = requisitionRepository.findAll();
        if (!allReqs.isEmpty()) {
            double sumTat = allReqs.stream()
                    .mapToDouble(r -> tatCalculationService.computeTatSummary(r).getElapsedDays())
                    .sum();
            avgTat = Math.round((sumTat / allReqs.size()) * 10.0) / 10.0;
        }

        return DashboardSummaryResponse.builder()
                .totalOpenVacancies(openVacancies)
                .pendingApprovals(pendingApprovals)
                .activeCandidates(totalCandidates)
                .upcomingInterviewsToday(scheduledInterviews)
                .overdueRequisitionsCount(tatAlertCount)
                .avgTatDays(avgTat)
                .statusBreakdown(statusBreakdown)
                .departmentBreakdown(deptBreakdown)
                .recentRequisitions(recent)
                .tatAlerts(tatAlertsList)
                .build();
    }

    private List<PersonalizedDashboardResponse.ActivityDto> getRecentActivities() {
        List<AuditLog> recentLogs = auditLogRepository.findAll(
                PageRequest.of(0, 4, Sort.by("timestamp").descending())).getContent();

        return recentLogs.stream().map(l ->
                PersonalizedDashboardResponse.ActivityDto.builder()
                        .id("audit-" + l.getId())
                        .type("feedback")
                        .title(l.getAction() != null ? l.getAction().replace("_", " ") : "Action")
                        .subtitle((l.getEntityType() != null ? l.getEntityType() : "System") + " – Actor: " + (l.getActorName() != null ? l.getActorName() : "System"))
                        .timeAgo(formatTimeAgo(l.getTimestamp()))
                        .iconColor(l.getAction() != null && (l.getAction().contains("DELETE") || l.getAction().contains("CANCEL")) ? "amber" : "green")
                        .build()
        ).collect(Collectors.toList());
    }

    private List<PersonalizedDashboardResponse.RequisitionItemDto> mapRequisitionsToItems(List<Requisition> reqs) {
        return reqs.stream().map(r ->
                PersonalizedDashboardResponse.RequisitionItemDto.builder()
                        .id(r.getRequisitionCode())
                        .jobTitle(r.getJobTitle())
                        .department(r.getDepartment() != null ? r.getDepartment().getDepartmentName() : "General")
                        .location("Pune")
                        .status(r.getStatus() != null ? r.getStatus().name() : "OPEN")
                        .candidateCount(candidateRepository.findByRequisitionId(r.getId()).size())
                        .build()
        ).collect(Collectors.toList());
    }

    private List<PersonalizedDashboardResponse.InterviewItemDto> mapInterviewsToItems(List<Interview> ints) {
        return ints.stream().map(i -> {
            LocalDateTime dt = i.getScheduledAt();
            String day = dt != null ? String.valueOf(dt.getDayOfMonth()) : "";
            String month = dt != null ? dt.getMonth().name().substring(0, 3) : "";
            String time = dt != null ? dt.format(DateTimeFormatter.ofPattern("hh:mm a")) : "";
            String candName = i.getCandidate() != null ? i.getCandidate().getName() : "Candidate";
            String roleName = i.getRequisition() != null ? i.getRequisition().getJobTitle() : "Interview";
            return PersonalizedDashboardResponse.InterviewItemDto.builder()
                    .id(String.valueOf(i.getId()))
                    .dateDay(day)
                    .dateMonth(month)
                    .candidateName(candName)
                    .role(roleName)
                    .time(time)
                    .mode(i.getMeetingLocation() != null && i.getMeetingLocation().toLowerCase().contains("online") ? "Online" : "Onsite")
                    .build();
        }).collect(Collectors.toList());
    }

    private List<PersonalizedDashboardResponse.TaskItemDto> mapTasksToItems(List<RecruitmentTask> tasks) {
        return tasks.stream().map(t ->
                PersonalizedDashboardResponse.TaskItemDto.builder()
                        .id("tsk-" + t.getId())
                        .title(t.getTaskTitle())
                        .dueDate(t.getDueDate() != null ? t.getDueDate().toString() : "")
                        .completed(t.getStatus() == RecruitmentTask.TaskStatus.COMPLETED)
                        .build()
        ).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PersonalizedDashboardResponse getPersonalizedDashboard(UserPrincipal currentUser) {
        String fullName = currentUser != null && currentUser.getName() != null ? currentUser.getName() : "Team Member";
        String firstName = fullName.trim().contains(" ") ? fullName.trim().split("\\s+")[0] : fullName;

        List<String> roles = currentUser != null ? currentUser.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .collect(Collectors.toList()) : List.of();

        boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
        boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
        boolean isRecruiter = roles.contains("ROLE_HR_RECRUITER");
        boolean isInterviewer = roles.contains("ROLE_INTERVIEWER");
        boolean isDeptHead = roles.contains("ROLE_DEPT_HEAD");

        String title = currentUser != null && currentUser.getTitle() != null ? currentUser.getTitle() : "HR Executive";
        String avatar = currentUser != null && currentUser.getProfileImageUrl() != null
                ? currentUser.getProfileImageUrl()
                : (isDeptHead ? "/assets/images/man.jpg" : "/assets/images/woman.jpg");
        String department = isDeptHead ? "Operations & Supply Chain" : (isITAdmin ? "IT & Systems" : "Human Resources");

        PersonalizedDashboardResponse.UserDto userDto = PersonalizedDashboardResponse.UserDto.builder()
                .id(currentUser != null ? currentUser.getId() : 0L)
                .name(fullName)
                .firstName(firstName)
                .email(currentUser != null ? currentUser.getEmail() : "")
                .title(title)
                .department(department)
                .profileImageUrl(avatar)
                .roles(roles)
                .build();

        List<PersonalizedDashboardResponse.ActivityDto> activities = getRecentActivities();

        // 1. IT ADMIN DASHBOARD
        if (isITAdmin && !isHRAdmin) {
            long totalUsers = userRepository.count();
            long activeUsers = userRepository.countByStatus(User.UserStatus.ACTIVE);
            long totalPolicies = accessPolicyRepository.count();
            long totalAuditLogs = auditLogRepository.count();

            List<Requisition> openReqs = requisitionRepository.findAll(PageRequest.of(0, 4, Sort.by("createdAt").descending())).getContent();
            List<Interview> upcomingInts = interviewRepository.findAll(PageRequest.of(0, 3, Sort.by("scheduledAt").descending())).getContent();
            List<RecruitmentTask> myTasks = currentUser != null ? taskRepository.findByAssignedUserId(currentUser.getId()) : List.of();

            return PersonalizedDashboardResponse.builder()
                    .user(userDto)
                    .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                            .activeRequisitions(totalUsers)
                            .assignedCandidates(activeUsers)
                            .interviewsThisWeek(totalPolicies)
                            .pendingOffers(totalAuditLogs)
                            .build())
                    .recentActivities(activities)
                    .openRequisitions(mapRequisitionsToItems(openReqs))
                    .upcomingInterviews(mapInterviewsToItems(upcomingInts))
                    .tasks(mapTasksToItems(myTasks))
                    .build();
        }

        // 2. ASSIGNED INTERVIEWER / PANEL MEMBER DASHBOARD
        Long currentUserId = currentUser != null ? currentUser.getId() : 0L;
        long myInterviewCount = interviewRepository.countByInterviewerId(currentUserId);

        if ((isInterviewer || myInterviewCount > 0) && !isHRAdmin && !isRecruiter && !isITAdmin && !isDeptHead) {
            long totalAssignedInterviews = myInterviewCount;
            long pendingInterviews = interviewRepository.countByInterviewerIdAndStatus(currentUserId, Interview.InterviewStatus.SCHEDULED);
            long completedInterviews = interviewRepository.countByInterviewerIdAndStatus(currentUserId, Interview.InterviewStatus.COMPLETED);

            List<Interview> myInterviews = interviewRepository.findByInterviewerId(currentUserId);
            List<Interview> upcomingItems = myInterviews.stream()
                    .filter(i -> i.getStatus() == Interview.InterviewStatus.SCHEDULED || i.getStatus() == Interview.InterviewStatus.RESCHEDULED)
                    .collect(Collectors.toList());

            List<RecruitmentTask> myTasks = taskRepository.findByAssignedUserId(currentUserId);

            return PersonalizedDashboardResponse.builder()
                    .user(userDto)
                    .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                            .activeRequisitions(totalAssignedInterviews)
                            .assignedCandidates(myInterviews.size())
                            .interviewsThisWeek(pendingInterviews)
                            .pendingOffers(completedInterviews)
                            .build())
                    .recentActivities(activities)
                    .openRequisitions(myInterviews.stream().map(i ->
                            PersonalizedDashboardResponse.RequisitionItemDto.builder()
                                    .id(i.getRequisition() != null ? i.getRequisition().getRequisitionCode() : "REQ")
                                    .jobTitle(i.getRequisition() != null ? i.getRequisition().getJobTitle() : "Job")
                                    .department(i.getRequisition() != null && i.getRequisition().getDepartment() != null ? i.getRequisition().getDepartment().getDepartmentName() : "General")
                                    .location("Pune")
                                    .status(i.getStatus().name())
                                    .candidateCount(1)
                                    .build()
                    ).distinct().collect(Collectors.toList()))
                    .upcomingInterviews(mapInterviewsToItems(upcomingItems))
                    .tasks(mapTasksToItems(myTasks))
                    .build();
        }

        // 3. RECRUITER DASHBOARD
        if (isRecruiter && !isHRAdmin) {
            Long userId = currentUser != null ? currentUser.getId() : 0L;
            long assignedReqs = requisitionRepository.countByAssignedRecruiterId(userId);
            long assignedCands = candidateRepository.countByRequisitionAssignedRecruiterId(userId);
            long interviewsForMyReqs = interviewRepository.countByRequisitionAssignedRecruiterId(userId);
            long pendingTasks = taskRepository.countByAssignedUserIdAndStatus(userId, RecruitmentTask.TaskStatus.PENDING);

            List<Requisition> myReqs = requisitionRepository.findByAssignedRecruiterId(userId);
            List<Interview> myInterviews = interviewRepository.findByRequisitionAssignedRecruiterId(userId);
            List<RecruitmentTask> myTasks = taskRepository.findByAssignedUserId(userId);

            return PersonalizedDashboardResponse.builder()
                    .user(userDto)
                    .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                            .activeRequisitions(assignedReqs)
                            .assignedCandidates(assignedCands)
                            .interviewsThisWeek(interviewsForMyReqs)
                            .pendingOffers(pendingTasks)
                            .build())
                    .recentActivities(activities)
                    .openRequisitions(mapRequisitionsToItems(myReqs))
                    .upcomingInterviews(mapInterviewsToItems(myInterviews))
                    .tasks(mapTasksToItems(myTasks))
                    .build();
        }

        // 4. DEPARTMENT HEAD DASHBOARD
        if (isDeptHead) {
            Long deptId = currentUser != null ? currentUser.getDepartmentRestrictionId() : null;
            long activeReqs = deptId != null ? requisitionRepository.countByDepartmentId(deptId) : 0;
            long assignedCands = deptId != null ? candidateRepository.countTotal(deptId) : 0;
            long scheduledInts = deptId != null ? interviewRepository.countByDepartmentIdAndStatus(deptId, Interview.InterviewStatus.SCHEDULED) : 0;
            long pendingOffers = deptId != null ? candidateRepository.countByStatusAndDept(Candidate.CandidateStatus.OFFER_EXTENDED, deptId) : 0;

            List<Requisition> deptReqs = deptId != null ? requisitionRepository.findByDepartmentId(deptId, PageRequest.of(0, 4)).getContent() : List.of();
            List<RecruitmentTask> myTasks = currentUser != null ? taskRepository.findByAssignedUserId(currentUser.getId()) : List.of();
            List<Interview> myAssigned = currentUser != null ? interviewRepository.findByInterviewerId(currentUser.getId()) : List.of();

            return PersonalizedDashboardResponse.builder()
                    .user(userDto)
                    .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                            .activeRequisitions(activeReqs)
                            .assignedCandidates(assignedCands)
                            .interviewsThisWeek(scheduledInts)
                            .pendingOffers(pendingOffers)
                            .build())
                    .recentActivities(activities)
                    .openRequisitions(mapRequisitionsToItems(deptReqs))
                    .upcomingInterviews(mapInterviewsToItems(myAssigned))
                    .tasks(mapTasksToItems(myTasks))
                    .build();
        }

        // 5. DEFAULT HR ADMIN DASHBOARD
        long totalCands = candidateRepository.count();
        long activeReqs = requisitionRepository.count();
        long scheduledInts = interviewRepository.countByStatus(Interview.InterviewStatus.SCHEDULED);
        long pendingOffers = candidateRepository.countByStatus(Candidate.CandidateStatus.OFFER_EXTENDED);

        List<Requisition> openReqs = requisitionRepository.findAll(PageRequest.of(0, 4, Sort.by("createdAt").descending())).getContent();
        List<Interview> upcomingInts = interviewRepository.findAll(PageRequest.of(0, 3, Sort.by("scheduledAt").descending())).getContent();
        List<RecruitmentTask> myTasks = currentUser != null ? taskRepository.findByAssignedUserId(currentUser.getId()) : List.of();

        return PersonalizedDashboardResponse.builder()
                .user(userDto)
                .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                        .activeRequisitions(activeReqs)
                        .assignedCandidates(totalCands)
                        .interviewsThisWeek(scheduledInts)
                        .pendingOffers(pendingOffers)
                        .build())
                .recentActivities(activities)
                .openRequisitions(mapRequisitionsToItems(openReqs))
                .upcomingInterviews(mapInterviewsToItems(upcomingInts))
                .tasks(mapTasksToItems(myTasks))
                .build();
    }

    private String formatTimeAgo(LocalDateTime dt) {
        if (dt == null) return "Just now";
        long minutes = java.time.Duration.between(dt, LocalDateTime.now()).toMinutes();
        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + " mins ago";
        long hours = minutes / 60;
        if (hours < 24) return hours + " hours ago";
        long days = hours / 24;
        return days + " days ago";
    }
}
