// Simple ESM mock adapter for Aztec SDK used for local development/testing.
// Usage: import AztecSDK from "./mockAztecAdapter.js";
// The adapter exports a `create` factory (async) that returns an SDK-like instance.

function randomId(prefix = "aztec-") {
  return prefix + Math.random().toString(36).slice(2, 12);
}

const impl = {
  async createCompanyVault({ name } = {}) {
    return {
      accountId: randomId("vault-"),
      pubkey:
        "0x" +
        Array.from({ length: 32 })
          .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"))
          .join(""),
      metadata: { name: name || "company_vault" },
    };
  },

  async createSubAccount({ parentAccountId, label } = {}) {
    return {
      accountId: randomId("sub-"),
      pubkey:
        "0x" +
        Array.from({ length: 32 })
          .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"))
          .join(""),
      parentAccountId,
      label,
    };
  },

  async getAccount(accountId) {
    return {
      accountId,
      pubkey:
        "0x" +
        Array.from({ length: 32 })
          .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"))
          .join(""),
      balance: 0,
    };
  },

  // helper used by scripts that expect a create method
  generateFakeAztecId() {
    return randomId("aztec-");
  },
};

// Provide a create factory so scripts that call AztecSDK.create(...) work
const adapter = {
  // factory to mimic real SDK's `.create(...)` behavior
  async create(config = {}) {
    // You can use config to customize returned instance in tests.
    // For local mock, we simply return an object exposing the same methods as impl.
    return {
      createCompanyVault: impl.createCompanyVault,
      createSubAccount: impl.createSubAccount,
      getAccount: impl.getAccount,
      // convenience aliases (some scripts expect different names)
      createAccount: impl.createCompanyVault,
      createSubaccount: impl.createSubAccount,
      // expose the raw impl as well for direct calls if needed
      __impl: impl,
    };
  },

  // also expose the functions directly on default export (optional)
  ...impl,
};

export default adapter;