/**
 * Express router mounting onboarding endpoints.
 * Usage:
 *   import express from 'express';
 *   import { Pool } from 'pg';
 *   import { EmployeeRepository } from './models/employeeRepository';
 *   import { ZkAccountService } from './services/zkAccountService';
 *   import { OnboardingController } from './controllers/onboardingController';
 *   import { createYourSdkClient } from './yourSdkBootstrap';
 *
 *   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *   const repo = new EmployeeRepository(pool);
 *   const sdk = createYourSdkClient(...);
 *   const zkService = new ZkAccountService(sdk, repo, process.env.COMPANY_VAULT_ID);
 *   const controller = new OnboardingController(repo, zkService);
 *   app.use('/api', onboardingRouter(controller));
 */

import { Router } from 'express';
import { OnboardingController } from '../controllers/onboardingController';

export function onboardingRouter(controller: OnboardingController) {
  const router = Router();
  router.post('/onboard', controller.onboard.bind(controller));
  router.post('/employees/:id/allocate', controller.allocate.bind(controller));
  return router;
}