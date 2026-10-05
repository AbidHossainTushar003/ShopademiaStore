CREATE TABLE IF NOT EXISTS order_items (
  order_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name_snapshot VARCHAR(180) NOT NULL,
  sku_snapshot VARCHAR(64) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price_minor BIGINT UNSIGNED NOT NULL,
  line_total_minor BIGINT UNSIGNED NOT NULL,
  currency_code CHAR(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_item_id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
