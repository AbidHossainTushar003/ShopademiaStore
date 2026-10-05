CREATE TABLE IF NOT EXISTS stores (
  store_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'inactive',
  credential_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  key_revoked_at TIMESTAMP NULL DEFAULT NULL,
  allowed_origins JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id),
  UNIQUE KEY uq_stores_slug (slug),
  UNIQUE KEY uq_stores_credential_hash (credential_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
