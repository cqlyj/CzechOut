import { useAccount, useDisconnect } from "wagmi";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router";
import {
  ChevronLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

export const DashboardContainer = () => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();
  const emailId = uuidv4();

  // Modifiable balance starting at 1 USDC
  const [balance, setBalance] = useState<number>(1.0);

  // Monthly tracking
  const [monthlyIn] = useState<number>(547.32);
  const [monthlyOut] = useState<number>(289.5);

  // Blockscout merits (placeholder)
  const [merits] = useState<number>(42);

  // Transaction counts
  const [stateChannelTxs] = useState<number>(34);
  const [delegationTxs] = useState<number>(13);

  // Placeholder transaction data
  const recentTransactions = [
    {
      type: "CzechIn",
      desc: "125.50 from 0xabc123...",
      amount: "+125.50",
      timestamp: "2 hrs ago",
    },
    {
      type: "CzechOut",
      desc: "89.25 to 0xdef456...",
      amount: "-89.25",
      timestamp: "1 day ago",
    },
    {
      type: "CzechIn",
      desc: "67.80 from 0x789xyz...",
      amount: "+67.80",
      timestamp: "3 days ago",
    },
  ];

  const handleWalletClick = () => {
    // You can customize this - could open a wallet modal, disconnect, or show options
    const action = confirm("Disconnect wallet?");
    if (action) {
      disconnect();
    }
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
          <button
            onClick={handleWalletClick}
            className="flex items-center border border-gray-300 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full border border-gray-400 mr-2 inline-block flex-shrink-0" />
            <span className="font-mono text-sm truncate">
              {address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : "0xabc..."}
            </span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Top Row - Balance and Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Balance Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-500 mb-2">
                Total Balance
              </h2>
              <div
                className="text-4xl lg:text-5xl font-bold text-gray-800"
                style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
              >
                {balance.toFixed(2)}{" "}
                <span className="text-2xl lg:text-3xl text-gray-500">USDC</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-xl text-lg font-medium transition shadow-sm flex items-center justify-center gap-2"
                style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
              >
                <ArrowUpIcon className="w-5 h-5" />
                Send
              </button>
              <button
                className="bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-xl text-lg font-medium transition shadow-sm flex items-center justify-center gap-2"
                style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}
              >
                <ArrowDownIcon className="w-5 h-5" />
                Receive
              </button>
              <button
                className="bg-orange-500 hover:bg-orange-600 text-white py-4 px-6 rounded-xl text-lg font-medium transition shadow-sm"
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

          {/* Blockscout Merits */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              Blockscout Merits
            </h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {merits}
              </div>
              <div className="text-xs text-gray-500">Total Earned</div>
              <div className="mt-4 bg-purple-100 rounded-lg p-3">
                <div className="text-xs text-purple-700 font-medium">
                  Coming Soon
                </div>
                <div className="text-xs text-purple-600">
                  Merit system integration
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
              {recentTransactions.map((tx, idx) => (
                <div
                  key={idx}
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
                <div className="text-xs">
                  Real-time transaction monitoring coming soon
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
