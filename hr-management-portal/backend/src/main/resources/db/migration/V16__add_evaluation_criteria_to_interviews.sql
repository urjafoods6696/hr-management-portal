-- V16: Add evaluation_criteria column to interviews table

SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'interviews' 
      AND COLUMN_NAME = 'evaluation_criteria'
);

SET @stmt = IF(@col_exists = 0, 
    'ALTER TABLE interviews ADD COLUMN evaluation_criteria TEXT NULL AFTER instructions', 
    'SELECT 1'
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

