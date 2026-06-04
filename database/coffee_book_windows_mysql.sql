-- Coffee Book Windows MySQL initialization script
-- Target: MySQL 5.7+ / MySQL 8.x on Windows
-- Encoding: UTF-8. Import with utf8mb4 to keep Chinese text correct.
--
-- PowerShell import example:
-- Get-Content -Raw -Encoding UTF8 "D:\咖啡书屋\database\coffee_book_windows_mysql.sql" | mysql --default-character-set=utf8mb4 -u root -p
--
-- MySQL client import example:
-- mysql --default-character-set=utf8mb4 -u root -p
-- mysql> source D:/咖啡书屋/database/coffee_book_windows_mysql.sql
--
-- Default accounts:
-- Frontend user: phone 13800000000 / password coffee123
-- Admin user: account admin / password admin123
--
-- Note: this script recreates the project tables in database coffee_book.
-- Back up existing data before importing into an environment with real data.

SET NAMES utf8mb4;
SET time_zone = '+08:00';
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `coffee_book`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `coffee_book`;

DROP TABLE IF EXISTS `permissions`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `carts`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `posts`;
DROP TABLE IF EXISTS `activity_applications`;
DROP TABLE IF EXISTS `activities`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `books`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) NOT NULL UNIQUE,
  `email` VARCHAR(160) NOT NULL DEFAULT '',
  `birthday` DATE NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(30) NOT NULL,
  `level` VARCHAR(50) NOT NULL,
  `points` INT NOT NULL DEFAULT 0,
  `avatar` MEDIUMTEXT NULL,
  `bio` TEXT NULL,
  `coffee_preference` VARCHAR(100) NOT NULL DEFAULT '',
  `book_preference` VARCHAR(100) NOT NULL DEFAULT '',
  `address` TEXT NULL,
  `profile_public` TINYINT(1) NOT NULL DEFAULT 1,
  `level_progress` INT NOT NULL DEFAULT 0,
  `last_checkin` VARCHAR(20) NOT NULL DEFAULT '',
  `favorites` TEXT NULL,
  `notes` TEXT NULL,
  `notifications` TEXT NULL,
  `gifts` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admins` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `account` VARCHAR(60) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `category` VARCHAR(40) NOT NULL DEFAULT 'creative',
  `image` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `books` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(160) NOT NULL,
  `author` VARCHAR(100) NOT NULL,
  `category` VARCHAR(40) NOT NULL,
  `ranking` VARCHAR(80) NOT NULL DEFAULT '',
  `summary` TEXT NOT NULL,
  `publisher` VARCHAR(160) NOT NULL DEFAULT '',
  `published_at` DATETIME NOT NULL,
  `image` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reservations` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL DEFAULT 0,
  `phone` VARCHAR(30) NOT NULL DEFAULT '',
  `seat_id` VARCHAR(20) NOT NULL,
  `date` DATE NOT NULL,
  `time` VARCHAR(20) NOT NULL,
  `people` VARCHAR(20) NOT NULL,
  `purpose` VARCHAR(100) NOT NULL,
  `note` TEXT,
  `status` VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL DEFAULT 0,
  `user_name` VARCHAR(100) NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `status` VARCHAR(30) NOT NULL,
  `payment_method` VARCHAR(40) NOT NULL DEFAULT '',
  `paid_at` DATETIME NULL,
  `cancelled_at` DATETIME NULL,
  `payment_review_status` VARCHAR(20) NOT NULL DEFAULT 'not_submitted',
  `payment_submitted_at` DATETIME NULL,
  `payment_reviewed_at` DATETIME NULL,
  `payment_reviewed_by` INT NOT NULL DEFAULT 0,
  `earned_points` INT NOT NULL DEFAULT 0,
  `earned_progress` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `user_id` INT NOT NULL DEFAULT 0,
  `amount` DECIMAL(10,2) NOT NULL,
  `method` VARCHAR(20) NOT NULL DEFAULT 'mock',
  `status` VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  `transaction_no` VARCHAR(80) NOT NULL DEFAULT '',
  `submitted_at` DATETIME NULL,
  `confirmed_at` DATETIME NULL,
  `expired_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_items` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activities` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(160) NOT NULL,
  `capacity` INT NOT NULL,
  `applied` INT NOT NULL,
  `date` DATE NOT NULL,
  `time` VARCHAR(40) NOT NULL DEFAULT '',
  `registration_start` DATETIME NULL,
  `early_start` DATETIME NULL,
  `location` VARCHAR(160) NOT NULL DEFAULT '',
  `description` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activity_applications` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `activity_id` INT NOT NULL,
  `user_id` INT NOT NULL DEFAULT 0,
  `phone` VARCHAR(30) NOT NULL,
  `people` INT NOT NULL DEFAULT 1,
  `kind` VARCHAR(20) NOT NULL DEFAULT 'regular',
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `posts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL DEFAULT 0,
  `author` VARCHAR(100) NOT NULL,
  `avatar` MEDIUMTEXT NULL,
  `title` VARCHAR(160) NOT NULL,
  `content` TEXT NOT NULL,
  `image` MEDIUMTEXT NULL,
  `liked_by` TEXT NULL,
  `likes` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `comments` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `post_id` INT NOT NULL,
  `user_id` INT NOT NULL DEFAULT 0,
  `user` VARCHAR(100) NOT NULL,
  `avatar` MEDIUMTEXT NULL,
  `content` TEXT NOT NULL,
  `likes` INT NOT NULL DEFAULT 0,
  `liked_by` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'approved'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `carts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_key` VARCHAR(80) NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notices` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(160) NOT NULL,
  `summary` TEXT NOT NULL,
  `date` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `actor_type` VARCHAR(30) NOT NULL DEFAULT 'system',
  `actor_id` INT NOT NULL DEFAULT 0,
  `actor_name` VARCHAR(100) NOT NULL DEFAULT '',
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(60) NOT NULL DEFAULT '',
  `target_id` VARCHAR(80) NOT NULL DEFAULT '',
  `detail` TEXT NULL,
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_orders_user_id` ON `orders` (`user_id`);
CREATE INDEX `idx_orders_status` ON `orders` (`status`);
CREATE INDEX `idx_payments_order_id` ON `payments` (`order_id`);
CREATE INDEX `idx_payments_status` ON `payments` (`status`);
CREATE INDEX `idx_payments_user_id` ON `payments` (`user_id`);
CREATE INDEX `idx_reservations_user_id` ON `reservations` (`user_id`);
CREATE INDEX `idx_reservations_date` ON `reservations` (`date`);
CREATE INDEX `idx_reservations_date_time` ON `reservations` (`date`, `time`);
CREATE INDEX `idx_posts_user_id` ON `posts` (`user_id`);
CREATE INDEX `idx_comments_post_id` ON `comments` (`post_id`);
CREATE INDEX `idx_comments_user_id` ON `comments` (`user_id`);
CREATE INDEX `idx_activity_applications_activity_id` ON `activity_applications` (`activity_id`);
CREATE INDEX `idx_activity_applications_user_id` ON `activity_applications` (`user_id`);
CREATE INDEX `idx_carts_user_key` ON `carts` (`user_key`);
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);

INSERT INTO `users` (
  `id`, `name`, `phone`, `email`, `birthday`, `password`, `role`, `level`, `points`, `avatar`,
  `bio`, `coffee_preference`, `book_preference`, `address`, `profile_public`, `level_progress`,
  `last_checkin`, `favorites`, `notes`, `notifications`, `gifts`
) VALUES
  (1, '城市读者', '13800000000', '', NULL, 'coffee123', 'member', '黄金会员', 2860, '', '', '', '', NULL, 1, 820, '', '["夜航西飞","桂花拿铁"]', '["城市阅读笔记","手冲课要点"]', '["您的预约已确认","六月新书已上架"]', '[]'),
  (2, '晨光读者', '13900000001', '', NULL, 'Coffee#123', 'member', '普通会员', 260, '', '', '', '', NULL, 1, 180, '', '[]', '[]', '[]', '[]'),
  (3, '南风书友', '13900000002', '', NULL, 'Coffee#123', 'member', '普通会员', 420, '', '', '', '', NULL, 1, 360, '', '[]', '[]', '[]', '[]'),
  (4, '白露咖啡客', '13900000003', '', NULL, 'Coffee#123', 'member', '黄金会员', 860, '', '', '', '', NULL, 1, 720, '', '[]', '[]', '[]', '[]'),
  (5, '山茶阅读者', '13900000004', '', NULL, 'Coffee#123', 'member', '黄金会员', 1180, '', '', '', '', NULL, 1, 1040, '', '[]', '[]', '[]', '[]'),
  (6, '星河藏书客', '13900000005', '', NULL, 'Coffee#123', 'member', '钻石会员', 2360, '', '', '', '', NULL, 1, 1680, '', '[]', '[]', '[]', '[]'),
  (7, '晚灯写作者', '13900000006', '', NULL, 'Coffee#123', 'member', '钻石会员', 3280, '', '', '', '', NULL, 1, 2150, '', '[]', '[]', '[]', '[]');

INSERT INTO `admins` (`id`, `name`, `account`, `password`, `role`) VALUES
  (1, '运营管理员', 'admin', 'admin123', 'admin');

INSERT INTO `products` (`id`, `name`, `description`, `price`, `stock`, `category`, `image`) VALUES
  (1, '书屋限定手冲杯', '陶瓷手作杯，适合手冲与拿铁。', 128.00, 32, 'creative', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80'),
  (2, '城市阅读帆布袋', '加厚棉布，可装 3 本书和一杯外带咖啡。', 69.00, 58, 'creative', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'),
  (3, '精品咖啡豆礼盒', '云南小粒、埃塞日晒、哥伦比亚水洗三支装。', 198.00, 20, 'creative', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80'),
  (4, '读书笔记套装', '横线本、书签、贴纸与索引贴组合。', 46.00, 76, 'creative', 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80'),
  (5, '桂花拿铁', '季节限定，桂花香气与中深烘豆融合。', 32.00, 120, 'coffee', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80'),
  (6, '云南普洱手冲', '坚果、红糖与柔和酸质，适合慢慢品尝。', 38.00, 80, 'coffee', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80'),
  (7, '耶加雪菲手冲', '柑橘、白花和茶感尾韵，明亮清爽。', 42.00, 72, 'coffee', 'https://images.unsplash.com/photo-1459755486867-b55449bb39ff?auto=format&fit=crop&w=900&q=80');

INSERT INTO `books` (`id`, `title`, `author`, `category`, `ranking`, `summary`, `publisher`, `published_at`, `image`) VALUES
  (1, '夜航西飞', '柏瑞尔·马卡姆', '文学', '周榜第 1', '一位女性飞行员在非洲大陆上的生命回忆。文字克制而开阔，适合在安静的下午慢慢阅读。', '人民文学出版社', '2025-08-15 10:00:00', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80'),
  (2, '置身事内', '兰小欢', '商业', '月榜第 2', '从地方政府投融资切入，理解中国经济运行的现实逻辑。适合希望建立商业与公共治理视角的读者。', '上海人民出版社', '2025-11-02 09:30:00', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80'),
  (3, '设计中的设计', '原研哉', '艺术', '季榜第 3', '重新观察日常事物，从感知、留白与沟通出发理解设计。适合设计爱好者和创意工作者。', '山东人民出版社', '2026-01-12 14:00:00', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80'),
  (4, '日日是好日', '森下典子', '生活', '盲盒推荐', '在学习茶道的岁月里体会四季、时间和专注。一本适合与咖啡一起阅读的温柔生活随笔。', '新星出版社', '2026-03-08 11:20:00', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80');

INSERT INTO `reservations` (`id`, `user_id`, `phone`, `seat_id`, `date`, `time`, `people`, `purpose`, `note`, `status`) VALUES
  (1, 1, '13800000000', 'B2', CURDATE(), '14:00', '1', '阅读自习', '', '使用中'),
  (2, 1, '13800000000', 'C4,C5', CURDATE(), '19:00', '2', '朋友聚会', '靠窗', '已预约');

INSERT INTO `activities` (
  `id`, `title`, `capacity`, `applied`, `date`, `time`, `registration_start`, `early_start`, `location`, `description`
) VALUES
  (1, '周五夜读会', 30, 18, '2026-06-05', '19:30-21:00', '2026-06-01 09:00:00', '2026-05-20 09:00:00', '二楼阅读区', '围绕城市文学进行主题共读与自由交流，适合希望认识新书友的读者。'),
  (2, '手冲咖啡公开课', 16, 12, '2026-06-12', '14:00-16:00', '2026-06-03 09:00:00', '2026-05-25 09:00:00', '一楼咖啡体验台', '从研磨、水温到萃取时间，现场完成一杯自己的手冲咖啡。'),
  (3, '城市书评挑战赛', 60, 41, '2026-06-20', '10:00-17:00', '2026-06-08 09:00:00', '2026-05-28 09:00:00', '共享活动厅', '提交短书评并参与现场分享，优秀作品将进入书屋月度推荐栏。');

INSERT INTO `activity_applications` (`id`, `activity_id`, `user_id`, `phone`, `people`, `kind`, `created_at`) VALUES
  (1, 1, 0, '13900009001', 18, 'regular', '2026-06-01 09:00:00'),
  (2, 2, 0, '13900009002', 12, 'regular', '2026-06-03 09:00:00'),
  (3, 3, 0, '13900009003', 41, 'regular', '2026-06-08 09:00:00');

INSERT INTO `posts` (`id`, `user_id`, `author`, `avatar`, `title`, `content`, `image`, `liked_by`, `likes`) VALUES
  (1, 1, '城市读者', '', '今天的耶加雪菲很适合配短篇小说', '酸质明亮，读完一章正好降温。', '', '[]', 0),
  (2, 0, '北窗', '', '书屋二楼靠窗座位效率很高', '下午的光线很好，插座也足够。', '', '[]', 0);

INSERT INTO `notices` (`id`, `title`, `summary`, `date`) VALUES
  (1, '端午节营业时间调整', '节假日门店营业延长至 23:00，夜读区开放预约。', '2026-06-01 08:00:00'),
  (2, '六月新书上架', '文学、艺术、商业类共 128 册新书加入可借阅库。', '2026-06-03 10:30:00'),
  (3, '会员积分兑换升级', '积分可兑换手冲课、文创周边与活动优先名额。', '2026-06-08 09:00:00');

INSERT INTO `audit_logs` (
  `id`, `actor_type`, `actor_id`, `actor_name`, `action`, `target_type`, `target_id`, `detail`, `created_at`
) VALUES
  (1, 'user', 1, '城市读者', '活动报名', 'activity', '1', '报名参加周五夜读会', '2026-05-31 14:25:00'),
  (2, 'user', 1, '城市读者', '发布社区动态', 'post', '1', '在书友社区发布读书笔记', '2026-05-31 14:18:00'),
  (3, 'system', 0, '系统', '商品售出', 'product', '3', '精品咖啡豆礼盒售出 1 件', '2026-05-31 14:12:00'),
  (4, 'user', 1, '城市读者', '预约座位', 'reservation', '1', '完成 A1 座位预约', '2026-05-31 14:08:00');

SET FOREIGN_KEY_CHECKS = 1;

-- Optional development MySQL account. Uncomment only if you want a local dev user.
-- CREATE USER IF NOT EXISTS 'dev'@'localhost' IDENTIFIED BY '';
-- GRANT ALL PRIVILEGES ON `coffee_book`.* TO 'dev'@'localhost';
-- FLUSH PRIVILEGES;
