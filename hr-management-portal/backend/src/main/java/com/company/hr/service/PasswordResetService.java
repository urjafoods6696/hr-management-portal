package com.company.hr.service;

import com.company.hr.dto.AuthRequest;
import com.company.hr.dto.PasswordResetResponseDto;
import com.company.hr.entity.PasswordResetToken;
import com.company.hr.entity.User;
import com.company.hr.exception.BadRequestException;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.PasswordResetTokenRepository;
import com.company.hr.repository.UserRepository;
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
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${spring.mail.username:recruitment-alerts@company.com}")
    private String fromEmail;

    @Value("${spring.mail.password:secret}")
    private String mailPassword;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public PasswordResetResponseDto initiatePasswordReset(AuthRequest.ForgotPasswordDto request) {
        String input = request.getEmail() != null ? request.getEmail().trim() : "";
        if (input.isEmpty()) {
            throw new BadRequestException("Work email or username is required");
        }

        // Locate user by email (case-insensitive) or username
        User user = userRepository.findByEmail(input)
                .or(() -> userRepository.findByUsername(input))
                .orElse(null);

        // Fallback: search ignoring case if exact match wasn't found
        if (user == null) {
            user = userRepository.findAll().stream()
                    .filter(u -> input.equalsIgnoreCase(u.getEmail()) || input.equalsIgnoreCase(u.getUsername()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("No active account found with email or username: " + input));
        }

        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new BadRequestException("Account status is " + user.getStatus() + ". Please contact IT Support.");
        }

        // Privileged Accounts (HR Admin and IT Admin) MUST use dedicated High-Security Email OTP verification
        if (user.getRoles() != null && user.getRoles().stream().anyMatch(r -> "ROLE_IT_ADMIN".equalsIgnoreCase(r.getRoleName()) || "ROLE_HR_ADMIN".equalsIgnoreCase(r.getRoleName()))) {
            throw new BadRequestException("Privileged accounts (HR Admin and IT Admin) require the High-Security Admin Password Verification workflow with Email OTP.");
        }

        // Invalidate any unexpired tokens for this user
        passwordResetTokenRepository.invalidateExistingTokensForUser(user);

        // Generate secure UUID token and 6-digit numeric verification OTP
        String token = UUID.randomUUID().toString().replace("-", "");
        String otpCode = String.format("%06d", secureRandom.nextInt(1_000_000));
        LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(15);

        PasswordResetToken resetTokenEntity = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .otpCode(otpCode)
                .expiryDate(expiryDate)
                .used(false)
                .build();

        passwordResetTokenRepository.save(resetTokenEntity);

        String resetUrl = frontendUrl + "/?resetToken=" + token;

        // Determine whether real SMTP credentials have been provided
        boolean isPlaceholderSmtp = "secret".equalsIgnoreCase(mailPassword)
                || "recruitment-alerts@company.com".equalsIgnoreCase(fromEmail);

        boolean emailSent = false;
        if (!isPlaceholderSmtp) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
                helper.setFrom(fromEmail);
                helper.setTo(user.getEmail());
                helper.setSubject("[ATS Urja] Password Reset Verification Code: " + otpCode);
                String htmlContent = buildResetEmailHtml(user.getName(), otpCode, resetUrl);
                helper.setText(htmlContent, true);

                mailSender.send(mimeMessage);
                emailSent = true;
                log.info("Password reset email successfully sent via SMTP to {}", user.getEmail());
            } catch (Exception ex) {
                log.warn("SMTP delivery to {} failed: {}", user.getEmail(), ex.getMessage());
                emailSent = false;
            }
        } else {
            log.info("Corporate SMTP is running with default placeholder credentials. Verification code generated: {}", otpCode);
            emailSent = false;
        }

        // Also add an in-app system notification for the user
        try {
            notificationService.notifyUser(
                    user,
                    "Password Reset Initiated",
                    "A password reset code (" + otpCode + ") was generated for your ATS Urja account. Valid for 15 minutes.",
                    "/?tab=settings"
            );
        } catch (Exception e) {
            log.warn("Could not save in-app notification: {}", e.getMessage());
        }

        if (emailSent) {
            return PasswordResetResponseDto.builder()
                    .success(true)
                    .message("A password reset email with verification code has been dispatched to " + user.getEmail() + ".")
                    .email(user.getEmail())
                    .emailSent(true)
                    .resetToken(token) // returned so the client can also transition smoothly
                    .resetCode(otpCode)
                    .resetUrl(resetUrl)
                    .build();
        } else {
            return PasswordResetResponseDto.builder()
                    .success(true)
                    .message("Password reset token generated. Note: Live corporate SMTP is currently unconfigured, so verification code is provided directly.")
                    .email(user.getEmail())
                    .emailSent(false)
                    .resetToken(token)
                    .resetCode(otpCode)
                    .resetUrl(resetUrl)
                    .build();
        }
    }

    @Transactional
    public PasswordResetResponseDto confirmPasswordReset(AuthRequest.ConfirmResetPasswordDto request) {
        String identifier = request.getToken() != null ? request.getToken().trim() : "";
        if (identifier.isEmpty()) {
            throw new BadRequestException("Verification code or reset token is required");
        }

        String newPassword = request.getNewPassword() != null ? request.getNewPassword().trim() : "";
        if (newPassword.length() < 6) {
            throw new BadRequestException("New password must be at least 6 characters long");
        }

        PasswordResetToken tokenEntity = passwordResetTokenRepository.findValidTokenOrOtp(identifier)
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification code / reset token"));

        if (tokenEntity.isUsed()) {
            throw new BadRequestException("This reset token or verification code has already been used");
        }

        if (tokenEntity.isExpired()) {
            throw new BadRequestException("This verification code has expired. Please request a new one");
        }

        User user = tokenEntity.getUser();
        user.setPassword(null);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Mark token as used
        tokenEntity.setUsed(true);
        passwordResetTokenRepository.save(tokenEntity);

        log.info("Password successfully updated in MySQL for user: {} (email: {})", user.getUsername(), user.getEmail());

        // Invalidate any other tokens
        passwordResetTokenRepository.invalidateExistingTokensForUser(user);

        return PasswordResetResponseDto.builder()
                .success(true)
                .message("Password has been successfully updated. You can now sign in with your new credentials.")
                .email(user.getEmail())
                .build();
    }

    private String buildResetEmailHtml(String name, String otpCode, String resetUrl) {
        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='UTF-8'></head>"
                + "<body style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B;'>"
                + "  <div style='max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);'>"
                + "    <div style='background: linear-gradient(135deg, #15803D 0%, #16A34A 100%); padding: 24px; text-align: center; color: white;'>"
                + "      <h1 style='margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;'>ATS URJA</h1>"
                + "      <p style='margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;'>Urja Foods & Agro Recruitment Management</p>"
                + "    </div>"
                + "    <div style='padding: 28px 24px;'>"
                + "      <h2 style='font-size: 18px; color: #0F172A; margin-top: 0;'>Hello " + (name != null ? name : "Team Member") + ",</h2>"
                + "      <p style='font-size: 14px; line-height: 1.6; color: #475569;'>"
                + "        We received a request to reset the password for your <strong>ATS Urja</strong> corporate account."
                + "      </p>"
                + "      <div style='margin: 24px 0; text-align: center; background: #F0FDF4; border: 1px dashed #16A34A; border-radius: 8px; padding: 18px;'>"
                + "        <div style='font-size: 12px; font-weight: 600; text-transform: uppercase; color: #15803D; letter-spacing: 1px; margin-bottom: 6px;'>Your 6-Digit Verification Code</div>"
                + "        <div style='font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #166534; font-family: monospace;'>" + otpCode + "</div>"
                + "        <div style='font-size: 11px; color: #64748B; margin-top: 6px;'>Expires in 15 minutes</div>"
                + "      </div>"
                + "      <div style='text-align: center; margin: 24px 0;'>"
                + "        <a href='" + resetUrl + "' style='display: inline-block; background-color: #16A34A; color: #FFFFFF; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.25);'>"
                + "          Reset Password Online"
                + "        </a>"
                + "      </div>"
                + "      <p style='font-size: 12px; line-height: 1.5; color: #64748B; margin-top: 24px; border-top: 1px solid #F1F5F9; padding-top: 16px;'>"
                + "        If you did not request this password change, no action is required; your account remains secure."
                + "      </p>"
                + "    </div>"
                + "    <div style='background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 14px 24px; text-align: center; font-size: 11px; color: #94A3B8;'>"
                + "      Urja Foods & Agro Pvt. Ltd. • Human Resources & Talent Acquisition System"
                + "    </div>"
                + "  </div>"
                + "</body>"
                + "</html>";
    }
}
