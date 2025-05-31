import { useSearchParams, useNavigate } from "react-router";
import { useAccount } from "wagmi";
import { sepolia } from "viem/chains";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  SparklesIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

export const SuccessContainer = () => {
  const [searchParams] = useSearchParams();
  const { address } = useAccount();
  const navigate = useNavigate();

  // Get transaction hashes from URL params
  const credentialsHash = searchParams.get("credentialsHash");
  const delegationHash = searchParams.get("delegationHash");

  // Animation states
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti animation
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, []);

  const truncateHash = (hash: string) => {
    if (!hash) return "";
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center px-8 py-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {showConfetti && (
          <>
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  opacity: 1,
                  scale: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: window.innerHeight + 20,
                  rotate: Math.random() * 360,
                  opacity: 0,
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Main success content */}
        <motion.div
          className="text-center space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Success icon */}
          <motion.div
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-xl">
              <CheckCircleIcon className="w-16 h-16 text-green-600" />
            </div>
          </motion.div>

          {/* Success message */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center space-x-3">
              <SparklesIcon className="w-8 h-8 text-yellow-500" />
              <h1 className="text-6xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Skvělé! Success! 🎉
              </h1>
              <SparklesIcon className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Your CzechOut account is now fully configured! You can now make
              secure transactions using just your{" "}
              <span className="font-bold text-blue-600">face + PIN</span>{" "}
              authentication.
            </p>
          </motion.div>

          {/* Account info */}
          {address && (
            <motion.div
              className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 rounded-3xl p-8 max-w-2xl mx-auto shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center justify-center space-x-3">
                <ShieldCheckIcon className="w-7 h-7 text-blue-600" />
                <span>Your Smart Account</span>
              </h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4">
                  <div className="text-lg font-medium text-gray-700 mb-2">
                    Wallet Address:
                  </div>
                  <div className="font-mono text-xl text-blue-700 break-all">
                    {address}
                  </div>
                  <a
                    href={`${sepolia.blockExplorers.default.url}/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 mt-3 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    <span>View on Sepolia Explorer</span>
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {/* Transaction details */}
          {(credentialsHash || delegationHash) && (
            <motion.div
              className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              {credentialsHash && (
                <div className="bg-white/80 backdrop-blur-sm border-2 border-green-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <DocumentCheckIcon className="w-6 h-6 text-green-600" />
                    <h4 className="text-xl font-bold text-gray-800">
                      Credentials Registered
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div className="text-gray-600">
                      ZK proof verified and stored on-chain
                    </div>
                    <div className="font-mono text-sm bg-green-50 rounded-lg p-3 break-all">
                      {truncateHash(credentialsHash)}
                    </div>
                    <a
                      href={`${sepolia.blockExplorers.default.url}/tx/${credentialsHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-2 text-green-600 hover:text-green-800 font-medium transition-colors"
                    >
                      <span>View Transaction</span>
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {delegationHash && (
                <div className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
                    <h4 className="text-xl font-bold text-gray-800">
                      EIP-7702 Delegation
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div className="text-gray-600">
                      Smart contract wallet activated
                    </div>
                    <div className="font-mono text-sm bg-purple-50 rounded-lg p-3 break-all">
                      {truncateHash(delegationHash)}
                    </div>
                    <a
                      href={`${sepolia.blockExplorers.default.url}/tx/${delegationHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-800 font-medium transition-colors"
                    >
                      <span>View Transaction</span>
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Features summary */}
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-8 text-white max-w-4xl mx-auto shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5 }}
          >
            <h3 className="text-3xl font-bold mb-6">Your CzechOut Powers ⚡</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">🎭</span>
                </div>
                <div className="font-bold text-xl">Face Recognition</div>
                <div className="text-blue-100">
                  Secure biometric authentication
                </div>
              </div>
              <div className="space-y-3">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">🔐</span>
                </div>
                <div className="font-bold text-xl">PIN Security</div>
                <div className="text-blue-100">Additional security layer</div>
              </div>
              <div className="space-y-3">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">⚡</span>
                </div>
                <div className="font-bold text-xl">Gas-Free Txns</div>
                <div className="text-blue-100">EIP-7702 delegation power</div>
              </div>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
          >
            <motion.button
              onClick={() => navigate("/dashboard")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 shadow-xl transition-all duration-200 flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <HomeIcon className="w-6 h-6" />
              <span>Go to Dashboard</span>
            </motion.button>

            <motion.button
              onClick={() => navigate("/welcome")}
              className="bg-white text-gray-700 border-2 border-gray-300 px-10 py-4 rounded-2xl font-bold text-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-offset-2 shadow-lg transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Over
            </motion.button>
          </motion.div>

          {/* Czech branding */}
          <motion.div
            className="pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.1 }}
          >
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium">Powered by</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-red-500 via-white to-blue-500 bg-clip-text text-transparent">
                🇨🇿 CzechOut Technology
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
