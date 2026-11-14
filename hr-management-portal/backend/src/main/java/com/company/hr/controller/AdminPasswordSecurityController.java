package com.company.hr.controller;

import com.company.hr.dto.AdminPasswordSecurityDto;
import com.company.hr.dto.ApiResponse;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.AdminPasswordSecurityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/auth/admin-password", "/api/auth/admin-password"})
@RequiredArgsConstructor
@Tag(name = "Admin Password Security", description = "High-security password change and recovery for HR Admin and IT Admin accounts with Email OTP")
public class AdminPasswordSecurityController {

    private final AdminPasswordSecurityService adminPasswordSecurityService;

    @PostMapping("/request-otp")
    @Operation(summary = "Step 1: Request 6-digit OTP verification code for HR Admin or IT Admin account (expires in 5 minutes)")
    public ResponseEntity<ApiResponse<AdminPasswordSecurityDto.ResponseDto>> requestOtp(
            @Valid @RequestBody AdminPasswordSecurityDto.RequestOtpDto dto,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        AdminPasswordSecurityDto.ResponseDto response = adminPasswordSecurityService.requestAdminOtp(dto, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMessage()));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Step 2 & 3: Verify 6-digit OTP code and issue a temporary single-use password reset token")
    public ResponseEntity<ApiResponse<AdminPasswordSecurityDto.ResponseDto>> verifyOtp(
            @Valid @RequestBody AdminPasswordSecurityDto.VerifyOtpDto dto,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        AdminPasswordSecurityDto.ResponseDto response = adminPasswordSecurityService.verifyAdminOtp(dto, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMessage()));
    }

    @PostMapping("/reset")
    @Operation(summary = "Step 4 & 5: Validate new password requirements (min 12 chars, upper, lower, number, special char) and commit change")
    public ResponseEntity<ApiResponse<AdminPasswordSecurityDto.ResponseDto>> resetPassword(
            @Valid @RequestBody AdminPasswordSecurityDto.ResetPasswordDto dto,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        AdminPasswordSecurityDto.ResponseDto response = adminPasswordSecurityService.resetAdminPassword(dto, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMessage()));
    }
}

