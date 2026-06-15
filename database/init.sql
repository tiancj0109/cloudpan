/*
 * CloudPan Database Initialization Script
 * Version: 1.0
 * Database: cloudpan
 */

CREATE DATABASE IF NOT EXISTS `cloudpan` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE `cloudpan`;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. 用户表 (User)
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(100) NOT NULL COMMENT '密码哈希',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `role` varchar(20) DEFAULT 'USER' COMMENT '角色: USER, ADMIN',
  `status` tinyint(4) DEFAULT 1 COMMENT '状态: 1正常, 0禁用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ----------------------------
-- 2. 用户存储配额表 (User Storage)
-- ----------------------------
DROP TABLE IF EXISTS `user_storage`;
CREATE TABLE `user_storage` (
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `total_quota` bigint(20) DEFAULT 1073741824 COMMENT '总配额(字节)，默认1GB',
  `used_space` bigint(20) DEFAULT 0 COMMENT '已用空间(字节)',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_storage_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户存储配额表';

-- ----------------------------
-- 3. 文件信息表 (File Info)
-- ----------------------------
DROP TABLE IF EXISTS `file_info`;
CREATE TABLE `file_info` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '文件ID',
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `parent_id` bigint(20) DEFAULT 0 COMMENT '父文件夹ID，根目录为0',
  `filename` varchar(255) NOT NULL COMMENT '文件名',
  `file_path` varchar(1000) DEFAULT NULL COMMENT '物理存储路径或OSS Key',
  `file_size` bigint(20) DEFAULT 0 COMMENT '文件大小(字节)',
  `file_type` varchar(50) DEFAULT NULL COMMENT '文件类型/扩展名',
  `is_folder` tinyint(1) DEFAULT 0 COMMENT '是否文件夹: 1是, 0否',
  `storage_type` tinyint(4) DEFAULT 0 COMMENT '存储类型: 0本地, 1OSS',
  `status` tinyint(4) DEFAULT 0 COMMENT '状态: 0正常, 1删除',
  `identifier` varchar(64) DEFAULT NULL COMMENT '文件MD5/SHA1标识，用于秒传',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_parent` (`user_id`, `parent_id`),
  CONSTRAINT `fk_file_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件信息表';

-- ----------------------------
-- 4. 回收站表 (Recycle Bin)
-- ----------------------------
DROP TABLE IF EXISTS `recycle_bin`;
CREATE TABLE `recycle_bin` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '回收站记录ID',
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `file_id` bigint(20) NOT NULL COMMENT '原文件ID',
  `original_parent_id` bigint(20) DEFAULT 0 COMMENT '原父文件夹ID',
  `deleted_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '删除时间',
  `expire_at` datetime DEFAULT NULL COMMENT '过期时间(自动清理)',
  PRIMARY KEY (`id`),
  KEY `idx_user_file` (`user_id`, `file_id`),
  CONSTRAINT `fk_recycle_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recycle_file` FOREIGN KEY (`file_id`) REFERENCES `file_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回收站表';

-- ----------------------------
-- 5. 分享链接表 (Share Link)
-- ----------------------------
DROP TABLE IF EXISTS `share_link`;
CREATE TABLE `share_link` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '分享ID',
  `user_id` bigint(20) NOT NULL COMMENT '分享者ID',
  `file_id` bigint(20) NOT NULL COMMENT '文件/文件夹ID',
  `share_code` varchar(50) NOT NULL COMMENT '分享链接代码(UUID)',
  `access_code` varchar(10) DEFAULT NULL COMMENT '提取码，空则公开',
  `permission` tinyint(4) DEFAULT 1 COMMENT '权限: 1只读/下载, 2可编辑(仅针对协作)',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间，NULL为永久',
  `visit_count` int(11) DEFAULT 0 COMMENT '访问次数',
  `download_count` int(11) DEFAULT 0 COMMENT '下载次数',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_share_code` (`share_code`),
  CONSTRAINT `fk_share_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_share_file` FOREIGN KEY (`file_id`) REFERENCES `file_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分享链接表';

-- ----------------------------
-- 6. 团队协作表 (Team Collaboration)
-- ----------------------------
DROP TABLE IF EXISTS `team_space`;
CREATE TABLE `team_space` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '团队空间ID',
  `name` varchar(100) NOT NULL COMMENT '团队名称',
  `owner_id` bigint(20) NOT NULL COMMENT '拥有者ID',
  `root_folder_id` bigint(20) DEFAULT NULL COMMENT '团队根目录ID',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_team_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团队空间表';

DROP TABLE IF EXISTS `team_member`;
CREATE TABLE `team_member` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '成员记录ID',
  `team_id` bigint(20) NOT NULL COMMENT '团队ID',
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `role` varchar(20) DEFAULT 'MEMBER' COMMENT '角色: OWNER, ADMIN, MEMBER',
  `permission` varchar(50) DEFAULT 'READ_WRITE' COMMENT '权限: READ_ONLY, READ_WRITE',
  `joined_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_user` (`team_id`, `user_id`),
  CONSTRAINT `fk_member_team` FOREIGN KEY (`team_id`) REFERENCES `team_space` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_member_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团队成员表';

-- ----------------------------
-- 7. OSS配置表 (OSS Config)
-- ----------------------------
DROP TABLE IF EXISTS `oss_config`;
CREATE TABLE `oss_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `provider` varchar(20) DEFAULT 'ALIYUN' COMMENT '提供商: ALIYUN, AWS, MINIO',
  `endpoint` varchar(255) NOT NULL COMMENT 'Endpoint',
  `access_key` varchar(100) NOT NULL COMMENT 'AccessKey',
  `secret_key` varchar(100) NOT NULL COMMENT 'SecretKey',
  `bucket_name` varchar(100) NOT NULL COMMENT 'Bucket名称',
  `is_enable` tinyint(1) DEFAULT 0 COMMENT '是否启用: 1是, 0否',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OSS配置表';

-- ----------------------------
-- 初始化数据
-- ----------------------------
-- 默认管理员账号: admin / 123456 (需在代码中BCrypt加密)
-- INSERT INTO `user` (`username`, `password`, `email`, `role`) VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOcVLqa8klt9y', 'admin@cloudpan.com', 'ADMIN');
-- 初始化用户配额
-- INSERT INTO `user_storage` (`user_id`, `total_quota`) VALUES (1, 10737418240); -- 10GB

SET FOREIGN_KEY_CHECKS = 1;
