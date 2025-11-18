// Demo: CFO signs an approval message locally (for testing only).
// Usage: ts-node backend/scripts/signApprovalExample.ts <batchId> [nonce] [signedTimestamp]
// Requires CFO_PRIVATE_KEY in env for demo signing (do NOT store this insecurely in production).
import dotenv from "dotenv";
import { Wallet } from "ethers";
dotenv.config();

async function main() {
  const CFO_PRIVATE_KEY = process.env.CFO_PRIVATE_KEY;
  if (!CFO_PRIVATE_KEY) {
    console.error("Set CFO_PRIVATE_KEY in env (demo only).");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const batchId = args[0];
  const nonce = args[1] || "";
  const ts = args[2] ? parseInt(args[2], 10) : Math.floor(Date.now() / 1000);
  if (!batchId) {
    console.error("Usage: ts-node backend/scripts/signApprovalExample.ts <batchId> [nonce] [signedTimestamp]");
    process.exit(1);
  }
  const message = `Approve payroll batch:${batchId}|${nonce}|${ts}`;
  const wallet = new Wallet(CFO_PRIVATE_KEY);
  const signature = await wallet.signMessage(message);
  console.log("message:", message);
  console.log("signature:", signature);
  console.log("signer address:", await wallet.getAddress());
}

main().catch((err) => { console.error(err); process.exit(1); });