ALTER TABLE categories
  ADD KEY idx_categories_status_sort (status, sort_order, category_id);
