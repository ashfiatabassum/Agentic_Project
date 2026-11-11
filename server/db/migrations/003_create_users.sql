-- Owners (data-model.md: users). R1: email uses utf8mb4_bin and is stored lowercased.
CREATE TABLE users (
  id             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name           VARCHAR(100)     NOT NULL,
  email          VARCHAR(254) COLLATE utf8mb4_bin NOT NULL,
  password_hash  VARCHAR(255)     NOT NULL,
  plan_code      VARCHAR(20)      NOT NULL DEFAULT 'free',
  created_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT fk_users_plan FOREIGN KEY (plan_code) REFERENCES plans (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
