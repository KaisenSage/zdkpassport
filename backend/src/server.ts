import path from 'path';
import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

import { EmployeeRepository } from './models/employeeRepository';
import AztecAdapter from './sdk/aztecAdapter';
import { ZkAccountService } from './services/zkAccountService';
import { OnboardingController } from './controllers/onboardingController';
import { onboardingRouter } from './routes/onboardingRoutes';
import { startFundingReconciler } from './jobs/fundingReconciler';

/**
 * Load .env robustly:
 * Try these candidates in order so running from repo root or backend/ both work.
 */
const envCandidates = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '.env'),
];

let loaded = false;
for (const p of envCandidates) {
  try {
    const result = dotenv.config({ path: p });
    if (result.parsed) {
      console.log(`Loaded env from ${p}`);
      loaded = true;
      break;
    }
  } catch {}
}
if (!loaded) {
  dotenv.config();
  console.log('Loaded env from default locations or environment variables');
}

const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL missing. Set backend/.env before running.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// instantiate repository
const repo = new EmployeeRepository(pool);

// Create a mock AztecAdapter for local testing
const COMPANY_VAULT_ID = process.env.COMPANY_VAULT_ID || 'company_vault_local';
const seedBalances: Record<string, number> = {};
seedBalances[COMPANY_VAULT_ID] = Number(process.env.COMPANY_VAULT_BALANCE || 10000);

const sdk = new AztecAdapter(seedBalances);

const zkService = new ZkAccountService(sdk as any, repo, COMPANY_VAULT_ID);
const controller = new OnboardingController(repo, zkService);
const app = express();

app.use(express.json());
app.use('/api', onboardingRouter(controller));

// Debug endpoint: list all registered routes (temporary)
app.get('/__routes', (_req, res) => {
  const routes = (app as any)._router.stack
    .filter((r: any) => r && r.route)
    .map((r: any) => {
      const methods = Object.keys(r.route.methods).map(m => m.toUpperCase()).join(',');
      return { path: r.route.path, methods };
    });
  res.json(routes);
});

// simple health route
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// start funding reconciler background job
startFundingReconciler(repo, sdk as any, Number(process.env.RECONCILER_INTERVAL_MS || 30000));

// start server
app.listen(PORT, () => {
  console.log(`zkpayroll backend listening on http://localhost:${PORT}`);
  console.log(`Company vault id: ${COMPANY_VAULT_ID}`);
});
