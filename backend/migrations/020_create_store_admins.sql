CREATE TABLE IF NOT EXISTS store_admins (
  store_id BIGINT UNSIGNED NOT NULL,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, admin_user_id),
  KEY idx_store_admins_admin (admin_user_id, store_id),
  CONSTRAINT fk_store_admins_store
    FOREIGN KEY (store_id) REFERENCES stores (store_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_store_admins_admin
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (admin_user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
