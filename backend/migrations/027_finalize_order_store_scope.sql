ALTER TABLE orders
  MODIFY COLUMN store_id BIGINT UNSIGNED NOT NULL,
  DROP INDEX uq_orders_customer_idempotency,
  ADD UNIQUE KEY uq_orders_store_customer_idempotency
    (store_id, customer_id, idempotency_key),
  ADD CONSTRAINT fk_orders_store
    FOREIGN KEY (store_id) REFERENCES stores (store_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
