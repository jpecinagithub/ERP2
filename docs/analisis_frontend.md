# Análisis del Frontend - ERP2

## 1. Resumen Ejecutivo

Frontend desarrollado con **React + Vite + Tailwind CSS**, utilizando arquitectura SPA (Single Page Application). La aplicación consume una API REST y gestiona el estado de autenticación mediante React Context.

---

## 2. Estructura del Proyecto

```
frontend/
├── src/
│   ├── api/
│   │   └── client.js          # Cliente Axios con interceptores
│   ├── components/
│   │   ├── Layout.jsx         # Layout principal
│   │   └── ui/
│   │       ├── Modal.jsx      # Componente modal
│   │       ├── StatusBadge.jsx
│   │       └── Toast.jsx      # Notificaciones
│   ├── context/
│   │   └── AuthContext.jsx   # Gestión de autenticación
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Accounts.jsx
│   │   ├── Customers.jsx
│   │   ├── Suppliers.jsx
│   │   ├── Items.jsx
│   │   ├── Users.jsx
│   │   ├── SalesInvoices.jsx
│   │   ├── PurchaseInvoices.jsx
│   │   ├── JournalEntries.jsx
│   │   ├── Balance.jsx
│   │   └── Inventory.jsx
│   ├── App.jsx               # Router principal
│   ├── main.jsx              # Entry point
│   └── index.css             # Estilos globales
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 3. Análisis de Componentes Principales

### 3.1 API Client (`src/api/client.js`)

**Tecnología:** Axios

**Características:**
- Base URL configurable mediante variable de entorno (`VITE_API_BASE`)
- Interceptor de **peticiones** para agregar token JWT automáticamente
- Interceptor de **respuestas** para manejar errores 401/403 y cerrar sesión

```javascript
// Token se envía en cada request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Logout automático en error de autenticación
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('erp_token');
      window.location.href = '/login';
    }
  }
);
```

**⚠️ Problema identificado:** El logout elimina `erp_user` del localStorage en el interceptor pero no redirige al login mediante React Router, sino con `window.location.href`, lo cual puede causar pérdida de estado en la app.

---

### 3.2 Autenticación (`src/context/AuthContext.jsx`)

**Gestión de estado:** React Context + useState

**Funcionalidades:**
- Login con credenciales (username/password)
- Almacenamiento de token en localStorage
- Decodificación de JWT para obtener datos de usuario
- Persistencia de sesión entre recargas
- Logout manual

```javascript
// Decodificación del JWT
const payload = JSON.parse(atob(token.split('.')[1]));
const userData = { id: payload.id, username: payload.username, role: payload.role };
```

---

### 3.3 Routing (`src/App.jsx`)

**Biblioteca:** React Router DOM v6

**Rutas protegidas:**
- `/` - Dashboard
- `/customers` - Clientes
- `/suppliers` - Proveedores
- `/items` - Artículos
- `/accounts` - Plan contable
- `/users` - Usuarios
- `/sales-invoices` - Facturas venta
- `/purchase-invoices` - Facturas compra
- `/journal` - Libro diario
- `/balance` - Balance de sumas y saldos
- `/inventory` - Inventario

**Protección:** `ProtectedRoute` verifica si existe usuario y sesión activa.

---

### 3.4 Página de Asientos Contables (`src/pages/JournalEntries.jsx`)

Esta es la página más completa del sistema:

**Características:**
- **Listado** de asientos con expansión para ver detalles
- **Crear** nuevos asientos con validación en tiempo real
- **Editar** asientos existentes (modal)
- **Eliminar** asientos
- **Importar** desde Excel con validación
- **Exportar** template Excel

**Validaciones implementadas:**
- Balance automático Debe = Haber (tolerancia 0.01)
- Verificación de cuentas contables
- Verificación de clientes/proveedores
- Verificación de artículos

**Importación Excel:**
- Valida columnas requeridas
- Agrupa líneas por referencia de asiento
- Verifica balance antes de crear cada asiento

---

## 4. Tecnologías Utilizadas

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | React | 18.x |
| Build | Vite | 5.x |
| Estilos | Tailwind CSS | 3.x |
| HTTP Client | Axios | 1.x |
| Router | React Router DOM | 6.x |
| Icons | React Icons (Heroicons) | - |
| Excel | XLSX (SheetJS) | - |
| CSS | PostCSS | 8.x |

---

## 5. Estilos y UI

### 5.1 Tailwind CSS

**Archivo de config:** `tailwind.config.js`

**Características del diseño:**
- Tema oscuro/claro con colores personalizados
- Paleta: Surface, Brand, Slate
- Clases personalizadas: `erp-input`, `erp-btn-primary`, `erp-btn-secondary`, `erp-panel`, `erp-th`, `erp-td`

### 5.2 Componentes UI Reutilizables

1. **Modal** - Ventanas modales para edición
2. **Toast** - Notificaciones temporales (éxito/error)
3. **StatusBadge** - Indicadores de estado
4. **Layout** - Estructura con sidebar y header

---

## 6. Gestión de Estado

### Estado Local (useState)
- Cada página gestiona sus propios datos
- Loading states
- Formularios
- Modales

### Estado Global (Context)
- **AuthContext** - Usuario autenticado, login, logout
- No existe Redux, Zustand u otro gestor de estado global

---

## 7. Puntos de Mejora Identificados

### Alta Prioridad
1. **Manejo de errores** - Mejorar mensajes de error en UI
2. **Validación de formularios** - Usar librería como Zod o React Hook Form
3. **Optimización de carga** - Implementar React Query o SWR para data fetching

### Media Prioridad
4. **Gestión de estado global** - Considerar Zustand o Redux Toolkit
5. **Testing** - Añadir tests unitarios y de integración
6. **Accesibilidad** - Mejorar ARIA y navegación por teclado

### Baja Prioridad
7. **Lazy loading** - Cargar rutas bajo demanda
8. **TypeScript** - Migrar de JSX a TSX (ya hay tsconfig.json)

---

## 8. Flujo de Datos

```
┌─────────────┐     JWT Token      ┌─────────────┐
│   Login     │ ───────────────►   │  Backend    │
│   Page      │                    │   API       │
└─────────────┘                    └──────┬──────┘
       │                                   │
       │ localStorage                      │
       ▼                                   ▼
┌─────────────────────────────────────────────┐
│              AuthContext                     │
│  - user: { id, username, role }            │
│  - login()                                  │
│  - logout()                                 │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│           Protected Routes                   │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │Journal  │  │Sales    │  │Purchase │    │
│  │Entries  │  │Invoices │  │Invoices │    │
│  └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────────────────────────┘
```

---

## 9. Integración con Backend

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/auth/login` | POST | Autenticación |
| `/journal` | GET/POST | Asientos contables |
| `/journal/:id` | GET/PUT/DELETE | Detalle/modificar |
| `/accounts` | CRUD | Plan contable |
| `/customers` | CRUD | Clientes |
| `/suppliers` | CRUD | Proveedores |
| `/items` | CRUD | Artículos |
| `/sales_invoices` | CRUD | Facturas venta |
| `/purchase_invoices` | CRUD | Facturas compra |
| `/reports/balance` | GET | Balance sumas/saldos |

---

## 10. Conclusión

El frontend ERP2 es una aplicación React bien estructurada con:
- ✅ Autenticación JWT funcional
- ✅ Routing protegido
- ✅ Integración completa con API REST
- ✅ UI moderna con Tailwind CSS
- ✅ Importación/exportación Excel
- ⚠️ Area de mejora en gestión de estado y validación

El sistema está preparado para uso en producción con algunas mejoras recomendadas.

---

*Documento generado automáticamente - ERP2 Frontend Analysis*
*Fecha: 2026-03-09*
