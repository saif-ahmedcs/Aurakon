CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  email_verification_token_hash CHAR(64) NULL,
  email_verification_expires DATETIME NULL,
  username VARCHAR(20) NOT NULL,
  gender ENUM('male','female') NULL,
  reset_token_hash CHAR(64) NULL,
  reset_token_expires DATETIME NULL,
  reset_token_consumed_at DATETIME NULL,
  delete_token_hash CHAR(64) NULL,
  delete_token_expires DATETIME NULL,
  total_xp INT NOT NULL DEFAULT 0,
  current_level INT NOT NULL DEFAULT 0,
  global_daily_streak INT NOT NULL DEFAULT 0,
  last_full_completion_date DATE NULL,
  shield_balance INT NOT NULL DEFAULT 0,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  username_changed_at DATETIME NULL,
  password_changed_at DATETIME NULL,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  pending_email VARCHAR(255) NULL,
  email_change_token_hash CHAR(64) NULL,
  email_change_token_expires DATETIME NULL,
  email_verification_consumed_at DATETIME NULL,
  email_change_consumed_at DATETIME NULL,
  KEY `idx_users_email_verification_token_hash` (`email_verification_token_hash`),
  KEY `idx_users_reset_token_hash` (`reset_token_hash`),
  KEY `idx_users_delete_token_hash` (`delete_token_hash`),
  KEY `idx_users_email_change_token_hash` (`email_change_token_hash`)
);

CREATE TABLE account_deletion_confirmations (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  consumed_at DATETIME NOT NULL,
  INDEX idx_account_deletion_confirmations_user_id (user_id),
  INDEX idx_account_deletion_confirmations_consumed_at (consumed_at)
);

CREATE TABLE habits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME NULL,
  shield_deferred_since DATE NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE pending_review_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  habit_id INT NOT NULL,
  status ENUM('active','resolved') NOT NULL DEFAULT 'active',
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_missed_date DATE NOT NULL,
  active_habit_id INT NULL,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  UNIQUE KEY unique_active_session_per_habit (active_habit_id)
);

CREATE TABLE habit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  habit_id INT NOT NULL,
  log_date DATE NOT NULL,
  status ENUM('pending','completed','pending_review','recovered','shielded','missed') NOT NULL DEFAULT 'pending',
  review_session_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (review_session_id) REFERENCES pending_review_sessions(id) ON DELETE SET NULL,
  UNIQUE KEY unique_habit_date (habit_id, log_date)
);

CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE daily_aura_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  stat_date DATE NOT NULL,
  aura_energy INT NOT NULL DEFAULT 0,
  total_habits INT NOT NULL,
  completed_habits INT NOT NULL,
  full_completion BOOLEAN NOT NULL DEFAULT false,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_date (user_id, stat_date),
  KEY idx_user_full_completion (user_id, full_completion, stat_date)
);

CREATE TABLE xp_bonus_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bonus_type ENUM('7day','30day') NOT NULL,
  awarded_at DATE NOT NULL,
  required_habit_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_bonus_awarded (user_id, bonus_type, awarded_at)
);

CREATE TABLE xp_completion_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  habit_id INT NOT NULL,
  log_date DATE NOT NULL,
  xp_amount INT NOT NULL,
  awarded_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  UNIQUE KEY unique_habit_log_date (habit_id, log_date)
);

CREATE TABLE guardian_shield_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  habit_id INT NOT NULL,
  milestone INT NOT NULL,
  streak_start_date DATE NOT NULL,
  awarded_at DATE NOT NULL,
  status ENUM('available','spent') NOT NULL DEFAULT 'available',
  spent_habit_log_id INT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (spent_habit_log_id) REFERENCES habit_logs(id) ON DELETE SET NULL,
  UNIQUE KEY unique_habit_milestone_streak (habit_id, milestone, streak_start_date)
);