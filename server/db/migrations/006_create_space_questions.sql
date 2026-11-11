-- Custom questions per space (data-model.md: space_questions). D4: max 5 active; deactivate when answered.
CREATE TABLE space_questions (
  id             BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  space_id       BIGINT UNSIGNED   NOT NULL,
  question_text  VARCHAR(200)      NOT NULL,
  position       TINYINT UNSIGNED  NOT NULL,
  is_active      TINYINT(1)        NOT NULL DEFAULT 1,
  created_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_space_questions_space_position (space_id, position),
  CONSTRAINT fk_space_questions_space FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
