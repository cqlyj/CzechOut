const WebSocket = require("ws");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createGetChannelsMessage,
  createAppSessionMessage,
  createCloseAppSessionMessage,
} = require("@erc7824/nitrolite");

dotenv.config({ path: "../../.env" });

// Configuration constants
const USDC_TOKEN = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"; // Polygon USDC token address
const CZECHOUT_SCOPE = "app.czechout";
const CZECHOUT_APP_NAME = "CzechOut";
const WEBSOCKET_URL = "wss://clearnet.yellow.com/ws";

const getAuthDomain = () => ({ name: "CzechOut" });
const AUTH_TYPES = {
  Policy: [
    { name: "challenge", type: "string" },
    { name: "scope", type: "string" },
    { name: "wallet", type: "address" },
    { name: "application", type: "address" },
    { name: "participant", type: "address" },
    { name: "expire", type: "uint256" },
    { name: "allowances", type: "Allowance[]" },
  ],
  Allowance: [
    { name: "asset", type: "string" },
    { name: "amount", type: "uint256" },
  ],
};

/**
 * Main CzechOut transfer function
 * @param {Object} params - Transfer parameters
 * @param {string} params.amount - Amount to transfer (e.g., "0.1")
 * @param {string} params.sender - Sender wallet address
 * @param {string} params.receiver - Receiver wallet address
 * @param {string} params.privateKey - Private key for signing transactions
 * @returns {Promise<Object>} Transfer result
 */
async function czechoutTransfer({ amount, sender, receiver, privateKey }) {
  return new Promise((resolve, reject) => {
    const wallet = new ethers.Wallet(privateKey);
    const expire = String(Math.floor(Date.now() / 1000) + 24 * 60 * 60);

    // Validate that sender matches the wallet address
    if (sender && wallet.address.toLowerCase() !== sender.toLowerCase()) {
      reject(
        new Error(
          `Sender address ${sender} does not match wallet address ${wallet.address}`
        )
      );
      return;
    }

    console.log(
      `🔄 Transferring ${amount} USDC from ${wallet.address} to ${receiver}`
    );

    const ws = new WebSocket(WEBSOCKET_URL);
    let openChannel = null;
    let transferResult = null;

    const extractChallenge = (data) => {
      let challengeUUID = "";
      if (
        Array.isArray(data) &&
        data.length >= 3 &&
        Array.isArray(data[2]) &&
        data[2].length > 0
      ) {
        challengeUUID = data[2][0]?.challenge;
      } else if (typeof data === "string") {
        try {
          const parsed = JSON.parse(data);
          if (
            parsed.res &&
            parsed.res[1] === "auth_challenge" &&
            parsed.res[2]
          ) {
            challengeUUID =
              parsed.res[2].challenge_message || parsed.res[2].challenge;
          }
        } catch (e) {
          challengeUUID = data;
        }
      }
      return challengeUUID;
    };

    const signMessage = async (data) => {
      const challengeUUID = extractChallenge(data);
      if (!challengeUUID) {
        const messageStr =
          typeof data === "string" ? data : JSON.stringify(data);
        const digestHex = ethers.id(messageStr);
        const messageBytes = ethers.getBytes(digestHex);
        const { serialized: signature } = wallet.signingKey.sign(messageBytes);
        return signature;
      }

      const message = {
        challenge: challengeUUID,
        scope: CZECHOUT_SCOPE,
        wallet: wallet.address,
        application: wallet.address,
        participant: wallet.address,
        expire: expire,
        allowances: [],
      };

      const signature = await wallet.signTypedData(
        getAuthDomain(),
        AUTH_TYPES,
        message
      );
      return signature;
    };

    const messageSigner = (payload) => {
      const message = JSON.stringify(payload);
      const digestHex = ethers.id(message);
      const messageBytes = ethers.getBytes(digestHex);
      const { serialized: signature } = wallet.signingKey.sign(messageBytes);
      return signature;
    };

    // Set up timeout
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Transfer timeout - operation took too long"));
    }, 60000); // 60 second timeout

    ws.onopen = async () => {
      console.log("✅ Connected to ClearNode");

      try {
        const authRequestMsg = await createAuthRequestMessage({
          wallet: wallet.address,
          participant: wallet.address,
          app_name: CZECHOUT_APP_NAME,
          expire: expire,
          scope: CZECHOUT_SCOPE,
          application: wallet.address,
          allowances: [],
        });

        ws.send(authRequestMsg);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(
          "📨 Received WebSocket message:",
          message.res ? message.res[1] : "unknown",
          JSON.stringify(message, null, 2)
        );

        if (message.res && message.res[1] === "auth_challenge") {
          const authVerifyMsg = await createAuthVerifyMessage(
            signMessage,
            event.data
          );
          ws.send(authVerifyMsg);
        } else if (message.res && message.res[1] === "auth_verify") {
          console.log("🔐 CzechOut authentication successful");
          const channelsMsg = await createGetChannelsMessage(
            messageSigner,
            wallet.address
          );
          ws.send(channelsMsg);
        } else if (message.res && message.res[1] === "get_channels") {
          const channelsData = message.res[2];
          const channels = channelsData[0];

          console.log(
            "🔍 Available channels:",
            JSON.stringify(channels, null, 2)
          );

          openChannel = channels.find(
            (channel) =>
              channel.status === "open" &&
              channel.token === USDC_TOKEN &&
              channel.amount > 0
          );

          if (!openChannel) {
            console.log("❌ No suitable channels found. Looking for:");
            console.log(`   - Status: open`);
            console.log(`   - Token: ${USDC_TOKEN}`);
            console.log(`   - Amount: > 0`);
            console.log(
              "🔍 Available channels:",
              channels.map((ch) => ({
                status: ch.status,
                token: ch.token,
                amount: ch.amount,
              }))
            );

            clearTimeout(timeout);
            ws.close();
            reject(new Error("No open USDC channel found"));
            return;
          }

          console.log("📊 Found open USDC channel:");
          console.log(`💰 Available: ${openChannel.amount / 1000000} USDC`);
          console.log(`👤 Sender: ${wallet.address}`);
          console.log(`👥 Receiver: ${receiver}`);

          // Create CzechOut app session
          const appDefinition = {
            protocol: "czechout_usdc_transfer_v1",
            participants: [wallet.address, receiver],
            weights: [100, 0],
            quorum: 100,
            challenge: 0,
            nonce: Date.now(),
          };

          const sessionData = [
            {
              definition: appDefinition,
              allocations: [
                {
                  participant: wallet.address,
                  asset: "usdc",
                  amount: amount,
                },
                {
                  participant: receiver,
                  asset: "usdc",
                  amount: "0",
                },
              ],
            },
          ];

          console.log("🎯 CzechOut App Definition:");
          console.log(JSON.stringify(appDefinition, null, 2));
          console.log("🎯 Session Data:");
          console.log(JSON.stringify(sessionData, null, 2));

          const appSessionMsg = await createAppSessionMessage(
            messageSigner,
            sessionData
          );
          ws.send(appSessionMsg);
        } else if (message.res && message.res[1] === "create_app_session") {
          const session = message.res[2][0];
          console.log("🚀 CzechOut app session created successfully!");
          console.log(`📱 App ID: ${session.app_session_id}`);

          const closeData = [
            {
              app_session_id: session.app_session_id,
              allocations: [
                {
                  participant: wallet.address,
                  asset: "usdc",
                  amount: "0",
                },
                {
                  participant: receiver,
                  asset: "usdc",
                  amount: amount,
                },
              ],
            },
          ];

          console.log(`💸 Executing USDC transfer (${amount} USDC)...`);
          console.log("🔍 Close data:", JSON.stringify(closeData, null, 2));
          const closeMsg = await createCloseAppSessionMessage(
            messageSigner,
            closeData
          );
          ws.send(closeMsg);
        } else if (message.res && message.res[1] === "close_app_session") {
          const result = message.res[2][0];
          console.log("✅ CzechOut USDC Transfer COMPLETED!");
          console.log(
            "🔍 Raw result from close_app_session:",
            JSON.stringify(result, null, 2)
          );

          // Check if allocations exist in the result
          if (!result || !result.allocations) {
            console.error("❌ Error: No allocations found in result");
            console.log("📋 Full result structure:", result);
            clearTimeout(timeout);
            ws.close();
            reject(
              new Error(
                "Transfer completed but allocations data is missing from response"
              )
            );
            return;
          }

          console.log("📊 Final CzechOut allocations:");

          const allocations = result.allocations.map((alloc) => {
            const amount = parseInt(alloc.amount);
            const usdcAmount = amount / 1000000;
            const isRecipient = alloc.participant === receiver;
            const label = isRecipient ? "👥 Recipient" : "👤 Sender";
            console.log(`   ${label}: ${amount} units (${usdcAmount} USDC)`);
            return {
              participant: alloc.participant,
              role: isRecipient ? "recipient" : "sender",
              amount: amount,
              usdcAmount: usdcAmount,
            };
          });

          transferResult = {
            success: true,
            appSessionId: result.app_session_id || "unknown",
            allocations: allocations,
            transferAmount: amount,
            sender: wallet.address,
            receiver: receiver,
            timestamp: new Date().toISOString(),
            rawResult: result, // Include raw result for debugging
          };

          clearTimeout(timeout);
          ws.close();
          resolve(transferResult);
        } else if (message.res && message.res[1] === "error") {
          const errorMsg = message.res[2][0].error;
          console.error("❌ CzechOut Error:", errorMsg);

          clearTimeout(timeout);
          ws.close();
          reject(new Error(`CzechOut transfer failed: ${errorMsg}`));
        } else {
          console.log("📄 Other message type:", message.res[1]);
        }
      } catch (error) {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error("🔥 CzechOut WebSocket error:", error);
      reject(new Error(`WebSocket error: ${error.message}`));
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      console.log("🔌 CzechOut session completed");
      if (!transferResult) {
        reject(new Error("Connection closed without completing transfer"));
      }
    };
  });
}

module.exports = {
  czechoutTransfer,
};
