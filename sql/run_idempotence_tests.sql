-- Prueba rápida de idempotencia para seeds (MySQL)
-- Ejecutar dos veces y verificar que no haya duplicados
START TRANSACTION;
-- Verificamos conteos antes de reejecutar seed (asumiendo que 02-seed.sql ya seedó)
SELECT 'BEFORE SEED' AS info;
SELECT COUNT(*) AS users_before FROM users;
SELECT COUNT(*) AS accounts_before FROM accounts;
SELECT COUNT(*) AS customers_before FROM customers;
SELECT COUNT(*) AS suppliers_before FROM suppliers;
SELECT COUNT(*) AS items_before FROM items;
COMMIT;

-- Reejecutar seed (manual: ejecutar sql/02-seed.sql dos veces) y luego confirmar conteos iguales
-- Después de ejecutar dos veces el seed, ejecuta nuevamente:
SELECT 'AFTER SEED (idempotent check)' AS info;
SELECT COUNT(*) AS users_after FROM users;
SELECT COUNT(*) AS accounts_after FROM accounts;
SELECT COUNT(*) AS customers_after FROM customers;
SELECT COUNT(*) AS suppliers_after FROM suppliers;
SELECT COUNT(*) AS items_after FROM items;
