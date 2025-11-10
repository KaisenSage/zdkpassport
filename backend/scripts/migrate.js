#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const data = fs.readFileSync(filePath, 'utf8');
  data.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.substring(0, eq).trim();
    let val = trimmed.substring(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });
  return env;
}

function run() {
  const repoRoot = path.resolve(__dirname, '..');
  const envPath = path.join(repoRoot, '.env');
  const migrationsDir = path.join(repoRoot, 'migrations');

  // ORDERED migrations: create employees first, then other migrations
  const migrations = [
    path.join(migrationsDir, '2025_11_03_create_employees_table.sql'),
    path.join(migrationsDir, '2025_11_05_add_zk_fields_to_employees.sql'),
    path.join(migrationsDir, '2025_11_05_create_employee_profile_and_verification.sql'),
    path.join(migrationsDir, '2025_11_10_create_employee_funding_tx.sql'),
  ];

  const env = loadEnv(envPath);
  if (!env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not found in', envPath);
    process.exit(1);
  }

  for (const m of migrations) {
    if (!fs.existsSync(m)) {
      console.error('ERROR: migration file not found:', m);
      process.exit(1);
    }
  }

  console.log('Using DATABASE_URL from', envPath);
  console.log('Running migrations:');
  migrations.forEach((m) => console.log('  -', m));

  const args = [env.DATABASE_URL, '-v', 'ON_ERROR_STOP=1'];
  migrations.forEach((m) => args.push('-f', m));

  const result = spawnSync('psql', args, {
    env: { ...process.env, DATABASE_URL: env.DATABASE_URL },
    stdio: 'inherit',
  });

  if (result.error) {
    console.error('Failed to spawn psql:', result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error('psql exited with code', result.status);
    process.exit(result.status || 1);
  }

  console.log('Migrations completed successfully.');
}

run();