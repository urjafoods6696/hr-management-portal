-- ==============================================================================
-- ATS Urja / TalentPulse HR Portal - Production Database Reset Script
-- Target: MySQL 8.x
-- Purpose: Complete purge of all development/testing data for clean production launch.
-- Safety: Preserves all authentication accounts, roles, departments, designations.
-- ==============================================================================

USE hr_portal_db;

-- 1. Temporarily disable foreign key checks for safe, atomic table clearing
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 2. CLEAR ALL TESTING / TRANSACTIONAL DATA (Exact Child-to-Parent Order)
-- -----------------------------------------------------------------------------

-- Interview & Feedback
TRUNCATE TABLE interview_feedback;
ALTER TABLE interview_feedback AUTO_INCREMENT = 1;

TRUNCATE TABLE interviews;
ALTER TABLE interviews AUTO_INCREMENT = 1;

-- Onboarding & Offers
TRUNCATE TABLE onboarding_checklists;
ALTER TABLE onboarding_checklists AUTO_INCREMENT = 1;

TRUNCATE TABLE offers;
ALTER TABLE offers AUTO_INCREMENT = 1;

-- Employee Documents & Lifecycle History
TRUNCATE TABLE employee_documents;
ALTER TABLE employee_documents AUTO_INCREMENT = 1;

TRUNCATE TABLE employee_status_history;
ALTER TABLE employee_status_history AUTO_INCREMENT = 1;

TRUNCATE TABLE employees;
ALTER TABLE employees AUTO_INCREMENT = 1;

-- Candidate Documents & Pipeline
TRUNCATE TABLE candidate_documents;
ALTER TABLE candidate_documents AUTO_INCREMENT = 1;

TRUNCATE TABLE recruitment_tasks;
ALTER TABLE recruitment_tasks AUTO_INCREMENT = 1;

TRUNCATE TABLE candidates;
ALTER TABLE candidates AUTO_INCREMENT = 1;

-- Requisition Approvals, History & Requisitions
TRUNCATE TABLE requisition_approvals;
ALTER TABLE requisition_approvals AUTO_INCREMENT = 1;

TRUNCATE TABLE requisition_history;
ALTER TABLE requisition_history AUTO_INCREMENT = 1;

TRUNCATE TABLE requisitions;
ALTER TABLE requisitions AUTO_INCREMENT = 1;

-- Approvals Inbox & Comments
TRUNCATE TABLE approval_comments;
ALTER TABLE approval_comments AUTO_INCREMENT = 1;

TRUNCATE TABLE approvals;
ALTER TABLE approvals AUTO_INCREMENT = 1;

-- Operational Logs, Notifications & Reset Tokens
TRUNCATE TABLE notifications;
ALTER TABLE notifications AUTO_INCREMENT = 1;

TRUNCATE TABLE audit_logs;
ALTER TABLE audit_logs AUTO_INCREMENT = 1;

TRUNCATE TABLE backup_history;
ALTER TABLE backup_history AUTO_INCREMENT = 1;

TRUNCATE TABLE password_reset_tokens;
ALTER TABLE password_reset_tokens AUTO_INCREMENT = 1;

-- -----------------------------------------------------------------------------
-- 3. PRESERVE & VERIFY AUTHENTICATION, ROLES & ORGANIZATIONAL MASTER DATA
-- -----------------------------------------------------------------------------

-- Roles Definition (Standard 8 System Roles)
INSERT INTO roles (id, role_name, description) VALUES
(1, 'ROLE_IT_ADMIN', 'System administrator with user, backup and security configuration privileges'),
(2, 'ROLE_HR_ADMIN', 'HR Department Administrator with full requisition, employee, and pipeline access'),
(3, 'ROLE_HR_RECRUITER', 'Recruiter managing assigned requisitions, candidate sourcing, and interviews'),
(4, 'ROLE_DEPT_HEAD', 'Department Head with requisition creation and department approval oversight'),
(5, 'ROLE_APPROVING_MANAGER', 'Line manager authorized to approve, return or reject manpower requisitions'),
(6, 'ROLE_SENIOR_MGMT', 'Senior leadership for final capital/headcount sanction and strategic analytics'),
(7, 'ROLE_INTERVIEWER', 'Panelist conducting technical/managerial interviews and submitting ratings'),
(8, 'ROLE_EMPLOYEE', 'Standard employee with document access and internal requisition requests')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Departments (Standard 6 Business Divisions)
INSERT INTO departments (id, department_code, department_name, active) VALUES
(1, 'DEP-ENG', 'Engineering & Technology', TRUE),
(2, 'DEP-SALES', 'Global Sales & Enterprise BD', TRUE),
(3, 'DEP-HR', 'Human Resources & Talent Acquisition', TRUE),
(4, 'DEP-FIN', 'Finance, Tax & Accounts', TRUE),
(5, 'DEP-OPS', 'Operations & Supply Chain', TRUE),
(6, 'DEP-MKT', 'Brand Marketing & Communications', TRUE)
ON DUPLICATE KEY UPDATE department_name = VALUES(department_name), active = TRUE;

-- Standard Designations
INSERT INTO designations (id, designation_code, designation_name, department_id, level, active) VALUES
(1, 'DES-ENG-01', 'Principal Cloud Architect', 1, 'Senior Lead', TRUE),
(2, 'DES-ENG-02', 'Senior Full Stack Java Engineer', 1, 'Senior', TRUE),
(3, 'DES-ENG-03', 'Frontend React Developer', 1, 'Mid-Level', TRUE),
(4, 'DES-ENG-04', 'QA Automation Engineer', 1, 'Mid-Level', TRUE),
(5, 'DES-SAL-01', 'Enterprise Sales Director', 2, 'Director', TRUE),
(6, 'DES-SAL-02', 'Business Development Executive', 2, 'Junior-Mid', TRUE),
(7, 'DES-HR-01', 'Talent Acquisition Lead', 3, 'Lead', TRUE),
(8, 'DES-HR-02', 'Senior Technical Recruiter', 3, 'Mid-Level', TRUE),
(9, 'DES-FIN-01', 'Financial Controller', 4, 'Senior Lead', TRUE),
(10, 'DES-OPS-01', 'Operations Manager', 5, 'Management', TRUE)
ON DUPLICATE KEY UPDATE designation_name = VALUES(designation_name), active = TRUE;

-- Standard Production Authorized Accounts (Admin, HR, Management)
-- Password for hradmin: hradmin (hash: $2a$10$49W4QK.4KQ/Fcfrh4b8YvO0CnAlEX6D/vXB2mpEqkBrMRc0p7MM4u)
-- Password for other accounts: password (hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
INSERT INTO users (id, username, name, email, password, password_hash, status, department_restriction_id, phone_number) VALUES
(1, 'itadmin', 'Vikramaditya Sharma', 'admin@company.com', 'password', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 1, '+91 98200 11223'),
(2, 'hradmin', 'HR Administrator', 'hradmin@company.com', 'hradmin', '$2a$10$49W4QK.4KQ/Fcfrh4b8YvO0CnAlEX6D/vXB2mpEqkBrMRc0p7MM4u', 'ACTIVE', 3, '+91 98200 22334'),
(3, 'recruiter.anita', 'Anita Deshmukh', 'anita.recruiter@company.com', 'password', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 3, '+91 98200 33445'),
(4, 'depthead.eng', 'Rajesh Kulkarni', 'rajesh.eng@company.com', 'password', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 1, '+91 98200 55667'),
(5, 'manager.amit', 'Amitav Mukherjee', 'amitav.mgr@company.com', 'password', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 1, '+91 98200 66778'),
(6, 'senior.mehta', 'Siddharth Mehta (VP)', 'smehta.vp@company.com', 'password', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 5, '+91 98200 77889')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name), 
    email = VALUES(email), 
    password = VALUES(password), 
    password_hash = VALUES(password_hash), 
    status = VALUES(status);

-- Role Mappings for Authorized Accounts
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- itadmin -> ROLE_IT_ADMIN
(2, 2), -- hradmin -> ROLE_HR_ADMIN
(3, 3), -- recruiter.anita -> ROLE_HR_RECRUITER
(4, 4), -- depthead.eng -> ROLE_DEPT_HEAD
(5, 5), -- manager.amit -> ROLE_APPROVING_MANAGER
(6, 6)  -- senior.mehta -> ROLE_SENIOR_MGMT
ON DUPLICATE KEY UPDATE role_id = VALUES(role_id);

-- Clean Access Policies to Standard Production Defaults
INSERT INTO access_policies (id, policy_key, policy_value, description) VALUES
(1, 'it_admin_candidate_access', 'false', 'Allow IT Administrator to view candidate records'),
(2, 'it_admin_resume_access', 'false', 'Allow IT Administrator to download/view candidate resumes'),
(3, 'it_admin_feedback_access', 'false', 'Allow IT Administrator to view interviewer ratings and scorecards'),
(4, 'can_assign_recruiters', 'ROLE_HR_ADMIN', 'Roles authorized to assign recruiters to requisitions'),
(5, 'can_assign_interviewers', 'ROLE_HR_ADMIN', 'Roles authorized to schedule rounds and assign interviewers'),
(6, 'can_assign_approvers', 'ROLE_HR_ADMIN,ROLE_DEPT_HEAD', 'Roles authorized to configure requisition approval workflows')
ON DUPLICATE KEY UPDATE policy_value = VALUES(policy_value);

-- 4. Re-enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 5. VERIFICATION QUERY
-- -----------------------------------------------------------------------------
SELECT 'users' AS tbl, COUNT(*) AS count FROM users
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL SELECT 'departments', COUNT(*) FROM departments
UNION ALL SELECT 'designations', COUNT(*) FROM designations
UNION ALL SELECT 'candidates', COUNT(*) FROM candidates
UNION ALL SELECT 'requisitions', COUNT(*) FROM requisitions
UNION ALL SELECT 'interviews', COUNT(*) FROM interviews
UNION ALL SELECT 'offers', COUNT(*) FROM offers
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'approvals', COUNT(*) FROM approvals
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;

