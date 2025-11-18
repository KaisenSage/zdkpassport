import { Request, Response } from 'express';
import { Employee, EmployeeRepository } from '../models/employeeRepository';
import { ZkAccountService } from '../services/zkAccountService';

export class OnboardingController {
  constructor(private repo: EmployeeRepository, private zk: ZkAccountService) {}

  // POST /api/onboard
  async onboard(req: Request, res: Response) {
    try {
      const { name, email, initialAllocation } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      let employee: Employee | null = null;
      if (email) {
        employee = await this.repo.getEmployeeByEmail(email);
      }

      if (!employee) {
        employee = await this.repo.createEmployee(name, email || null);
        // Defensive check: fail explicitly if createEmployee returned null/undefined
        if (!employee) {
          console.error('onboard error: createEmployee returned null');
          return res.status(500).json({ error: 'failed to create employee' });
        }
      }

      // Ensure zk account exists
      if (!employee.zk_account_id) {
        await this.zk.createSubAccountForEmployee(employee.id, { email });
        employee = await this.repo.getEmployeeById(employee.id);
        if (!employee) {
          console.error('onboard error: employee missing after zk sub-account creation');
          return res.status(500).json({ error: 'employee not found after zk deployment' });
        }
      }

      let allocationResult = null;
      if (initialAllocation && Number(initialAllocation) > 0) {
        allocationResult = await this.zk.allocateFromVault(
          employee.id,
          employee.zk_account_id as string,
          Number(initialAllocation)
        );
      }

      const refreshed = await this.repo.getEmployeeById(employee.id);
      return res.json({ success: true, employee: refreshed, allocation: allocationResult });
    } catch (err: unknown) {
      console.error('onboard error', err);
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg || 'internal error' });
    }
  }

  // POST /api/employees/:id/allocate
  async allocate(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { amount } = req.body;
      if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount required' });

      const employee = await this.repo.getEmployeeById(id);
      if (!employee) return res.status(404).json({ error: 'employee not found' });
      if (!employee.zk_account_id) return res.status(400).json({ error: 'employee has no zk account' });

      const result = await this.zk.allocateFromVault(id, employee.zk_account_id, Number(amount));
      return res.json({ success: true, result });
    } catch (err: unknown) {
      console.error('allocate error', err);
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg || 'internal error' });
    }
  }
}