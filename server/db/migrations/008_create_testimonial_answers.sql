-- Answers to custom questions (data-model.md: testimonial_answers). question_snapshot keeps old answers readable.
CREATE TABLE testimonial_answers (
  id                 BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  testimonial_id     BIGINT UNSIGNED   NOT NULL,
  question_id        BIGINT UNSIGNED   NULL,
  question_snapshot  VARCHAR(200)      NOT NULL,
  answer_text        VARCHAR(1000)     NOT NULL,
  position           TINYINT UNSIGNED  NOT NULL,
  created_at         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_answers_testimonial FOREIGN KEY (testimonial_id) REFERENCES testimonials (id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES space_questions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
