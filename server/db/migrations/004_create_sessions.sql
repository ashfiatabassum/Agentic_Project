-- Login sessions (data-model.md: sessions). Only the SHA-256 hash of the cookie token is stored.
CREATE TABLE sessions (
  id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  token_hash  CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id     BIGINT UNSIGNED  NOT NULL,
  expires_at  DATETIME         NOT NULL,
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY ix_sessions_expires_at (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
