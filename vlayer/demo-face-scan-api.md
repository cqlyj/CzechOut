# vlayer Server-Side Web Proof for Face Scanning Demo

This document demonstrates how to implement vlayer's server-side web proof verification for face scanning and gesture recognition in PIN recovery.

## Overview

Based on vlayer's documentation, server-side web proofs are ideal for proving data from public or token-authenticated APIs without requiring a browser extension. In our case, we would use this to verify face scan results from a biometric API.

## Real Implementation Flow

### 1. Face Scanning API Setup

```javascript
// Example localhost:3000/settings.json response
{
  "result": ["true"],
  "user_id": "0x1234567890123456789012345678901234567890",
  "verification_score": 0.95,
  "gestures_verified": ["nod", "smile"],
  "timestamp": 1640995200000,
  "session_id": "face-scan-123456"
}
```

### 2. vlayer CLI Command

```bash
# Generate web proof from face scan API
vlayer web-proof-fetch \
  --url "https://localhost:3000/settings.json" \
  --notary "https://test-notary.vlayer.xyz/" \
  --headers "Authorization: Bearer YOUR_API_TOKEN"
```

### 3. WebProofProver Contract Processing

```solidity
// WebProofProver.sol extracts the face scan result
function main(
    WebProof calldata webProof,
    address account
) public view returns (Proof memory, string memory, address) {
    Web memory web = webProof.verify("https://localhost:3000/settings.json");

    // Extract face scan result from JSON
    string memory matchOrNot = web.jsonGetString("result[0]");

    return (proof(), matchOrNot, account);
}
```

### 4. WebProofVerifier Contract Verification

```solidity
// WebProofVerifier.sol verifies the proof and sets face verification
function verify(
    Proof calldata,
    string memory matchOrNot,
    address account
) public onlyVerified(prover, WebProofProver.main.selector) {
    if (keccak256(abi.encodePacked(matchOrNot)) == keccak256(abi.encodePacked("true"))) {
        walletToFaceVerified[account] = true;
    }
}
```

## Current Simulation Implementation

Since we don't have a real face scanning API, our current implementation simulates the entire flow:

### Simulated Steps

1. **Face Scanning** (2s) - Simulates camera capturing face data
2. **Gesture Processing** (2s) - Simulates analyzing gestures (nod, smile, etc.)
3. **Web Proof Generation** (2s) - Simulates vlayer CLI generating cryptographic proof
4. **On-Chain Verification** - Calls `setFaceVerified(address, true)` directly

### Benefits of Simulation

- **User Experience**: Shows realistic biometric verification flow
- **Contract Integration**: Tests actual smart contract interactions
- **Development**: Allows testing without external API dependencies
- **Demonstration**: Shows vlayer's capabilities for biometric 2FA

## Security Considerations

### vlayer Web Proof Security

- **TLS Notary**: vlayer's notary service validates HTTPS session integrity
- **Zero-Knowledge**: Biometric data never exposed, only verification result
- **Cryptographic Proof**: Tamper-proof evidence of API response
- **Privacy-Preserving**: No biometric data stored on blockchain

### Trust Assumptions

- **Notary Trust**: vlayer's notary service must be trusted (roadmap for decentralization)
- **API Integrity**: Face scanning API must provide reliable verification
- **Contract Security**: WebProofVerifier contract controls who can verify

## Production Deployment

### Prerequisites

```bash
# Install vlayer CLI
npm install -g @vlayer/cli

# Set up environment variables
export VITE_VLAYER_API_TOKEN="your_vlayer_token"
export VITE_NOTARY_URL="https://test-notary.vlayer.xyz/"
```

### Real Face Scanning API Integration

```typescript
// Real implementation would integrate with services like:
// - AWS Rekognition
// - Microsoft Face API
// - Google Cloud Vision
// - Custom ML model with camera feed

const generateFaceScanProof = async (walletAddress: string) => {
  // 1. Start camera feed for face scanning
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });

  // 2. Capture face scan and gestures
  const faceData = await captureFaceVerification(stream);

  // 3. Submit to face scanning API
  const apiResponse = await fetch("https://localhost:3000/face-verify", {
    method: "POST",
    body: JSON.stringify({
      faceData,
      walletAddress,
      gestures: ["nod", "smile"],
    }),
  });

  // 4. Generate vlayer web proof from API response
  const webProof = await vlayerWebProofFetch({
    url: "https://localhost:3000/settings.json",
    notaryUrl: "https://test-notary.vlayer.xyz/",
  });

  // 5. Submit proof to WebProofProver
  return await callProver([webProof, walletAddress]);
};
```

### Contract Deployment

```bash
# Deploy contracts with proper addresses
forge script script/DeployWebProof.s.sol --broadcast --rpc-url $RPC_URL
```

## Testing

### Unit Tests

```solidity
// test/WebProofVerification.t.sol
function testFaceVerificationSuccess() public {
    // Test successful face scan verification
    string memory result = "true";
    webProofVerifier.verify(mockProof, result, testAddress);
    assertTrue(webProofVerifier.getFaceVerified(testAddress));
}
```

### Integration Tests

```typescript
// Test complete flow with simulated face scanning
describe("Face Scan Web Proof", () => {
  it("should verify face scan through vlayer web proof", async () => {
    await startWebProof();
    await waitForStep("Done!");
    expect(await contract.getFaceVerified(address)).toBe(true);
  });
});
```

This implementation demonstrates vlayer's powerful server-side web proof capabilities for secure, privacy-preserving biometric verification in PIN recovery systems.
