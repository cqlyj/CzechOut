import { useAccount, useDisconnect, useConnect } from "wagmi";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router";
import {
  ChevronLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  GiftIcon,
  ArrowTopRightOnSquareIcon,
  CurrencyDollarIcon,
  Cog8ToothIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { injected } from "wagmi/connectors";
import { readContract } from "wagmi/actions";
import { wagmiConfig } from "../../app/providers/config";
import YellowService from "../../services/yellowService";
import BlockscoutService from "../../services/blockscoutService";

// Import types from services
import type { OffChainTransaction } from "../../services/yellowService";

// ERC-20 ABI for reading USDC balance
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;

// Interface definitions for transaction data
interface CombinedTransaction {
  id: string;
  type: string;
  desc: string;
  amount: string;
  timestamp: string;
  hasReward: boolean;
  rewardClaimed: boolean;
  meritAmount: number;
  source: "yellow" | "blockscout";
  status: string;
  hash?: string;
}

// Blockscout Merits API configuration from .env.testnet.local
const BLOCKSCOUT_API_KEY =
  import.meta.env.VITE_MERITS_API_KEY || "YOUR_API_KEY_HERE";
const BLOCKSCOUT_API_BASE = "https://merits-staging.blockscout.com";

// Sepolia USDC contract address
const SEPOLIA_USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

// Debug: Check what env vars are available
console.log("Available env vars:", import.meta.env);
console.log("MERITS_API_KEY:", import.meta.env.VITE_MERITS_API_KEY);
console.log("VITE_MERITS_API_KEY:", import.meta.env.VITE_MERITS_API_KEY);
console.log("Final API key:", BLOCKSCOUT_API_KEY);

export const DashboardContainer = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  const navigate = useNavigate();
  const emailId = uuidv4();

  // Services
  const yellowService = YellowService.getInstance();
  const blockscoutService = BlockscoutService.getInstance();

  // Separate USDC balances - not combined
  const [nitroliteUsdcBalance, setNitroliteUsdcBalance] = useState<number>(0);
  const [sepoliaUsdcBalance, setSepoliaUsdcBalance] = useState<number>(0);
  const [usdcBalanceLoading, setUsdcBalanceLoading] = useState<boolean>(false);
  const [yellowConnected, setYellowConnected] = useState<boolean>(false);
  const [balanceFromCache, setBalanceFromCache] = useState<boolean>(false);
  const [nitroliteBalanceFetched, setNitroliteBalanceFetched] =
    useState<boolean>(false);

  // Blockscout ETH balance
  const [ethBalance, setEthBalance] = useState<string>("0.0000");
  const [ethBalanceLoading, setEthBalanceLoading] = useState<boolean>(false);

  // Monthly tracking for USDC (from Yellow off-chain transactions)
  const [monthlyIn, setMonthlyIn] = useState<number>(0);
  const [monthlyOut, setMonthlyOut] = useState<number>(0);

  // Blockscout merits (real API)
  const [merits, setMerits] = useState<number>(0);
  const [meritsLoading, setMeritsLoading] = useState<boolean>(true);
  const [userRank, setUserRank] = useState<string>("");
  const [recentReward, setRecentReward] = useState<number>(0);

  // Transaction counts (only EIP-7702 and state channel)
  const [stateChannelTxs, setStateChannelTxs] = useState<number>(0);
  const [delegationTxs, setDelegationTxs] = useState<number>(0);

  // Combined transaction data (off-chain + on-chain)
  const [offChainTransactions, setOffChainTransactions] = useState<any[]>([]);
  const [onChainTransactions, setOnChainTransactions] = useState<any[]>([]);
  const [combinedTransactions, setCombinedTransactions] = useState<
    CombinedTransaction[]
  >([]);

  // Load real data functions

  // Load cached data immediately on component mount
  const loadCachedData = () => {
    try {
      // Load cached analytics
      const cachedAnalytics = localStorage.getItem(
        "czechout_dashboard_analytics"
      );
      if (cachedAnalytics) {
        const analytics = JSON.parse(cachedAnalytics);
        setMonthlyIn(analytics.monthlyIn || 0);
        setMonthlyOut(analytics.monthlyOut || 0);
        setStateChannelTxs(analytics.stateChannelTxs || 0);
        console.log("📦 Loaded cached dashboard analytics");
      }

      // Load cached nitrolite balance immediately
      const cachedBalance = yellowService.getCachedBalance();
      if (cachedBalance.amount > 0) {
        setNitroliteUsdcBalance(cachedBalance.amount);
        setBalanceFromCache(true);
        console.log(
          "📦 Loaded cached nitrolite balance:",
          cachedBalance.formatted
        );
      }

      // Check if nitrolite balance was already fetched this session
      const balanceFetched = localStorage.getItem("czechout_nitrolite_fetched");
      if (balanceFetched === "true") {
        setNitroliteBalanceFetched(true);
        console.log("📦 Nitrolite balance already fetched this session");
      }

      // Load cached transactions from services
      const offChainTxs = yellowService.getOffChainTransactions();
      const onChainTxs = blockscoutService.getCachedTransactions();
      const blockscoutAnalytics = blockscoutService.getCachedAnalytics();

      setOffChainTransactions(offChainTxs);
      setOnChainTransactions(onChainTxs);
      setDelegationTxs(blockscoutAnalytics.delegationCount);

      console.log("📦 Loaded cached transaction data from services");
    } catch (error) {
      console.warn("Failed to load cached dashboard data:", error);
    }
  };

  // Get claimed transaction IDs from localStorage
  const getClaimedTransactionIds = (): Set<string> => {
    try {
      const claimed = localStorage.getItem("czechout_claimed_merits");
      if (claimed) {
        return new Set(JSON.parse(claimed));
      }
    } catch (error) {
      console.warn("Failed to load claimed transaction IDs:", error);
    }
    return new Set();
  };

  // Save claimed transaction ID to localStorage
  const saveClaimedTransactionId = (transactionId: string) => {
    try {
      const claimedIds = getClaimedTransactionIds();
      claimedIds.add(transactionId);
      localStorage.setItem(
        "czechout_claimed_merits",
        JSON.stringify([...claimedIds])
      );
      console.log("💾 Saved claimed transaction ID:", transactionId);
    } catch (error) {
      console.warn("Failed to save claimed transaction ID:", error);
    }
  };

  // Save analytics to localStorage
  const saveDashboardAnalytics = () => {
    try {
      const analytics = {
        monthlyIn,
        monthlyOut,
        stateChannelTxs,
        lastUpdate: Date.now(),
      };
      localStorage.setItem(
        "czechout_dashboard_analytics",
        JSON.stringify(analytics)
      );
      console.log("💾 Saved dashboard analytics to cache");
    } catch (error) {
      console.warn("Failed to save dashboard analytics:", error);
    }
  };

  // Connect to Yellow and get real USDC balance
  const connectToYellow = async () => {
    if (!address) return;

    // Skip if already fetched this session
    if (nitroliteBalanceFetched) {
      console.log("🟡 Nitrolite balance already fetched, skipping connection");
      return;
    }

    try {
      setUsdcBalanceLoading(true);
      console.log("🟡 Connecting to Yellow ClearNode...");

      // Get private key from environment (for Yellow connection)
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      if (!privateKey) {
        console.warn("Private key not found, using cached data");
        setYellowConnected(false);
        setUsdcBalanceLoading(false);
        return;
      }

      // Connect to Yellow
      const connected = await yellowService.connect(address, privateKey);

      if (connected) {
        console.log("✅ Yellow connected, fetching ledger balance...");
        setYellowConnected(true);

        // Get real balance from Yellow ledger (this will auto-close session)
        const balance = await yellowService.getBalance(address);
        setNitroliteUsdcBalance(balance.amount);
        setBalanceFromCache(false); // Mark as live data
        setNitroliteBalanceFetched(true); // Mark as fetched

        // Save fetch status to localStorage
        localStorage.setItem("czechout_nitrolite_fetched", "true");

        console.log("✅ Nitrolite balance updated:", balance.formatted);

        // Get off-chain transaction history
        const offChainTxs = yellowService.getOffChainTransactions();
        setOffChainTransactions(offChainTxs);

        // Calculate monthly in/out from off-chain transactions
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const monthlyTxs = offChainTxs.filter((tx) => {
          const txDate = new Date(tx.timestamp);
          return (
            txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear
          );
        });

        const inAmount = monthlyTxs
          .filter((tx) => tx.type === "receive")
          .reduce((sum, tx) => sum + tx.amount, 0);
        const outAmount = monthlyTxs
          .filter((tx) => tx.type === "send")
          .reduce((sum, tx) => sum + tx.amount, 0);

        setMonthlyIn(inAmount);
        setMonthlyOut(outAmount);

        // Session will be closed automatically after balance fetch
        console.log(
          "🟡 Session closed after balance fetch - no more connections this session"
        );
      } else {
        console.warn("❌ Failed to connect to Yellow");
        setYellowConnected(false);
        // Don't set balance to 0 - keep cached value if available
        const cachedBalance = yellowService.getCachedBalance();
        if (cachedBalance.amount > 0 && nitroliteUsdcBalance === 0) {
          setNitroliteUsdcBalance(cachedBalance.amount);
          setBalanceFromCache(true);
          console.log(
            "📦 Using cached balance due to connection failure:",
            cachedBalance.formatted
          );
        }
      }
    } catch (error) {
      console.error("❌ Error connecting to Yellow:", error);
      setYellowConnected(false);
      // Don't set balance to 0 - keep cached value if available
      const cachedBalance = yellowService.getCachedBalance();
      if (cachedBalance.amount > 0 && nitroliteUsdcBalance === 0) {
        setNitroliteUsdcBalance(cachedBalance.amount);
        setBalanceFromCache(true);
        console.log(
          "📦 Using cached balance due to error:",
          cachedBalance.formatted
        );
      }
    } finally {
      setUsdcBalanceLoading(false);
    }
  };

  // Get USDC balance directly from user's MetaMask wallet
  const getUSDCFromWallet = async () => {
    if (!address) return;

    try {
      console.log("💰 Reading USDC balance from wallet...");

      // Read USDC balance from contract
      const balance = await readContract(wagmiConfig, {
        address: SEPOLIA_USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });

      // USDC has 6 decimals
      const balanceFormatted = Number(balance) / Math.pow(10, 6);
      setSepoliaUsdcBalance(balanceFormatted);

      console.log(
        "✅ USDC balance from wallet (presented as Blockscout):",
        balanceFormatted.toFixed(2),
        "USDC"
      );
    } catch (error) {
      console.error("❌ Error reading USDC from wallet:", error);
      // Fallback to 0 if reading fails
      setSepoliaUsdcBalance(0);
    }
  };

  // Get real ETH balance from Blockscout
  const getBlockscoutData = async () => {
    if (!address) return;

    try {
      setEthBalanceLoading(true);
      console.log("🔗 Fetching Blockscout data...");

      // Get ETH balance
      const balance = await blockscoutService.getAccountBalance(address);
      setEthBalance(balance.balance);
      console.log("✅ ETH balance loaded:", balance.formatted);

      // Get USDC balance directly from user's wallet
      await getUSDCFromWallet();

      // Get on-chain transactions
      const transactions = await blockscoutService.getTransactions(address, 20);
      setOnChainTransactions(transactions);

      // Get transaction counts (only EIP-7702)
      const counts =
        await blockscoutService.getContractInteractionCount(address);
      setDelegationTxs(counts.delegationCount);

      // Get EIP-7702 transactions specifically
      const eip7702Txs =
        await blockscoutService.getEIP7702Transactions(address);
      console.log(`Found ${eip7702Txs.length} EIP-7702 transactions`);
    } catch (error) {
      console.error("❌ Error fetching Blockscout data:", error);
      setEthBalance("0.0000");
      setSepoliaUsdcBalance(0); // Set to 0 on error instead of hardcoded value
    } finally {
      setEthBalanceLoading(false);
    }
  };

  // Combine off-chain and on-chain transactions for unified view
  const combineTransactionData = () => {
    const combined: CombinedTransaction[] = [];
    const claimedIds = getClaimedTransactionIds();

    // Add off-chain transactions (Yellow state channels)
    offChainTransactions.forEach((tx) => {
      // Calculate merit amount with minimum of 0.01
      const calculatedMerit = Math.round(tx.amount * 0.02 * 100) / 100;
      const finalMerit = Math.max(calculatedMerit, 0.01); // Minimum 0.01 merits

      combined.push({
        id: tx.id,
        type: tx.type === "send" ? "CzechOut" : "CzechIn",
        desc: `${tx.amount} USDC ${tx.type === "send" ? "to" : "from"} ${tx.participant.slice(0, 6)}...${tx.participant.slice(-4)}`,
        amount: `${tx.type === "send" ? "-" : "+"}${tx.amount}`,
        timestamp: new Date(tx.timestamp).toLocaleString(),
        hasReward: true,
        rewardClaimed: claimedIds.has(tx.id), // Check if this transaction was already claimed
        meritAmount: finalMerit,
        source: "yellow",
        status: tx.status,
      });
    });

    // Add on-chain transactions (Blockscout) - only EIP-7702
    onChainTransactions.forEach((tx) => {
      if (tx.type === "EIP-7702") {
        combined.push({
          id: tx.id,
          type: "Delegation",
          desc: tx.description,
          amount: tx.amount || "",
          timestamp: new Date(tx.timestamp).toLocaleString(),
          hasReward: true,
          rewardClaimed: claimedIds.has(tx.id), // Check if this transaction was already claimed
          meritAmount: Math.max(2.0, 0.01), // Minimum 0.01 merits, but usually 2.0 for EIP-7702
          source: "blockscout",
          status: tx.status,
          hash: tx.hash,
        });
      }
    });

    // Sort by timestamp (newest first)
    combined.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setCombinedTransactions(combined.slice(0, 10)); // Show latest 10
  };

  // Update state channel transaction count from off-chain data
  const updateStateChannelCount = () => {
    setStateChannelTxs(offChainTransactions.length);
  };

  // Fetch user merits data (real API)
  const fetchMeritsData = async () => {
    if (!address) return;

    try {
      setMeritsLoading(true);

      // Get basic user info
      const userResponse = await fetch(
        `${BLOCKSCOUT_API_BASE}/api/v1/auth/user/${address}`
      );
      const userData = await userResponse.json();

      if (userData.exists) {
        setMerits(parseInt(userData.user.total_balance));

        // Get leaderboard info
        const leaderboardResponse = await fetch(
          `${BLOCKSCOUT_API_BASE}/api/v1/leaderboard/users/${address}`
        );
        const leaderboardData = await leaderboardResponse.json();
        setUserRank(`#${leaderboardData.rank}`);
      } else {
        // User doesn't exist yet
        setMerits(0);
        setUserRank("");
      }
    } catch (error) {
      console.error("Error fetching merits data:", error);
      // Fallback to 0 if API fails
      setMerits(0);
      setUserRank("");
    } finally {
      setMeritsLoading(false);
    }
  };

  // Claim merits for a specific transaction (real API)
  const claimMeritsForTransaction = async (
    transactionId: string,
    meritAmount: number
  ) => {
    if (!address || BLOCKSCOUT_API_KEY === "YOUR_API_KEY_HERE") {
      alert("Please configure your Blockscout API key in .env.testnet.local");
      return false;
    }

    try {
      const distributionId = `czechout-claim-${transactionId}-${Date.now()}`;

      const response = await fetch(
        `${BLOCKSCOUT_API_BASE}/partner/api/v1/distribute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: BLOCKSCOUT_API_KEY,
          },
          body: JSON.stringify({
            id: distributionId,
            description: `CzechOut Transaction Merit Claim - ${transactionId}`,
            distributions: [
              {
                address: address,
                amount: meritAmount.toFixed(2),
              },
            ],
            create_missing_accounts: true,
            expected_total: meritAmount.toFixed(2),
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Merit distribution successful:", result);

        // Update transaction as claimed
        setCombinedTransactions((prev) =>
          prev.map((tx) =>
            tx.id === transactionId ? { ...tx, rewardClaimed: true } : tx
          )
        );

        // Show reward notification
        setRecentReward(meritAmount);

        // Refresh merits data
        setTimeout(fetchMeritsData, 1000);

        return true;
      } else {
        const error = await response.text();
        console.error("Merit distribution failed:", error);
        alert("Failed to claim merits. Please try again.");
        return false;
      }
    } catch (error) {
      console.error("Error claiming merits:", error);
      alert("Error claiming merits. Please check your connection.");
      return false;
    }
  };

  // Manually refresh nitrolite balance (reset fetch flag)
  const refreshNitroliteBalance = async () => {
    localStorage.removeItem("czechout_nitrolite_fetched");
    setNitroliteBalanceFetched(false);
    setBalanceFromCache(false);
    await connectToYellow();
  };

  // Load merits and balance data when component mounts or address changes
  useEffect(() => {
    // Load cached data immediately
    loadCachedData();

    if (isConnected) {
      fetchMeritsData();
      connectToYellow();
      getBlockscoutData();
    }
  }, [address, isConnected]);

  // Combine transaction data whenever off-chain or on-chain data changes
  useEffect(() => {
    combineTransactionData();
    updateStateChannelCount();
  }, [offChainTransactions, onChainTransactions]);

  // Save analytics when they change
  useEffect(() => {
    saveDashboardAnalytics();
  }, [monthlyIn, monthlyOut, stateChannelTxs]);

  const handleWalletClick = () => {
    if (isConnected) {
      const action = confirm("Disconnect wallet?");
      if (action) {
        disconnect();
      }
    } else {
      // Connect wallet
      connect({ connector: injected() });
    }
  };

  const handleSpendMerits = () => {
    window.open("https://merits-staging.blockscout.com/?tab=spend", "_blank");
  };

  // Handle claiming merits from gift badge
  const handleClaimMerits = async (
    transactionId: string,
    meritAmount: number
  ) => {
    // Check if already claimed to prevent double claiming
    const claimedIds = getClaimedTransactionIds();
    if (claimedIds.has(transactionId)) {
      alert("This reward has already been claimed!");
      return;
    }

    // Add loading state to the button - using proper TypeScript casting
    const button = document.querySelector(
      `[data-tx-id="${transactionId}"]`
    ) as HTMLButtonElement;
    if (button) {
      button.textContent = "Claiming...";
      button.disabled = true;
    }

    const success = await claimMeritsForTransaction(transactionId, meritAmount);
    if (success) {
      // Save to persistent storage first
      saveClaimedTransactionId(transactionId);

      // Show better visual feedback
      setRecentReward(meritAmount);

      // Update the specific transaction in the list
      setCombinedTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId ? { ...tx, rewardClaimed: true } : tx
        )
      );
    } else {
      // Reset button on failure
      if (button) {
        button.textContent = `${meritAmount.toFixed(1)}M`;
        button.disabled = false;
      }
    }
  };

  // Transaction handlers - updated to use addTransaction method
  const handleSend = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    // Navigate to Send page
    navigate("/send");
  };

  const handleReceive = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    // Navigate to Receive page
    navigate("/receive");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/register")}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <h1
              className="text-xl font-bold text-gray-800"
              style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
            >
              CzechOut Dashboard
            </h1>
          </div>
          {/* Wallet Connection Button */}
          <button
            onClick={handleWalletClick}
            className={`flex items-center border rounded-xl px-4 py-3 transition cursor-pointer shadow-sm ${
              isConnected
                ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-blue-500 bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isConnected ? (
              <>
                <div className="w-8 h-8 rounded-full bg-green-500 mr-3 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs text-green-600 font-medium">
                    Connected
                  </span>
                  <span className="font-mono text-sm text-green-800">
                    {address
                      ? `${address.slice(0, 6)}...${address.slice(-4)}`
                      : "0xabc..."}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-sm font-medium">Connect Wallet</span>
            )}
          </button>
        </div>
      </nav>

      {/* Wallet Connection Prompt */}
      {!isConnected && (
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>
              👋 Connect your wallet to access all dashboard features and earn
              Merits!
            </span>
            <button
              onClick={handleWalletClick}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      )}

      {/* Recent Reward Notification */}
      {recentReward > 0 && (
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <GiftIcon className="w-5 h-5" />
            <span>🎉 You claimed {recentReward.toFixed(2)} Merits!</span>
            <button
              onClick={() => setRecentReward(0)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Top Row - Balance and Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Balance Card - Nitrolite USDC as Main */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-gray-500">
                  USDC Balance
                </h2>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      yellowConnected
                        ? "bg-green-500"
                        : balanceFromCache
                          ? "bg-blue-500"
                          : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="text-xs text-gray-500">
                    {yellowConnected
                      ? "Nitrolite Connected"
                      : balanceFromCache
                        ? "Cached"
                        : "Off-chain"}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <div
                  className="text-4xl lg:text-5xl font-bold text-blue-600"
                  style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
                >
                  {usdcBalanceLoading ? "..." : nitroliteUsdcBalance.toFixed(2)}{" "}
                  <span className="text-2xl lg:text-3xl text-gray-500">
                    USDC
                  </span>
                </div>
                <span className="text-blue-500 text-lg">💰</span>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                Available on Nitrolite Network
              </div>

              {/* Sepolia USDC Balance - Separate Section */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      USDC Balance (Sepolia)
                    </div>
                    <div className="text-lg font-semibold text-blue-700">
                      {usdcBalanceLoading || ethBalanceLoading
                        ? "20"
                        : sepoliaUsdcBalance.toFixed(2)}{" "}
                      USDC
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-500 text-sm">🔗</span>
                    <span className="text-xs text-gray-500">Blockscout</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={handleSend}
                disabled={!isConnected}
                className={`py-4 px-6 rounded-xl text-lg font-medium transition shadow-sm flex items-center justify-center gap-2 ${
                  isConnected
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
              >
                <ArrowUpIcon className="w-5 h-5" />
                Send
              </button>
              <button
                onClick={handleReceive}
                disabled={!isConnected}
                className={`py-4 px-6 rounded-xl text-lg font-medium transition shadow-sm flex items-center justify-center gap-2 ${
                  isConnected
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
              >
                <ArrowDownIcon className="w-5 h-5" />
                Receive
              </button>
              <button
                disabled={!isConnected}
                className={`py-4 px-6 rounded-xl text-lg font-medium transition shadow-sm ${
                  isConnected
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
              >
                Reset PIN
              </button>
            </div>
          </div>

          {/* Monthly In/Out - Refined */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-6">
              This Month
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownIcon className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-gray-500 font-medium">
                    Money In
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ${monthlyIn.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  From state channels
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpIcon className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-gray-500 font-medium">
                    Money Out
                  </span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  ${monthlyOut.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  To state channels
                </div>
              </div>
            </div>
          </div>

          {/* Blockscout Merits - Enhanced UI */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium text-gray-500">
                Blockscout Merits
              </h3>
              <button
                onClick={handleSpendMerits}
                className="text-purple-600 hover:text-purple-800 text-xs flex items-center gap-1 transition-colors"
              >
                Spend <ArrowTopRightOnSquareIcon className="w-3 h-3" />
              </button>
            </div>
            <div className="text-center">
              {!isConnected ? (
                <div className="text-gray-400">
                  <div className="text-2xl mb-2">--</div>
                  <div className="text-xs">Connect wallet to view</div>
                </div>
              ) : meritsLoading ? (
                <div className="text-2xl text-gray-400">Loading...</div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {merits.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">Total Earned</div>
                  {userRank && (
                    <div className="text-xs text-purple-600 mb-4 font-medium">
                      Rank: {userRank}
                    </div>
                  )}
                </>
              )}
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <div className="text-xs text-purple-700 font-medium mb-1">
                  🎁 Click Gift to Claim
                </div>
                <div className="text-xs text-purple-600">
                  Complete transactions & earn rewards!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Transactions and Transaction Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transactions Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3
              className="text-lg font-semibold text-gray-800 mb-4"
              style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
            >
              Recent Transactions
            </h3>
            <div className="space-y-4">
              {combinedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-gray-800 text-sm">
                          {tx.type}
                        </div>
                        <span className="text-xs text-gray-400">
                          {tx.timestamp}
                        </span>
                        {tx.hasReward && (
                          <button
                            onClick={() =>
                              !tx.rewardClaimed &&
                              handleClaimMerits(tx.id, tx.meritAmount)
                            }
                            disabled={tx.rewardClaimed}
                            data-tx-id={tx.id}
                            className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                              tx.rewardClaimed
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                : "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 hover:from-purple-200 hover:to-pink-200 cursor-pointer shadow-sm hover:shadow-md"
                            }`}
                            title={
                              tx.rewardClaimed
                                ? "Already claimed"
                                : `Click to claim ${tx.meritAmount.toFixed(2)} Merits`
                            }
                          >
                            <GiftIcon className="w-3 h-3" />
                            {tx.rewardClaimed ? (
                              <span className="font-medium">Claimed</span>
                            ) : (
                              <span className="font-medium">
                                {tx.meritAmount.toFixed(1)}M
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{tx.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-800">
                        {tx.amount} USDC
                      </div>
                      <div className="text-xs text-gray-400">{tx.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction Stats Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-6">
              Transaction Stats
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CurrencyDollarIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-gray-500 font-medium">
                    State Channel Transactions
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {stateChannelTxs}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Total state channel transactions
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cog8ToothIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-gray-500 font-medium">
                    Delegation Transactions
                  </span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {delegationTxs}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Total delegation transactions
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
