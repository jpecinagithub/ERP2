MVP Plan

- MVP0: Diseño y fundamentos de datos
- MVP1: Autenticación, maestros y contabilidad básica
- MVP2: Ventas, Compras, Inventario y contabilidad de operaciones

Propósito: dejar una base de datos sólida con trazabilidad y coherencia contable, lista para desarrollar flujos de negocio y reportes.

Entregables clave:
- Esquema DB y reglas contables documentadas
- Seeds y datos de prueba
- API básica de maestros y autenticación (conceptual)
- Libro diario básico y tablas de operaciones
- Plan de pruebas de consistencia contable

Notas de implementación:
- El entorno de desarrollo es single-tenant; seeds deben permitir pruebas sin datos reales.
- Contraseñas en pruebas pueden estar en texto claro (solo para MVP); migrar a hashing en producción.
- Mantener trazabilidad a través de document_links y relaciones entre facturas, asientos y movimientos.
