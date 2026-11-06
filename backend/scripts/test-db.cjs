require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool
  .query('SELECT COUNT(*) FROM producto')
  .then((r) => console.log('Productos en la base:', r.rows[0].count))
  .catch((e) => console.error('Error:', e.message))
  .finally(() => pool.end());