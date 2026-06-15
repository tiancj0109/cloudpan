-- 5. Moment Notifications
CREATE TABLE IF NOT EXISTS `moment_notifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT 'Recipient User ID',
  `sender_id` BIGINT NOT NULL COMMENT 'Sender User ID',
  `moment_id` BIGINT NOT NULL COMMENT 'Related Moment ID',
  `type` ENUM('LIKE', 'COMMENT', 'REPLY') NOT NULL COMMENT 'Notification Type',
  `content` TEXT COMMENT 'Comment content, empty for LIKE',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
