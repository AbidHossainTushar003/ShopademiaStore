CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  amount_minor BIGINT UNSIGNED NOT NULL,
  currency_code CHAR(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payments_order (order_id),
  KEY idx_payments_status_created (payment_status, created_at),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
