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

-- Ensure password column is populated with the secure BCrypt hash rather than plaintext 'password'
UPDATE users SET password = password_hash WHERE password IS NULL;

