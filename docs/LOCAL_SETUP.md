# Local Setup Guide for ERP2

Prerequisites
- Docker and Docker Compose (or Docker Desktop) installed
- Optional: Node.js for frontend/backend development

1) Create and start the DB
- Copy docker-compose.yml to repo root
- Run: docker compose up -d
- Wait a few moments for MySQL to initialize (check docker logs: docker logs erp2-mysql)

2) Prepare environment files
- Create a local env for the backend, or reuse existing:
- Copy backend/.env.example to backend/.env and set DB_HOST=localhost, DB_USER=erp_user, DB_PASSWORD=erp_password, DB_NAME=ERP2

3) Deploy the schema and seeds
- In a shell, run:
  bash sql/deploy_all.sh
  (On Windows: run sql/deploy_all.ps1 in PowerShell)

4) Verification
- Run integrity checks:
- SQL: sql/verify_integrity.sql
- Seed idempotence tests: sql/run_idempotence_tests.sql

5) Optional: Run utilidades
- sql/04-utilidades.sql

6) Cleanup
- To stop DB: docker compose down
- To remove volumes: docker compose down -v

Notas
- Este flujo asume que la base ERP2 ya existe o se crea al levantar MySQL con los scripts siguientes.
- Los nombres de usuario y contraseñas están hardcodeados para desarrollo; no usar en producción.
