-- Migration: create employees table (safe to run multiple times)
BEGIN;

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  -- initial zk-related columns (can be altered by later migrations)
  zk_account_id TEXT,
  zk_pubkey TEXT,
  zk_deploy_status VARCHAR(32),
  zk_allocated_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;