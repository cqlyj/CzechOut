const fs = require("fs");
const circomlib = require("circomlibjs");

async function main() {
  const poseidon = await circomlib.buildPoseidon();
  const F = poseidon.F;

  // Inputs
  // @TODO: dynamically get those information later
  const walletAddressHex = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const pin = 123456;
  const intent = 0;
  const nonce = 0;

  // Convert wallet address to BigInt field element
  const walletAddress = BigInt(walletAddressHex);

  // Step 1: Compute credential_hash = Poseidon(walletAddress, pin, intent)
  const credentialHash = poseidon([walletAddress, pin, intent]);
  const credentialHashStr = F.toString(credentialHash);

  // Step 2: Compute result_hash = Poseidon(credential_hash, nonce)
  const resultHash = poseidon([credentialHash, nonce]);
  const resultHashStr = F.toString(resultHash);

  // Prepare input object
  const input = {
    pin: pin.toString(),
    walletAddress: walletAddress.toString(),
    intent: intent.toString(),
    credential_hash: credentialHashStr,
    nonce: nonce.toString(),
    result_hash: resultHashStr,
  };

  // Write to input.json
  fs.writeFileSync("zk/inputs/input.json", JSON.stringify(input, null, 2));
  console.log("✅ input.json generated successfully.");
}

main().catch((err) => console.error(err));
