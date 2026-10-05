CREATE TABLE IF NOT EXISTS orders (
  order_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  customer_email_snapshot VARCHAR(254) NOT NULL,
  customer_name_snapshot VARCHAR(120) NOT NULL,
  order_number CHAR(35) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  subtotal_minor BIGINT UNSIGNED NOT NULL,
  total_minor BIGINT UNSIGNED NOT NULL,
  shipping_snapshot JSON NOT NULL,
  order_status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  UNIQUE KEY uq_orders_order_number (order_number),
  UNIQUE KEY uq_orders_customer_idempotency (customer_id, idempotency_key),
  KEY idx_orders_customer_created (customer_id, created_at),
  KEY idx_orders_status_created (order_status, created_at),
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
