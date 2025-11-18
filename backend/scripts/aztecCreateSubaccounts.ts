// Example script that uses the mock Aztec adapter's create() factory.
// Run: npx tsx scripts/aztecCreateSubaccounts.ts

import AztecSDK from "./mockAztecAdapter.js"; // point to mock adapter during local dev
import dotenv from "dotenv";
dotenv.config();

async function run() {
  // create returns an sdk-like instance in the mock adapter
  const sdk = await AztecSDK.create({ /* provider/wallet config if needed */ });

  // Example: create a company vault (if you need one)
  const companyVault = await sdk.createCompanyVault({ name: "My Company Vault" });
  console.log("companyVault:", companyVault.accountId, companyVault.pubkey);

  // create a sub-account under company vault
  const subAccount = await sdk.createSubAccount({ parentAccountId: companyVault.accountId, label: "treasury" });
  console.log("subAccountId:", subAccount.accountId);
  console.log("subAccountPubKey:", subAccount.pubkey);
}

run().catch((err) => {
  console.error("Error creating subaccounts:", err);
  process.exit(1);
});