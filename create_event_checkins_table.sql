-- SQL to create event_checkins table
CREATE TABLE IF NOT EXISTS `event_checkins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT NOT NULL,
  `guest_id` VARCHAR(128) NULL,
  `booking_id` VARCHAR(128) NULL,
  `checked_in_by` INT NULL,
  `checked_in_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
