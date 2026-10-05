CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  added_price_minor BIGINT UNSIGNED NOT NULL,
  added_currency_code CHAR(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cart_item_id),
  UNIQUE KEY uq_cart_items_cart_product (cart_id, product_id),
  KEY idx_cart_items_product (product_id),
  CONSTRAINT chk_cart_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT fk_cart_items_cart
    FOREIGN KEY (cart_id) REFERENCES carts (cart_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_cart_items_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
