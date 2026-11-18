package com.company.hr.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileUpdateRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
    private String name;

    @Size(max = 30, message = "Phone number cannot exceed 30 characters")
    private String phoneNumber;

    @Size(max = 500, message = "Profile image URL cannot exceed 500 characters")
    private String profileImageUrl;

    @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
    private String username;

    @Size(max = 150, message = "Email cannot exceed 150 characters")
    private String email;

    private String department;
    private Long departmentId;
    private String role;
}
