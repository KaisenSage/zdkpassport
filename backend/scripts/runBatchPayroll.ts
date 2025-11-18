import dotenv from "dotenv";
dotenv.config();

import fs from "fs/promises";
import crypto from "crypto";
import AztecAdapter from "./mockAztecAdapter.js"; // use mock for local dev
import { ethers } from "ethers";

type Recipient = { employeeId: string; subaccountId: string; amount: number };

async function loadRecipients(): Promise<Recipient[]> {
  const data = await fs.readFile(new URL("./sample-recipients.json", import.meta.url), "utf8");
  return JSON.parse(data) as Recipient[];
}

function computeProtocolFee(total: number, bps: number) {
  return Math.round((total * bps) / 10000 * 100) / 100;
}

function canonicalizeRun(run: any) {
  return JSON.stringify(run, Object.keys(run).sort());
}

async function anchorRunHash(runHashHex: string) {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.ANCHOR_WALLET_PRIVATE_KEY || "", provider);

  const anchorAddress = process.env.ANCHOR_CONTRACT_ADDRESS;
  if (!anchorAddress) throw new Error("ANCHOR_CONTRACT_ADDRESS not set");

  const abi = ["function anchorRun(bytes32 runHash) public returns (bool)"];
  const contract = new ethers.Contract(anchorAddress, abi, wallet);

  const tx = await contract.anchorRun(runHashHex);
  const receipt = await tx.wait();
  return receipt.transactionHash;
}

async function runBatch() {
  const sdk = await AztecAdapter.create({});
  const recipients = await loadRecipients();

  if (recipients.length === 0) {
    console.log("No recipients; exiting");
    return;
  }

  const total = recipients.reduce((s, r) => s + r.amount, 0);
  const feeBps = Number(process.env.PROTOCOL_FEE_BPS ?? 100);
  const fee = computeProtocolFee(total, feeBps);
  const netTotal = total - fee;

  const batch = {
    id: `run-${Date.now()}`,
    createdAt: new Date().toISOString(),
    total,
    fee,
    netTotal,
    items: recipients,
  };

  console.log("Batch:", batch.id, "total:", total, "fee:", fee);

  const transferResults: any[] = [];
  for (const item of recipients) {
    // mock transfer; replace with real SDK call in production
    const txId = `tx-${Math.random().toString(36).slice(2, 9)}`;
    transferResults.push({ employeeId: item.employeeId, subaccountId: item.subaccountId, amount: item.amount, txId });
  }

  const runObj = {
    batchId: batch.id,
    ts: batch.createdAt,
    total: batch.total,
    fee: batch.fee,
    items: transferResults.map((t) => ({ employeeId: t.employeeId, subaccountId: t.subaccountId, amount: t.amount, txId: t.txId })),
  };

  const canonical = canonicalizeRun(runObj);
  const hash = crypto.createHash("sha256").update(canonical).digest("hex");
  const runHashBytes32 = "0x" + hash;

  console.log("Run hash (sha256):", runHashBytes32);

  let anchorTxHash = "";
  if (process.env.ANCHOR_CONTRACT_ADDRESS && process.env.ANCHOR_WALLET_PRIVATE_KEY) {
    try {
      anchorTxHash = await anchorRunHash(runHashBytes32);
      console.log("Anchor tx hash:", anchorTxHash);
    } catch (e: any) {
      console.warn("Anchor failed:", e.message || e);
    }
  } else {
    console.log("Skipping anchor: ANCHOR_CONTRACT_ADDRESS or ANCHOR_WALLET_PRIVATE_KEY not set");
  }

  console.log("Batch completed:", batch.id, "anchorTx:", anchorTxHash);
}

runBatch().catch((err) => {
  console.error("Batch runner error:", err);
  process.exit(1);
});