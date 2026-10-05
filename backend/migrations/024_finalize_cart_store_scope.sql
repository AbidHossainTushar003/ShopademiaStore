ALTER TABLE carts
  MODIFY COLUMN store_id BIGINT UNSIGNED NOT NULL,
  DROP INDEX uq_carts_customer,
  ADD UNIQUE KEY uq_carts_store_customer (store_id, customer_id),
  ADD CONSTRAINT fk_carts_store
    FOREIGN KEY (store_id) REFERENCES stores (store_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
