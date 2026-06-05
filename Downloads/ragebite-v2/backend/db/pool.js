require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] ❌ Connection failed:', err.message);
    process.exit(1);
  }
  console.log('[DB] ✅ PostgreSQL connected');
  release();
});

// Helper: run a query with automatic error logging
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB]', { query: text.slice(0, 60), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('[DB] Query error:', err.message, '\nQuery:', text);
    throw err;
  }
}

// Helper: get a client for transactions
async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);
  client.release = () => {
    client.query = originalQuery;
    client.release = release;
    release();
  };
  return client;
}

module.exports = { pool, query, getClient };
