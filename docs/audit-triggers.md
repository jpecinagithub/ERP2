Auditoria con Triggers en MySQL

Resumen
- Implementamos triggers AFTER INSERT/UPDATE/DELETE en las tablas clave (customers, suppliers, items) para registrar acciones en la tabla audit_logs.
- Los triggers son automáticos y aseguran trazabilidad sin depender de la capa de la aplicación.
- Para evitar duplicar registros de auditoría durante seeds o migraciones, el sistema usa una bandera de sesión: @AUDIT_SKIP_SEED.
- La ID del usuario que ejecuta la acción se toma de la sesión vía @AUDIT_USER_ID.

Cómo funciona
- Se crean estos triggers con la lógica de no registrar si @AUDIT_SKIP_SEED = 1.
- Durante un seed, se ejecuta SET @AUDIT_SKIP_SEED = 1; SET @AUDIT_USER_ID = 1; antes de iniciar operaciones.
- Al terminar, se restablece la bandera: SET @AUDIT_SKIP_SEED = 0;.

Qué campos registra audit_logs (ejemplo)
- id (autoincremental)
- user_id (referencia al usuario que ejecuta la acción; usa @AUDIT_USER_ID si disponible)
- action (CREATE, UPDATE, DELETE)
- table_name (nombre de la tabla afectada)
- record_id (clave de la fila afectada)
- details (texto con resumen de los cambios; puede ser texto plano o JSON simple)
- created_at (timestamp)

Consideraciones
- Performance: los triggers añaden overhead; úsalo si necesitas trazabilidad. Si la carga es alta, monitoriza el volumen de audit_logs y planifica archivado.
- Seguridad: audit_logs pueden crecer; considera políticas de retención y particionamiento si es necesario.
- Integración: la aplicación debe establecer el valor de @AUDIT_USER_ID y activar la bandera de seed cuando haga seed, migraciones, o procesos automáticos.

Ejemplo de configuración en la app (conceptual)
- Al inicio de una request/contenido transaccional: SET @AUDIT_USER_ID = <id_usuario_autenticado>;
- Durante seed: SET @AUDIT_SKIP_SEED = 1; Y al finalizar seed: SET @AUDIT_SKIP_SEED = 0;
- Si un servicio de background ejecuta seeds, usa un usuario de sistema concreto (p. ej., 0) para auditoría o desactívalo para el seed.

Notas
- Este enfoque asume que la DB está configurada con las claves únicas necesarias para que ON DUPLICATE KEY UPDATE funcione como seed idempotente.
- Si necesitas, puedo adaptar el esquema de audit_logs para guardar también versiones antiguas de filas (OLD) y nuevos valores (NEW) en formato JSON.
