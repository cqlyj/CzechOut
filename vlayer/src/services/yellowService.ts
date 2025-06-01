// Yellow/Nitrolite Service for CzechOut
// Based on backend/czechout-transfer.js implementation

import { ethers } from "ethers";
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createGetChannelsMessage,
  createAppSessionMessage,
  createCloseAppSessionMessage,
  createGetLedgerBalancesMessage,
} from "@erc7824/nitrolite";

interface YellowBalance {
  asset: string;
  amount: number;
  formatted: string; // Human readable amount (e.g., "0.9 USDC")
}

interface YellowChannel {
  status: string;
  token: string;
  amount: number;
  participant: string;
}

export interface OffChainTransaction {
  id: string;
  type: "send" | "receive";
  amount: number;
  asset: string;
  participant: string;
  timestamp: string;
  appSessionId?: string;
  status: "completed" | "pending" | "failed";
}

export class YellowService {
  private static instance: YellowService;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private messageQueue: any[] = [];
  private wallet: any = null; // Store wallet for message signing
  private signMessage: ((data: any) => Promise<string>) | null = null; // Store signer function
  private messageSigner: ((payload: any) => string) | null = null; // Store message signer function

  // Configuration from backend/czechout-transfer.js
  private readonly WS_URL = "wss://clearnet.yellow.com/ws";
  private readonly CZECHOUT_SCOPE = "app.czechout";
  private readonly CZECHOUT_APP_NAME = "CzechOut";
  private readonly USDC_TOKEN = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

  // Session storage for off-chain transactions
  private offChainTransactions: OffChainTransaction[] = [];
  private currentBalance: YellowBalance = {
    asset: "USDC",
    amount: 0,
    formatted: "0.00 USDC",
  };

  private constructor() {
    // Load cached balance from localStorage on startup
    this.loadCachedBalance();
    // Load cached transactions and analytics
    this.loadCachedTransactions();
  }

  static getInstance(): YellowService {
    if (!YellowService.instance) {
      YellowService.instance = new YellowService();
    }
    return YellowService.instance;
  }

  // Load cached balance from localStorage
  private loadCachedBalance() {
    try {
      const cachedBalance = localStorage.getItem("czechout_nitrolite_balance");
      if (cachedBalance) {
        const parsed = JSON.parse(cachedBalance);
        this.currentBalance = parsed;
        console.log("📦 Loaded cached nitrolite balance:", this.currentBalance);
      }
    } catch (error) {
      console.warn("Failed to load cached balance:", error);
    }
  }

  // Save balance to localStorage
  private saveCachedBalance() {
    try {
      localStorage.setItem(
        "czechout_nitrolite_balance",
        JSON.stringify(this.currentBalance)
      );
      console.log("💾 Saved nitrolite balance to cache:", this.currentBalance);
    } catch (error) {
      console.warn("Failed to save balance to cache:", error);
    }
  }

  // Load cached transactions from localStorage
  private loadCachedTransactions() {
    try {
      const cachedTransactions = localStorage.getItem(
        "czechout_offchain_transactions"
      );
      if (cachedTransactions) {
        const parsed = JSON.parse(cachedTransactions);
        this.offChainTransactions = parsed;
        console.log(
          "📦 Loaded cached off-chain transactions:",
          this.offChainTransactions.length
        );
      }
    } catch (error) {
      console.warn("Failed to load cached transactions:", error);
    }
  }

  // Save transactions to localStorage
  private saveCachedTransactions() {
    try {
      localStorage.setItem(
        "czechout_offchain_transactions",
        JSON.stringify(this.offChainTransactions)
      );
      console.log(
        "💾 Saved off-chain transactions to cache:",
        this.offChainTransactions.length
      );
    } catch (error) {
      console.warn("Failed to save transactions to cache:", error);
    }
  }

  // Add transaction to history and save to cache
  addTransaction(transaction: OffChainTransaction) {
    this.offChainTransactions.unshift(transaction);
    // Keep only latest 50 transactions
    if (this.offChainTransactions.length > 50) {
      this.offChainTransactions = this.offChainTransactions.slice(0, 50);
    }
    this.saveCachedTransactions();
  }

  // Connect to Yellow ClearNode (exactly like czechout-transfer.js)
  async connect(walletAddress: string, privateKey: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Create wallet instance from private key
        this.wallet = new ethers.Wallet(privateKey);

        this.ws = new WebSocket(this.WS_URL);

        const expire = String(Math.floor(Date.now() / 1000) + 24 * 60 * 60);

        // Auth domain and types (like backend)
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

        // Extract challenge function (like backend)
        const extractChallenge = (data: any): string => {
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

        // Sign message function for auth (like backend)
        const signMessage = async (data: any): Promise<string> => {
          const challengeUUID = extractChallenge(data);
          if (!challengeUUID) {
            const messageStr =
              typeof data === "string" ? data : JSON.stringify(data);
            const digestHex = ethers.id(messageStr);
            const messageBytes = ethers.getBytes(digestHex);
            const { serialized: signature } =
              this.wallet.signingKey.sign(messageBytes);
            return signature;
          }

          const message = {
            challenge: challengeUUID,
            scope: this.CZECHOUT_SCOPE,
            wallet: this.wallet.address,
            application: this.wallet.address,
            participant: this.wallet.address,
            expire: expire,
            allowances: [],
          };

          const signature = await this.wallet.signTypedData(
            getAuthDomain(),
            AUTH_TYPES,
            message
          );
          return signature;
        };

        // Message signer for regular messages (like backend)
        const messageSigner = (payload: any): string => {
          const message = JSON.stringify(payload);
          const digestHex = ethers.id(message);
          const messageBytes = ethers.getBytes(digestHex);
          const { serialized: signature } =
            this.wallet.signingKey.sign(messageBytes);
          return signature;
        };

        // Store both signers for use in other methods
        this.signMessage = signMessage;
        this.messageSigner = messageSigner;

        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close();
            reject(new Error("Connection timeout"));
          }
        }, 10000);

        this.ws.onopen = async () => {
          console.log("🟡 Connected to Yellow ClearNode");

          try {
            // CzechOut-specific authentication request (using nitrolite package)
            const authRequestMsg = await createAuthRequestMessage({
              wallet: this.wallet.address,
              participant: this.wallet.address,
              app_name: this.CZECHOUT_APP_NAME,
              expire: expire,
              scope: this.CZECHOUT_SCOPE,
              application: this.wallet.address,
              allowances: {},
            });

            // Add small delay to ensure WebSocket is ready
            setTimeout(() => {
              this.ws?.send(authRequestMsg);
            }, 100);
          } catch (error) {
            console.error("Error sending auth request:", error);
            reject(error);
          }
        };

        this.ws.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("📨 Received message:", message);

            if (message.res && message.res[1] === "auth_challenge") {
              try {
                const authVerifyMsg = await createAuthVerifyMessage(
                  signMessage,
                  event.data
                );
                this.ws?.send(authVerifyMsg);
              } catch (error) {
                console.error("Error creating auth verify message:", error);
                reject(error);
              }
            } else if (message.res && message.res[1] === "auth_verify") {
              console.log("✅ CzechOut authentication successful");
              this.isConnected = true;
              clearTimeout(connectionTimeout);
              resolve(true);
            } else if (message.res && message.res[1] === "error") {
              console.error(
                "❌ Yellow Error:",
                message.res[2]?.[0]?.error || message.res[2]
              );
              clearTimeout(connectionTimeout);
              reject(
                new Error(message.res[2]?.[0]?.error || "Authentication failed")
              );
            } else {
              // Handle other message types (for debugging)
              console.log("📝 Other message type:", message.res?.[1], message);
            }
          } catch (error) {
            console.error("Error parsing message:", error);
            reject(new Error("Invalid message format"));
          }
        };

        this.ws.onerror = (error) => {
          console.error("🟡 Yellow WebSocket error:", error);
          clearTimeout(connectionTimeout);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("🟡 Yellow connection closed");
          this.isConnected = false;
          clearTimeout(connectionTimeout);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get real balance from Yellow ledger (using nitrolite package)
  async getBalance(walletAddress: string): Promise<YellowBalance> {
    if (!this.isConnected || !this.wallet || !this.messageSigner) {
      console.warn("Yellow not connected, returning cached balance");
      return this.currentBalance;
    }

    return new Promise(async (resolve, reject) => {
      try {
        console.log("🟡 Requesting ledger balance...");
        // Send signed get_ledger_balances message (using nitrolite package)
        const balanceMsg = await createGetLedgerBalancesMessage(
          this.messageSigner,
          walletAddress // participant parameter
        );
        this.ws?.send(balanceMsg);

        // Set timeout for response
        const responseTimeout = setTimeout(() => {
          console.warn("Balance request timeout, returning cached balance");
          resolve(this.currentBalance);
        }, 5000);

        // Listen for response
        const originalOnMessage = this.ws?.onmessage;
        this.ws!.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("📨 Raw balance response:", message);

            if (message.res && message.res[1] === "get_ledger_balances") {
              console.log("📊 Received ledger balances", message.res);
              clearTimeout(responseTimeout);

              // Parse balance from response - fix for actual response structure
              const responseData = message.res[2];
              console.log("📊 Response data:", responseData);

              if (
                responseData &&
                Array.isArray(responseData) &&
                responseData.length > 0
              ) {
                const balances = responseData[0];
                console.log("📊 Balances array:", balances);

                if (
                  balances &&
                  Array.isArray(balances) &&
                  balances.length > 0
                ) {
                  // The actual structure is: res[2][0][0] = {asset: 'usdc', amount: '0.839797'}
                  const usdcBalance = balances[0];
                  console.log("📊 Found balance object:", usdcBalance);

                  if (usdcBalance && usdcBalance.asset === "usdc") {
                    // Amount is already in correct USDC format - use as-is!
                    const amount = parseFloat(usdcBalance.amount || "0");
                    console.log(
                      `📊 USDC amount: ${amount} (no conversion needed)`
                    );

                    this.currentBalance = {
                      asset: "USDC",
                      amount: amount,
                      formatted: `${amount.toFixed(2)} USDC`,
                    };
                    console.log("✅ Updated balance:", this.currentBalance);

                    // Save to localStorage for persistence
                    this.saveCachedBalance();
                  } else {
                    console.warn(
                      "⚠️ Invalid USDC balance object:",
                      usdcBalance
                    );
                  }
                } else {
                  console.warn(
                    "⚠️ Balances is not an array or empty:",
                    balances
                  );
                }
              } else {
                console.warn(
                  "⚠️ Invalid response data structure:",
                  responseData
                );
              }

              // Restore original message handler
              this.ws!.onmessage = originalOnMessage;

              // Close the app session after getting balance
              this.closeAppSession();

              resolve(this.currentBalance);
            } else if (message.res && message.res[1] === "error") {
              console.error("❌ Balance fetch error:", message.res[2]);
              clearTimeout(responseTimeout);
              this.ws!.onmessage = originalOnMessage;
              resolve(this.currentBalance); // Return cached balance on error
            } else {
              // Handle any other message types during balance request
              console.log(
                "📝 Other message during balance request:",
                message.res?.[1]
              );
            }
          } catch (error) {
            console.error("Error parsing balance response:", error);
            clearTimeout(responseTimeout);
            this.ws!.onmessage = originalOnMessage;
            resolve(this.currentBalance);
          }
        };
      } catch (error) {
        console.error("Error requesting balance:", error);
        reject(error);
      }
    });
  }

  // Close app session after getting balance/history
  private async closeAppSession() {
    try {
      console.log("🟡 Closing app session...");

      if (this.messageSigner) {
        const closeSessionMsg = await createCloseAppSessionMessage(
          this.messageSigner,
          {} // Empty session data to close
        );
        this.ws?.send(closeSessionMsg);
        console.log("✅ App session close request sent");
      }

      // Disconnect after a short delay
      setTimeout(() => {
        this.disconnect();
        console.log("✅ Yellow session closed and disconnected");
      }, 1000);
    } catch (error) {
      console.error("Error closing app session:", error);
      // Force disconnect even if close session fails
      this.disconnect();
    }
  }

  // Get available channels (using nitrolite package)
  async getChannels(walletAddress: string): Promise<YellowChannel[]> {
    if (!this.isConnected || !this.wallet || !this.messageSigner) return [];

    return new Promise(async (resolve) => {
      try {
        // Send signed get_channels message (using nitrolite package)
        const channelsMsg = await createGetChannelsMessage(
          this.messageSigner,
          walletAddress // participant parameter
        );
        this.ws?.send(channelsMsg);

        const originalOnMessage = this.ws?.onmessage;
        this.ws!.onmessage = (event) => {
          const message = JSON.parse(event.data);

          if (message.res && message.res[1] === "get_channels") {
            const channelsData = message.res[2];
            const channels = channelsData[0];

            const formattedChannels: YellowChannel[] = channels.map(
              (channel: any) => ({
                status: channel.status,
                token: channel.token,
                amount: channel.amount,
                participant: channel.participant,
              })
            );

            this.ws!.onmessage = originalOnMessage;
            resolve(formattedChannels);
          }
        };
      } catch (error) {
        console.error("Error requesting channels:", error);
        resolve([]);
      }
    });
  }

  // Execute off-chain transfer (using nitrolite package)
  async transfer(
    fromAddress: string,
    toAddress: string,
    amount: number
  ): Promise<OffChainTransaction> {
    if (!this.isConnected || !this.wallet || !this.messageSigner) {
      throw new Error("Not connected to Yellow");
    }

    const transactionId = `tx-${Date.now()}`;

    try {
      // Create app session for transfer
      const appDefinition = {
        protocol: "czechout_usdc_transfer_v1",
        participants: [fromAddress, toAddress],
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
              participant: fromAddress,
              asset: "usdc",
              amount: amount.toString(),
            },
            { participant: toAddress, asset: "usdc", amount: "0" },
          ],
        },
      ];

      // Send app session creation message (using nitrolite package)
      const appSessionMsg = await createAppSessionMessage(
        this.messageSigner,
        sessionData
      );
      this.ws?.send(appSessionMsg);

      // Create transaction record
      const transaction: OffChainTransaction = {
        id: transactionId,
        type: "send",
        amount: amount,
        asset: "USDC",
        participant: toAddress,
        timestamp: new Date().toISOString(),
        status: "pending",
      };

      this.offChainTransactions.unshift(transaction);
      return transaction;
    } catch (error) {
      console.error("Error creating transfer:", error);
      throw error;
    }
  }

  // Get off-chain transaction history (stored in session)
  getOffChainTransactions(): OffChainTransaction[] {
    return [...this.offChainTransactions];
  }

  // Get current cached balance without connecting (instant access)
  getCachedBalance(): YellowBalance {
    return { ...this.currentBalance };
  }

  // Check if we have a valid cached balance
  hasCachedBalance(): boolean {
    return this.currentBalance.amount > 0;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

export default YellowService;
