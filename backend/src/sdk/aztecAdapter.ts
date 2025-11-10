/**
 * Simple local adapter implementing the minimal ZkSdk surface used by ZkAccountService.
 * Replace with a real Aztec/zk SDK implementation for production.
 *
 * Functions:
 *  - createStealthAccount(metadata?): Promise<{ accountId, pubKey }>
 *  - transfer({ from, to, amount }): Promise<{ txHash }>
 *  - waitForConfirm(txHash, timeoutMs?): Promise<{ confirmed: boolean }>
 *  - getBalance(accountId): Promise<number>
 *
 * This adapter keeps balances & pending txs in-memory for local testing.
 */

import { randomBytes } from 'crypto';

export interface ZkSdk {
  createStealthAccount: (metadata?: Record<string, any>) => Promise<{ accountId: string; pubKey: string }>;
  transfer: (opts: { from: string; to: string; amount: number }) => Promise<{ txHash: string }>;
  waitForConfirm: (txHash: string, timeoutMs?: number) => Promise<{ confirmed: boolean }>;
  getBalance: (accountId: string) => Promise<number>;
}

type PendingTx = {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  confirmed: boolean;
  createdAt: number;
};

function hex(len = 8) {
  return randomBytes(len).toString('hex');
}

export class AztecAdapter implements ZkSdk {
  private balances: Map<string, number> = new Map();
  private pending: Map<string, PendingTx> = new Map();

  constructor(private initialBalances: Record<string, number> = {}) {
    // seed initial balances (eg. company vault)
    Object.entries(initialBalances).forEach(([acct, val]) => this.balances.set(acct, val));
  }

  async createStealthAccount(metadata?: Record<string, any>) {
    // create a fake account id and pubkey
    const accountId = `aztec_acct_${Date.now()}_${hex(4)}`;
    const pubKey = `pk_${hex(16)}`;
    // initialize zero balance
    this.balances.set(accountId, 0);
    console.log(`[AztecAdapter] created stealth account ${accountId} (meta: ${JSON.stringify(metadata)})`);
    return { accountId, pubKey };
  }

  async transfer(opts: { from: string; to: string; amount: number }) {
    const { from, to, amount } = opts;
    const txHash = `0x${hex(16)}`;
    const pending: PendingTx = {
      txHash,
      from,
      to,
      amount,
      confirmed: false,
      createdAt: Date.now(),
    };
    this.pending.set(txHash, pending);

    // simulate async chain confirmation: confirm after short delay
    setTimeout(() => {
      // credit the `to` account
      const prev = this.balances.get(to) || 0;
      this.balances.set(to, prev + amount);

      // optionally debit the from account if we track it (we do if present)
      if (this.balances.has(from)) {
        const prevFrom = this.balances.get(from) || 0;
        this.balances.set(from, prevFrom - amount);
      }

      pending.confirmed = true;
      this.pending.set(txHash, pending);
      console.log(`[AztecAdapter] tx ${txHash} confirmed: ${from} -> ${to} amount=${amount}`);
    }, 2000 + Math.floor(Math.random() * 2000)); // 2–4s delay

    console.log(`[AztecAdapter] submitted tx ${txHash} from ${from} -> ${to} (${amount})`);
    return { txHash };
  }

  async waitForConfirm(txHash: string, timeoutMs = 30_000) {
    const pollInterval = 300;
    const start = Date.now();
    return new Promise<{ confirmed: boolean }>((resolve) => {
      const check = () => {
        const p = this.pending.get(txHash);
        if (p && p.confirmed) {
          resolve({ confirmed: true });
          return;
        }
        if (Date.now() - start > timeoutMs) {
          resolve({ confirmed: false });
          return;
        }
        setTimeout(check, pollInterval);
      };
      check();
    });
  }

  async getBalance(accountId: string) {
    return this.balances.get(accountId) || 0;
  }
}

export default AztecAdapter;