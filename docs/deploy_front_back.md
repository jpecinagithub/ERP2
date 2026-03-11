# Despliegue ERP2 (Backend + Frontend)

## 1) Requisitos
- Node.js 18+ (recomendado 20+)
- MySQL 8+
- Base de datos creada (`erp2`)

## 2) Backend
Ruta: `backend/`

1. Instalar dependencias:
   - `npm install`
2. Configurar conexion MySQL en `backend/src/db.js` (host, user, password, database).
3. Inicializar datos:
   - Ejecutar `sql/init_schema.sql`
   - Ejecutar seeds que uses (`sql/seed_maestros.sql`, `sql/seed_invoices_mvp2.sql`, etc.)
4. Levantar API:
   - `node src/index.js`
5. Verificar:
   - `GET http://localhost:3000/api/health`

## 3) Frontend
Ruta: `frontend/`

1. Instalar dependencias:
   - `npm install`
2. Crear archivo de entorno:
   - Copiar `.env.example` a `.env`
   - Ajustar `VITE_API_BASE` si cambia host/puerto del backend
3. Desarrollo:
   - `npm run dev`
4. Produccion build:
   - `npm run build`
   - salida en `frontend/dist/`

## 4) Publicacion
### Opcion A: Servir frontend estatico + backend separado
- Subir `frontend/dist/` a tu hosting estatico (Nginx, Netlify, Vercel, etc.)
- Publicar backend Node en servidor/API (Render, VPS, Railway, etc.)
- Configurar `VITE_API_BASE` apuntando a la URL publica de la API

### Opcion B: Mismo servidor
- Build del frontend (`dist/`)
- Servir `dist/` desde Nginx/Apache
- Proxy `/api` hacia backend Node (puerto 3000)

## 5) Checklist rapido
- API responde `/api/health`
- Login funciona en frontend
- CRUD maestros (clientes/proveedores/articulos/cuentas/usuarios) funciona
- Facturas, diario, balance e inventario responden sin error 401/500
