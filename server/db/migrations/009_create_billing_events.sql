-- Simulated billing events (data-model.md: billing_events, D6). No card or payment data is ever stored.
CREATE TABLE billing_events (
  id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED  NOT NULL,
  event_type      VARCHAR(30)      NOT NULL,
  from_plan_code  VARCHAR(20)      NOT NULL,
  to_plan_code    VARCHAR(20)      NOT NULL,
  amount_minor    INT UNSIGNED     NOT NULL,
  currency        CHAR(3) CHARACTER SET ascii NOT NULL,
  is_simulated    TINYINT(1)       NOT NULL DEFAULT 1,
  created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_billing_events_user_created (user_id, created_at),
  CONSTRAINT fk_billing_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_billing_events_from_plan FOREIGN KEY (from_plan_code) REFERENCES plans (code),
  CONSTRAINT fk_billing_events_to_plan FOREIGN KEY (to_plan_code) REFERENCES plans (code),
  CONSTRAINT chk_billing_events_type CHECK (event_type IN ('upgrade_simulated')),
  CONSTRAINT chk_billing_events_simulated CHECK (is_simulated = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
