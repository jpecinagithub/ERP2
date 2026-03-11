#!/usr/bin/env bash
set -euo pipefail

###########################################################
# ERP2 – Deployment flow (schema + seeds + triggers)
# Runs the full flow in a deterministic order.
# Config via environment variables:
#  DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
###########################################################

DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-ERP2}

MYSQL_CMD="mysql -h ${DB_HOST} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME}"

echo "[deploy] Applying schema (01-schema.sql)" 
${MYSQL_CMD} < sql/01-schema.sql

echo "[deploy] Applying seeds (02-seed-core.sql)" 
${MYSQL_CMD} < sql/02-seed-core.sql
echo "[deploy] Applying seeds (02-seed-entities.sql)" 
${MYSQL_CMD} < sql/02-seed-entities.sql

echo "[deploy] Applying auditoria triggers (03-triggers-auditoria.sql)" 
${MYSQL_CMD} < sql/03-triggers-auditoria.sql

echo "[deploy] Applying utilities (04-utilidades.sql)" 
${MYSQL_CMD} < sql/04-utilidades.sql

echo "Deployment completed."
