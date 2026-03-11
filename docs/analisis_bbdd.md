# Análisis de Base de Datos - ERP2

## 1. Resumen Ejecutivo

Sistema ERP basado en metodología **Journal-First** (asientos contables primero) para garantizar coherencia contable automática. La arquitectura sigue el Plan General de Contabilidad (PGC) español.

---

## 2. Esquema de Base de Datos

### 2.1 Tablas del Sistema

| Tabla | Descripción | Clave Foránea Principal |
|-------|-------------|-------------------------|
| `users` | Usuarios del sistema con roles | - |
| `accounts` | Plan contable (60+ cuentas PGC) | created_by → users |
| `customers` | Clientes (25 registrados) | created_by → users |
| `suppliers` | Proveedores (20 registrados) | created_by → users |
| `units` | Unidades de medida (10 tipos) | created_by → users |
| `categories` | Categorías de productos (15) | parent_id → categories, created_by → users |
| `tax_rates` | Impuestos (IVA 21%, 10%, 4%, etc.) | created_by → users |
| `items` | Inventario (40 artículos) | category_id, unit_id, tax_rate_id, created_by |
| `journal_entries` | Asientos contables principales | created_by → users |
| `journal_entry_lines` | Líneas de asientos contables | journal_entry_id, account_id, item_id |
| `sales_invoices` | Facturas de venta | customer_id, journal_entry_id |
| `sales_invoice_lines` | Líneas facturas venta | invoice_id, item_id |
| `purchase_invoices` | Facturas de compra | supplier_id, journal_entry_id |
| `purchase_invoice_lines` | Líneas facturas compra | invoice_id, item_id |
| `inventory_movements` | Movimientos de inventario | item_id, journal_entry_id |

### 2.2 Tipos de Datos y Rangos

- **IDs**: `BIGINT UNSIGNED` (gran capacidad para escalabilidad)
- **Montos**: `DECIMAL(14,2)` (hasta 14 dígitos, 2 decimales)
- **Cantidades**: `DECIMAL(14,4)` (precisión para inventarios)
- **Fechas**: `DATE` para movimientos, `DATETIME` para logs

---

## 3. Análisis de Relaciones

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ESQUEMA DE RELACIONES                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   users ──────────────┐                                                 │
│        (creador)      │                                                 │
│                       ▼                                                 │
│   ┌────────────── accounts ───────────────┐                             │
│   │  (plan contable PGC)                 │                             │
│   │           │                │         │                             │
│   │     parent_account         │         │                             │
│   │           └────────────────┘         │                             │
│   └──────────────────────────────────────┘                             │
│                       │                                                 │
│   journal_entries ◄───┼────── journal_entry_lines                      │
│   (asiento)           │             │                                   │
│                       │             ├──────► account_id               │
│                       │             ├──────► item_id (opcional)       │
│                       │             └──────► entity_id (cliente/prov) │
│                       │                                                 │
│   sales_invoices ◄────┴──────────────┤                                  │
│   purchase_invoices ◄────────────────┘                                  │
│        │              │                                                 │
│        ▼              ▼                                                 │
│   inventory_movements ──► items                                         │
│   (stock automatico)     │                                              │
│                           ▼                                              │
│                    categories ──► units ──► tax_rates                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Reglas de Negocio Implementadas

### 4.1 Contabilidad - Sistema Journal-First

1. **Balance automático de asientos**: 
   - Validación en tiempo real (débito = crédito)
   - Tolerancia: 0.01 (centavos)

2. **Procedimientos almacenados**:
   - `sp_post_journal_entry()` - Valida y postea asientos
   - `sp_generate_purchase_from_journal()` - Genera facturas de compra
   - `sp_generate_sales_from_journal()` - Genera facturas de venta
   - `fn_check_journal_balance()` - Función auxiliar de verificación

3. **Triggers contables**:
   - `trg_balance_asiento` - Valida equilibrio (versiones anteriores)
   - `trg_stock_insert` / `trg_stock_update` - Actualiza stock automáticamente

### 4.2 Gestión de Inventario

1. **Tipos de movimientos**:
   - `entrada` / `salida` - Operaciones normales
   - `ajuste+` / `ajuste-` - Correcciones de inventario

2. **Stock automático**: Se actualiza automáticamente mediante triggers en `inventory_movements`

### 4.3 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| `superadmin` | Acceso total al sistema |
| `admin` | Administración de usuarios |
| `contabilidad` | Asientos, facturas, reportes |
| `compras` | Facturas de compra, inventario |
| `tesoreria` | Pagos y cobros |

### 4.4 Auditoría

- Tabla `audit_logs` con triggers automáticos
- Flags de sesión: `@AUDIT_SKIP_SEED` y `@AUDIT_USER_ID`
- Registro de: CREATE, UPDATE, DELETE

---

## 5. Datos de Semilla (Seed)

### Resumen de Datos Iniciales

| Entidad | Cantidad | Descripción |
|---------|----------|-------------|
| Users | 6 | Roles variados |
| Units | 10 | kg, l, ud, caja, etc. |
| Categories | 15 | Materiales, ferretería, eléctricos |
| Tax Rates | 8 | IVA 21%, 10%, 4%, IGIC, etc. |
| Accounts | 44 | Plan contable PGC (Grupos 1-7) |
| Customers | 25 | Empresas riojanas (ficticias) |
| Suppliers | 20 | Distribuidores nacionales |
| Items | 40 | Artículos de ferretería/construcción |

### Cuentas Contables Principales (PGC)

```
GRUPO 1 - Financiación Básica
├── 100 - Caja
├── 110 - Bancos c/c vista
├── 120 - Capital social
└── 129 - Resultado del ejercicio

GRUPO 2 - Inmovilizado
├── 200 - Inmovilizado intangible
├── 220 - Inmovilizado material
└── 281 - Amortización acumulada

GRUPO 3 - Existencias
├── 300 - Mercaderías
├── 310 - Materias primas
└── 350 - Productos terminados

GRUPO 4 - Deudores y Acreedores
├── 400 - Proveedores
├── 430 - Clientes
├── 472 - H.P. IVA soportado
└── 477 - H.P. IVA repercussions

GRUPO 6 - Compras y Gastos
├── 600 - Compras de mercaderías
├── 622 - Suministros
└── 640 - Sueldos y salarios

GRUPO 7 - Ventas e Ingresos
├── 700 - Ventas de mercaderías
└── 708 - Devoluciones de ventas
```

---

## 6. Endpoints de API Principales

### Autenticación
- `POST /auth/login` - Inicio de sesión
- `GET /auth/me` - Usuario actual

### Maestros
- `/accounts` - CRUD Plan contable
- `/customers` - CRUD Clientes
- `/suppliers` - CRUD Proveedores
- `/items` - CRUD Artículos
- `/users` - CRUD Usuarios

### Operaciones
- `/journal` - Asientos contables (Journal-First)
- `/sales_invoices` - Facturación de ventas
- `/purchase_invoices` - Facturación de compras
- `/inventory` - Movimientos de inventario

### Reportes
- `/reports/balance` - Balance de sumas y saldos
- `/reports/trial-balance` - Balance de comprobación

---

## 7. Problemas Conocidos y Soluciones

### 7.1 Problema Original: Trigger de Balance
- **Problema**: El trigger `trg_balance_asiento` fallaba con errores de sintaxis MySQL al validar cada línea
- **Solución**: Reemplazado por validación en aplicación + procedimiento `sp_post_journal_entry()` que valida el asiento completo

### 7.2 Generación Automática de Facturas
- El sistema genera automáticamente facturas de venta/compra desde los asientos contables
- Usa procedimiento almacenado que detecta el tipo de transacción (`venta`/`compra`)

---

## 8. Recomendaciones para Desarrollo Futuro

### Prioridad Alta
1. [ ] Implementar controles de inventario (ubicaciones, lotes)
2. [ ] Añadir módulo de tesorería (cobros/pagos)
3. [ ] Mejorar reporting (estados financieros)

### Prioridad Media
4. [ ] Multi-empresa (actualmente single-tenant)
5. [ ] Migrar contraseñas a hashing (bcrypt/argon2)
6. [ ] Añadir validación de NIF/CIF

### Prioridad Baja
7. [ ] Integración con externos (API REST completa)
8. [ ] Documentos adjuntos (PDF facturas)
9. [ ] Notificaciones/alertas

---

## 9. Configuración Técnica

### Conexión MySQL
```javascript
// backend/src/db.js
host: 'localhost'
user: 'root'
password: '1234'  // ⚠️ Cambiar en producción
database: 'erp2'
```

### Tecnologías
- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Tailwind
- **Database**: MySQL 8.0+
- **Authentication**: JWT

---

*Documento generado automáticamente - ERP2 Analysis*
*Fecha: 2026-03-09*
