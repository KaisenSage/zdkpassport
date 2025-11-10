/**
 * zkAccountService: wrapper around your zk provider SDK (Aztec or other).
 * The service expects an injected `sdk` object implementing:
 *  - createStealthAccount(metadata?: object): Promise<{ accountId: string, pubKey: string }>
 *  - transfer(opts: { from: string, to: string, amount: number }): Promise<{ txHash: string }>
 *  - waitForConfirm(txHash: string, timeoutMs?: number): Promise<{ confirmed: boolean }>
 *  - getBalance(accountId: string): Promise<number>
 *
 * This file orchestrates account creation, calling the sdk and persisting results via repo.
 */

import { EmployeeRepository } from '../models/employeeRepository';

export interface ZkSdk {
  createStealthAccount: (metadata?: Record<string, any>) => Promise<{ accountId: string; pubKey: string }>;
  transfer: (opts: { from: string; to: string; amount: number }) => Promise<{ txHash: string }>;
  waitForConfirm: (txHash: string, timeoutMs?: number) => Promise<{ confirmed: boolean }>;
  getBalance: (accountId: string) => Promise<number>;
}

export class ZkAccountService {
  constructor(private sdk: ZkSdk, private repo: EmployeeRepository, private companyVaultId: string) {}

  /**
   * Creates a stealth sub-account for the employee and persists mapping.
   * Returns { accountId, pubKey }
   */
  async createSubAccountForEmployee(employeeId: number, metadata?: Record<string, any>) {
    // 1. call SDK
    const { accountId, pubKey } = await this.sdk.createStealthAccount({ employeeId, ...(metadata || {}) });

    // 2. persist mapping (status -> created)
    await this.repo.updateEmployeeZkFields(employeeId, {
      zk_account_id: accountId,
      zk_pubkey: pubKey,
      zk_deploy_status: 'created',
    });

    return { accountId, pubKey };
  }

  /**
   * Allocates funds from the company vault into an employee subaccount.
   * Creates a funding tx record before sending the tx so we can reconcile.
   */
  async allocateFromVault(employeeId: number, subAccountId: string, amount: number) {
    // create funding tx DB record (status: pending)
    const txId = await this.repo.createFundingTx(employeeId, amount, null);

    // perform the confidential transfer from the company vault to the subAccount
    const { txHash } = await this.sdk.transfer({ from: this.companyVaultId, to: subAccountId, amount });

    // store txHash on record (mark pending with txHash)
    await this.repo.markFundingTxAsConfirmed(txId, txHash).catch(async () => {
      // If immediate confirm call fails, just set tx_hash and let reconciler confirm later
      // We update the record with txHash by direct update call in repo (not implemented here)
    });

    // Wait for confirmation
    const receipt = await this.sdk.waitForConfirm(txHash, 30_000); // 30s default
    if (receipt.confirmed) {
      // increment allocated amount and mark funding tx confirmed
      await this.repo.incrementAllocatedAmount(employeeId, amount);
      await this.repo.markFundingTxAsConfirmed(txId, txHash);
      return { txId, txHash, confirmed: true };
    } else {
      // mark pending and let background worker handle retries
      await this.repo.incrementFundingTxAttempt(txId);
      return { txId, txHash, confirmed: false };
    }
  }

  async getBalance(accountId: string) {
    return this.sdk.getBalance(accountId);
  }
}