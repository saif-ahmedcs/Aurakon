CREATE TABLE habits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  target_days INT NULL
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
  username VARCHAR(20) NULL
);