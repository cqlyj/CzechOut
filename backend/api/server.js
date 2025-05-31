const express = require("express");
const cors = require("cors");
const { czechoutTransfer } = require("./czechout-api");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Default sender and receiver addresses - can be configured
const DEFAULT_SENDER =
  process.env.DEFAULT_SENDER || "0xFB6a372F2F51a002b390D18693075157A459641F";
const DEFAULT_RECEIVER =
  process.env.DEFAULT_RECEIVER || "0x120C1fc5B7f357c0254cDC8027970DDD6405e115";

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "CzechOut API is running" });
});

// Transfer endpoint
app.post("/transfer", async (req, res) => {
  try {
    const {
      amount,
      sender = DEFAULT_SENDER,
      receiver = DEFAULT_RECEIVER,
      privateKey,
    } = req.body;

    // Validation
    if (!amount) {
      return res.status(400).json({
        error: "Amount is required",
        example: {
          amount: "0.1",
          sender: "0x...",
          receiver: "0x...",
          privateKey: "0x...",
        },
      });
    }

    if (!privateKey && !process.env.WALLET_PRIVATE_KEY) {
      return res.status(400).json({
        error:
          "Private key is required (either in request body or environment variable WALLET_PRIVATE_KEY)",
      });
    }

    if (!sender && !DEFAULT_SENDER) {
      return res.status(400).json({
        error: "Sender address is required",
      });
    }

    console.log(
      `🚀 Starting CzechOut transfer: ${amount} USDC from ${sender} to ${receiver}`
    );

    // Call the transfer function
    const result = await czechoutTransfer({
      amount: amount.toString(),
      sender,
      receiver,
      privateKey: privateKey || process.env.WALLET_PRIVATE_KEY,
    });

    res.json({
      success: true,
      message: "Transfer completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Get transfer status endpoint (placeholder for future enhancement)
app.get("/transfer/:transactionId", (req, res) => {
  res.json({
    message: "Transfer status endpoint - coming soon",
    transactionId: req.params.transactionId,
  });
});

app.listen(PORT, () => {
  console.log(`🌟 CzechOut API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💸 Transfer endpoint: http://localhost:${PORT}/transfer`);
  console.log(`🔗 Default receiver: ${DEFAULT_RECEIVER}`);
});
