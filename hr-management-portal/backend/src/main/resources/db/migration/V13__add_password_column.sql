-- ==============================================================================
-- V13: Add Password Column to Users Table
-- ==============================================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'password');

SET @stmt = IF(@col_exists = 0, 
    'ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL AFTER email;', 
    'SELECT 1;');
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed default passwords for system user accounts
UPDATE users SET password = 'password' WHERE password IS NULL;
UPDATE users SET password = 'password' WHERE username = 'itadmin';

