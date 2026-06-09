-- Coffee Book Commercial Upgrade V2.0
-- Phase 1 creates additive tables only. Existing tables, columns and API paths are not changed.

CREATE TABLE IF NOT EXISTS member_levels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(60) NOT NULL,
  min_growth INT NOT NULL DEFAULT 0,
  max_growth INT NULL,
  benefits JSON NULL,
  discount_rate DECIMAL(6, 3) NOT NULL DEFAULT 1.000,
  points_multiplier DECIMAL(6, 2) NOT NULL DEFAULT 1.00,
  priority_signup INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_growth_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  growth_value INT NOT NULL DEFAULT 0,
  source VARCHAR(40) NOT NULL,
  related_id INT NOT NULL DEFAULT 0,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_member_growth_user (user_id),
  INDEX idx_member_growth_source (source)
);

CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  type VARCHAR(40) NOT NULL,
  value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  threshold_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  total_quantity INT NOT NULL DEFAULT 0,
  received_quantity INT NOT NULL DEFAULT 0,
  scope VARCHAR(40) NOT NULL DEFAULT 'all',
  min_level_code VARCHAR(20) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_coupons_type (type),
  INDEX idx_coupons_status (status)
);

CREATE TABLE IF NOT EXISTS user_coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  coupon_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unused',
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL,
  order_id INT NOT NULL DEFAULT 0,
  INDEX idx_user_coupons_user (user_id),
  INDEX idx_user_coupons_coupon (coupon_id),
  INDEX idx_user_coupons_status (status)
);

CREATE TABLE IF NOT EXISTS recommend_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL DEFAULT 0,
  scene VARCHAR(40) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id INT NOT NULL,
  reason VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recommend_scene (scene)
);

CREATE TABLE IF NOT EXISTS user_browse_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL DEFAULT 0,
  target_type VARCHAR(40) NOT NULL,
  target_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_browse_user (user_id)
);

CREATE TABLE IF NOT EXISTS invite_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inviter_user_id INT NOT NULL,
  invitee_user_id INT NOT NULL DEFAULT 0,
  invite_code VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reward_points INT NOT NULL DEFAULT 0,
  reward_coupon_id INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  converted_at DATETIME NULL,
  INDEX idx_invite_inviter (inviter_user_id),
  INDEX idx_invite_code (invite_code)
);

CREATE TABLE IF NOT EXISTS task_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  type VARCHAR(30) NOT NULL,
  action_key VARCHAR(60) NOT NULL,
  reward_points INT NOT NULL DEFAULT 0,
  reward_growth INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  task_rule_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress INT NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_tasks_user (user_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  icon VARCHAR(120) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_id INT NOT NULL,
  earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_badges_user (user_id)
);

CREATE TABLE IF NOT EXISTS notification_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL DEFAULT 0,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(120) NOT NULL,
  content VARCHAR(500) NOT NULL,
  link VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'unread',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  source VARCHAR(60) NOT NULL DEFAULT 'system',
  trigger_type VARCHAR(60) NOT NULL DEFAULT 'manual',
  trigger_data JSON NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_type (type)
);

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  content VARCHAR(500) NOT NULL,
  link VARCHAR(255) NOT NULL DEFAULT '',
  pinned TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_metrics_daily (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_date DATE NOT NULL UNIQUE,
  gmv DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  sales_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  average_order_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  payment_conversion_rate DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  repurchase_rate DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  dau INT NOT NULL DEFAULT 0,
  mau INT NOT NULL DEFAULT 0,
  new_users INT NOT NULL DEFAULT 0,
  active_users INT NOT NULL DEFAULT 0,
  activity_signup_conversion_rate DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  reservation_arrival_rate DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  coupon_usage_rate DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_kpi_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  target_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  refresh_interval INT NOT NULL DEFAULT 300,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO business_kpi_configs (code, name, target_value, refresh_interval, status)
VALUES
  ('gmv', 'GMV', 12000.00, 300, 'active'),
  ('activity_conversion', '活动转化率', 35.00, 300, 'active'),
  ('repeat_rate', '复购率', 28.00, 600, 'active')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  target_value = VALUES(target_value),
  refresh_interval = VALUES(refresh_interval),
  status = VALUES(status);

INSERT INTO member_levels (code, name, min_growth, max_growth, benefits, discount_rate, points_multiplier, priority_signup)
VALUES
  ('LV1', 'Lv1 新读者', 0, 499, JSON_ARRAY('每日签到积分', '基础积分兑换', '活动报名提醒'), 1.000, 1.00, 0),
  ('LV2', 'Lv2 咖啡爱好者', 500, 1499, JSON_ARRAY('文创商城 98 折', '积分 1.1 倍', '活动提前报名 1 次/月'), 0.980, 1.10, 1),
  ('LV3', 'Lv3 资深书友', 1500, 2999, JSON_ARRAY('文创商城 95 折', '积分 1.2 倍', '读书会优先席位'), 0.950, 1.20, 2),
  ('LV4', 'Lv4 黄金会员', 3000, 5999, JSON_ARRAY('文创商城 9 折', '积分 1.5 倍', '生日咖啡券', '热门活动优先报名'), 0.900, 1.50, 3),
  ('LV5', 'Lv5 黑金会员', 6000, NULL, JSON_ARRAY('文创商城 85 折', '积分 2 倍', '专属客服', '黑金活动优先席位'), 0.850, 2.00, 5)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  min_growth = VALUES(min_growth),
  max_growth = VALUES(max_growth),
  benefits = VALUES(benefits),
  discount_rate = VALUES(discount_rate),
  points_multiplier = VALUES(points_multiplier),
  priority_signup = VALUES(priority_signup);

INSERT INTO coupons (name, type, value, threshold_amount, valid_from, valid_to, total_quantity, received_quantity, scope, min_level_code, status)
VALUES
  ('新人首单礼券', 'newcomer', 20.00, 59.00, '2026-01-01', '2026-12-31', 1000, 0, 'all', NULL, 'active'),
  ('满 99 减 15', 'full_reduction', 15.00, 99.00, '2026-01-01', '2026-12-31', 800, 0, 'shop', NULL, 'active'),
  ('黄金以上会员专属 9 折券', 'member_exclusive', 0.90, 129.00, '2026-01-01', '2026-12-31', 500, 0, 'shop', 'LV4', 'active');

INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '每日签到', 'daily', 'daily_check_in', 10, 35, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'daily_check_in');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '浏览一本书', 'daily', 'browse_book', 5, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'browse_book');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '浏览一个商品', 'daily', 'browse_product', 5, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'browse_product');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '浏览一个活动', 'daily', 'browse_activity', 5, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'browse_activity');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '点赞一次动态', 'daily', 'like_post', 5, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'like_post');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '评论一次动态', 'daily', 'comment_post', 8, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'comment_post');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '完善个人资料', 'growth', 'complete_profile', 30, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'complete_profile');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '首次下单', 'growth', 'first_order', 50, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'first_order');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '首次预约', 'growth', 'first_reservation', 30, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'first_reservation');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '首次活动报名', 'growth', 'first_activity_signup', 40, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'first_activity_signup');
INSERT INTO task_rules (name, type, action_key, reward_points, reward_growth, status)
SELECT '首次兑换礼品', 'growth', 'first_redeem_gift', 40, 0, 'active'
WHERE NOT EXISTS (SELECT 1 FROM task_rules WHERE action_key = 'first_redeem_gift');

INSERT INTO badges (name, description, icon, status)
SELECT '阅读达人', '浏览书籍并沉淀阅读兴趣', '读', 'active'
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = '阅读达人');
INSERT INTO badges (name, description, icon, status)
SELECT '咖啡鉴赏家', '持续浏览咖啡商品与咖啡内容', '咖', 'active'
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = '咖啡鉴赏家');
INSERT INTO badges (name, description, icon, status)
SELECT '活动先锋', '报名并参与书屋活动', '活', 'active'
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = '活动先锋');
INSERT INTO badges (name, description, icon, status)
SELECT '社区达人', '点赞、评论并参与社区互动', '社', 'active'
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = '社区达人');
INSERT INTO badges (name, description, icon, status)
SELECT '黑金会员', '达到 Lv5 黑金会员等级', '黑', 'active'
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = '黑金会员');
