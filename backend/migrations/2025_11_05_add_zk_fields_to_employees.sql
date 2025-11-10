-- Run this SQL to create the minimal schema (psql -f migrations.sql or via your DB tool)

CREATE TABLE IF NOT EXISTS employee_profile (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(100),
  status VARCHAR(30) DEFAULT 'onboarding',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_verification (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(100) REFERENCES employee_profile(employee_id) ON DELETE CASCADE,
  unique_identifier VARCHAR(255),
  proof_hash VARCHAR(128) NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (employee_id)
);