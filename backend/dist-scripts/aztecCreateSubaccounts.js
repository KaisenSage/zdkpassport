"use strict";
// Pseudocode – adapt to your Aztec SDK.
// This script demonstrates creating a sub-account and printing its id/public key.
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore: aztec-sdk may not be installed locally, replace with real SDK import or add types
const aztec_sdk_1 = require("aztec-sdk"); // replace with your SDK import
const dotenv_1 = require("dotenv");
dotenv_1.default.config();
async function run() {
    const sdk = await aztec_sdk_1.AztecSDK.create({ /* provider/wallet config */});
    // Example: create a stealth/sub-account under company vault
    const companyVaultId = process.env.COMPANY_VAULT_ID; // if you already have it
    // If creating a new vault/account:
    // const newAccount = await sdk.createAccount({ ownerPublicKey: '0x...', meta: { kind: 'vault' }});
    // console.log('new account id', newAccount.accountId);
    // To create a sub-account for treasury or employee:
    const subAccount = await sdk.createSubAccount({ parentAccountId: companyVaultId, label: 'treasury' });
    console.log("subAccountId:", subAccount.accountId);
    console.log("subAccountPubKey:", subAccount.pubkey);
}
// Run
run().catch((err) => { console.error(err); process.exit(1); });
