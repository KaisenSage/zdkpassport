// Mock adapter for Aztec private transfers (for local testing).
// Replace with actual Aztec SDK integration (createTransferProof/sendProof) in production.
export async function createPrivateTransfer(from: string, to: string, amount: number) {
  return { ok: true, txHash: `mock-${Math.random().toString(36).slice(2,9)}` };
}