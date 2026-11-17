package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyHiringPerformanceResponse {
    private long applications;
    private long interviews;
    private long joined;
    private Integer selectedYear;
    private Integer selectedMonth;
    private String department;
    private List<MonthMetricDto> monthlyPerformance;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthMetricDto {
        private String month;
        private String monthName;
        private Integer monthNumber;
        private Integer year;
        private long applications;
        private long interviews;
        private long joined;
    }
}
