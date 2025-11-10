-- Migration: ensure zk-related columns exist on employees (idempotent)
BEGIN;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS zk_account_id TEXT,
  ADD COLUMN IF NOT EXISTS zk_pubkey TEXT,
  ADD COLUMN IF NOT EXISTS zk_deploy_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS zk_allocated_amount NUMERIC DEFAULT 0;

COMMIT;