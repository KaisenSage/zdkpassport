-- Migration: create employee_funding_tx and indexes (idempotent)
BEGIN;

CREATE TABLE IF NOT EXISTS employee_funding_tx (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_funding_tx_employee_id ON employee_funding_tx(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_funding_tx_status ON employee_funding_tx(status);

COMMIT;