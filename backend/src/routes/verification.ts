import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { query } from "../db";

const router = express.Router();

/**
 * POST /api/verify/save
 * Payload:
 * {
 *   employeeId: string,           // your internal employee id (not PII)
 *   uniqueIdentifier?: string,    // optional identifier from zkPassport
 *   proof?: object,               // optional full proof object (if needed)
 *   result?: object,              // optional onResult payload
 *   verified?: boolean
 * }
 *
 * We compute a SHA256 hash of the minimal payload and store only that hash + metadata.
 */

const SaveSchema = z.object({
  employeeId: z.string().min(1),
  uniqueIdentifier: z.string().optional().nullable(),
  proof: z.any().optional(),
  result: z.any().optional(),
  verified: z.boolean().optional().default(false),
});

router.post("/save", async (req, res) => {
  const parse = SaveSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, error: parse.error.format() });
  }
  const { employeeId, uniqueIdentifier, proof, result, verified } = parse.data;

  try {
    // Build a canonical payload to hash (avoid PII)
    const payloadForHash = JSON.stringify({
      uniqueIdentifier: uniqueIdentifier || null,
      result: result || null,
      // Do NOT include any PII fields here
    });

    // Optional salt from env
    const salt = process.env.PROOF_HASH_SALT || "";
    const proofHash = crypto.createHash("sha256").update(payloadForHash + salt).digest("hex");

    // Upsert verification record
    const upsertQuery = `
      INSERT INTO employee_verification (employee_id, unique_identifier, proof_hash, verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (employee_id)
      DO UPDATE SET unique_identifier = EXCLUDED.unique_identifier,
                    proof_hash = EXCLUDED.proof_hash,
                    verified = EXCLUDED.verified,
                    updated_at = NOW()
      RETURNING *;
    `;
    const resultDb = await query(upsertQuery, [employeeId, uniqueIdentifier, proofHash, verified]);

    // Optionally, store raw proof in a secure audit table if you need (not recommended)

    return res.json({ ok: true, verification: resultDb.rows[0] });
  } catch (err) {
    console.error("save verification error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;