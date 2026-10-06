ALTER TABLE carts
  MODIFY COLUMN store_id BIGINT UNSIGNED NOT NULL,
  DROP FOREIGN KEY fk_carts_customer,
  DROP INDEX uq_carts_customer,
  ADD UNIQUE KEY uq_carts_store_customer (store_id, customer_id),
  ADD KEY idx_carts_customer (customer_id),
  ADD CONSTRAINT fk_carts_customer_scoped
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT fk_carts_store
    FOREIGN KEY (store_id) REFERENCES stores (store_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
