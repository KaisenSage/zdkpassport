// Usage: ts-node backend/scripts/verifyApprovalSignature.ts "<message>" "<signature>"
import dotenv from "dotenv";
import { verifyMessage } from "ethers";
dotenv.config();

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: ts-node backend/scripts/verifyApprovalSignature.ts "<message>" "<signature>"');
  process.exit(1);
}
const [message, signature] = args;
try {
  const recovered = verifyMessage(message, signature);
  console.log("Recovered address:", recovered);
  console.log("Configured CFO_ADDRESS:", process.env.CFO_ADDRESS || "(not set)");
  console.log("Matches:", (process.env.CFO_ADDRESS || "").toLowerCase() === recovered.toLowerCase());
} catch (err) {
  console.error("verify failed:", err);
}