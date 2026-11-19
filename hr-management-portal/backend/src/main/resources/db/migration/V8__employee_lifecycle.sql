
-- =============================================================================
-- V8__employee_lifecycle.sql
-- Employee Lifecycle Schema
-- Structure only: No demo data, no existing data deletion
-- =============================================================================

SET NAMES utf8mb4;

-- 1. Add employee lifecycle columns individually.
-- Individual ALTER statements avoid column-position dependencies.

ALTER TABLE employees
ADD COLUMN candidate_id BIGINT NULL;

ALTER TABLE employees
ADD COLUMN offer_id BIGINT NULL;

ALTER TABLE employees
ADD COLUMN avatar_url VARCHAR(500) NULL;

ALTER TABLE employees
ADD COLUMN gender VARCHAR(20) NULL DEFAULT 'Not Set';

ALTER TABLE employees
ADD COLUMN date_of_birth DATE NULL;

ALTER TABLE employees
ADD COLUMN blood_group VARCHAR(10) NULL DEFAULT 'Not Set';

ALTER TABLE employees
ADD COLUMN marital_status VARCHAR(30) NULL DEFAULT 'Not Set';

ALTER TABLE employees
ADD COLUMN address VARCHAR(255) NULL;

ALTER TABLE employees
ADD COLUMN reporting_manager_name VARCHAR(150) NULL;

ALTER TABLE employees
ADD COLUMN probation_duration_months INT NULL DEFAULT 6;

ALTER TABLE employees
ADD COLUMN probation_end_date DATE NULL;

ALTER TABLE employees
ADD COLUMN confirmation_status ENUM(
    'CONFIRMED',
    'PENDING_REVIEW',
    'EXTENDED',
    'NOT_APPLICABLE'
) NOT NULL DEFAULT 'PENDING_REVIEW';

ALTER TABLE employees
ADD COLUMN confirmation_date DATE NULL;

ALTER TABLE employees
ADD COLUMN resignation_date DATE NULL;

ALTER TABLE employees
ADD COLUMN notice_period_days INT NULL DEFAULT 30;

ALTER TABLE employees
ADD COLUMN last_working_day DATE NULL;

ALTER TABLE employees
ADD COLUMN actual_exit_date DATE NULL;

ALTER TABLE employees
ADD COLUMN exit_reason TEXT NULL;

ALTER TABLE employees
ADD COLUMN exit_checklist_status ENUM(
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'NOT_APPLICABLE'
) NOT NULL DEFAULT 'NOT_STARTED';


-- 2. Add candidate and offer relationships

ALTER TABLE employees
ADD CONSTRAINT fk_employees_candidate
FOREIGN KEY (candidate_id)
REFERENCES candidates(id)
ON DELETE SET NULL;

ALTER TABLE employees
ADD CONSTRAINT fk_employees_offer
FOREIGN KEY (offer_id)
REFERENCES offers(id)
ON DELETE SET NULL;


-- 3. Create employee status history table

CREATE TABLE IF NOT EXISTS employee_status_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    employee_id BIGINT NOT NULL,

    previous_status VARCHAR(50) NOT NULL,

    new_status VARCHAR(50) NOT NULL,

    change_reason TEXT NULL,

    changed_by_user_id BIGINT NULL,

    changed_by_name VARCHAR(150) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_emp_history_employee (employee_id),

    CONSTRAINT fk_emp_history_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_emp_history_user
        FOREIGN KEY (changed_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- END OF V8 MIGRATION
-- No INSERT, UPDATE, or DELETE statements for employee records.
-- =============================================================================
