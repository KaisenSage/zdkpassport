import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import verificationRouter from "./routes/verification";
import hrRouter from "./routes/hr";
import authRouter from "./routes/auth"; // new auth router (implements /api/auth/*)

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(helmet());

// Allow the frontend to send/receive cookies. Set ALLOWED_ORIGIN in .env in production.
// cors origin:true will reflect the request origin which works with credentials:true.
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || true,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser()); // parse cookies (required for session cookie middleware)

// Routes already present
app.use("/api/verify", verificationRouter);
app.use("/api/hr", hrRouter);

// Mount auth router (signup/login/logout)
app.use("/api/auth", authRouter);

// Week 3: attempt to mount batch payroll routes if they exist.
// This keeps the existing file working if you haven't yet added the /routes/batch file.
// If you've added the batch router, it will be mounted at /api/batch.
try {
  // Use require to avoid top-level import errors if the file doesn't exist yet.
  // The batch router should export a default Express.Router.
  // Example path: backend/src/routes/batch.ts -> export default router;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const batchRouter = require("./routes/batch").default;
  if (batchRouter) {
    app.use("/api/batch", batchRouter);
    console.log("Mounted /api/batch (batch payroll routes)");
  }
} catch (err) {
  console.warn(
    "Batch payroll routes not mounted: ./routes/batch not found. Create backend/src/routes/batch.ts to enable week-3 endpoints."
  );
}

// Optional: inform about important week-3 env variables (non-blocking)
const requiredForWeek3 = [
  { key: "CFO_ADDRESS", desc: "CFO signing address (off-chain approvals)" },
  { key: "TREASURY_AZTEC_ID", desc: "Aztec id for protocol treasury (fee receiver)" },
  { key: "COMPANY_VAULT_ID", desc: "Company vault Aztec id (payments source)" },
  { key: "ANCHOR_CONTRACT_ADDRESS", desc: "PayrollAnchor contract address (for on-chain anchoring)" },
];
requiredForWeek3.forEach((e) => {
  if (!process.env[e.key]) {
    console.warn(`Week-3 WARNING: env ${e.key} not set (${e.desc}). Set it in backend/.env to enable full functionality.`);
  }
});

// health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// graceful shutdown handlers (helpful during dev and for production)
function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down server...`);
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

app.listen(port, () => {
  console.log(`zkPayroll backend listening on port ${port}`);
});