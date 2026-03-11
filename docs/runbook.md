# ERP2 Runbook

Este runbook describe el flujo para desplegar la BBDD de ERP2 con un enfoque robusto usando schema, seeds y triggers de auditoría.

1) Preparación
- Configura variables de entorno para la base de datos o edita los scripts para tus credenciales:
  - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

2) Despliegue
- Opcional: preparar entorno limpio ejecutando borrar base si procede.
- Ejecuta el flujo de despliegue en secuencia:
  - sql/01-schema.sql
  - sql/02-seed.sql
  - sql/03-triggers-auditoria.sql
  - sql/04-utilidades.sql

- Alternativa: usa sql/deploy_all.sh o sql/deploy_all.ps1 para un flujo automatizado.

3) Verificación
- Ejecuta sql/verify_integrity.sql para comprobar que las tablas esperadas existen y que hay triggers activos.
- Ejecuta sql/run_idempotence_tests.sql para confirmar que los seeds son idempotentes (después de dos ejecuciones, los conteos deben ser los mismos).

4) Auditoría
- Si deseas activar auditoría en un entorno real, establece las variables de sesión antes de operaciones:
  - SET @AUDIT_USER_ID = <id_usuario>;
  - SET @AUDIT_SKIP_SEED = 1; durante seeds, y luego 0 al terminar.

5) Mantenimiento
- Revisa periódicamente el tamaño de audit_logs y aplica políticas de retención si el volumen crece.
- Actualiza los esquemas y seeds mediante migraciones para mantener consistencia entre entornos.
