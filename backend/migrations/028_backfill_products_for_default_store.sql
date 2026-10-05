INSERT IGNORE INTO store_products (store_id, product_id, visibility)
SELECT 1, product_id, 'visible' FROM products;
