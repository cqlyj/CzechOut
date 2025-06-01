// Blockscout Service for EIP-7702 and on-chain transaction data

interface BlockscoutTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  timestamp: string;
  status: string;
  type: string; // "0", "1", "2", "4" (EIP-7702)
  authorizationList?: any[];
  methodName?: string;
  fee: string;
}

interface OnChainTransaction {
  id: string;
  hash: string;
  type: "EIP-7702" | "Registry" | "Transfer" | "Contract Call";
  description: string;
  amount?: string;
  timestamp: string;
  status: "success" | "failed" | "pending";
  gasUsed: string;
  fee: string;
  blockNumber: number;
  from: string;
  to: string;
}

interface AccountBalance {
  balance: string;
  balanceWei: string;
  formatted: string; // e.g., "1.234 ETH"
}

interface TokenBalance {
  balance: string;
  decimals: number;
  formatted: string; // e.g., "123.45 USDC"
  symbol: string;
}

export class BlockscoutService {
  private static instance: BlockscoutService;
  private readonly baseUrl = "https://eth-sepolia.blockscout.com";

  // Contract addresses from your .note.md
  private readonly REGISTRY_ADDRESS =
    "0x081C0AF74DE93A30517aa9A5d9ae915d0070dFaD";
  private readonly DELEGATION_ADDRESS =
    "0xeE7fE61ba80E9EB65BA36c025863B884c1606939";

  // Sepolia USDC contract address (test USDC on Sepolia)
  private readonly SEPOLIA_USDC_ADDRESS =
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  // Cached data
  private cachedTransactions: OnChainTransaction[] = [];
  private cachedAnalytics = {
    delegationCount: 0,
    totalCount: 0,
    lastUpdate: 0,
  };

  private constructor() {
    // Load cached data on startup
    this.loadCachedData();
  }

  static getInstance(): BlockscoutService {
    if (!BlockscoutService.instance) {
      BlockscoutService.instance = new BlockscoutService();
    }
    return BlockscoutService.instance;
  }

  // Load cached data from localStorage
  private loadCachedData() {
    try {
      // Load transactions
      const cachedTxs = localStorage.getItem("czechout_onchain_transactions");
      if (cachedTxs) {
        this.cachedTransactions = JSON.parse(cachedTxs);
        console.log(
          "📦 Loaded cached on-chain transactions:",
          this.cachedTransactions.length
        );
      }

      // Load analytics
      const cachedAnalytics = localStorage.getItem(
        "czechout_onchain_analytics"
      );
      if (cachedAnalytics) {
        this.cachedAnalytics = JSON.parse(cachedAnalytics);
        console.log(
          "📦 Loaded cached on-chain analytics:",
          this.cachedAnalytics
        );
      }
    } catch (error) {
      console.warn("Failed to load cached blockchain data:", error);
    }
  }

  // Save data to localStorage
  private saveCachedData() {
    try {
      localStorage.setItem(
        "czechout_onchain_transactions",
        JSON.stringify(this.cachedTransactions)
      );
      localStorage.setItem(
        "czechout_onchain_analytics",
        JSON.stringify(this.cachedAnalytics)
      );
      console.log("💾 Saved blockchain data to cache");
    } catch (error) {
      console.warn("Failed to save blockchain data to cache:", error);
    }
  }

  // Get ETH balance for an address
  async getAccountBalance(address: string): Promise<AccountBalance> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v2/addresses/${address}`
      );
      const data = await response.json();

      const balanceWei = data.coin_balance || "0";
      const balanceEth = parseInt(balanceWei) / 1e18;

      return {
        balance: balanceEth.toString(),
        balanceWei: balanceWei,
        formatted: `${balanceEth.toFixed(4)} ETH`,
      };
    } catch (error) {
      console.error("Error fetching account balance:", error);
      return {
        balance: "0",
        balanceWei: "0",
        formatted: "0.0000 ETH",
      };
    }
  }

  // Get transactions for an address (filtered for EIP-7702 and relevant transactions)
  async getTransactions(
    address: string,
    limit: number = 20
  ): Promise<OnChainTransaction[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v2/addresses/${address}/transactions?limit=${limit}`
      );
      const data = await response.json();

      const transactions: OnChainTransaction[] =
        data.items?.map((tx: any) => {
          return this.parseTransaction(tx, address);
        }) || [];

      const filteredTransactions = transactions.filter((tx) => tx !== null);

      // Update cache
      this.cachedTransactions = filteredTransactions;
      this.saveCachedData();

      return filteredTransactions;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      // Return cached data if API fails
      console.log("📦 Returning cached transactions due to API error");
      return this.cachedTransactions;
    }
  }

  // Get specific EIP-7702 transactions
  async getEIP7702Transactions(address: string): Promise<OnChainTransaction[]> {
    try {
      const allTransactions = await this.getTransactions(address, 50);

      // Filter for EIP-7702 transactions (type 4)
      const eip7702Transactions = allTransactions.filter(
        (tx) =>
          tx.type === "EIP-7702" ||
          tx.description.includes("Delegation") ||
          tx.to?.toLowerCase() === this.DELEGATION_ADDRESS.toLowerCase()
      );

      return eip7702Transactions;
    } catch (error) {
      console.error("Error fetching EIP-7702 transactions:", error);
      return [];
    }
  }

  // Get Registry contract interactions
  async getRegistryTransactions(
    address: string
  ): Promise<OnChainTransaction[]> {
    try {
      const allTransactions = await this.getTransactions(address, 50);

      // Filter for Registry contract interactions
      const registryTransactions = allTransactions.filter(
        (tx) =>
          tx.type === "Registry" ||
          tx.to?.toLowerCase() === this.REGISTRY_ADDRESS.toLowerCase()
      );

      return registryTransactions;
    } catch (error) {
      console.error("Error fetching Registry transactions:", error);
      return [];
    }
  }

  // Get transaction details by hash
  async getTransactionByHash(hash: string): Promise<OnChainTransaction | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v2/transactions/${hash}`
      );
      const data = await response.json();

      return this.parseTransaction(data, "");
    } catch (error) {
      console.error("Error fetching transaction by hash:", error);
      return null;
    }
  }

  // Check if an address has been registered in Registry contract
  async isAddressRegistered(address: string): Promise<boolean> {
    try {
      // Call the getCredentialHash function to see if address is registered
      const response = await fetch(
        `${this.baseUrl}/api/v2/smart-contracts/${this.REGISTRY_ADDRESS}/methods/read`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method_id: "getCredentialHash",
            args: [address],
          }),
        }
      );

      const data = await response.json();

      // If credential hash is not 0, address is registered
      return data.result && data.result !== "0";
    } catch (error) {
      console.error("Error checking registration status:", error);
      return false;
    }
  }

  // Get contract interaction count for an address
  async getContractInteractionCount(address: string): Promise<{
    delegationCount: number;
    totalCount: number;
  }> {
    try {
      const transactions = await this.getTransactions(address, 100);

      const delegationCount = transactions.filter(
        (tx) =>
          tx.type === "EIP-7702" ||
          tx.to?.toLowerCase() === this.DELEGATION_ADDRESS.toLowerCase()
      ).length;

      const analytics = {
        delegationCount,
        totalCount: transactions.length,
        lastUpdate: Date.now(),
      };

      // Update cache
      this.cachedAnalytics = analytics;
      this.saveCachedData();

      return {
        delegationCount: analytics.delegationCount,
        totalCount: analytics.totalCount,
      };
    } catch (error) {
      console.error("Error getting contract interaction count:", error);
      // Return cached data if API fails
      console.log("📦 Returning cached analytics due to API error");
      return {
        delegationCount: this.cachedAnalytics.delegationCount,
        totalCount: this.cachedAnalytics.totalCount,
      };
    }
  }

  // Parse raw transaction data into our format
  private parseTransaction(tx: any, userAddress: string): OnChainTransaction {
    let type: OnChainTransaction["type"] = "Transfer";
    let description = "";

    // Determine transaction type and description
    if (tx.type === "4") {
      type = "EIP-7702";
      description = `EIP-7702 Delegation to ${this.truncateAddress(tx.to)}`;
    } else if (tx.to?.toLowerCase() === this.REGISTRY_ADDRESS.toLowerCase()) {
      type = "Registry";
      description = `Registry ${tx.method || "Contract Call"}`;
    } else if (tx.to?.toLowerCase() === this.DELEGATION_ADDRESS.toLowerCase()) {
      type = "EIP-7702";
      description = `Delegation Contract Interaction`;
    } else if (tx.method) {
      type = "Contract Call";
      description = `${tx.method} on ${this.truncateAddress(tx.to)}`;
    } else {
      // Regular transfer
      const isOutgoing = tx.from?.toLowerCase() === userAddress.toLowerCase();
      const direction = isOutgoing ? "to" : "from";
      const address = isOutgoing ? tx.to : tx.from;
      description = `Transfer ${direction} ${this.truncateAddress(address)}`;
    }

    // Calculate amount if it's a value transfer
    let amount: string | undefined;
    if (tx.value && tx.value !== "0") {
      const valueEth = parseInt(tx.value) / 1e18;
      amount = `${valueEth.toFixed(4)} ETH`;
    }

    return {
      id: tx.hash,
      hash: tx.hash,
      type,
      description,
      amount,
      timestamp: tx.timestamp || new Date().toISOString(),
      status: tx.status === "1" || tx.status === "ok" ? "success" : "failed",
      gasUsed: tx.gas_used || "0",
      fee: this.calculateFee(tx.gas_used, tx.gas_price),
      blockNumber: parseInt(tx.block) || 0,
      from: tx.from,
      to: tx.to,
    };
  }

  // Helper to calculate transaction fee
  private calculateFee(gasUsed: string, gasPrice: string): string {
    try {
      const feeWei = BigInt(gasUsed || "0") * BigInt(gasPrice || "0");
      const feeEth = Number(feeWei) / 1e18;
      return `${feeEth.toFixed(6)} ETH`;
    } catch {
      return "0 ETH";
    }
  }

  // Helper to truncate addresses
  private truncateAddress(address: string): string {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Get transaction URL for opening in explorer
  getTransactionUrl(hash: string): string {
    return `${this.baseUrl}/tx/${hash}`;
  }

  getAddressUrl(address: string): string {
    return `${this.baseUrl}/address/${address}`;
  }

  // Get USDC balance from Sepolia for an address
  async getUSDCBalance(address: string): Promise<TokenBalance> {
    try {
      // Use the correct Blockscout API endpoint for token balance
      const response = await fetch(
        `${this.baseUrl}/api?module=account&action=tokenbalance&contractaddress=${this.SEPOLIA_USDC_ADDRESS}&address=${address}`
      );
      const data = await response.json();

      if (data.status === "1" && data.result) {
        // Convert from raw token amount to USDC with 6 decimals
        const rawBalance = data.result;
        const decimals = 6; // USDC has 6 decimals
        const balanceFormatted = parseInt(rawBalance) / Math.pow(10, decimals);

        return {
          balance: rawBalance,
          decimals: decimals,
          formatted: `${balanceFormatted.toFixed(2)} USDC`,
          symbol: "USDC",
        };
      } else {
        // No USDC found or error, return zero balance
        console.warn("No USDC balance found on Sepolia:", data);
        return {
          balance: "0",
          decimals: 6,
          formatted: "0.00 USDC",
          symbol: "USDC",
        };
      }
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
      return {
        balance: "0",
        decimals: 6,
        formatted: "0.00 USDC",
        symbol: "USDC",
      };
    }
  }

  // Get cached data (for immediate use on page load)
  getCachedTransactions(): OnChainTransaction[] {
    return [...this.cachedTransactions];
  }

  getCachedAnalytics(): {
    delegationCount: number;
    totalCount: number;
    lastUpdate: number;
  } {
    return { ...this.cachedAnalytics };
  }
}

export default BlockscoutService;
