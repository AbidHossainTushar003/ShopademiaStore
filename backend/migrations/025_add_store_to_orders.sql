ALTER TABLE orders
  ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER order_id,
  ADD KEY idx_orders_store_customer_created (store_id, customer_id, created_at),
  ADD KEY idx_orders_store_status_created (store_id, order_status, created_at);
