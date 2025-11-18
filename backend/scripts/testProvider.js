import dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";

(async () => {
  try {
    const rpc = process.env.RPC_URL || "https://sepolia.infura.io/v3/YOUR_PROJECT_ID";
    const provider = new ethers.JsonRpcProvider(rpc);

    const addr = process.env.ANCHOR_WALLET_ADDRESS;
    console.log("RPC:", rpc);
    console.log("Anchor address:", addr || "(none set)");

    if (addr) {
      const bal = await provider.getBalance(addr);
      console.log("Balance (ETH):", ethers.formatEther(bal));
    } else {
      console.log("No ANCHOR_WALLET_ADDRESS set in env.");
    }

    const contractAddr = process.env.ANCHOR_CONTRACT_ADDRESS;
    if (contractAddr) {
      const code = await provider.getCode(contractAddr);
      console.log("Contract code at ANCHOR_CONTRACT_ADDRESS (0x prefix ok):", code === "0x" ? "no contract" : "contract exists");
    } else {
      console.log("No ANCHOR_CONTRACT_ADDRESS set in env.");
    }
  } catch (err) {
    console.error("Provider test failed:", err);
    process.exit(1);
  }
})();