const fetch = require("node-fetch");

const API_BASE_URL = "http://localhost:3001";

async function testHealthCheck() {
  console.log("🔍 Testing health check...");

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    if (response.ok) {
      console.log("✅ Health check passed:", data);
      return true;
    } else {
      console.log("❌ Health check failed:", data);
      return false;
    }
  } catch (error) {
    console.log("❌ Health check error:", error.message);
    return false;
  }
}

async function testTransfer() {
  console.log("\n💸 Testing USDC transfer...");

  const transferData = {
    amount: "0.0001", // Small amount for testing
    receiver: "0x120C1fc5B7f357c0254cDC8027970DDD6405e115",
    // Note: sender and privateKey should be set via environment variables
    // or you can add them here for testing:
    // sender: "0x...",
    // privateKey: "0x..."
  };

  try {
    console.log("📤 Sending transfer request:", transferData);

    const response = await fetch(`${API_BASE_URL}/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transferData),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Transfer successful!");
      console.log("📊 Transfer result:", JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log("❌ Transfer failed:", data);
      return false;
    }
  } catch (error) {
    console.log("❌ Transfer error:", error.message);
    return false;
  }
}

async function testInvalidRequest() {
  console.log("\n🧪 Testing invalid request (no amount)...");

  try {
    const response = await fetch(`${API_BASE_URL}/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiver: "0x120C1fc5B7f357c0254cDC8027970DDD6405e115",
        // Missing amount - should trigger validation error
      }),
    });

    const data = await response.json();

    if (!response.ok && data.error) {
      console.log("✅ Validation working correctly:", data.error);
      return true;
    } else {
      console.log("❌ Validation failed - should have rejected request");
      return false;
    }
  } catch (error) {
    console.log("❌ Test error:", error.message);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting CzechOut API Tests\n");
  console.log("Make sure the API server is running with: npm start\n");

  const results = [];

  // Test 1: Health check
  results.push(await testHealthCheck());

  // Test 2: Invalid request validation
  results.push(await testInvalidRequest());

  // Test 3: Transfer (will only work if environment is properly configured)
  console.log("\n⚠️  Note: The transfer test will only work if you have:");
  console.log("   - WALLET_PRIVATE_KEY set in .env");
  console.log("   - Sufficient USDC balance in your wallet");
  console.log("   - An open state channel\n");

  const shouldTestTransfer = process.argv.includes("--with-transfer");

  if (shouldTestTransfer) {
    results.push(await testTransfer());
  } else {
    console.log(
      "⏭️  Skipping transfer test. Use --with-transfer flag to test actual transfers."
    );
    results.push(true); // Skip this test
  }

  // Summary
  console.log("\n📋 Test Summary:");
  console.log(`✅ Passed: ${results.filter((r) => r).length}`);
  console.log(`❌ Failed: ${results.filter((r) => !r).length}`);
  console.log(`📊 Total:  ${results.length}`);

  if (results.every((r) => r)) {
    console.log("\n🎉 All tests passed!");
    process.exit(0);
  } else {
    console.log("\n💥 Some tests failed.");
    process.exit(1);
  }
}

// Check if fetch is available (for Node.js < 18)
if (typeof fetch === "undefined") {
  console.log(
    "❌ This test requires node-fetch. Install it with: npm install node-fetch"
  );
  process.exit(1);
}

// Run tests
runTests().catch((error) => {
  console.error("💥 Test runner error:", error);
  process.exit(1);
});
