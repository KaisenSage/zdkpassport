import express from "express";
import { z } from "zod";
import { query } from "../db";

const router = express.Router();

// Simple middleware to protect HR routes using an API key from env.
// Replace with proper auth (JWT/OAuth/Session) in production.
router.use((req, res, next) => {
  const apiKey = process.env.HR_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: "HR_API_KEY not configured" });

  const provided = req.header("x-api-key");
  if (provided !== apiKey) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
});

/**
 * POST /api/hr/employees
 * body: { employeeId: string, role?: string }
 */
const CreateSchema = z.object({
  employeeId: z.string().min(1),
  role: z.string().optional(),
});

router.post("/employees", async (req, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.format() });

  const { employeeId, role } = parsed.data;
  try {
    const insert = `
      INSERT INTO employee_profile (employee_id, role, status, created_at, updated_at)
      VALUES ($1, $2, 'onboarding', NOW(), NOW())
      ON CONFLICT (employee_id) DO NOTHING
      RETURNING *;
    `;
    const resultDb = await query(insert, [employeeId, role || null]);
    return res.json({ ok: true, employee: resultDb.rows[0] || null });
  } catch (err) {
    console.error("create employee error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/hr/employees
 * returns list of employees joined with verification info
 */
router.get("/employees", async (_req, res) => {
  try {
    const q = `
      SELECT p.employee_id, p.role, p.status, p.created_at, v.verified, v.unique_identifier, v.updated_at as verification_updated_at
      FROM employee_profile p
      LEFT JOIN employee_verification v ON v.employee_id = p.employee_id
      ORDER BY p.created_at DESC;
    `;
    const resultDb = await query(q);
    return res.json({ ok: true, employees: resultDb.rows });
  } catch (err) {
    console.error("list employees error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * PATCH /api/hr/employees/:employeeId/status
 * body: { status: 'employed' | 'resigned' | 'terminated' | 'onboarding' }
 */
const StatusSchema = z.object({
  status: z.enum(["onboarding", "employed", "resigned", "terminated"]),
});

router.patch("/employees/:employeeId/status", async (req, res) => {
  const parsed = StatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.format() });

  const { status } = parsed.data;
  const employeeId = req.params.employeeId;
  try {
    const q = `UPDATE employee_profile SET status = $1, updated_at = NOW() WHERE employee_id = $2 RETURNING *`;
    const resultDb = await query(q, [status, employeeId]);
    return res.json({ ok: true, employee: resultDb.rows[0] || null });
  } catch (err) {
    console.error("update status error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;