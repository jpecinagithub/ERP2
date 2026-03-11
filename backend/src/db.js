const mysql = require('mysql2/promise');

// Cargar variables de entorno
require('dotenv').config();

function parseBool(value, defaultValue = false) {
  if (value == null) return defaultValue;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function buildDbConfig() {
  // Preferir URL si existe (útil en proveedores tipo TiDB/PlanetScale/etc.)
  // Formato: mysql://user:pass@host:port/dbname
  const url = process.env.DATABASE_URL || process.env.DB_URL;
  if (url) {
    const sslEnabled = parseBool(process.env.DB_SSL, true);
    const rejectUnauthorized = parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);
    const ca = process.env.DB_SSL_CA;
    return {
      uri: url,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
      queueLimit: 0,
      ...(sslEnabled
        ? { ssl: ca ? { rejectUnauthorized, ca } : { rejectUnauthorized } }
        : {})
    };
  }

  const sslEnabled = parseBool(process.env.DB_SSL, false);
  const rejectUnauthorized = parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);
  const ca = process.env.DB_SSL_CA;

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ERP2',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
    ...(sslEnabled
      ? { ssl: ca ? { rejectUnauthorized, ca } : { rejectUnauthorized } }
      : {})
  };
}

// Configuración de la base de datos desde variables de entorno
const pool = mysql.createPool(buildDbConfig());

module.exports = pool;
