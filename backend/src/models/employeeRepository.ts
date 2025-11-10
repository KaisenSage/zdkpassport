import { Pool } from 'pg';

export interface Employee {
  id: number;
  name: string;
  email: string | null;
  zk_account_id?: string | null;
  zk_pubkey?: string | null;
  zk_deploy_status?: string | null;
  zk_allocated_amount?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface FundingTx {
  id: number;
  employee_id: number;
  amount: number;
  tx_hash?: string | null;
  status: string;
  attempt_count: number;
  created_at?: string;
  updated_at?: string;
}

export class EmployeeRepository {
  constructor(private pool: Pool) {}

  async getEmployeeByEmail(email: string): Promise<Employee | null> {
    const res = await this.pool.query('SELECT * FROM employees WHERE email = $1 LIMIT 1', [email]);
    return res.rows[0] ?? null;
  }

  async getEmployeeById(id: number): Promise<Employee | null> {
    const res = await this.pool.query('SELECT * FROM employees WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] ?? null;
  }

  async createEmployee(name: string, email: string | null = null): Promise<Employee> {
    const res = await this.pool.query(
      `INSERT INTO employees (name, email, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       RETURNING *`,
      [name, email]
    );
    return res.rows[0];
  }

  /**
   * Update zk fields.
   * Accepts either:
   *  - updateEmployeeZkAccount(employeeId, zkAccountId:string, zkPubkey?:string, deployStatus?:string)
   *  - updateEmployeeZkAccount(employeeId, fieldsObjectOrJsonString)
   */
  async updateEmployeeZkAccount(employeeId: number, arg1: any, arg2?: any, arg3?: any) {
    let zk_account_id: string | null = null;
    let zk_pubkey: string | null = null;
    let zk_deploy_status: string | null = null;
    let zk_allocated_amount: number | null = null;

    if (arg1 && typeof arg1 === 'object') {
      zk_account_id = arg1.zk_account_id ?? null;
      zk_pubkey = arg1.zk_pubkey ?? null;
      zk_deploy_status = arg1.zk_deploy_status ?? null;
      zk_allocated_amount = typeof arg1.zk_allocated_amount !== 'undefined' ? arg1.zk_allocated_amount : null;
    } else if (arg1 && typeof arg1 === 'string') {
      try {
        const parsed = JSON.parse(arg1);
        if (parsed && typeof parsed === 'object') {
          zk_account_id = parsed.zk_account_id ?? null;
          zk_pubkey = parsed.zk_pubkey ?? null;
          zk_deploy_status = parsed.zk_deploy_status ?? null;
          zk_allocated_amount = typeof parsed.zk_allocated_amount !== 'undefined' ? parsed.zk_allocated_amount : null;
        } else {
          zk_account_id = arg1;
        }
      } catch {
        zk_account_id = arg1;
      }
    }

    // explicit args override parsed object fields
    if (typeof arg2 !== 'undefined' && arg2 !== null) zk_pubkey = arg2;
    if (typeof arg3 !== 'undefined' && arg3 !== null) zk_deploy_status = arg3;

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (zk_account_id !== null) {
      sets.push(`zk_account_id = $${idx++}`);
      vals.push(zk_account_id);
    }
    if (zk_pubkey !== null) {
      sets.push(`zk_pubkey = $${idx++}`);
      vals.push(zk_pubkey);
    }
    if (zk_deploy_status !== null) {
      sets.push(`zk_deploy_status = $${idx++}`);
      vals.push(zk_deploy_status);
    }
    if (zk_allocated_amount !== null) {
      sets.push(`zk_allocated_amount = $${idx++}`);
      vals.push(zk_allocated_amount);
    }

    if (sets.length === 0) {
      return this.getEmployeeById(employeeId);
    }

    vals.push(employeeId);
    const q = `
      UPDATE employees
      SET ${sets.join(', ')}, updated_at = now()
      WHERE id = $${idx}
      RETURNING *
    `;
    const res = await this.pool.query(q, vals);
    return res.rows[0] ?? null;
  }

  // Backwards-compatible alias some callers expect
  async updateEmployeeZkFields(employeeId: number, ...args: any[]) {
    return this.updateEmployeeZkAccount(employeeId, ...args);
  }

  // Funding tx operations used by reconciler & services
  async insertFundingTx(employeeId: number, amount: number): Promise<FundingTx> {
    const res = await this.pool.query(
      `INSERT INTO employee_funding_tx (employee_id, amount, status, attempt_count, created_at, updated_at)
       VALUES ($1, $2, 'pending', 0, now(), now())
       RETURNING *`,
      [employeeId, amount]
    );
    return res.rows[0];
  }

  // Alias to satisfy callers expecting createFundingTx(...)
  async createFundingTx(employeeId: number, amount: number): Promise<FundingTx> {
    return this.insertFundingTx(employeeId, amount);
  }

  async listPendingFundingTxs(limit = 100): Promise<FundingTx[]> {
    const res = await this.pool.query(
      `SELECT * FROM employee_funding_tx WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1`,
      [limit]
    );
    return res.rows;
  }

  /**
   * Increment attempt_count on a funding tx.
   * Accepts either an id or an object with .id and returns the updated funding_tx row.
   */
  async incrementFundingTxAttempt(idOrTx: any): Promise<FundingTx | null> {
    let id: number;
    if (idOrTx && typeof idOrTx === 'object' && typeof idOrTx.id !== 'undefined') {
      id = Number(idOrTx.id);
    } else {
      id = Number(idOrTx);
    }
    if (!Number.isFinite(id) || Number.isNaN(id)) {
      throw new Error('invalid funding tx id');
    }

    const res = await this.pool.query(
      `UPDATE employee_funding_tx
       SET attempt_count = COALESCE(attempt_count, 0) + 1,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return res.rows[0] ?? null;
  }

  // Generic status updater (accepts id or funding-tx object)
  async markFundingTxStatus(idOrTx: any, status: string, txHash?: string | null) {
    // normalize id whether caller passed { id: ... } or an id
    let id: number;
    if (idOrTx && typeof idOrTx === 'object' && typeof idOrTx.id !== 'undefined') {
      id = Number(idOrTx.id);
    } else {
      id = Number(idOrTx);
    }
    if (!Number.isFinite(id) || Number.isNaN(id)) {
      throw new Error('invalid funding tx id');
    }

    await this.pool.query(
      `UPDATE employee_funding_tx
       SET status = $1, tx_hash = COALESCE($2, tx_hash), updated_at = now()
       WHERE id = $3`,
      [status, txHash ?? null, id]
    );
  }

  // Alias expected by service: markFundingTxAsConfirmed(txIdOrObject, txHash?)
  async markFundingTxAsConfirmed(idOrTx: any, txHash?: string | null) {
    return this.markFundingTxStatus(idOrTx, 'confirmed', txHash ?? null);
  }

  // Optional: alias for marking failed (if service expects it)
  async markFundingTxAsFailed(idOrTx: any, txHash?: string | null) {
    return this.markFundingTxStatus(idOrTx, 'failed', txHash ?? null);
  }

  /**
   * Atomically increment zk_allocated_amount for an employee.
   * Signature used by services: incrementAllocatedAmount(employeeId, amount)
   * Returns the updated employee row.
   */
  async incrementAllocatedAmount(employeeId: number, amount: number) {
    const res = await this.pool.query(
      `UPDATE employees
       SET zk_allocated_amount = COALESCE(zk_allocated_amount, 0) + $1,
           updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [amount, employeeId]
    );
    return res.rows[0] ?? null;
  }
}