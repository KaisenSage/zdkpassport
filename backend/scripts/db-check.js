// node backend/scripts/db-check.js
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/zkpayroll';
const pool = new Pool({ connectionString });

(async () => {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
    console.log('tables:', tables.rows.map(r => r.table_name).join(', '));

    // Try employees table
    try {
      const e = await pool.query("SELECT id,name,email,zk_account_id,zk_pubkey,zk_deploy_status FROM employees ORDER BY id DESC LIMIT 20;");
      console.log('employees rows:', e.rows);
    } catch (err) {
      console.log('employees table not found or query failed:', err.message);
    }

    // Try system_accounts or vaults
    try {
      const s = await pool.query("SELECT name,aztec_account_id,pubkey,metadata FROM system_accounts ORDER BY name LIMIT 50;");
      console.log('system_accounts rows:', s.rows);
    } catch (err) {
      console.log('system_accounts table not found or query failed:', err.message);
    }
  } catch (err) {
    console.error('db-check error:', err.message || err);
  } finally {
    await pool.end();
  }
})();