const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");

const execAsync = util.promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API endpoint to generate ZK inputs
app.post("/api/zk/generate-inputs", async (req, res) => {
  try {
    const { walletAddress, pin, intent = 0, nonce = 0 } = req.body;

    if (!walletAddress || !pin) {
      return res.status(400).json({
        error: "Missing required parameters: walletAddress and pin",
      });
    }

    console.log("🔄 Generating ZK inputs...");
    console.log("Wallet:", walletAddress);
    console.log("PIN:", pin);

    // Create a temporary version of generateInput.js with the user's data
    const generateInputScript = `
const fs = require("fs");
const circomlib = require("circomlibjs");

async function main() {
  const poseidon = await circomlib.buildPoseidon();
  const F = poseidon.F;

  // Inputs from API request
  const walletAddressHex = "${walletAddress}";
  const pin = ${pin};
  const intent = ${intent};
  const nonce = ${nonce};

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

  // Return the input instead of writing to file
  console.log(JSON.stringify(input));
}

main().catch((err) => console.error(err));
`;

    // Write temporary script
    const tempScriptPath = path.join(
      __dirname,
      "../zk/inputs/tempGenerateInput.js"
    );
    fs.writeFileSync(tempScriptPath, generateInputScript);

    // Execute the script
    const { stdout, stderr } = await execAsync(`node ${tempScriptPath}`);

    if (stderr) {
      console.error("Script error:", stderr);
      throw new Error(stderr);
    }

    // Parse the output
    const inputs = JSON.parse(stdout.trim());

    // Clean up temp file
    fs.unlinkSync(tempScriptPath);

    console.log("✅ ZK inputs generated successfully");
    res.json(inputs);
  } catch (error) {
    console.error("❌ Error generating ZK inputs:", error);
    res.status(500).json({
      error: "Failed to generate ZK inputs",
      details: error.message,
    });
  }
});

// API endpoint to generate ZK proof
app.post("/api/zk/generate-proof", async (req, res) => {
  try {
    const inputs = req.body;

    if (!inputs || !inputs.pin || !inputs.walletAddress) {
      return res.status(400).json({
        error: "Missing required input parameters",
      });
    }

    console.log("🔄 Generating ZK proof...");

    // Write inputs to temporary file
    const tempInputPath = path.join(__dirname, "../zk/inputs/temp_input.json");
    fs.writeFileSync(tempInputPath, JSON.stringify(inputs, null, 2));

    // Step 1: Generate witness
    console.log("📊 Generating witness...");
    const witnessPath = path.join(__dirname, "../zk/outputs/temp_witness.wtns");
    await execAsync(
      `node ../zk/outputs/pinVerification_js/generate_witness.js ../zk/outputs/pinVerification_js/pinVerification.wasm ${tempInputPath} ${witnessPath}`,
      {
        cwd: __dirname,
      }
    );

    // Step 2: Generate proof
    console.log("🔐 Generating proof...");
    const proofPath = path.join(__dirname, "../zk/proofs/temp_proof.json");
    const publicPath = path.join(__dirname, "../zk/proofs/temp_public.json");

    await execAsync(
      `snarkjs groth16 prove ../zk/outputs/pinVerification.zkey ${witnessPath} ${proofPath} ${publicPath}`,
      {
        cwd: __dirname,
      }
    );

    // Read the generated proof and public signals
    const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
    const publicSignals = JSON.parse(fs.readFileSync(publicPath, "utf8"));

    // Format the response
    const response = {
      pi_a: [proof.pi_a[0], proof.pi_a[1]],
      pi_b: [
        [proof.pi_b[0][1], proof.pi_b[0][0]], // Note: snarkjs returns in reverse order
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      pi_c: [proof.pi_c[0], proof.pi_c[1]],
      publicSignals: publicSignals,
    };

    // Clean up temporary files
    fs.unlinkSync(tempInputPath);
    fs.unlinkSync(witnessPath);
    fs.unlinkSync(proofPath);
    fs.unlinkSync(publicPath);

    console.log("✅ ZK proof generated successfully");
    res.json(response);
  } catch (error) {
    console.error("❌ Error generating ZK proof:", error);
    res.status(500).json({
      error: "Failed to generate ZK proof",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "ZK Proof Server is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 ZK Proof Server running on port ${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   POST /api/zk/generate-inputs`);
  console.log(`   POST /api/zk/generate-proof`);
  console.log(`   GET  /api/health`);
});

module.exports = app;
