-- Fix reminderSent column name case sensitivity issue
-- Rename reminderSent to reminder_sent to match MySQL conventions

ALTER TABLE `appointments` 
CHANGE COLUMN `reminderSent` `reminder_sent` TINYINT NOT NULL DEFAULT 0;
