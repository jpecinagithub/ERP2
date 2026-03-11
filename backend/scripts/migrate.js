require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function parseBool(value, defaultValue = false) {
  if (value == null) return defaultValue;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function readSql(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function stripCreateDbAndUse(sql) {
  return sql
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim().toUpperCase();
      if (trimmed.startsWith('CREATE DATABASE')) return false;
      if (trimmed.startsWith('USE ')) return false;
      return true;
    })
    .join('\n');
}

function getConnectionConfig() {
  const url = process.env.DATABASE_URL || process.env.DB_URL;
  const sslEnabled = parseBool(process.env.DB_SSL, true);
  const rejectUnauthorized = parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);
  const ca = process.env.DB_SSL_CA;

  const ssl =
    sslEnabled ? (ca ? { rejectUnauthorized, ca } : { rejectUnauthorized }) : undefined;

  if (url) {
    return { uri: url, multipleStatements: true, ...(ssl ? { ssl } : {}) };
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    ...(ssl ? { ssl } : {})
  };
}

async function run() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const sqlDir = path.join(repoRoot, 'sql');

  const schemaPath = path.join(sqlDir, process.env.DB_SCHEMA_FILE || '01-schemaGPT.sql');
  const seedPath = path.join(sqlDir, process.env.DB_SEED_FILE || '02-seedGPT.sql');

  const skipSeed = parseBool(process.env.DB_SKIP_SEED, false);
  const stripDbStatements = parseBool(process.env.DB_STRIP_DB_STATEMENTS, true);

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`No se encontró el schema: ${schemaPath}`);
  }

  if (!skipSeed && !fs.existsSync(seedPath)) {
    throw new Error(`No se encontró el seed: ${seedPath}`);
  }

  let schemaSql = readSql(schemaPath);
  let seedSql = skipSeed ? '' : readSql(seedPath);

  // TiDB Serverless normalmente ya tiene la DB creada desde consola y exige TLS.
  // Para evitar errores por CREATE DATABASE/USE, por defecto los removemos.
  if (stripDbStatements) {
    schemaSql = stripCreateDbAndUse(schemaSql);
    seedSql = stripCreateDbAndUse(seedSql);
  }

  const conn = await mysql.createConnection(getConnectionConfig());
  try {
    console.log(`[migrate] Aplicando schema: ${path.basename(schemaPath)}`);
    await conn.query(schemaSql);
    console.log('[migrate] Schema OK');

    if (!skipSeed) {
      console.log(`[migrate] Aplicando seeds: ${path.basename(seedPath)}`);
      await conn.query(seedSql);
      console.log('[migrate] Seeds OK');
    } else {
      console.log('[migrate] Seeds omitidos (DB_SKIP_SEED=1)');
    }
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('[migrate] Error:', err.message);
  process.exit(1);
});

