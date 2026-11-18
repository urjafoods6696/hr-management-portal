package com.company.hr.repository;

import com.company.hr.entity.Candidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    Optional<Candidate> findByCandidateCode(String candidateCode);
    Page<Candidate> findByRequisitionId(Long requisitionId, Pageable pageable);
    List<Candidate> findByRequisitionId(Long requisitionId);
    Page<Candidate> findByStatus(Candidate.CandidateStatus status, Pageable pageable);
    long countByStatus(Candidate.CandidateStatus status);
    long countByStatusIn(Collection<Candidate.CandidateStatus> statuses);
    long countByCreatedAtGreaterThanEqual(java.time.LocalDateTime sinceDate);

    @Query("SELECT c.status, COUNT(c) FROM Candidate c GROUP BY c.status")
    List<Object[]> countCandidatesByPipelineStage();

    @Query("SELECT COUNT(c) FROM Candidate c LEFT JOIN c.requisition r WHERE (:deptId IS NULL OR r.department.id = :deptId)")
    long countTotal(@Param("deptId") Long deptId);

    @Query("SELECT COUNT(c) FROM Candidate c LEFT JOIN c.requisition r WHERE c.status = :status AND (:deptId IS NULL OR r.department.id = :deptId)")
    long countByStatusAndDept(@Param("status") Candidate.CandidateStatus status, @Param("deptId") Long deptId);

    @Query("SELECT COUNT(c) FROM Candidate c LEFT JOIN c.requisition r WHERE c.status IN :statuses AND (:deptId IS NULL OR r.department.id = :deptId)")
    long countByStatusInAndDept(@Param("statuses") Collection<Candidate.CandidateStatus> statuses, @Param("deptId") Long deptId);

    @Query("SELECT COUNT(c) FROM Candidate c LEFT JOIN c.requisition r WHERE c.createdAt >= :sinceDate AND (:deptId IS NULL OR r.department.id = :deptId)")
    long countNewSince(@Param("sinceDate") java.time.LocalDateTime sinceDate, @Param("deptId") Long deptId);

    @Query("SELECT COUNT(c) FROM Candidate c LEFT JOIN c.requisition r WHERE c.createdAt >= :sinceDate AND r.assignedRecruiter.id = :recruiterId")
    long countNewSinceForRecruiter(@Param("sinceDate") java.time.LocalDateTime sinceDate, @Param("recruiterId") Long recruiterId);

    long countByRequisitionAssignedRecruiterId(Long recruiterId);

    long countByRequisitionAssignedRecruiterIdAndStatus(Long recruiterId, Candidate.CandidateStatus status);

    long countByRequisitionAssignedRecruiterIdAndStatusIn(Long recruiterId, Collection<Candidate.CandidateStatus> statuses);

    @Query("SELECT c FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "WHERE (:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.mobile) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.candidateCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.primarySkills) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.currentDesignation) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(r.jobTitle) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:reqId IS NULL OR r.id = :reqId) " +
           "AND (:deptName IS NULL OR LOWER(COALESCE(NULLIF(TRIM(c.storedDepartment), ''), d.departmentName)) = LOWER(:deptName)) " +
           "AND (:hasStatus = false OR str(c.status) IN :statuses) " +
           "AND (:sourceStr IS NULL OR str(c.source) = :sourceStr) " +
           "AND (:deptRestrictionId IS NULL OR d.id = :deptRestrictionId)")
    Page<Candidate> filterCandidates(
            @Param("search") String search,
            @Param("reqId") Long reqId,
            @Param("deptName") String deptName,
            @Param("hasStatus") boolean hasStatus,
            @Param("statuses") List<String> statuses,
            @Param("sourceStr") String sourceStr,
            @Param("deptRestrictionId") Long deptRestrictionId,
            Pageable pageable);

    @Query("SELECT DISTINCT c FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "LEFT JOIN Interview i ON i.candidate.id = c.id " +
           "WHERE (:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.mobile) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.candidateCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.primarySkills) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.currentDesignation) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(r.jobTitle) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:reqId IS NULL OR r.id = :reqId) " +
           "AND (:deptName IS NULL OR LOWER(COALESCE(NULLIF(TRIM(c.storedDepartment), ''), d.departmentName)) = LOWER(:deptName)) " +
           "AND (:hasStatus = false OR str(c.status) IN :statuses) " +
           "AND (:sourceStr IS NULL OR str(c.source) = :sourceStr) " +
           "AND (:deptRestrictionId IS NULL OR d.id = :deptRestrictionId) " +
           "AND (:recruiterId IS NULL OR r.assignedRecruiter.id = :recruiterId) " +
           "AND (:interviewerId IS NULL OR i.interviewer.id = :interviewerId)")
    Page<Candidate> filterCandidatesWithRoleScope(
            @Param("search") String search,
            @Param("reqId") Long reqId,
            @Param("deptName") String deptName,
            @Param("hasStatus") boolean hasStatus,
            @Param("statuses") List<String> statuses,
            @Param("sourceStr") String sourceStr,
            @Param("deptRestrictionId") Long deptRestrictionId,
            @Param("recruiterId") Long recruiterId,
            @Param("interviewerId") Long interviewerId,
            Pageable pageable);

    @Query("SELECT COUNT(DISTINCT c.id) FROM Candidate c " +
           "WHERE c.id IN (SELECT i.candidate.id FROM Interview i) " +
           "OR c.status IN (com.company.hr.entity.Candidate.CandidateStatus.INTERVIEW_SCHEDULED, " +
           "com.company.hr.entity.Candidate.CandidateStatus.INTERVIEW_IN_PROGRESS, " +
           "com.company.hr.entity.Candidate.CandidateStatus.OFFER_EXTENDED, " +
           "com.company.hr.entity.Candidate.CandidateStatus.OFFER_ACCEPTED, " +
           "com.company.hr.entity.Candidate.CandidateStatus.JOINING_SCHEDULED, " +
           "com.company.hr.entity.Candidate.CandidateStatus.JOINED)")
    long countCandidatesReachedInterview();

    @Query("SELECT COUNT(c) FROM Candidate c WHERE c.createdAt >= :start AND c.createdAt < :end")
    long countApplicationsInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(DISTINCT c.id) FROM Candidate c " +
           "WHERE (c.id IN (SELECT i.candidate.id FROM Interview i WHERE COALESCE(i.scheduledAt, i.createdAt) >= :start AND COALESCE(i.scheduledAt, i.createdAt) < :end)) " +
           "OR (c.status IN (com.company.hr.entity.Candidate.CandidateStatus.INTERVIEW_SCHEDULED, " +
           "com.company.hr.entity.Candidate.CandidateStatus.INTERVIEW_IN_PROGRESS, " +
           "com.company.hr.entity.Candidate.CandidateStatus.OFFER_EXTENDED, " +
           "com.company.hr.entity.Candidate.CandidateStatus.OFFER_ACCEPTED, " +
           "com.company.hr.entity.Candidate.CandidateStatus.JOINING_SCHEDULED, " +
           "com.company.hr.entity.Candidate.CandidateStatus.JOINED) " +
           "AND COALESCE(c.updatedAt, c.createdAt) >= :start AND COALESCE(c.updatedAt, c.createdAt) < :end)")
    long countCandidatesReachedInterviewInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(c) FROM Candidate c WHERE c.status = com.company.hr.entity.Candidate.CandidateStatus.JOINED " +
           "AND (COALESCE(c.updatedAt, c.createdAt) >= :start AND COALESCE(c.updatedAt, c.createdAt) < :end)")
    long countJoinedInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(c) FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "WHERE (:hasDept = false OR " +
           "     LOWER(COALESCE(c.storedDepartment, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')) OR " +
           "     LOWER(COALESCE(d.departmentName, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')))")
    long countApplicationsAllTimeFiltered(
            @Param("hasDept") boolean hasDept,
            @Param("deptToken") String deptToken);

    @Query("SELECT COUNT(c) FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "WHERE c.createdAt >= :start AND c.createdAt < :end " +
           "AND (:hasDept = false OR " +
           "     LOWER(COALESCE(c.storedDepartment, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')) OR " +
           "     LOWER(COALESCE(d.departmentName, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')))")
    long countApplicationsInPeriodFiltered(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("hasDept") boolean hasDept,
            @Param("deptToken") String deptToken);

    @Query("SELECT COUNT(DISTINCT c.id) FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "WHERE (:hasDept = false OR " +
           "     LOWER(COALESCE(c.storedDepartment, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')) OR " +
           "     LOWER(COALESCE(d.departmentName, '')) LIKE LOWER(CONCAT('%', :deptToken, '%'))) " +
           "AND (c.id IN (SELECT i.candidate.id FROM Interview i) OR " +
           "     c.status IN (com.company.hr.entity.Candidate.CandidateStatus.INTERVIEW_SCHEDULED, " +
           "                  com.company.hr.entity.Candidate.CandidateStatus.INTERVIEW_IN_PROGRESS, " +
           "                  com.company.hr.entity.Candidate.CandidateStatus.OFFER_EXTENDED, " +
           "                  com.company.hr.entity.Candidate.CandidateStatus.OFFER_ACCEPTED, " +
           "                  com.company.hr.entity.Candidate.CandidateStatus.JOINING_SCHEDULED, " +
           "                  com.company.hr.entity.Candidate.CandidateStatus.JOINED))")
    long countCandidatesReachedInterviewFilteredAllTime(
            @Param("hasDept") boolean hasDept,
            @Param("deptToken") String deptToken);

    @Query("SELECT COUNT(DISTINCT c.id) FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "WHERE (:hasDept = false OR " +
           "     LOWER(COALESCE(c.storedDepartment, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')) OR " +
           "     LOWER(COALESCE(d.departmentName, '')) LIKE LOWER(CONCAT('%', :deptToken, '%'))) " +
           "AND ((c.id IN (SELECT i.candidate.id FROM Interview i WHERE COALESCE(i.scheduledAt, i.createdAt) >= :start AND COALESCE(i.scheduledAt, i.createdAt) < :end)) " +
           "     OR (c.status IN (com.company.hr.entity.Candidate.CandidateStatus.INTERVIEW_SCHEDULED, " +
           "                      com.company.hr.entity.Candidate.CandidateStatus.INTERVIEW_IN_PROGRESS, " +
           "                      com.company.hr.entity.Candidate.CandidateStatus.OFFER_EXTENDED, " +
           "                      com.company.hr.entity.Candidate.CandidateStatus.OFFER_ACCEPTED, " +
           "                      com.company.hr.entity.Candidate.CandidateStatus.JOINING_SCHEDULED, " +
           "                      com.company.hr.entity.Candidate.CandidateStatus.JOINED) " +
           "         AND COALESCE(c.updatedAt, c.createdAt) >= :start AND COALESCE(c.updatedAt, c.createdAt) < :end))")
    long countCandidatesReachedInterviewInPeriodFiltered(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("hasDept") boolean hasDept,
            @Param("deptToken") String deptToken);

    @Query("SELECT COUNT(c) FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "WHERE c.status = com.company.hr.entity.Candidate.CandidateStatus.JOINED " +
           "AND (:hasDept = false OR " +
           "     LOWER(COALESCE(c.storedDepartment, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')) OR " +
           "     LOWER(COALESCE(d.departmentName, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')))")
    long countJoinedAllTimeFiltered(
            @Param("hasDept") boolean hasDept,
            @Param("deptToken") String deptToken);

    @Query("SELECT COUNT(c) FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "WHERE c.status = com.company.hr.entity.Candidate.CandidateStatus.JOINED " +
           "AND COALESCE(c.updatedAt, c.createdAt) >= :start AND COALESCE(c.updatedAt, c.createdAt) < :end " +
           "AND (:hasDept = false OR " +
           "     LOWER(COALESCE(c.storedDepartment, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')) OR " +
           "     LOWER(COALESCE(d.departmentName, '')) LIKE LOWER(CONCAT('%', :deptToken, '%')))")
    long countJoinedInPeriodFiltered(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("hasDept") boolean hasDept,
            @Param("deptToken") String deptToken);
}

