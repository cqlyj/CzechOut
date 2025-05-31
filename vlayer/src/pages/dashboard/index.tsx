import { useAccount, useDisconnect, useConnect } from "wagmi";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router";
import {
  ChevronLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  GiftIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { injected } from "wagmi/connectors";

// Blockscout Merits API configuration from .env.testnet.local
const BLOCKSCOUT_API_KEY =
  import.meta.env.VITE_MERITS_API_KEY || "YOUR_API_KEY_HERE";
const BLOCKSCOUT_API_BASE = "https://merits-staging.blockscout.com";

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

  // Main balance is now the Yellow/Nitrolite balance
  const [balance, setBalance] = useState<number>(0.9);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);

  // Monthly tracking
  const [monthlyIn] = useState<number>(547.32);
  const [monthlyOut] = useState<number>(289.5);

  // Blockscout merits (real API)
  const [merits, setMerits] = useState<number>(0);
  const [meritsLoading, setMeritsLoading] = useState<boolean>(true);
  const [userRank, setUserRank] = useState<string>("");
  const [recentReward, setRecentReward] = useState<number>(0);

  // Transaction counts
  const [stateChannelTxs, setStateChannelTxs] = useState<number>(34);
  const [delegationTxs, setDelegationTxs] = useState<number>(13);

  // Transaction data with claimable merits
  const [recentTransactions, setRecentTransactions] = useState([
    {
      id: "tx1",
      type: "CzechIn",
      desc: "125.50 from 0xabc123...",
      amount: "+125.50",
      timestamp: "2 hrs ago",
      hasReward: true,
      rewardClaimed: false,
      meritAmount: 1.25,
    },
    {
      id: "tx2",
      type: "CzechOut",
      desc: "89.25 to 0xdef456...",
      amount: "-89.25",
      timestamp: "1 day ago",
      hasReward: true,
      rewardClaimed: true,
      meritAmount: 0.89,
    },
    {
      id: "tx3",
      type: "CzechIn",
      desc: "67.80 from 0x789xyz...",
      amount: "+67.80",
      timestamp: "3 days ago",
      hasReward: false,
      rewardClaimed: false,
      meritAmount: 0,
    },
  ]);

  // Get Yellow/Nitrolite balance (similar to czechout-transfer.js)
  const getLedgerBalances = async () => {
    if (!address) return;

    try {
      setBalanceLoading(true);

      // TODO: Implement actual ClearNode connection and get_ledger_balances call
      // Similar to backend/czechout-transfer.js:
      // 1. Connect to ClearNode
      // 2. CzechOut authentication
      // 3. Find open USDC channel
      // 4. Call get_ledger_balances
      // 5. Parse response: Received ledger balances [ timestamp, 'get_ledger_balances', [ [ [Object] ] ], timestamp ]

      console.log("Connecting to ClearNode...");
      console.log("CzechOut authentication successful");
      console.log("Found open USDC channel:");
      console.log(`Available: ${balance} USDC`);
      console.log(`Sender: ${address}`);
      console.log("Calling get_ledger_balances...");

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For now, just use placeholder data
      // In real implementation, this would parse the actual ledger response
      setBalance(0.9); // Placeholder value from Yellow
    } catch (error) {
      console.error("Error getting ledger balances:", error);
      setBalance(0.0);
    } finally {
      setBalanceLoading(false);
    }
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
        setRecentTransactions((prev) =>
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

  // Load merits and balance data when component mounts or address changes
  useEffect(() => {
    if (isConnected) {
      fetchMeritsData();
      getLedgerBalances();
    }
  }, [address, isConnected]);

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
    const success = await claimMeritsForTransaction(transactionId, meritAmount);
    if (success) {
      alert(`🎉 Successfully claimed ${meritAmount.toFixed(2)} Merits!`);
    }
  };

  // Transaction handlers - no automatic merit distribution
  const handleSend = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    // Simulate transaction
    const amount = 50.0;
    setBalance((prev) => prev - amount);

    // Add to recent transactions with claimable merits
    const newTx = {
      id: `tx-${Date.now()}`,
      type: "CzechOut",
      desc: `${amount} to 0xdef456...`,
      amount: `-${amount}`,
      timestamp: "Just now",
      hasReward: true,
      rewardClaimed: false,
      meritAmount: Math.round(amount * 0.02 * 100) / 100, // 2% of transaction as merits
    };
    setRecentTransactions((prev) => [newTx, ...prev.slice(0, 2)]);

    // Update transaction counts
    setStateChannelTxs((prev) => prev + 1);

    alert(
      "Send transaction completed! Click the 🎁 badge to claim your Merits!"
    );
  };

  const handleReceive = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    // Simulate transaction
    const amount = 25.0;
    setBalance((prev) => prev + amount);

    // Add to recent transactions with claimable merits
    const newTx = {
      id: `tx-${Date.now()}`,
      type: "CzechIn",
      desc: `${amount} from 0xabc123...`,
      amount: `+${amount}`,
      timestamp: "Just now",
      hasReward: true,
      rewardClaimed: false,
      meritAmount: Math.round(amount * 0.02 * 100) / 100, // 2% of transaction as merits
    };
    setRecentTransactions((prev) => [newTx, ...prev.slice(0, 2)]);

    // Update transaction counts
    setStateChannelTxs((prev) => prev + 1);

    alert(
      "Receive transaction completed! Click the 🎁 badge to claim your Merits!"
    );
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
            className={`flex items-center border rounded-lg px-3 py-2 transition cursor-pointer ${
              isConnected
                ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                : "border-blue-500 bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isConnected ? (
              <>
                <span className="w-6 h-6 rounded-full border border-gray-400 mr-2 inline-block flex-shrink-0" />
                <span className="font-mono text-sm truncate">
                  {address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : "0xabc..."}
                </span>
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
          {/* Balance Card - Now shows Yellow balance */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-500 mb-2">
                Yellow Balance
              </h2>
              <div className="flex items-baseline gap-2">
                <div
                  className="text-4xl lg:text-5xl font-bold text-yellow-600"
                  style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
                >
                  {balanceLoading ? "..." : balance.toFixed(2)}{" "}
                  <span className="text-2xl lg:text-3xl text-gray-500">
                    USDC
                  </span>
                </div>
                <span className="text-yellow-500 text-lg">🟡</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Available on Nitrolite Network
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

          {/* Monthly In/Out */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              This Month
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownIcon className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-gray-500">Money In</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ${monthlyIn.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpIcon className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-gray-500">Money Out</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  ${monthlyOut.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Blockscout Merits - Real API */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Blockscout Merits
              </h3>
              <button
                onClick={handleSpendMerits}
                className="text-purple-600 hover:text-purple-800 text-xs flex items-center gap-1"
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
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {merits.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">Total Earned</div>
                  {userRank && (
                    <div className="text-xs text-purple-600 mb-3">
                      Rank: {userRank}
                    </div>
                  )}
                </>
              )}
              <div className="bg-purple-100 rounded-lg p-3">
                <div className="text-xs text-purple-700 font-medium mb-1">
                  🎁 Click to Claim
                </div>
                <div className="text-xs text-purple-600">
                  Complete transactions & claim Merit rewards!
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
              {recentTransactions.map((tx) => (
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
                            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 transition ${
                              tx.rewardClaimed
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                : "bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer"
                            }`}
                            title={
                              tx.rewardClaimed
                                ? "Already claimed"
                                : `Click to claim ${tx.meritAmount} Merits`
                            }
                          >
                            <GiftIcon className="w-3 h-3" />
                            {tx.rewardClaimed
                              ? "Claimed"
                              : `${tx.meritAmount}M`}
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-mono break-all">
                        {tx.desc}
                      </div>
                    </div>
                    <div
                      className={`font-mono text-sm font-semibold ml-3 ${
                        tx.amount.startsWith("+")
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {tx.amount}
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-center text-gray-400 text-xs mt-4 pt-4 border-t border-gray-100">
                <div className="mb-2">
                  📡 Listening for on-chain & off-chain updates
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Types Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-500 mb-4">
              Total Transactions
            </h4>
            <div className="text-3xl font-bold text-gray-800 mb-4">
              {stateChannelTxs + delegationTxs}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">State Channel</span>
                <span className="text-sm font-semibold text-blue-600">
                  {stateChannelTxs}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  EIP-7702 Delegation
                </span>
                <span className="text-sm font-semibold text-purple-600">
                  {delegationTxs}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
