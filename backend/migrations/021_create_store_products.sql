CREATE TABLE IF NOT EXISTS store_products (
  store_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  visibility ENUM('visible', 'hidden') NOT NULL DEFAULT 'hidden',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, product_id),
  KEY idx_store_products_product (product_id, store_id),
  CONSTRAINT fk_store_products_store
    FOREIGN KEY (store_id) REFERENCES stores (store_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_store_products_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
