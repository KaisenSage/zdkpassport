import { Wallet } from "ethers";

function main() {
  const w = Wallet.createRandom();
  console.log("RELAYER_PRIVATE_KEY=", w.privateKey);
  console.log("RELAYER_ADDRESS=", w.address);
}

main();