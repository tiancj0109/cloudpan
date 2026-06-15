USE `cloudpan`;

-- ----------------------------
-- Friend Table
-- ----------------------------
DROP TABLE IF EXISTS `friend`;
CREATE TABLE `friend` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint(20) NOT NULL COMMENT 'User ID',
  `friend_id` bigint(20) NOT NULL COMMENT 'Friend ID',
  `status` tinyint(4) DEFAULT 0 COMMENT 'Status: 0-Pending, 1-Accepted, 2-DeleteRequested',
  `action_user_id` bigint(20) DEFAULT NULL COMMENT 'Last Action User ID',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Create Time',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update Time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_friend` (`user_id`, `friend_id`),
  CONSTRAINT `fk_friend_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_friend_friend` FOREIGN KEY (`friend_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Friend Relationship Table';

-- ----------------------------
-- Chat Message Table
-- ----------------------------
DROP TABLE IF EXISTS `chat_message`;
CREATE TABLE `chat_message` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `sender_id` bigint(20) NOT NULL COMMENT 'Sender ID',
  `receiver_id` bigint(20) NOT NULL COMMENT 'Receiver ID',
  `content` text COMMENT 'Content or File Path',
  `type` varchar(20) NOT NULL COMMENT 'Type: TEXT, IMAGE, VIDEO, AUDIO',
  `file_size` bigint(20) DEFAULT 0 COMMENT 'File Size',
  `file_path` varchar(500) DEFAULT NULL COMMENT 'Original File Path',
  `thumb_path` varchar(500) DEFAULT NULL COMMENT 'Thumbnail/Cover Path',
  `duration` int(11) DEFAULT 0 COMMENT 'Duration (seconds)',
  `status` tinyint(4) DEFAULT 0 COMMENT 'Status: 0-Unread, 1-Read',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Create Time',
  PRIMARY KEY (`id`),
  KEY `idx_sender_receiver` (`sender_id`, `receiver_id`),
  KEY `idx_receiver_sender` (`receiver_id`, `sender_id`),
  CONSTRAINT `fk_chat_sender` FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Chat Message Table';
