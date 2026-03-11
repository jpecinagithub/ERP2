-- Verificación básica de integridad tras deployment
SELECT 'Users' AS what, COUNT(*) AS count FROM users;
SELECT 'Accounts' AS what, COUNT(*) AS count FROM accounts;
SELECT 'Customers' AS what, COUNT(*) AS count FROM customers;
SELECT 'Suppliers' AS what, COUNT(*) AS count FROM suppliers;
SELECT 'Items' AS what, COUNT(*) AS count FROM items;

-- Verificar triggers existentes (stock ya implementados) en information_schema
SELECT COUNT(*) AS triggers_count FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE();
