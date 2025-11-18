import dotenv from "dotenv";
dotenv.config();

import fs from "fs/promises";
import path from "path";
import { ethers } from "ethers";

async function main() {
  const rpc = process.env.RPC_URL || "http://127.0.0.1:8545";
  const pk = process.env.ANCHOR_WALLET_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("ANCHOR_WALLET_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY not set in .env");

  // Path to compiled artifact created by Hardhat
  const artifactPath = path.resolve("artifacts/contracts/Anchor.sol/Anchor.json");
  let artifact;
  try {
    artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  } catch (err) {
    throw new Error(`Cannot read artifact at ${artifactPath}. Run 'npx hardhat compile' first.`);
  }

  // ethers v6 provider/signer
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("Deploying Anchor contract using address", wallet.address);

  // Deploy
  const contract = await factory.deploy();

  // Try to get a transaction hash in a way that works across ethers versions
  let txHash;
  try {
    // ethers v6: deploymentTransaction is a method that may return the tx response
    if (typeof contract.deploymentTransaction === "function") {
      const txResp = contract.deploymentTransaction();
      txHash = txResp?.hash;
    }
  } catch (e) {
    // ignore
  }

  // Fallback: some environments may provide deployTransaction
  if (!txHash && contract.deployTransaction && contract.deployTransaction.hash) {
    txHash = contract.deployTransaction.hash;
  }

  if (txHash) {
    console.log("Transaction sent:", txHash);
  } else {
    console.log("Transaction hash not available immediately; waiting for deployment...");
  }

  // Wait for deployment to be mined (ethers v6)
  await contract.waitForDeployment();

  // Contract address (ethers v6 exposes 'target' or 'address')
  const deployedAddress = contract.target ?? contract.address;
  console.log("Anchor deployed to:", deployedAddress);
  console.log("Set ANCHOR_CONTRACT_ADDRESS in your .env to this value.");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});