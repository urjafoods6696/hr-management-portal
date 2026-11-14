package com.company.hr.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AdminPasswordSecurityDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RequestOtpDto {
        @NotBlank(message = "Registered email address is required")
        @Email(message = "Invalid work email format")
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyOtpDto {
        @NotBlank(message = "Registered email address is required")
        @Email(message = "Invalid work email format")
        private String email;

        @NotBlank(message = "6-digit OTP verification code is required")
        @Size(min = 6, max = 6, message = "OTP must be exactly 6 numeric digits")
        private String otp;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResetPasswordDto {
        @NotBlank(message = "Registered email address is required")
        @Email(message = "Invalid work email format")
        private String email;

        @NotBlank(message = "Single-use verification token is required")
        private String resetToken;

        @NotBlank(message = "New password is required")
        @Size(min = 12, message = "Password must be at least 12 characters long")
        private String newPassword;

        @NotBlank(message = "Password confirmation is required")
        private String confirmPassword;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ResponseDto {
        private boolean success;
        private String message;
        private String email;
        private String accountRole;
        private Integer expiresInSeconds;
        private String resetToken;
        private String devOtpPreview;
    }
}

