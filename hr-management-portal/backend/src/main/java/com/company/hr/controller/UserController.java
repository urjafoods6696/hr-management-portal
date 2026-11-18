package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.dto.UserProfileUpdateRequest;
import com.company.hr.dto.UserResponseDto;
import com.company.hr.entity.User;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/users", "/api/v1/users"})
@RequiredArgsConstructor
@Tag(name = "User Management", description = "User profile and lifecycle endpoints")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get authenticated user profile strictly from JWT security principal")
    public ResponseEntity<ApiResponse<UserResponseDto>> getCurrentUserProfile(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        UserResponseDto profile = userService.getCurrentUserProfile(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(profile));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update authenticated user's own profile (Full Name, Phone Number, Avatar, Username, Email, Department, Role)")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateCurrentUserProfile(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody UserProfileUpdateRequest request) {
        UserResponseDto profile = userService.updateCurrentUserProfile(currentUser, request);
        return ResponseEntity.ok(ApiResponse.ok(profile, "Profile updated successfully."));
    }

    @PostMapping(value = "/me/avatar", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload authenticated user profile avatar image from device")
    public ResponseEntity<ApiResponse<UserResponseDto>> uploadCurrentUserAvatar(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        UserResponseDto profile = userService.uploadUserProfileAvatar(currentUser, file);
        return ResponseEntity.ok(ApiResponse.ok(profile, "Profile avatar updated successfully."));
    }

    @GetMapping("/avatar/{fileName:.+}")
    @Operation(summary = "Serve uploaded profile avatar image")
    public ResponseEntity<org.springframework.core.io.Resource> getAvatar(
            @PathVariable String fileName) throws java.io.IOException {
        org.springframework.core.io.Resource resource = userService.getAvatarResource(fileName);
        String ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        org.springframework.http.MediaType mediaType = org.springframework.http.MediaType.IMAGE_JPEG;
        if (ext.equals(".png")) mediaType = org.springframework.http.MediaType.IMAGE_PNG;
        else if (ext.equals(".webp")) mediaType = org.springframework.http.MediaType.parseMediaType("image/webp");

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "public, max-age=604800")
                .body(resource);
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Deactivate user (Stage 1 of Two-Step Deletion)")
    public ResponseEntity<ApiResponse<User>> deactivateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = userService.deactivateUser(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(user, "User deactivated successfully."));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Permanently delete inactive user (Stage 2 of Two-Step Deletion)")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        userService.deleteUser(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(null, "User permanently deleted successfully."));
    }
}
