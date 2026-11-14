package com.company.hr.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PasswordResetResponseDto {
    private boolean success;
    private String message;
    private String email;
    private boolean emailSent;
    private String resetToken;
    private String resetCode;
    private String resetUrl;
}

