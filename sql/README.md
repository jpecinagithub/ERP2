ERP MVP0 SQL bootstrap

Files:
- init_schema.sql: DDL para crear las tablas base (usuarios, cuentas, maestros, contabilidad, inventario, facturas, pagos, etc.).
- 01-schema.sql: Versión actualizada del esquema, con triggers de stock y conciliación.
- 02-seed.sql: Seeds para maestros y datos de ejemplo (idempotente).
- 03-triggers-auditoria.sql: Triggers de auditoría (opcional).
- 04-utilidades.sql: Procedimientos y funciones centrales.

Uso recomendado:
- Crear base de datos ERP2 en MySQL:
  CREATE DATABASE ERP2;
- Ejecutar sql/01-schema.sql en ERP2;
- Ejecutar sql/02-seed-core.sql y sql/02-seed-entities.sql para poblar datos de prueba (idempotentes).
- Ejecutar sql/03-triggers-auditoria.sql para auditoría (opcional, se desactiva durante seeds si se usan banderas).
- Ejecutar sql/04-utilidades.sql para las utilidades de posting y balance.

Notas:
- Este set de datos es para pruebas y desarrollo; no usar contraseñas en producción tal como están.
- A medida que evolucione el modelo, agregar migraciones para cambios de esquema.
