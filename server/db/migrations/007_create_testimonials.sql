-- Customer testimonials (data-model.md: testimonials). D5 original_body, R3 NOT NULL '', R4 wall CHECK, R5 one index.
-- Locked/visible status is calculated with ROW_NUMBER() over (created_at, id); it is not stored.
CREATE TABLE testimonials (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  space_id        BIGINT UNSIGNED   NOT NULL,
  name            VARCHAR(100)      NOT NULL,
  email           VARCHAR(254)      NOT NULL,
  job_title       VARCHAR(100)      NOT NULL DEFAULT '',
  company         VARCHAR(100)      NOT NULL DEFAULT '',
  social_link     VARCHAR(300)      NOT NULL DEFAULT '',
  photo_path      VARCHAR(255)      NULL,
  rating          TINYINT UNSIGNED  NULL,
  body            VARCHAR(2000)     NOT NULL,
  original_body   VARCHAR(2000)     NULL,
  edited_at       DATETIME          NULL,
  consent_public  TINYINT(1)        NOT NULL DEFAULT 0,
  consent_social  TINYINT(1)        NOT NULL DEFAULT 0,
  is_hidden       TINYINT(1)        NOT NULL DEFAULT 0,
  is_favorite     TINYINT(1)        NOT NULL DEFAULT 0,
  on_wall         TINYINT(1)        NOT NULL DEFAULT 0,
  created_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_testimonials_space_created (space_id, created_at),
  CONSTRAINT fk_testimonials_space FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE,
  CONSTRAINT chk_testimonials_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  CONSTRAINT chk_testimonials_wall_eligible CHECK (on_wall = 0 OR (consent_public = 1 AND is_hidden = 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
