package com.company.hr.repository;

import com.company.hr.entity.PasswordResetToken;
import com.company.hr.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    Optional<PasswordResetToken> findByOtpCode(String otpCode);

    @Query("SELECT p FROM PasswordResetToken p WHERE (p.token = :identifier OR p.otpCode = :identifier) AND p.used = false ORDER BY p.createdAt DESC LIMIT 1")
    Optional<PasswordResetToken> findValidTokenOrOtp(@Param("identifier") String identifier);

    @Modifying
    @Query("UPDATE PasswordResetToken p SET p.used = true WHERE p.user = :user AND p.used = false")
    void invalidateExistingTokensForUser(@Param("user") User user);
}

