-- SQL to create event_checklist_items table
CREATE TABLE IF NOT EXISTS `event_checklist_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT NOT NULL,
  `item_key` VARCHAR(128) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `category` VARCHAR(64) NULL,
  `item_order` INT DEFAULT 0,
  `completed` TINYINT(1) DEFAULT 0,
  `completed_by` INT NULL,
  `completed_at` DATETIME NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_item_unique` (`event_id`, `item_key`),
  INDEX (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
