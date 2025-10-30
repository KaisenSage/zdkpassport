import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import verificationRouter from "./routes/verification";
import hrRouter from "./routes/hr";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(helmet());
app.use(cors({ origin: true })); // tighten origin in production
app.use(express.json({ limit: "1mb" }));

// Routes
app.use("/api/verify", verificationRouter);
app.use("/api/hr", hrRouter);

// health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(port, () => {
  console.log(`zkPayroll backend listening on port ${port}`);
});