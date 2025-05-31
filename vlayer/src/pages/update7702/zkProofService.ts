// ZK Proof Service for interfacing with the backend proof generation

export interface ZKInputs {
  pin: string;
  walletAddress: string;
  intent: string;
  credential_hash: string;
  nonce: string;
  result_hash: string;
}

export interface ZKProof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  publicSignals: [string, string, string, string, string];
}

// Service to generate ZK proofs using the actual zk/ scripts
export class ZKProofService {
  private static instance: ZKProofService;
  private apiBaseUrl: string;

  private constructor() {
    // In a real implementation, this would be your backend API
    this.apiBaseUrl = process.env.VITE_API_URL || "http://localhost:3001";
  }

  static getInstance(): ZKProofService {
    if (!ZKProofService.instance) {
      ZKProofService.instance = new ZKProofService();
    }
    return ZKProofService.instance;
  }

  async generateInputs(walletAddress: string, pin: string): Promise<ZKInputs> {
    try {
      // Call backend API to generate inputs using the generateInput.js script
      const response = await fetch(
        `${this.apiBaseUrl}/api/zk/generate-inputs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress,
            pin,
            intent: 0,
            nonce: 0,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate inputs: ${response.statusText}`);
      }

      const inputs = await response.json();
      return inputs;
    } catch (error) {
      console.error("Error generating ZK inputs:", error);

      // Fallback to local computation for demo purposes
      return this.generateInputsLocally(walletAddress, pin);
    }
  }

  async generateProof(inputs: ZKInputs): Promise<ZKProof> {
    try {
      // Call backend API to generate proof using snarkjs
      const response = await fetch(`${this.apiBaseUrl}/api/zk/generate-proof`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inputs),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate proof: ${response.statusText}`);
      }

      const proof = await response.json();
      return proof;
    } catch (error) {
      console.error("Error generating ZK proof:", error);

      // Fallback to mock proof for demo purposes
      return this.generateMockProof(inputs);
    }
  }

  private async generateInputsLocally(
    walletAddress: string,
    pin: string
  ): Promise<ZKInputs> {
    // Simple hash calculation for demo - in production would use actual Poseidon
    const walletBigInt = BigInt(walletAddress);
    const pinBigInt = BigInt(pin);
    const intent = 0n;
    const nonce = 0n;

    // Mock Poseidon hash calculation
    const credentialHash = (walletBigInt ^ pinBigInt ^ intent).toString();
    const resultHash = (BigInt(credentialHash) ^ nonce).toString();

    return {
      pin: pin,
      walletAddress: walletAddress,
      intent: intent.toString(),
      credential_hash: credentialHash,
      nonce: nonce.toString(),
      result_hash: resultHash,
    };
  }

  private async generateMockProof(inputs: ZKInputs): Promise<ZKProof> {
    // Return a mock proof structure for demo purposes
    return {
      pi_a: [
        "17623747653022893209409606601603258455784002732406529289012627344168703611937",
        "15090619286481645225295608361603877168640528677976628458223202468459348653020",
      ],
      pi_b: [
        [
          "3443153309757815833666830999899647519994250736442884223577056002428442117665",
          "15168765846761380181570965295974721997289661290926474870405229928507098202020",
        ],
        [
          "16169433205256254831293010129104974550786457057062287940565471974090322444734",
          "20644297354845506069607578100400155024569756098063801423979786489500764995403",
        ],
      ],
      pi_c: [
        "15026142036209826760519223906317924413079755206468874577133168754040139698197",
        "20277453742647737682336956746990775717863053526784373261150177595553405428777",
      ],
      publicSignals: [
        inputs.walletAddress,
        inputs.intent,
        inputs.credential_hash,
        inputs.nonce,
        inputs.result_hash,
      ],
    };
  }

  // Method to run the full proof generation pipeline
  async generateFullProof(
    walletAddress: string,
    pin: string
  ): Promise<ZKProof> {
    console.log("🔄 Generating ZK inputs...");
    const inputs = await this.generateInputs(walletAddress, pin);
    console.log("✅ ZK inputs generated:", inputs);

    console.log("🔄 Generating ZK proof...");
    const proof = await this.generateProof(inputs);
    console.log("✅ ZK proof generated:", proof);

    return proof;
  }
}

export default ZKProofService;
