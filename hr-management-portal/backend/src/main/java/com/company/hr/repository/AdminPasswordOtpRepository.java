package com.company.hr.repository;

import com.company.hr.entity.AdminPasswordOtp;
import com.company.hr.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminPasswordOtpRepository extends JpaRepository<AdminPasswordOtp, Long> {

    Optional<AdminPasswordOtp> findTopByUserAndUsedFalseOrderByCreatedAtDesc(User user);

    Optional<AdminPasswordOtp> findByResetTokenAndUsedFalse(String resetToken);

    @Modifying
    @Query("UPDATE AdminPasswordOtp o SET o.used = true WHERE o.user = :user AND o.used = false")
    void invalidatePreviousOtpsForUser(@Param("user") User user);
}

