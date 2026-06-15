/*
 Navicat Premium Data Transfer

 Source Server         : 陈同学
 Source Server Type    : MySQL
 Source Server Version : 80408 (8.4.8)
 Source Host           : 8.137.191.22:3306
 Source Schema         : cloudpan

 Target Server Type    : MySQL
 Target Server Version : 80408 (8.4.8)
 File Encoding         : 65001

 Date: 15/06/2026 09:19:00
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for chat_group
-- ----------------------------
DROP TABLE IF EXISTS `chat_group`;
CREATE TABLE `chat_group`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '群组ID',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '群组名称',
  `owner_id` bigint NOT NULL COMMENT '群主ID',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '群头像URL',
  `notice` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '群公告',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_group_owner`(`owner_id` ASC) USING BTREE,
  CONSTRAINT `fk_group_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '群组表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for chat_message
-- ----------------------------
DROP TABLE IF EXISTS `chat_message`;
CREATE TABLE `chat_message`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `sender_id` bigint NOT NULL COMMENT 'Sender ID',
  `receiver_id` bigint NULL DEFAULT NULL COMMENT '接收者ID，群聊为NULL',
  `group_id` bigint NULL DEFAULT NULL COMMENT '群组ID，私聊为NULL',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT 'Content or File Path',
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Type: TEXT, IMAGE, VIDEO, AUDIO',
  `file_size` bigint NULL DEFAULT 0 COMMENT 'File Size',
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT 'Original File Path',
  `thumb_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT 'Thumbnail/Cover Path',
  `duration` int NULL DEFAULT 0 COMMENT 'Duration (seconds)',
  `status` tinyint NULL DEFAULT 0 COMMENT 'Status: 0-Unread, 1-Read',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Create Time',
  `reply_to_message_id` bigint NULL DEFAULT NULL,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_sender_receiver`(`sender_id` ASC, `receiver_id` ASC) USING BTREE,
  INDEX `idx_receiver_sender`(`receiver_id` ASC, `sender_id` ASC) USING BTREE,
  INDEX `idx_group_id`(`group_id` ASC) USING BTREE,
  CONSTRAINT `fk_chat_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_chat_sender` FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1173 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = 'Chat Message Table' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for file_info
-- ----------------------------
DROP TABLE IF EXISTS `file_info`;
CREATE TABLE `file_info`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '鏂囦欢ID',
  `user_id` bigint NOT NULL COMMENT '鐢ㄦ埛ID',
  `parent_id` bigint NULL DEFAULT 0 COMMENT '鐖舵枃浠跺すID锛屾牴鐩?綍涓?',
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '鏂囦欢鍚',
  `file_path` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '鐗╃悊瀛樺偍璺?緞鎴朞SS Key',
  `file_size` bigint NULL DEFAULT 0 COMMENT '鏂囦欢澶у皬(瀛楄妭)',
  `file_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '鏂囦欢绫诲瀷/鎵╁睍鍚',
  `is_folder` tinyint(1) NULL DEFAULT 0 COMMENT '鏄?惁鏂囦欢澶? 1鏄? 0鍚',
  `storage_type` tinyint NULL DEFAULT 0 COMMENT '瀛樺偍绫诲瀷: 0鏈?湴, 1OSS',
  `status` tinyint NULL DEFAULT 0 COMMENT '状态: 0正常, 1删除',
  `identifier` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '鏂囦欢MD5/SHA1鏍囪瘑锛岀敤浜庣?浼',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  `team_id` bigint NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_parent`(`user_id` ASC, `parent_id` ASC) USING BTREE,
  CONSTRAINT `fk_file_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1085 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '鏂囦欢淇℃伅琛' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for friend
-- ----------------------------
DROP TABLE IF EXISTS `friend`;
CREATE TABLE `friend`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint NOT NULL COMMENT 'User ID',
  `friend_id` bigint NOT NULL COMMENT 'Friend ID',
  `status` tinyint NULL DEFAULT 0 COMMENT 'Status: 0-Pending, 1-Accepted, 2-DeleteRequested',
  `action_user_id` bigint NULL DEFAULT NULL COMMENT 'Last Action User ID',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Create Time',
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update Time',
  `is_top` tinyint(1) NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_friend`(`user_id` ASC, `friend_id` ASC) USING BTREE,
  INDEX `fk_friend_friend`(`friend_id` ASC) USING BTREE,
  CONSTRAINT `fk_friend_friend` FOREIGN KEY (`friend_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_friend_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 27 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = 'Friend Relationship Table' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for group_member
-- ----------------------------
DROP TABLE IF EXISTS `group_member`;
CREATE TABLE `group_member`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '成员记录ID',
  `group_id` bigint NOT NULL COMMENT '群组ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'MEMBER' COMMENT '角色: OWNER, ADMIN, MEMBER',
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '群内昵称',
  `joined_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `last_read_message_id` bigint NULL DEFAULT 0,
  `is_top` tinyint(1) NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_group_user`(`group_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `fk_member_group_user`(`user_id` ASC) USING BTREE,
  CONSTRAINT `fk_member_group` FOREIGN KEY (`group_id`) REFERENCES `chat_group` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_member_group_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 49 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '群组成员表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for moment_comments
-- ----------------------------
DROP TABLE IF EXISTS `moment_comments`;
CREATE TABLE `moment_comments`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `moment_id` bigint NOT NULL,
  `user_id` bigint NOT NULL COMMENT 'Commenter ID',
  `reply_to_user_id` bigint NULL DEFAULT NULL COMMENT 'If replying to a specific user',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_moment_id`(`moment_id` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 63 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for moment_likes
-- ----------------------------
DROP TABLE IF EXISTS `moment_likes`;
CREATE TABLE `moment_likes`  (
  `moment_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`moment_id`, `user_id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for moment_notifications
-- ----------------------------
DROP TABLE IF EXISTS `moment_notifications`;
CREATE TABLE `moment_notifications`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT 'Recipient User ID',
  `sender_id` bigint NOT NULL COMMENT 'Sender User ID',
  `moment_id` bigint NOT NULL COMMENT 'Related Moment ID',
  `type` enum('LIKE','COMMENT','REPLY') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Notification Type',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Comment content, empty for LIKE',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_is_read`(`is_read` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 62 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for moment_visibility
-- ----------------------------
DROP TABLE IF EXISTS `moment_visibility`;
CREATE TABLE `moment_visibility`  (
  `moment_id` bigint NOT NULL,
  `user_id` bigint NOT NULL COMMENT 'Target User ID',
  PRIMARY KEY (`moment_id`, `user_id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for moments
-- ----------------------------
DROP TABLE IF EXISTS `moments`;
CREATE TABLE `moments`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT 'Publisher ID',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Text content',
  `media` json NULL COMMENT 'JSON array of media URLs',
  `media_type` enum('IMAGE','VIDEO','NONE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NONE' COMMENT 'Type of media',
  `visibility` enum('PUBLIC','PRIVATE','FRIENDS','PARTIAL','EXCLUDE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PUBLIC' COMMENT 'Visibility setting',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_created_at`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 81 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for oss_config
-- ----------------------------
DROP TABLE IF EXISTS `oss_config`;
CREATE TABLE `oss_config`  (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '閰嶇疆ID',
  `provider` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'ALIYUN' COMMENT '鎻愪緵鍟? ALIYUN, AWS, MINIO',
  `endpoint` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Endpoint',
  `access_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'AccessKey',
  `secret_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'SecretKey',
  `bucket_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Bucket鍚嶇О',
  `is_enable` tinyint(1) NULL DEFAULT 0 COMMENT '鏄?惁鍚?敤: 1鏄? 0鍚',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = 'OSS閰嶇疆琛' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for recycle_bin
-- ----------------------------
DROP TABLE IF EXISTS `recycle_bin`;
CREATE TABLE `recycle_bin`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '鍥炴敹绔欒?褰旾D',
  `user_id` bigint NOT NULL COMMENT '鐢ㄦ埛ID',
  `file_id` bigint NOT NULL COMMENT '鍘熸枃浠禝D',
  `original_parent_id` bigint NULL DEFAULT 0 COMMENT '鍘熺埗鏂囦欢澶笽D',
  `deleted_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒犻櫎鏃堕棿',
  `expire_at` datetime NULL DEFAULT NULL COMMENT '杩囨湡鏃堕棿(鑷?姩娓呯悊)',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_file`(`user_id` ASC, `file_id` ASC) USING BTREE,
  INDEX `fk_recycle_file`(`file_id` ASC) USING BTREE,
  CONSTRAINT `fk_recycle_file` FOREIGN KEY (`file_id`) REFERENCES `file_info` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_recycle_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 982 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '鍥炴敹绔欒〃' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for share_link
-- ----------------------------
DROP TABLE IF EXISTS `share_link`;
CREATE TABLE `share_link`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '鍒嗕韩ID',
  `user_id` bigint NOT NULL COMMENT '鍒嗕韩鑰匢D',
  `file_id` bigint NOT NULL COMMENT '鏂囦欢/鏂囦欢澶笽D',
  `share_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '鍒嗕韩閾炬帴浠ｇ爜(UUID)',
  `access_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '鎻愬彇鐮侊紝绌哄垯鍏?紑',
  `permission` tinyint NULL DEFAULT 1 COMMENT '鏉冮檺: 1鍙??/涓嬭浇, 2鍙?紪杈?浠呴拡瀵瑰崗浣?',
  `expire_time` datetime NULL DEFAULT NULL COMMENT '杩囨湡鏃堕棿锛孨ULL涓烘案涔',
  `visit_count` int NULL DEFAULT 0 COMMENT '璁块棶娆℃暟',
  `download_count` int NULL DEFAULT 0 COMMENT '涓嬭浇娆℃暟',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_share_code`(`share_code` ASC) USING BTREE,
  INDEX `fk_share_user`(`user_id` ASC) USING BTREE,
  INDEX `fk_share_file`(`file_id` ASC) USING BTREE,
  CONSTRAINT `fk_share_file` FOREIGN KEY (`file_id`) REFERENCES `file_info` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_share_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 48 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '鍒嗕韩閾炬帴琛' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for team_member
-- ----------------------------
DROP TABLE IF EXISTS `team_member`;
CREATE TABLE `team_member`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '鎴愬憳璁板綍ID',
  `team_id` bigint NOT NULL COMMENT '鍥㈤槦ID',
  `user_id` bigint NOT NULL COMMENT '鐢ㄦ埛ID',
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'MEMBER' COMMENT '瑙掕壊: OWNER, ADMIN, MEMBER',
  `permission` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'READ_WRITE' COMMENT '鏉冮檺: READ_ONLY, READ_WRITE',
  `joined_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍔犲叆鏃堕棿',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_team_user`(`team_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `fk_member_user`(`user_id` ASC) USING BTREE,
  CONSTRAINT `fk_member_team` FOREIGN KEY (`team_id`) REFERENCES `team_space` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_member_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 35 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '鍥㈤槦鎴愬憳琛' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for team_space
-- ----------------------------
DROP TABLE IF EXISTS `team_space`;
CREATE TABLE `team_space`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '鍥㈤槦绌洪棿ID',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '鍥㈤槦鍚嶇О',
  `owner_id` bigint NOT NULL COMMENT '鎷ユ湁鑰匢D',
  `root_folder_id` bigint NULL DEFAULT NULL COMMENT '鍥㈤槦鏍圭洰褰旾D',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_team_owner`(`owner_id` ASC) USING BTREE,
  CONSTRAINT `fk_team_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '鍥㈤槦绌洪棿琛' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '用户名',
  `password` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '密码（加密）',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '邮箱',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '头像URL',
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'USER' COMMENT '角色: USER（普通用户）, ADMIN（管理员）',
  `status` tinyint NULL DEFAULT 1 COMMENT '状态: 1（正常）, 0（禁用）',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `signature` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '说点骚话吧?',
  `last_moments_read_at` timestamp NULL DEFAULT NULL COMMENT '用户最后一次阅读动态的时间戳',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_username`(`username` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 25 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '用户表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for user_storage
-- ----------------------------
DROP TABLE IF EXISTS `user_storage`;
CREATE TABLE `user_storage`  (
  `user_id` bigint NOT NULL COMMENT '鐢ㄦ埛ID',
  `total_quota` bigint NULL DEFAULT 1073741824 COMMENT '鎬婚厤棰?瀛楄妭)锛岄粯璁?GB',
  `used_space` bigint NULL DEFAULT 0 COMMENT '宸茬敤绌洪棿(瀛楄妭)',
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  PRIMARY KEY (`user_id`) USING BTREE,
  CONSTRAINT `fk_storage_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '鐢ㄦ埛瀛樺偍閰嶉?琛' ROW_FORMAT = DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;
