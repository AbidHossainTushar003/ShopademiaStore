CREATE TABLE IF NOT EXISTS inventory (
  inventory_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity_on_hand BIGINT UNSIGNED NOT NULL DEFAULT 0,
  quantity_reserved BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (inventory_id),
  UNIQUE KEY uq_inventory_product (product_id),
  CONSTRAINT chk_inventory_reserved_not_over_on_hand
    CHECK (quantity_reserved <= quantity_on_hand),
  CONSTRAINT fk_inventory_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
