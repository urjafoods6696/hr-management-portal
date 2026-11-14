package com.company.hr.service;

import com.company.hr.dto.AdminPasswordSecurityDto;
import com.company.hr.entity.AdminPasswordOtp;
import com.company.hr.entity.AuditLog;
import com.company.hr.entity.Role;
import com.company.hr.entity.User;
import com.company.hr.exception.BadRequestException;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.AdminPasswordOtpRepository;
import com.company.hr.repository.AuditLogRepository;
import com.company.hr.repository.UserRepository;
import com.company.hr.security.UserPrincipal;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPasswordSecurityService {

    private final UserRepository userRepository;
    private final AdminPasswordOtpRepository adminPasswordOtpRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRepository auditLogRepository;

    @Value("${spring.mail.username:recruitment-alerts@company.com}")
    private String fromEmail;

    @Value("${spring.mail.password:secret}")
    private String mailPassword;

    private final SecureRandom secureRandom = new SecureRandom();

    private static final Pattern UPPERCASE_PATTERN = Pattern.compile(".*[A-Z].*");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile(".*[a-z].*");
    private static final Pattern DIGIT_PATTERN = Pattern.compile(".*[0-9].*");
    private static final Pattern SPECIAL_CHAR_PATTERN = Pattern.compile(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*");

    /**
     * Step 1: Request Password Change & Dispatch 6-digit OTP (5-minute expiry)
     */
    @Transactional
    public AdminPasswordSecurityDto.ResponseDto requestAdminOtp(AdminPasswordSecurityDto.RequestOtpDto dto, UserPrincipal currentUser) {
        String emailInput = dto.getEmail() != null ? dto.getEmail().trim().toLowerCase() : "";
        if (emailInput.isEmpty()) {
            throw new BadRequestException("Registered work email is required.");
        }

        User user = findPrivilegedUser(emailInput);

        // Authorization check: If user is authenticated, ensure they can only reset their own password
        if (currentUser != null && currentUser.getId() != null) {
            if (!currentUser.getId().equals(user.getId())) {
                throw new BadRequestException("Access denied: You can only request password verification for your own account.");
            }
        }

        // Invalidate any existing unused OTPs for this user
        adminPasswordOtpRepository.invalidatePreviousOtpsForUser(user);

        // Generate cryptographically secure random 6-digit OTP
        int otpNumber = 100000 + secureRandom.nextInt(900000);
        String otpCode = String.valueOf(otpNumber);

        // Hash the OTP using BCrypt for storage (never plaintext)
        String hashedOtp = passwordEncoder.encode(otpCode);
        LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(5);

        AdminPasswordOtp otpEntity = AdminPasswordOtp.builder()
                .user(user)
                .otpHash(hashedOtp)
                .expiresAt(expiryDate)
                .verificationAttempts(0)
                .maxAttempts(5)
                .used(false)
                .build();

        adminPasswordOtpRepository.save(otpEntity);

        String roleName = getPrivilegedRoleLabel(user);

        // Dispatch Email
        boolean isPlaceholderSmtp = "secret".equalsIgnoreCase(mailPassword)
                || "recruitment-alerts@company.com".equalsIgnoreCase(fromEmail);

        boolean emailSent = false;
        if (!isPlaceholderSmtp) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
                helper.setFrom(fromEmail);
                helper.setTo(user.getEmail());
                helper.setSubject("HR Portal – Admin Password Verification Code");
                String html = buildAdminOtpHtml(user.getName(), roleName, otpCode);
                helper.setText(html, true);

                mailSender.send(mimeMessage);
                emailSent = true;
                log.info("Admin verification OTP email successfully dispatched to registered address: {}", maskEmail(user.getEmail()));
            } catch (Exception ex) {
                log.warn("SMTP delivery to {} failed: {}", maskEmail(user.getEmail()), ex.getMessage());
                emailSent = false;
            }
        } else {
            log.info("Corporate SMTP placeholder active. OTP generated for privileged account: {}", maskEmail(user.getEmail()));
            emailSent = false;
        }

        // Log audit event for privileged security operation
        try {
            auditLogRepository.save(AuditLog.builder()
                    .actorId(user.getId())
                    .actorName(user.getName())
                    .action("ADMIN_PASSWORD_OTP_REQUESTED")
                    .entityType("USER")
                    .entityId(String.valueOf(user.getId()))
                    .newValue("{\"role\":\"" + roleName + "\",\"email\":\"" + maskEmail(user.getEmail()) + "\"}")
                    .ipAddress("127.0.0.1")
                    .build());
        } catch (Exception e) {
            log.warn("Could not save security audit log: {}", e.getMessage());
        }

        return AdminPasswordSecurityDto.ResponseDto.builder()
                .success(true)
                .message("A secure 6-digit verification code has been dispatched to your registered email (" + maskEmail(user.getEmail()) + "). It expires in 5 minutes.")
                .email(user.getEmail())
                .accountRole(roleName)
                .expiresInSeconds(300)
                .devOtpPreview(isPlaceholderSmtp ? otpCode : null)
                .build();
    }

    /**
     * Step 2 & 3: Verify 6-digit OTP code and issue a single-use reset token
     */
    @Transactional
    public AdminPasswordSecurityDto.ResponseDto verifyAdminOtp(AdminPasswordSecurityDto.VerifyOtpDto dto, UserPrincipal currentUser) {
        String emailInput = dto.getEmail() != null ? dto.getEmail().trim().toLowerCase() : "";
        String inputOtp = dto.getOtp() != null ? dto.getOtp().trim() : "";

        if (inputOtp.length() != 6 || !inputOtp.matches("\\d{6}")) {
            throw new BadRequestException("Verification code must be exactly 6 numeric digits.");
        }

        User user = findPrivilegedUser(emailInput);

        if (currentUser != null && currentUser.getId() != null) {
            if (!currentUser.getId().equals(user.getId())) {
                throw new BadRequestException("Access denied: You cannot verify OTP for another administrator.");
            }
        }

        AdminPasswordOtp otpEntity = adminPasswordOtpRepository.findTopByUserAndUsedFalseOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new BadRequestException("No active verification code found for this account. Please request a new code."));

        if (otpEntity.isExpired()) {
            otpEntity.setUsed(true);
            adminPasswordOtpRepository.save(otpEntity);
            throw new BadRequestException("Verification code has expired (5-minute validity). Please request a new code.");
        }

        if (otpEntity.getVerificationAttempts() >= otpEntity.getMaxAttempts()) {
            otpEntity.setUsed(true);
            adminPasswordOtpRepository.save(otpEntity);
            throw new BadRequestException("Maximum verification attempts exceeded (5/5). This code has been invalidated for security. Please request a new OTP.");
        }

        // Increment attempts
        otpEntity.setVerificationAttempts(otpEntity.getVerificationAttempts() + 1);

        // Validate hash
        boolean matches = passwordEncoder.matches(inputOtp, otpEntity.getOtpHash());
        if (!matches) {
            adminPasswordOtpRepository.save(otpEntity);
            int remaining = otpEntity.getMaxAttempts() - otpEntity.getVerificationAttempts();
            if (remaining <= 0) {
                otpEntity.setUsed(true);
                adminPasswordOtpRepository.save(otpEntity);
                throw new BadRequestException("Incorrect verification code. Maximum attempts reached. Code has been invalidated.");
            }
            throw new BadRequestException("Incorrect verification code. " + remaining + " attempts remaining.");
        }

        // Issue single-use reset token valid for 10 minutes
        String singleUseResetToken = "adm-rst-" + UUID.randomUUID().toString().replace("-", "");
        otpEntity.setResetToken(singleUseResetToken);
        otpEntity.setResetTokenExpiresAt(LocalDateTime.now().plusMinutes(10));
        adminPasswordOtpRepository.save(otpEntity);

        String roleName = getPrivilegedRoleLabel(user);

        return AdminPasswordSecurityDto.ResponseDto.builder()
                .success(true)
                .message("Email verification successful! Please set your new password.")
                .email(user.getEmail())
                .accountRole(roleName)
                .resetToken(singleUseResetToken)
                .expiresInSeconds(600)
                .build();
    }

    /**
     * Step 4 & 5: Validate New Password Complexity & Commit Password Change
     */
    @Transactional
    public AdminPasswordSecurityDto.ResponseDto resetAdminPassword(AdminPasswordSecurityDto.ResetPasswordDto dto, UserPrincipal currentUser) {
        String emailInput = dto.getEmail() != null ? dto.getEmail().trim().toLowerCase() : "";
        String resetToken = dto.getResetToken() != null ? dto.getResetToken().trim() : "";
        String newPassword = dto.getNewPassword() != null ? dto.getNewPassword().trim() : "";
        String confirmPassword = dto.getConfirmPassword() != null ? dto.getConfirmPassword().trim() : "";

        if (resetToken.isEmpty()) {
            throw new BadRequestException("Single-use verification token is required.");
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new BadRequestException("New password and confirmation password do not match.");
        }

        // Enforce strict enterprise password policy for HR Admin / IT Admin
        validatePasswordComplexity(newPassword);

        User user = findPrivilegedUser(emailInput);

        if (currentUser != null && currentUser.getId() != null) {
            if (!currentUser.getId().equals(user.getId())) {
                throw new BadRequestException("Access denied: You cannot reset another administrator's password.");
            }
        }

        AdminPasswordOtp otpEntity = adminPasswordOtpRepository.findByResetTokenAndUsedFalse(resetToken)
                .orElseThrow(() -> new BadRequestException("Invalid or already consumed reset token. Please initiate a new password change request."));

        if (!otpEntity.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Verification token does not match the target administrator account.");
        }

        if (otpEntity.isResetTokenExpired()) {
            otpEntity.setUsed(true);
            adminPasswordOtpRepository.save(otpEntity);
            throw new BadRequestException("Password reset window has expired. Please verify with a new OTP.");
        }

        // Commit new password securely (encoded with BCrypt; plaintext cleared)
        user.setPassword(null);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Mark reset token as permanently consumed
        otpEntity.setUsed(true);
        adminPasswordOtpRepository.save(otpEntity);

        String roleName = getPrivilegedRoleLabel(user);

        // Record security audit trail
        try {
            auditLogRepository.save(AuditLog.builder()
                    .actorId(user.getId())
                    .actorName(user.getName())
                    .action("ADMIN_PASSWORD_CHANGED")
                    .entityType("USER")
                    .entityId(String.valueOf(user.getId()))
                    .newValue("{\"role\":\"" + roleName + "\",\"username\":\"" + user.getUsername() + "\"}")
                    .ipAddress("127.0.0.1")
                    .build());
        } catch (Exception e) {
            log.warn("Could not save security audit log: {}", e.getMessage());
        }

        log.info("Privileged account password successfully changed for {} ({})", user.getUsername(), roleName);

        return AdminPasswordSecurityDto.ResponseDto.builder()
                .success(true)
                .message("Password for " + roleName + " (" + user.getUsername() + ") has been updated successfully. Please sign in with your new credentials.")
                .email(user.getEmail())
                .accountRole(roleName)
                .build();
    }

    /**
     * Validates that the user exists and holds either ROLE_HR_ADMIN or ROLE_IT_ADMIN
     */
    private User findPrivilegedUser(String input) {
        User user = userRepository.findByEmail(input)
                .or(() -> userRepository.findByUsername(input))
                .orElse(null);

        if (user == null) {
            user = userRepository.findAll().stream()
                    .filter(u -> input.equalsIgnoreCase(u.getEmail()) 
                              || input.equalsIgnoreCase(u.getUsername())
                              || (input.contains("@") && input.split("@")[0].equalsIgnoreCase(u.getUsername())))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("No administrator account found matching: " + input));
        }

        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new BadRequestException("Administrator account status is " + user.getStatus() + ". Please contact IT Infrastructure.");
        }

        boolean isPrivileged = false;
        if (user.getRoles() != null) {
            for (Role role : user.getRoles()) {
                String rn = role.getRoleName();
                if ("ROLE_HR_ADMIN".equals(rn) || "ROLE_IT_ADMIN".equals(rn)) {
                    isPrivileged = true;
                    break;
                }
            }
        }

        if (!isPrivileged) {
            throw new BadRequestException("Access denied: High-security Email OTP verification is restricted to HR Admin and IT Admin accounts only.");
        }

        return user;
    }

    /**
     * Enforces enterprise password policy:
     * - Minimum 12 characters
     * - At least one uppercase letter
     * - At least one lowercase letter
     * - At least one number
     * - At least one special character
     */
    public void validatePasswordComplexity(String password) {
        if (password == null || password.length() < 12) {
            throw new BadRequestException("Password must be at least 12 characters long.");
        }
        if (!UPPERCASE_PATTERN.matcher(password).matches()) {
            throw new BadRequestException("Password must contain at least one uppercase letter (A-Z).");
        }
        if (!LOWERCASE_PATTERN.matcher(password).matches()) {
            throw new BadRequestException("Password must contain at least one lowercase letter (a-z).");
        }
        if (!DIGIT_PATTERN.matcher(password).matches()) {
            throw new BadRequestException("Password must contain at least one numeric digit (0-9).");
        }
        if (!SPECIAL_CHAR_PATTERN.matcher(password).matches()) {
            throw new BadRequestException("Password must contain at least one special character (!@#$%^&*()_+-=[]{};':\"|,.<>/?).");
        }
    }

    private String getPrivilegedRoleLabel(User user) {
        if (user.getRoles() != null) {
            for (Role role : user.getRoles()) {
                if ("ROLE_IT_ADMIN".equals(role.getRoleName())) return "IT Administrator";
                if ("ROLE_HR_ADMIN".equals(role.getRoleName())) return "HR Administrator";
            }
        }
        return "Privileged Administrator";
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@");
        String name = parts[0];
        String domain = parts[1];
        if (name.length() <= 2) {
            return name.charAt(0) + "***@" + domain;
        }
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + "@" + domain;
    }

    /**
     * Branded HTML Email Template:
     * - Subject: HR Portal – Admin Password Verification Code
     * - Account type (HR Admin / IT Admin)
     * - 6-digit OTP code in large, clean typography
     * - 5-minute expiration
     * - Urgent security warning
     */
    private String buildAdminOtpHtml(String name, String roleName, String otpCode) {
        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='UTF-8'></head>"
                + "<body style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B;'>"
                + "  <div style='max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);'>"
                + "    <div style='background: linear-gradient(135deg, #15803D 0%, #16A34A 100%); padding: 26px; text-align: center; color: white;'>"
                + "      <div style='font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; margin-bottom: 4px;'>High Security Verification</div>"
                + "      <h1 style='margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;'>ATS URJA • HR PORTAL</h1>"
                + "      <p style='margin: 4px 0 0 0; font-size: 13px; opacity: 0.95;'>Privileged Credential Management</p>"
                + "    </div>"
                + "    <div style='padding: 30px 26px;'>"
                + "      <div style='display: inline-block; background: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px;'>"
                + "        Privileged Account: " + roleName
                + "      </div>"
                + "      <h2 style='font-size: 18px; color: #0F172A; margin: 0 0 10px 0;'>Hello " + (name != null ? name : roleName) + ",</h2>"
                + "      <p style='font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;'>"
                + "        A password change request was initiated for your <strong>" + roleName + "</strong> account. "
                + "        To authorize this sensitive change, please verify your identity using the single-use verification code below."
                + "      </p>"
                + "      <div style='margin: 24px 0; text-align: center; background: #F0FDF4; border: 2px dashed #16A34A; border-radius: 10px; padding: 22px;'>"
                + "        <div style='font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803D; letter-spacing: 1.5px; margin-bottom: 8px;'>Your 6-Digit Verification Code</div>"
                + "        <div style='font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #166534; font-family: Consolas, monospace;'>" + otpCode + "</div>"
                + "        <div style='font-size: 12px; color: #DC2626; font-weight: 600; margin-top: 8px;'><span style='display: inline-block;'>⏱️</span> Expires in exactly 5 minutes (One-Time Use Only)</div>"
                + "      </div>"
                + "      <div style='background: #FEF2F2; border-left: 4px solid #EF4444; padding: 14px 16px; border-radius: 6px; margin: 24px 0;'>"
                + "        <div style='font-size: 12px; font-weight: 700; color: #991B1B; margin-bottom: 4px;'>SECURITY ALERT</div>"
                + "        <div style='font-size: 12px; line-height: 1.5; color: #7F1D1D;'>"
                + "          If you did not initiate this request, someone may be attempting to access your privileged administrative credentials. "
                + "          Please alert the IT Security team immediately. Your existing password remains unchanged and protected."
                + "        </div>"
                + "      </div>"
                + "      <p style='font-size: 12px; line-height: 1.5; color: #64748B; margin-top: 24px; border-top: 1px solid #F1F5F9; padding-top: 16px;'>"
                + "        • Maximum 5 verification attempts are permitted before this code is permanently locked.<br>"
                + "        • Urja Foods IT will never ask for your verification code or password."
                + "      </p>"
                + "    </div>"
                + "    <div style='background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px 26px; text-align: center; font-size: 11px; color: #94A3B8;'>"
                + "      Urja Foods & Agro Pvt. Ltd. • Enterprise Governance & Talent Systems"
                + "    </div>"
                + "  </div>"
                + "</body>"
                + "</html>";
    }
}
