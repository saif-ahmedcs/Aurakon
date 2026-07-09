CREATE TABLE habits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  target_days INT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'easy',
  user_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE habit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  habit_id INT NOT NULL,
  log_date DATE NOT NULL,
  status ENUM('pending','completed','pending_review','recovered','shielded','missed') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  UNIQUE KEY unique_habit_date (habit_id, log_date)
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  email_verification_token_hash CHAR(64) NULL,
  email_verification_expires DATETIME NULL,
  username VARCHAR(20) NOT NULL,
  reset_token_hash CHAR(64) NULL,
  reset_token_expires DATETIME NULL,
  total_xp INT NOT NULL DEFAULT 0,
  current_level INT NOT NULL DEFAULT 0,
  global_daily_streak INT NOT NULL DEFAULT 0,
  last_full_completion_date DATE NULL,
  shield_balance INT NOT NULL DEFAULT 0
);


CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
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
  UNIQUE KEY unique_user_date (user_id, stat_date)
);

CREATE TABLE xp_bonus_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bonus_type ENUM('7day','30day') NOT NULL,
  awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_bonus_awarded (user_id, bonus_type, awarded_at)
);