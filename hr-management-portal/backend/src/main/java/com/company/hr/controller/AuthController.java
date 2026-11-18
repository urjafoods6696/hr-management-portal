package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.dto.AuthRequest;
import com.company.hr.dto.AuthResponse;
import com.company.hr.dto.PasswordResetResponseDto;
import com.company.hr.dto.UserResponseDto;
import com.company.hr.security.JwtTokenProvider;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.PasswordResetService;
import com.company.hr.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for user login, password recovery, token issuance, and profile check")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserService userService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue JWT bearer token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest.LoginDto loginDto) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginDto.getUsernameOrEmail(), loginDto.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        AuthResponse authResponse = AuthResponse.builder()
                .token(jwt)
                .id(userPrincipal.getId())
                .username(userPrincipal.getUsername())
                .name(userPrincipal.getName())
                .email(userPrincipal.getEmail())
                .roles(roles)
                .departmentRestrictionId(userPrincipal.getDepartmentRestrictionId())
                .title(userPrincipal.getTitle())
                .profileImageUrl(userPrincipal.getProfileImageUrl())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(authResponse, "Authentication successful"));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Initiate password recovery and dispatch reset verification code/email")
    public ResponseEntity<ApiResponse<PasswordResetResponseDto>> forgotPassword(@Valid @RequestBody AuthRequest.ForgotPasswordDto request) {
        PasswordResetResponseDto response = passwordResetService.initiatePasswordReset(request);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMessage()));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Verify token or OTP code and reset user password")
    public ResponseEntity<ApiResponse<PasswordResetResponseDto>> resetPassword(@Valid @RequestBody AuthRequest.ConfirmResetPasswordDto request) {
        PasswordResetResponseDto response = passwordResetService.confirmPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMessage()));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user identity and database profile")
    public ResponseEntity<ApiResponse<UserResponseDto>> getCurrentUser(@AuthenticationPrincipal UserPrincipal currentUser) {
        UserResponseDto profile = userService.getCurrentUserProfile(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(profile));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current authenticated user's own profile")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateCurrentUser(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @jakarta.validation.Valid @RequestBody com.company.hr.dto.UserProfileUpdateRequest request) {
        UserResponseDto profile = userService.updateCurrentUserProfile(currentUser, request);
        return ResponseEntity.ok(ApiResponse.ok(profile, "Profile updated successfully."));
    }

    @PostMapping(value = "/me/avatar", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload current authenticated user's profile avatar from device")
    public ResponseEntity<ApiResponse<UserResponseDto>> uploadCurrentUserAvatar(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        UserResponseDto profile = userService.uploadUserProfileAvatar(currentUser, file);
        return ResponseEntity.ok(ApiResponse.ok(profile, "Profile avatar updated successfully."));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user and invalidate session")
    public ResponseEntity<ApiResponse<String>> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully"));
    }
}
