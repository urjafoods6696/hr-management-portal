-- Remove automatic default assumptions on candidate profile fields and track explicit HR verification & authentic content
ALTER TABLE candidates
    MODIFY COLUMN experience_years DECIMAL(4,1) NULL DEFAULT NULL,
    MODIFY COLUMN notice_period_days INT NULL DEFAULT NULL,
    MODIFY COLUMN source ENUM('LINKEDIN','NAUKRI','REFERRAL','COMPANY_CAREERS','CAMPUS','HEADHUNTER') NULL DEFAULT NULL,
    ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER status,
    ADD COLUMN verified_by VARCHAR(150) NULL AFTER is_verified,
    ADD COLUMN verified_at DATETIME NULL AFTER verified_by,
    ADD COLUMN linkedin_url VARCHAR(300) NULL AFTER primary_skills,
    ADD COLUMN professional_summary TEXT NULL AFTER linkedin_url,
    ADD COLUMN work_experience TEXT NULL AFTER professional_summary,
    ADD COLUMN education_details TEXT NULL AFTER work_experience,
    ADD COLUMN certifications TEXT NULL AFTER education_details,
    ADD COLUMN hr_notes TEXT NULL AFTER certifications;

ALTER TABLE candidate_documents
    ADD COLUMN extracted_text LONGTEXT NULL AFTER file_size_bytes;

