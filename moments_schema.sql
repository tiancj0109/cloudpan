-- Moments (朋友圈) Feature Database Schema

-- 1. Moments Table
CREATE TABLE IF NOT EXISTS `moments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT 'Publisher ID',
  `content` TEXT COMMENT 'Text content',
  `media` JSON COMMENT 'JSON array of media URLs',
  `media_type` ENUM('IMAGE', 'VIDEO', 'NONE') NOT NULL DEFAULT 'NONE' COMMENT 'Type of media',
  `visibility` ENUM('PUBLIC', 'PRIVATE', 'FRIENDS', 'PARTIAL', 'EXCLUDE') NOT NULL DEFAULT 'PUBLIC' COMMENT 'Visibility setting',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Moment Visibility (for PARTIAL/EXCLUDE visibility)
-- Stores the list of users who CAN see (for PARTIAL) or CANNOT see (for EXCLUDE)
CREATE TABLE IF NOT EXISTS `moment_visibility` (
  `moment_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL COMMENT 'Target User ID',
  PRIMARY KEY (`moment_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Moment Likes
CREATE TABLE IF NOT EXISTS `moment_likes` (
  `moment_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`moment_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Moment Comments
CREATE TABLE IF NOT EXISTS `moment_comments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `moment_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL COMMENT 'Commenter ID',
  `reply_to_user_id` BIGINT DEFAULT NULL COMMENT 'If replying to a specific user',
  `content` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_moment_id` (`moment_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
