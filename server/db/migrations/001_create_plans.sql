-- Plans lookup table (data-model.md: plans). Seeded here; changed only by new migrations.
CREATE TABLE plans (
  code                        VARCHAR(20)              NOT NULL,
  name                        VARCHAR(50)              NOT NULL,
  price_minor                 INT UNSIGNED             NOT NULL,
  currency                    CHAR(3) CHARACTER SET ascii NOT NULL,
  billing_interval            VARCHAR(10)              NULL,
  max_spaces                  INT UNSIGNED             NOT NULL,
  max_testimonials_per_space  INT UNSIGNED             NOT NULL,
  sort_order                  TINYINT UNSIGNED         NOT NULL,
  created_at                  DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (code),
  CONSTRAINT chk_plans_billing_interval CHECK (billing_interval IS NULL OR billing_interval IN ('month'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO plans (code, name, price_minor, currency, billing_interval, max_spaces, max_testimonials_per_space, sort_order) VALUES
  ('free', 'Free', 0,     'BDT', NULL,    3,  100,  1),
  ('paid', 'Paid', 99900, 'BDT', 'month', 25, 1000, 2);
