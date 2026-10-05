ALTER TABLE products
  ADD KEY idx_products_status_name (status, name),
  ADD KEY idx_products_category_status_name (category_id, status, name),
  ADD KEY idx_products_status_price (status, price_minor),
  ADD KEY idx_products_category_status_price (category_id, status, price_minor);
