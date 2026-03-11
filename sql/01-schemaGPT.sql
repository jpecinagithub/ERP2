-- =====================================================
-- ERP2 - Robust Schema
-- Inventory conciliation + accounting ready
-- =====================================================

CREATE DATABASE IF NOT EXISTS ERP2
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE ERP2;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','compras','contabilidad','tesoreria','superadmin') NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(64) NOT NULL,
  record_id BIGINT UNSIGNED NULL,
  details TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- UNITS
-- =====================================================

CREATE TABLE IF NOT EXISTS units (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(150),
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL
);

-- =====================================================
-- CATEGORIES
-- =====================================================

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE,
  name VARCHAR(100) NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- =====================================================
-- TAX RATES
-- =====================================================

CREATE TABLE IF NOT EXISTS tax_rates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL
);

-- =====================================================
-- ACCOUNTS (Chart of accounts)
-- =====================================================

CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  type ENUM('activo','pasivo','patrimonio','ingreso','gasto') NOT NULL,
  parent_account BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_account) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- CUSTOMERS
-- =====================================================

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tax_id VARCHAR(50),
  address TEXT,
  email VARCHAR(100),
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- SUPPLIERS
-- =====================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tax_id VARCHAR(50),
  address TEXT,
  email VARCHAR(100),
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  category_id BIGINT UNSIGNED NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  tax_rate_id BIGINT UNSIGNED NULL,
  cost_price DECIMAL(14,4) DEFAULT 0,
  sale_price DECIMAL(14,2) DEFAULT 0,
  stock_current DECIMAL(14,4) DEFAULT 0 COMMENT 'Updated by inventory triggers',
  stock_minimum DECIMAL(14,4) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
  FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- JOURNAL ENTRIES
-- =====================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_date DATE NOT NULL,
  description TEXT,
  reference VARCHAR(50),
  status ENUM('borrador','posteado','anulado') DEFAULT 'borrador',
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  posted_at DATETIME NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- JOURNAL ENTRY LINES
-- =====================================================

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  debit DECIMAL(14,2) DEFAULT 0,
  credit DECIMAL(14,2) DEFAULT 0,
  description TEXT,
  transaction_type ENUM('venta','compra','pago','cobro','ajuste') NULL,
  entity_id BIGINT UNSIGNED NULL,
  item_id BIGINT UNSIGNED NULL,
  quantity DECIMAL(14,4) NULL,
  unit_price DECIMAL(14,2) NULL,
  document_ref VARCHAR(50),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- =====================================================
-- SALES INVOICES
-- =====================================================

CREATE TABLE IF NOT EXISTS sales_invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  invoice_date DATE NOT NULL,
  journal_entry_id BIGINT UNSIGNED UNIQUE,
  total_amount DECIMAL(14,2) NOT NULL,
  status ENUM('borrador','emitida','pagada','anulada') DEFAULT 'borrador',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
);

-- =====================================================
-- SALES INVOICE LINES
-- =====================================================

CREATE TABLE IF NOT EXISTS sales_invoice_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  total DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT
);

-- =====================================================
-- PURCHASE INVOICES
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id BIGINT UNSIGNED NOT NULL,
  invoice_date DATE NOT NULL,
  journal_entry_id BIGINT UNSIGNED UNIQUE,
  total_amount DECIMAL(14,2) NOT NULL,
  status ENUM('borrador','recibida','pagada','anulada') DEFAULT 'borrador',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
);

-- =====================================================
-- PURCHASE INVOICE LINES
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_invoice_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  total DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT
);

-- =====================================================
-- INVENTORY MOVEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('entrada','salida','ajuste+','ajuste-') NOT NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit_cost DECIMAL(14,4),
  reference_type VARCHAR(30),
  reference_id BIGINT UNSIGNED,
  journal_entry_id BIGINT UNSIGNED,
  movement_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES (performance)
-- =====================================================

CREATE INDEX idx_journal_lines_entry
ON journal_entry_lines(journal_entry_id);

CREATE INDEX idx_journal_lines_account
ON journal_entry_lines(account_id);

CREATE INDEX idx_journal_lines_item
ON journal_entry_lines(item_id);

CREATE INDEX idx_inventory_item
ON inventory_movements(item_id);

CREATE INDEX idx_inventory_journal
ON inventory_movements(journal_entry_id);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- STOCK TRIGGERS
-- =====================================================

DELIMITER //

DROP TRIGGER IF EXISTS trg_stock_insert //

CREATE TRIGGER trg_stock_insert
AFTER INSERT ON inventory_movements
FOR EACH ROW
BEGIN

  DECLARE delta DECIMAL(14,4) DEFAULT 0;

  IF NEW.movement_type IN ('entrada','ajuste+') THEN
     SET delta = NEW.quantity;
  ELSEIF NEW.movement_type IN ('salida','ajuste-') THEN
     SET delta = -NEW.quantity;
  END IF;

  UPDATE items
  SET stock_current = stock_current + delta
  WHERE id = NEW.item_id;

END //

DELIMITER ;