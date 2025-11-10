-- Migration: create employee_profile and employee_verification (idempotent)
-- Note: employee_profile.employee_id references employees.id (integer)
BEGIN;

CREATE TABLE IF NOT EXISTS employee_profile (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT,
  status VARCHAR(30) DEFAULT 'onboarding',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_verification (
  id SERIAL PRIMARY KEY,
  employee_profile_id INTEGER UNIQUE NOT NULL REFERENCES employee_profile(id) ON DELETE CASCADE,
  unique_identifier VARCHAR(255),
  proof_hash VARCHAR(128) NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;