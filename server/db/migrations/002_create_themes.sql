-- Themes lookup table (data-model.md: themes, D1). Colours live in client CSS keyed by code.
CREATE TABLE themes (
  code        VARCHAR(20)       NOT NULL,
  name        VARCHAR(50)       NOT NULL,
  sort_order  TINYINT UNSIGNED  NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO themes (code, name, sort_order) VALUES
  ('light', 'Light', 1),
  ('dark',  'Dark',  2),
  ('warm',  'Warm',  3);
