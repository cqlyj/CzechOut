import { useAccount, useWalletClient } from "wagmi";
import { privateKeyToAccount } from "viem/accounts";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CogIcon,
  DocumentCheckIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import ZKProofService from "./zkProofService";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

// Contract addresses from .note.md
const REGISTRY_ADDRESS = "0x9469A68F08f692a7df72E6fE66674b4833657C96";
const DELEGATION_ADDRESS = "0xf746D07609aF6E1410086F7A62a00D0a5EA1cdA0";

// Registry ABI for the register function
const REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    inputs: [
      { name: "_pA", type: "uint256[2]" },
      { name: "_pB", type: "uint256[2][2]" },
      { name: "_pC", type: "uint256[2]" },
      { name: "wallet", type: "uint256" },
      { name: "intent", type: "uint256" },
      { name: "credential_hash", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "result_hash", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

type SetupStep = "credentials" | "delegation" | "completed";

export const Update7702Page = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<SetupStep>("credentials");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentialsHash, setCredentialsHash] = useState<string>("");
  const [delegationHash, setDelegationHash] = useState<string>("");
  const [generatingProof, setGeneratingProof] = useState(false);
  const [proofStep, setProofStep] = useState("");

  // Get ZK proof service instance
  const zkProofService = ZKProofService.getInstance();

  useEffect(() => {
    // Check if user has completed registration
    const registrationCompleted = localStorage.getItem("registrationCompleted");
    if (!registrationCompleted) {
      navigate("/app/register");
    }
  }, [navigate]);

  const handleRegisterCredentials = async () => {
    if (!address || !walletClient) {
      setError("Please connect your wallet");
      return;
    }

    // Get user's PIN from localStorage
    const userPin = localStorage.getItem("userPin");
    if (!userPin) {
      setError("PIN not found. Please register first.");
      return;
    }

    setIsLoading(true);
    setGeneratingProof(true);
    setError("");

    try {
      // Step 1: Generate ZK proof using the service
      setProofStep("Generating ZK inputs...");
      console.log("🔄 Starting ZK proof generation");
      console.log("Wallet Address:", address);
      console.log("PIN:", userPin);

      const proof = await zkProofService.generateFullProof(address, userPin);

      setProofStep("Submitting to blockchain...");
      setGeneratingProof(false);

      // Step 2: Call Registry.register() with the generated proof
      console.log("🔄 Submitting to Registry contract...");
      const hash = await walletClient.writeContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "register",
        args: [
          [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
          [
            [BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])],
            [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])],
          ],
          [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
          BigInt(proof.publicSignals[0]), // wallet
          BigInt(proof.publicSignals[1]), // intent
          BigInt(proof.publicSignals[2]), // credential_hash
          BigInt(proof.publicSignals[3]), // nonce
          BigInt(proof.publicSignals[4]), // result_hash
        ],
      });

      console.log("✅ Registry transaction submitted:", hash);
      setCredentialsHash(hash);
      setCurrentStep("delegation");

      // Wait for transaction confirmation
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error("❌ Credentials registration failed:", error);
      setError(`Registration failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
      setGeneratingProof(false);
      setProofStep("");
    }
  };

  const handleSetupDelegation = async () => {
    if (!address || !walletClient) {
      setError("Please connect your wallet");
      return;
    }

    // Check if private key is available
    const privateKey = import.meta.env.VITE_PRIVATE_KEY;
    if (!privateKey) {
      setError(
        "Private key not found in environment variables. Please add VITE_PRIVATE_KEY to your .env file"
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Create account from private key
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      // Create wallet client with private key for EIP-7702 support
      const privateKeyWalletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(),
      });

      console.log("🔄 Setting up EIP-7702 delegation...");
      console.log("Account address:", account.address);
      console.log("Delegation contract:", DELEGATION_ADDRESS);

      // Sign EIP-7702 authorization
      const authorization = await privateKeyWalletClient.signAuthorization({
        chainId: sepolia.id,
        contractAddress: DELEGATION_ADDRESS,
        executor: "self",
      });

      console.log("✅ Authorization signed:", authorization);

      // Send type 4 transaction with authorization
      const hash = await privateKeyWalletClient.sendTransaction({
        authorizationList: [authorization],
        data: "0x",
        to: account.address,
        value: 0n,
      });

      console.log("✅ EIP-7702 transaction sent:", hash);
      setDelegationHash(hash);
      setCurrentStep("completed");

      // Mark setup as complete
      localStorage.setItem("accountSetupCompleted", "true");

      // Navigate to success after animation
      setTimeout(() => {
        navigate(
          `/success?credentialsHash=${credentialsHash}&delegationHash=${hash}`
        );
      }, 3000);
    } catch (error: any) {
      console.error("❌ Delegation setup failed:", error);
      setError(`Delegation failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCredentialsStep = () => (
    <motion.div
      className="flex flex-col items-center space-y-8"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center"
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        <DocumentCheckIcon className="w-10 h-10 text-blue-600" />
      </motion.div>

      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-gray-900">
          Register Your Credentials
        </h2>
        <p className="text-gray-600 max-w-2xl text-lg">
          We'll generate a zero-knowledge proof using your face credentials and
          PIN, then register it on-chain. This proves you own the credentials
          without revealing them.
        </p>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 max-w-xl">
        <h3 className="font-bold text-blue-800 mb-3 text-lg">
          {generatingProof ? "Generating ZK Proof..." : "What happens next:"}
        </h3>
        {generatingProof ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-700">
                {proofStep || "Computing Poseidon hashes..."}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: generatingProof ? "60%" : "0%" }}
              />
            </div>
            <p className="text-sm text-blue-600">
              Using your wallet address and PIN to create zero-knowledge proof
            </p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CogIcon className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-700">
                {proofStep || "Submitting to Registry contract..."}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: "90%" }}
              />
            </div>
          </div>
        ) : (
          <ul className="space-y-2 text-blue-700">
            <li className="flex items-start space-x-3">
              <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Generate ZK proof from your PIN + wallet address</span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Submit proof to Registry contract</span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Enable secure account recovery</span>
            </li>
          </ul>
        )}
      </div>

      {error && (
        <motion.div
          className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 max-w-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-red-800 font-medium">{error}</p>
        </motion.div>
      )}

      <motion.button
        onClick={handleRegisterCredentials}
        disabled={isLoading}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-12 py-4 rounded-2xl font-bold text-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isLoading ? (
          <span className="flex items-center space-x-3">
            <ArrowPathIcon className="w-6 h-6 animate-spin" />
            <span>
              {generatingProof
                ? "Generating Proof..."
                : "Registering Credentials..."}
            </span>
          </span>
        ) : (
          <span className="flex items-center space-x-3">
            <DocumentCheckIcon className="w-6 h-6" />
            <span>Generate Proof & Register</span>
          </span>
        )}
      </motion.button>
    </motion.div>
  );

  const renderDelegationStep = () => (
    <motion.div
      className="flex flex-col items-center space-y-8"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center"
        whileHover={{ scale: 1.1, rotate: -5 }}
      >
        <ShieldCheckIcon className="w-10 h-10 text-violet-600" />
      </motion.div>

      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-gray-900">
          Setup Account Delegation
        </h2>
        <p className="text-gray-600 max-w-2xl text-lg">
          Now we'll set up EIP-7702 delegation, allowing your account to use
          smart contract functionality for secure face + PIN transactions
          without needing to hold ETH for gas.
        </p>
      </div>

      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 max-w-xl">
        <div className="flex items-center space-x-3">
          <CheckCircleIcon className="w-6 h-6 text-green-600" />
          <span className="text-green-800 font-medium">
            Credentials registered successfully!
          </span>
        </div>
        {credentialsHash && (
          <p className="text-green-700 text-sm mt-2 font-mono break-all">
            Tx: {credentialsHash.slice(0, 10)}...{credentialsHash.slice(-8)}
          </p>
        )}
      </div>

      <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-6 max-w-xl">
        <h3 className="font-bold text-violet-800 mb-3 text-lg">
          EIP-7702 Benefits:
        </h3>
        <ul className="space-y-2 text-violet-700">
          <li className="flex items-start space-x-3">
            <ChevronRightIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>Smart contract wallet functionality</span>
          </li>
          <li className="flex items-start space-x-3">
            <ChevronRightIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>Gas-free transactions via delegation</span>
          </li>
          <li className="flex items-start space-x-3">
            <ChevronRightIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>Enhanced security with face + PIN auth</span>
          </li>
        </ul>
      </div>

      {error && (
        <motion.div
          className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 max-w-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-red-800 font-medium">{error}</p>
        </motion.div>
      )}

      <motion.button
        onClick={handleSetupDelegation}
        disabled={isLoading}
        className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-12 py-4 rounded-2xl font-bold text-xl hover:from-violet-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isLoading ? (
          <span className="flex items-center space-x-3">
            <ArrowPathIcon className="w-6 h-6 animate-spin" />
            <span>Setting up Delegation...</span>
          </span>
        ) : (
          <span className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-6 h-6" />
            <span>Setup Delegation</span>
          </span>
        )}
      </motion.button>
    </motion.div>
  );

  const renderCompletedStep = () => (
    <motion.div
      className="flex flex-col items-center space-y-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <CheckCircleIcon className="w-12 h-12 text-green-600" />
      </motion.div>

      <div className="text-center space-y-6">
        <h2 className="text-4xl font-bold text-gray-900">Setup Complete! 🎉</h2>
        <p className="text-gray-600 max-w-2xl text-lg">
          Your CzechOut account is now fully configured with secure on-chain
          credentials and EIP-7702 delegation. You can now make transactions
          using just your face + PIN!
        </p>
      </div>

      <motion.div
        className="flex justify-center space-x-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.3 },
          },
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-4 h-4 bg-green-500 rounded-full"
            variants={{
              hidden: { opacity: 0.3, scale: 0.8 },
              visible: {
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 0.8,
                  repeat: Infinity,
                  repeatType: "reverse",
                },
              },
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );

  return (
    <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-white to-violet-50 flex items-center justify-center px-8 py-4">
      <div className="w-full max-w-4xl">
        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-8">
            <div
              className={`flex items-center space-x-3 ${
                currentStep === "credentials"
                  ? "text-blue-600"
                  : currentStep === "delegation"
                    ? "text-gray-400"
                    : "text-green-600"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === "credentials"
                    ? "bg-blue-100 border-2 border-blue-600"
                    : currentStep === "delegation"
                      ? "bg-gray-100"
                      : "bg-green-100"
                }`}
              >
                {currentStep === "credentials"
                  ? "1"
                  : currentStep === "delegation"
                    ? "1"
                    : "✓"}
              </div>
              <span className="font-medium">Register Credentials</span>
            </div>

            <div
              className={`w-12 h-0.5 ${
                currentStep === "delegation" || currentStep === "completed"
                  ? "bg-blue-300"
                  : "bg-gray-200"
              }`}
            />

            <div
              className={`flex items-center space-x-3 ${
                currentStep === "delegation"
                  ? "text-violet-600"
                  : currentStep === "completed"
                    ? "text-green-600"
                    : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === "delegation"
                    ? "bg-violet-100 border-2 border-violet-600"
                    : currentStep === "completed"
                      ? "bg-green-100"
                      : "bg-gray-100"
                }`}
              >
                {currentStep === "delegation"
                  ? "2"
                  : currentStep === "completed"
                    ? "✓"
                    : "2"}
              </div>
              <span className="font-medium">Setup Delegation</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <AnimatePresence mode="wait">
          {currentStep === "credentials" && renderCredentialsStep()}
          {currentStep === "delegation" && renderDelegationStep()}
          {currentStep === "completed" && renderCompletedStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};
