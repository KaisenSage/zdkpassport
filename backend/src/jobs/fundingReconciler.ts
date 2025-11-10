/**
 * Background reconciler for pending funding transactions.
 * Periodically fetches pending funding txs and checks their confirmation status via SDK.
 * If confirmed -> mark confirmed and increment employee allocated amount.
 * Retries up to maxAttempts then marks as failed.
 *
 * This is intended to run as a separate process or a scheduled job inside your app.
 */

import { EmployeeRepository } from '../models/employeeRepository';
import { ZkSdk } from '../services/zkAccountService';

export async function startFundingReconciler(repo: EmployeeRepository, sdk: ZkSdk, intervalMs = 30_000) {
  const maxAttempts = 5;

  async function tick() {
    try {
      const pending = await repo.listPendingFundingTxs(50);
      for (const tx of pending) {
        try {
          if (!tx.tx_hash) {
            // cannot reconcile without tx_hash; skip or log
            await repo.incrementFundingTxAttempt(tx.id);
            continue;
          }

          // ask SDK whether tx is confirmed
          const status = await sdk.waitForConfirm(tx.tx_hash, 10_000); // 10s
          if (status.confirmed) {
            // mark confirmed and increment allocated amount
            await repo.incrementAllocatedAmount(tx.employee_id, Number(tx.amount));
            await repo.markFundingTxAsConfirmed(tx.id, tx.tx_hash);
            console.log(`Funding tx ${tx.id} confirmed (${tx.tx_hash})`);
          } else {
            const attempts = await repo.incrementFundingTxAttempt(tx.id);
            if (attempts >= maxAttempts) {
              await repo.markFundingTxAsFailed(tx.id, attempts);
              console.warn(`Funding tx ${tx.id} marked failed after ${attempts} attempts`);
            } else {
              console.log(`Funding tx ${tx.id} not confirmed yet (attempt ${attempts})`);
            }
          }
        } catch (innerErr) {
          console.error('Error reconciling tx', tx.id, innerErr);
          await repo.incrementFundingTxAttempt(tx.id);
        }
      }
    } catch (err) {
      console.error('Funding reconciler error', err);
    } finally {
      setTimeout(tick, intervalMs);
    }
  }

  // start first tick
  tick();
}