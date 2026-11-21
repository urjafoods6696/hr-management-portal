-- V13: Add password column for entity compatibility.
-- Existing password_hash values remain unchanged.
-- No plaintext passwords or hashes are copied into password.

SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'password'
);

SET @stmt = IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL AFTER email',
    'SELECT 1'
);

PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
