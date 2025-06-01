const WebSocket = require("ws");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createGetChannelsMessage,
  createAppSessionMessage,
  createCloseAppSessionMessage,
  createGetLedgerBalancesMessage,
} = require("@erc7824/nitrolite");
const { signEip712Transaction } = require("viem/zksync");

dotenv.config({ path: "../.env" });

const TRANSFER_AMOUNT = "0.1"; // 0.1 USDC
const USDC_TOKEN = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"; // Polygon USDC token address

const CZECHOUT_SCOPE = "app.czechout";
const CZECHOUT_APP_NAME = "CzechOut";

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

const expire = String(Math.floor(Date.now() / 1000) + 24 * 60 * 60);

async function czechoutTransfer() {
  const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY);

  console.log(`Transferring 0.1 USDC via CzechOut App Session`);

  const ws = new WebSocket("wss://clearnet.yellow.com/ws");
  let openChannel = null;

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
        if (parsed.res && parsed.res[1] === "auth_challenge" && parsed.res[2]) {
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
      const messageStr = typeof data === "string" ? data : JSON.stringify(data);
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

  ws.onopen = async () => {
    console.log("Connected to ClearNode");

    // CzechOut-specific authentication request
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
  };

  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.res && message.res[1] === "auth_challenge") {
        const authVerifyMsg = await createAuthVerifyMessage(
          signMessage,
          event.data
        );
        ws.send(authVerifyMsg);
      } else if (message.res && message.res[1] === "auth_verify") {
        console.log("CzechOut authentication successful");
        const channelsMsg = await createGetChannelsMessage(
          messageSigner,
          wallet.address
        );
        ws.send(channelsMsg);
      } else if (message.res && message.res[1] === "get_channels") {
        const channelsData = message.res[2];
        const channels = channelsData[0];

        openChannel = channels.find(
          (channel) =>
            channel.status === "open" &&
            channel.token === USDC_TOKEN &&
            channel.amount > 0
        );

        if (!openChannel) {
          console.error("No open USDC channel found");
          ws.close();
          return;
        }

        console.log("Found open USDC channel:");
        console.log(`Available: ${openChannel.amount / 1000000} USDC`); // use get leger balance instead
        console.log(`Sender: ${wallet.address}`);
        console.log(`Receiver: 0x8B20E8270a69A96a1030a893aA1be133BFd9b99e`);

        // Create CzechOut app session
        const appDefinition = {
          protocol: "czechout_usdc_transfer_v1",
          participants: [
            wallet.address,
            "0x8B20E8270a69A96a1030a893aA1be133BFd9b99e",
          ],
          weights: [100, 0],
          quorum: 100,
          challenge: 0,
          nonce: Date.now(),
        };
        // Start with you having the amount you want to transfer (conservation principle)
        const sessionData = [
          {
            definition: appDefinition,
            allocations: [
              {
                participant: wallet.address,
                asset: "usdc",
                amount: "0.01", // You start with the amount to transfer (0.1 USDC)
              },
              {
                participant: "0x8B20E8270a69A96a1030a893aA1be133BFd9b99e",
                asset: "usdc",
                amount: "0", // Recipient starts with 0
              },
            ],
          },
        ];

        console.log("CzechOut App Definition:");
        console.log(JSON.stringify(appDefinition, null, 2));

        const appSessionMsg = await createAppSessionMessage(
          messageSigner,
          sessionData
        );
        ws.send(appSessionMsg);
      } else if (message.res && message.res[1] === "create_app_session") {
        const session = message.res[2][0];
        console.log("CzechOut app session created successfully!");
        console.log(`App ID: ${session.app_session_id}`);

        const signedMessage = await createGetLedgerBalancesMessage(
          messageSigner,
          wallet.address
        );
        ws.send(signedMessage);

        // Test closing with small amounts to see if we can transfer funds
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
                participant: "0x8B20E8270a69A96a1030a893aA1be133BFd9b99e",
                asset: "usdc",
                amount: "0.01", // Try to allocate 0.1 USDC to recipient
              },
            ],
          },
        ];

        console.log("USDC transfer (0.1 USDC)...");
        const closeMsg = await createCloseAppSessionMessage(
          messageSigner,
          closeData
        );
        ws.send(closeMsg);
      } else if (message.res && message.res[1] === "close_app_session") {
        const result = message.res[2][0];
        console.log("CzechOut USDC Transfer COMPLETED!");
        console.log("Final CzechOut allocations:");

        result.allocations.forEach((alloc) => {
          const amount = parseInt(alloc.amount);
          const usdcAmount = amount / 1000000;
          const isRecipient = alloc.participant === openChannel.participant;
          const label = isRecipient ? "👥 Recipient" : "👤 You";
          console.log(`   ${label}: ${amount} units (${usdcAmount} USDC)`);
        });

        console.log("\n✅ SUCCESS: CzechOut USDC transfer completed!");
        ws.close();
      } else if (message.res && message.res[1] === "get_ledger_balances") {
        console.log("Received ledger balances", message.res);
        // const balances = message[0].map((balance) => ({
        //   asset: balance.asset,
        //   amount: parseInt(balance.amount) / 1000000, // Convert to USDC
        // }));
      } else if (message.res && message.res[1] === "error") {
        console.error("❌ CzechOut Error:", message.res[2][0].error);

        if (message.res[2][0].error.includes("insufficient funds")) {
          console.log("Insufficient funds");
        }

        ws.close();
      } else {
        console.log("Other message type:", message.res[1]);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  ws.onerror = (error) => console.error("CzechOut WebSocket error:", error);
  ws.onclose = () => console.log("CzechOut session completed");
}

czechoutTransfer().catch(console.error);
