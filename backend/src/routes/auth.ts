import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../db";
import { ZKPassport } from "@zkpassport/sdk";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "replace-with-secure-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "cw_sess";

/**
 * Helper: create JWT and set cookie
 */
function issueToken(res: express.Response, payload: object) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  // set cookie (httpOnly, secure in production)
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60, // 1 hour (ms) — align with JWT_EXPIRES_IN if needed
    // domain: process.env.COOKIE_DOMAIN || undefined,
    // path: "/",
  });
  return token;
}

/**
 * Payload validation
 */
const SignupPayload = z.union([
  z.object({ uniqueIdentifier: z.string().min(1), meta: z.any().optional() }),
  z.object({
    queryResult: z.any(),
    proofs: z.array(z.any()),
    domain: z.string().optional(),
  }),
]);

/**
 * POST /api/auth/signup
 * - Accepts uniqueIdentifier (preferred) OR proofs + queryResult for server-side verification.
 * - Upserts user row and issues cookie.
 */
router.post("/signup", async (req, res) => {
  const parsed = SignupPayload.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.format() });

  let uniqueIdentifier: string | undefined;
  try {
    if ("uniqueIdentifier" in parsed.data) {
      uniqueIdentifier = parsed.data.uniqueIdentifier;
    } else {
      // server-side verify via ZKPassport SDK
      const { queryResult, proofs, domain } = parsed.data;
      const zk = new ZKPassport(domain || req.hostname);
      const { verified, uniqueIdentifier: u } = await zk.verify({ proofs, queryResult, devMode: true });
      if (!verified || !u) {
        return res.status(400).json({ ok: false, error: "verification_failed" });
      }
      uniqueIdentifier = u;
    }

    // Upsert user in DB
    const upsert = `
      INSERT INTO users (unique_identifier, meta, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (unique_identifier) DO UPDATE SET meta = COALESCE(EXCLUDED.meta, users.meta), updated_at = NOW()
      RETURNING *;
    `;
    const meta = ("meta" in parsed.data && (parsed.data as any).meta) ? (parsed.data as any).meta : null;
    const resultDb = await query(upsert, [uniqueIdentifier, meta]);
    const user = resultDb.rows[0];

    // Issue token
    const token = issueToken(res, { sub: user.id, uid: uniqueIdentifier });

    return res.json({ ok: true, user: { id: user.id, uniqueIdentifier }, token });
  } catch (err) {
    console.error("auth/signup error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/auth/login
 * - Accepts uniqueIdentifier OR proofs for server-side verification
 * - If user exists, issue token. If not, returns 404 (or you can auto create).
 */
const LoginPayload = SignupPayload;

router.post("/login", async (req, res) => {
  const parsed = LoginPayload.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.format() });

  let uniqueIdentifier: string | undefined;
  try {
    if ("uniqueIdentifier" in parsed.data) {
      uniqueIdentifier = parsed.data.uniqueIdentifier;
    } else {
      const { queryResult, proofs, domain } = parsed.data;
      const zk = new ZKPassport(domain || req.hostname);
      const { verified, uniqueIdentifier: u } = await zk.verify({ proofs, queryResult, devMode: true });
      if (!verified || !u) {
        return res.status(400).json({ ok: false, error: "verification_failed" });
      }
      uniqueIdentifier = u;
    }

    // find user
    const q = `SELECT * FROM users WHERE unique_identifier = $1 LIMIT 1`;
    const r = await query(q, [uniqueIdentifier]);
    if (r.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }
    const user = r.rows[0];

    const token = issueToken(res, { sub: user.id, uid: uniqueIdentifier });

    return res.json({ ok: true, user: { id: user.id, uniqueIdentifier }, token });
  } catch (err) {
    console.error("auth/login error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", async (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ ok: true });
});

export default router;