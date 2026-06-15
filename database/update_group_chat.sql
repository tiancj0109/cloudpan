-- ----------------------------
-- 1. 群组表 (Chat Group)
-- ----------------------------
DROP TABLE IF EXISTS `chat_group`;
CREATE TABLE `chat_group` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '群组ID',
  `name` varchar(100) NOT NULL COMMENT '群组名称',
  `owner_id` bigint(20) NOT NULL COMMENT '群主ID',
  `avatar` varchar(255) DEFAULT NULL COMMENT '群头像URL',
  `notice` varchar(500) DEFAULT NULL COMMENT '群公告',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_group_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群组表';

-- ----------------------------
-- 2. 群组成员表 (Group Member)
-- ----------------------------
DROP TABLE IF EXISTS `group_member`;
CREATE TABLE `group_member` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '成员记录ID',
  `group_id` bigint(20) NOT NULL COMMENT '群组ID',
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `role` varchar(20) DEFAULT 'MEMBER' COMMENT '角色: OWNER, ADMIN, MEMBER',
  `nickname` varchar(50) DEFAULT NULL COMMENT '群内昵称',
  `joined_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_user` (`group_id`, `user_id`),
  CONSTRAINT `fk_member_group` FOREIGN KEY (`group_id`) REFERENCES `chat_group` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_member_group_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群组成员表';

-- ----------------------------
-- 3. 修改聊天消息表 (Chat Message)
-- ----------------------------
-- 添加 group_id 字段，允许为空（私聊）
ALTER TABLE `chat_message` ADD COLUMN `group_id` bigint(20) DEFAULT NULL COMMENT '群组ID，私聊为NULL' AFTER `receiver_id`;
ALTER TABLE `chat_message` ADD INDEX `idx_group_id` (`group_id`);
