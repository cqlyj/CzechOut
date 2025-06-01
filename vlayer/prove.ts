import fs from "fs";
import { preverifyEmail } from "@vlayer/sdk";
// .. Import prover contract ABI

// Read the email MIME-encoded file content
const email = fs.readFileSync("email.eml").toString();

// Prepare the email for verification
const unverifiedEmail = await preverifyEmail(email);

// Create vlayer server client
const vlayer = createVlayerClient();

const hash = await vlayer.prove({
  address: prover,
  proverAbi: emailProofProver.abi,
  functionName: "main",
  args: [unverifiedEmail],
  chainId: foundry,
});
const result = await vlayer.waitForProvingResult({ hash });
