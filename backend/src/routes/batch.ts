import express from "express";
import { createBatch, getBatch, approveAndExecuteBatch } from "../services/batchService";

const router = express.Router();

/**
 * POST /api/batch/create
 * Body:
 * {
 *   "nonce": "optional-nonce",
 *   "entries": [
 *     { "employeeId": "u1", "aztecAccountId": "emp-aztec-1", "amount": 100 },
 *     ...
 *   ],
 *   "metadata": "optional metadata string"
 * }
 */
router.post("/create", async (req, res) => {
  try {
    const { nonce, entries, metadata } = req.body;
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ ok: false, message: "entries required" });
    }
    const batch = await createBatch({ nonce, entries, metadata });
    res.json({ ok: true, batch });
  } catch (err: any) {
    console.error("create batch error", err);
    res.status(500).json({ ok: false, message: err?.message || "internal error" });
  }
});

/**
 * GET /api/batch/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const batch = await getBatch(id);
    if (!batch) return res.status(404).json({ ok: false, message: "not found" });
    res.json({ ok: true, batch });
  } catch (err: any) {
    console.error("get batch error", err);
    res.status(500).json({ ok: false, message: err?.message || "internal error" });
  }
});

/**
 * POST /api/batch/execute
 * Body:
 * {
 *   batchId: "<id>",
 *   approval: { signature: "0x...", signedTimestamp: 169..." }
 * }
 */
router.post("/execute", async (req, res) => {
  try {
    const { batchId, approval } = req.body;
    if (!batchId || !approval || !approval.signature || !approval.signedTimestamp) {
      return res.status(400).json({ ok: false, message: "batchId and approval (signature + signedTimestamp) required" });
    }

    const result = await approveAndExecuteBatch(batchId, approval);
    res.json({ ok: true, result });
  } catch (err: any) {
    console.error("execute batch error", err);
    res.status(500).json({ ok: false, message: err?.message || "internal error" });
  }
});

export default router;