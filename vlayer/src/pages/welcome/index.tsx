import { Link, useNavigate } from "react-router";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";
import { useConnectWallet } from "./useConnectWallet";
import { useAccount } from "wagmi";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  BoltIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export const WelcomePage = () => {
  const { connectWallet } = useConnectWallet();
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleConnectClick = () => {
    console.log("Connect Wallet button clicked");
    connectWallet();
  };

  const handleContinue = () => {
    navigate("/app/register");
  };

  const features = [
    {
      icon: <BoltIcon className="w-6 h-6" />,
      title: "Pay as You Go",
      description: "No phone, no cash, no cards needed. Just your face + PIN.",
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      title: "You Keep Control",
      description:
        "Your seed phrase stays with you. We handle payments via EIP-7702.",
    },
    {
      icon: <CurrencyDollarIcon className="w-6 h-6" />,
      title: "Instant Channels",
      description: "Lightning-fast state channels in Yellow's ecosystem.",
    },
    {
      icon: <GlobeAltIcon className="w-6 h-6" />,
      title: "Earn Merits",
      description: "Collect Blockscout rewards for every transaction.",
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const heroVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8, rotate: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const pulseVariants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-200 rounded-full opacity-20 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 w-80 h-80 bg-indigo-200 rounded-full opacity-20 blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <motion.div
        className="relative max-w-6xl mx-auto px-6 py-16"
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        {/* Header Section */}
        <motion.div className="text-center mb-20" variants={itemVariants}>
          <motion.div
            className="flex justify-center items-center mb-8"
            variants={logoVariants}
          >
            <motion.div
              className="relative"
              variants={pulseVariants}
              initial="initial"
              animate="animate"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <span className="text-4xl font-bold text-white">🇨🇿</span>
              </div>
              <motion.div
                className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
                animate={{
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <span className="text-lg">⚡</span>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.h1
            className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-6"
            variants={heroVariants}
          >
            CzechOut
          </motion.h1>

          <motion.p
            className="text-2xl text-gray-600 mb-3"
            variants={itemVariants}
          >
            The fastest way to send money globally
          </motion.p>

          <motion.p
            className="text-xl text-violet-600 font-medium italic mb-10"
            variants={itemVariants}
          >
            Pay anywhere. No wallet, no cards. Just you. 🎯
          </motion.p>

          <motion.div
            className="flex justify-center flex-wrap gap-8 text-sm text-gray-500 mb-12"
            variants={itemVariants}
          >
            {[
              "Face + PIN Authentication",
              "EIP-7702 Delegation",
              "State Channels",
            ].map((feature, index) => (
              <motion.div
                key={feature}
                className="flex items-center space-x-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                <span>{feature}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20"
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2 },
              }}
            >
              <motion.div
                className="text-violet-600 mb-6 group-hover:scale-110 transition-transform duration-300"
                whileHover={{ rotate: 10 }}
              >
                {feature.icon}
              </motion.div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* How it Works */}
        <motion.div
          className="bg-white rounded-3xl p-12 shadow-xl border border-gray-100 mb-20"
          variants={itemVariants}
          whileHover={{
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            transition: { duration: 0.3 },
          }}
        >
          <motion.h2
            className="text-3xl font-bold text-gray-900 text-center mb-12"
            variants={itemVariants}
          >
            Two Things. That's It.
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-12">
            {[
              {
                emoji: "👤",
                step: "Prove Who You Are",
                desc: "Transaction history + email verification. Simple identity verification using your blockchain activity patterns.",
                tech: "Email Proof + Transaction History",
              },
              {
                emoji: "🔢",
                step: "Prove What You Have",
                desc: "Your secret PIN. Combined with your identity, this unlocks instant payments via EIP-7702.",
                tech: "Zero-Knowledge PIN",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="text-center group"
                variants={itemVariants}
                whileHover={{ y: -10 }}
              >
                <motion.div
                  className="w-20 h-20 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:from-violet-200 group-hover:to-indigo-200 transition-colors duration-300"
                  whileHover={{
                    scale: 1.1,
                    rotate: 5,
                  }}
                >
                  <span className="text-3xl">{item.emoji}</span>
                </motion.div>
                <h3 className="font-bold text-gray-900 mb-3 text-xl">
                  {item.step}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  {item.desc}
                </p>
                <span className="text-xs text-violet-600 font-medium bg-violet-50 px-3 py-1 rounded-full">
                  {item.tech}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-12 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100"
            variants={itemVariants}
          >
            <div className="text-center">
              <motion.div
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                whileHover={{ scale: 1.1 }}
              >
                <span className="text-2xl">✨</span>
              </motion.div>
              <h4 className="font-bold text-gray-900 mb-2">The Magic</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your seed phrase never leaves your device. CzechOut uses{" "}
                <strong>EIP-7702 delegation</strong> to handle payments on your
                behalf, while you maintain full control. State channels ensure
                instant settlements within Yellow's ecosystem.
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Pay Anywhere Section */}
        <motion.div
          className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-3xl p-12 text-white text-center mb-20 relative overflow-hidden"
          variants={itemVariants}
          whileHover={{
            scale: 1.02,
            transition: { duration: 0.3 },
          }}
        >
          <motion.div
            className="absolute inset-0 bg-white opacity-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.05, 0.1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <div className="relative z-10">
            <motion.h2
              className="text-3xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Pay Under Any Circumstance 🌟
            </motion.h2>
            <motion.p
              className="text-xl opacity-90 mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 0.9, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Forgot your phone? Lost your wallet? No problem.
            </motion.p>
            <motion.div
              className="flex justify-center flex-wrap gap-6 text-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full">
                📊 Transaction History
              </span>
              <span className="text-white opacity-75">+</span>
              <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full">
                🔢 PIN
              </span>
              <span className="text-white opacity-75">=</span>
              <span className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-full font-bold">
                💳 Payment Ready
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div className="text-center" variants={itemVariants}>
          <AnimatePresence mode="wait">
            {isConnected && address ? (
              <motion.div
                className="space-y-6"
                key="connected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="inline-flex items-center space-x-3 bg-green-100 text-green-800 px-6 py-3 rounded-xl shadow-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  <CheckCircleIcon className="w-6 h-6" />
                  <span className="font-medium">
                    Wallet Connected: {address.slice(0, 6)}...
                    {address.slice(-4)}
                  </span>
                </motion.div>

                <div>
                  <motion.button
                    onClick={handleContinue}
                    className="inline-flex items-center space-x-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-12 py-5 rounded-2xl font-bold text-lg hover:from-violet-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 shadow-2xl"
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 20px 40px rgba(99, 102, 241, 0.4)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span>Enter CzechOut Dashboard</span>
                    <ArrowRightIcon className="w-6 h-6" />
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="space-y-6"
                key="disconnected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <motion.p
                  className="text-gray-600 mb-6 text-lg"
                  variants={itemVariants}
                >
                  Connect your wallet to start using CzechOut
                </motion.p>

                <motion.button
                  onClick={handleConnectClick}
                  className="inline-flex items-center space-x-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-12 py-5 rounded-2xl font-bold text-lg hover:from-violet-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 shadow-2xl"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(99, 102, 241, 0.4)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <span>Connect Wallet to Get Started</span>
                  <ArrowRightIcon className="w-6 h-6" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="text-center mt-20 pt-12 border-t border-gray-200"
          variants={itemVariants}
        >
          <p className="text-gray-500">
            Powered by Yellow Network • Secured by Zero-Knowledge Proofs • Built
            with ❤️ in Prague
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
