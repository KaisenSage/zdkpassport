// backend/src/jobs/fundingReconciler.ts
// Reconciler that picks up pending funding txs and attempts to submit / confirm them.
// This version is defensive: repo.incrementFundingTxAttempt may return null, so we
// read attempt_count from the returned row and handle nulls safely.

import { EmployeeRepository, FundingTx } from '../models/employeeRepository';

const DEFAULT_MAX_ATTEMPTS = 5;

export function startFundingReconciler(repo: EmployeeRepository, sdk: any, intervalMs = 30000, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
  async function tick() {
    try {
      const pending: FundingTx[] = await repo.listPendingFundingTxs(100);
      if (!pending || pending.length === 0) return;

      for (const tx of pending) {
        try {
          // If there's no tx_hash yet we can't check on-chain — increment attempt and skip.
          if (!tx.tx_hash) {
            const updated = await repo.incrementFundingTxAttempt(tx.id);
            const attempts = updated?.attempt_count ?? 0;
            console.log(`Funding tx ${tx.id} has no tx_hash; incremented attempts => ${attempts}`);
            // if attempts reached threshold, mark failed
            if (attempts >= maxAttempts) {
              await repo.markFundingTxAsFailed(tx.id, null);
              console.warn(`Funding tx ${tx.id} marked failed after ${attempts} attempts (no tx_hash)`);
            }
            continue;
          }

          // If tx_hash exists, ask SDK whether it's confirmed (adapter-specific)
          const confirmed = await sdk.checkTxConfirmed(tx.tx_hash);
          if (!confirmed) {
            // increment attempts and read updated attempt_count safely
            const updated = await repo.incrementFundingTxAttempt(tx.id);
            const attempts = updated?.attempt_count ?? 0;

            console.log(`Funding tx ${tx.id} is not confirmed yet; attempts=${attempts}`);

            if (attempts >= maxAttempts) {
              await repo.markFundingTxAsFailed(tx.id, tx.tx_hash);
              console.warn(`Funding tx ${tx.id} marked failed after ${attempts} attempts`);
            }
            continue;
          }

          // confirmed: record confirmation and update allocated amount on employee
          await repo.markFundingTxAsConfirmed(tx.id, tx.tx_hash);
          // increment the employee's allocated amount atomically
          const newEmp = await repo.incrementAllocatedAmount(tx.employee_id, Number(tx.amount));
          console.log(`Funding tx ${tx.id} confirmed. Employee ${tx.employee_id} allocation updated. new zk_allocated_amount=${newEmp?.zk_allocated_amount}`);
        } catch (innerErr) {
          console.error(`Error processing funding tx ${tx.id}:`, innerErr);
        }
      }
    } catch (err) {
      console.error('Funding reconciler error', err);
    }
  }

  // Run immediately, then on interval
  tick().catch((e) => console.error('Initial reconciler tick failed', e));
  const handle = setInterval(() => tick().catch((e) => console.error('Reconciler tick failed', e)), intervalMs);

  // return a stop function for graceful shutdown/testing
  return () => clearInterval(handle);
}