-- 修改 receiver_id 允许为空（用于群聊）
ALTER TABLE `chat_message` MODIFY COLUMN `receiver_id` bigint(20) DEFAULT NULL COMMENT '接收者ID，群聊为NULL';
