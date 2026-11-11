-- Testimonial collection spaces (data-model.md: spaces). D2 slug rules, D3 field modes, R2 ascii, R3 NOT NULL ''.
CREATE TABLE spaces (
  id                 BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  owner_id           BIGINT UNSIGNED  NOT NULL,
  slug               VARCHAR(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title              VARCHAR(100)     NOT NULL,
  subtitle           VARCHAR(200)     NOT NULL DEFAULT '',
  prompt             VARCHAR(500)     NOT NULL,
  thank_you_message  VARCHAR(500)     NOT NULL DEFAULT '',
  theme_code         VARCHAR(20)      NOT NULL DEFAULT 'light',
  brand_color        CHAR(7) CHARACTER SET ascii NOT NULL DEFAULT '#4F46E5',
  logo_path          VARCHAR(255)     NULL,
  job_title_mode     VARCHAR(10)      NOT NULL DEFAULT 'off',
  company_mode       VARCHAR(10)      NOT NULL DEFAULT 'off',
  social_link_mode   VARCHAR(10)      NOT NULL DEFAULT 'off',
  photo_mode         VARCHAR(10)      NOT NULL DEFAULT 'off',
  rating_mode        VARCHAR(10)      NOT NULL DEFAULT 'off',
  created_at         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_spaces_slug (slug),
  KEY ix_spaces_owner_created (owner_id, created_at),
  CONSTRAINT fk_spaces_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_spaces_theme FOREIGN KEY (theme_code) REFERENCES themes (code),
  CONSTRAINT chk_spaces_slug CHECK (CHAR_LENGTH(slug) BETWEEN 3 AND 60 AND REGEXP_LIKE(slug, '^[a-z0-9]+(-[a-z0-9]+)*$', 'c')),
  CONSTRAINT chk_spaces_brand_color CHECK (REGEXP_LIKE(brand_color, '^#[0-9A-Fa-f]{6}$')),
  CONSTRAINT chk_spaces_field_modes CHECK (
    job_title_mode   IN ('off', 'optional', 'required') AND
    company_mode     IN ('off', 'optional', 'required') AND
    social_link_mode IN ('off', 'optional', 'required') AND
    photo_mode       IN ('off', 'optional', 'required') AND
    rating_mode      IN ('off', 'optional', 'required')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
