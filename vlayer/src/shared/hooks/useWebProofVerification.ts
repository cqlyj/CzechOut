import { useState, useRef, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseAbi } from "viem";

// Simple transaction history verification steps
enum TransactionVerificationStep {
  READY = "Ready to start verification",
  LOADING_HISTORY = "Loading your transaction history...",
  QUESTION = "Answer verification question",
  VERIFYING = "Verifying answer...",
  COMPLETE = "Verification complete!",
}

// Verification data interface
interface VerificationData {
  questionCorrect: boolean;
  userAnswer: string;
  attempts: number;
}

// Transaction history interface
interface TransactionHistory {
  hasEIP7702: boolean;
  questionText: string;
  correctAnswer: string;
}

export const useWebProofVerification = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Core states
  const [currentStep, setCurrentStep] = useState<TransactionVerificationStep>(
    TransactionVerificationStep.READY
  );
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");

  // Transaction verification states
  const [transactionHistory, setTransactionHistory] =
    useState<TransactionHistory | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData>({
    questionCorrect: false,
    userAnswer: "",
    attempts: 0,
  });

  // Question and answer
  const [question, setQuestion] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");

  // Legacy props for compatibility
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream] = useState<MediaStream | null>(null);
  const [webcamActive] = useState(false);
  const [faceDetected] = useState(false);
  const [isListening] = useState(false);
  const [voiceProgress] = useState(0);
  const [currentTranscript] = useState("");
  const [recoveryPhrase] = useState("");
  const [biometricData] = useState({
    voiceVerified: false,
    gestureComplete: false,
    voiceConfidence: 0,
    spokenPhrase: "",
    expectedPhrase: "",
    faceHash: "",
  });

  // Contract addresses from .note.md
  const WEB_PROOF_VERIFIER_ADDRESS =
    "0x50A1622D80BAe063D47AF339EB5Bf713D1D0542d";

  // Load transaction history and generate simple yes/no question
  const loadTransactionHistory = async () => {
    setCurrentStep(TransactionVerificationStep.LOADING_HISTORY);
    setError("");

    try {
      // Simulate transaction history loading
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check local storage for user's EIP-7702 usage (set during registration or previous transactions)
      const hasUsedEIP7702 =
        localStorage.getItem("czechout_eip7702_used") === "true";

      // Simple yes/no question
      const questionText = "Have you used EIP-7702 transactions before?";
      const correctAnswer = hasUsedEIP7702 ? "yes" : "no";

      const history: TransactionHistory = {
        hasEIP7702: hasUsedEIP7702,
        questionText,
        correctAnswer,
      };

      setTransactionHistory(history);
      setQuestion(questionText);
      setCorrectAnswer(correctAnswer);

      setCurrentStep(TransactionVerificationStep.QUESTION);
    } catch (error: any) {
      console.error("❌ Failed to load transaction history:", error);
      setError("Failed to load transaction history. Please try again.");
      setCurrentStep(TransactionVerificationStep.READY);
    }
  };

  // Handle answer submission
  const submitAnswer = (answer: string) => {
    setVerificationData((prev) => ({ ...prev, userAnswer: answer }));

    // Check if answer is correct (case insensitive)
    const isCorrect =
      answer.toLowerCase().trim() === correctAnswer.toLowerCase();

    setVerificationData((prev) => ({ ...prev, questionCorrect: isCorrect }));

    if (isCorrect) {
      completeVerification();
    } else {
      const newAttempts = verificationData.attempts + 1;
      setVerificationData((prev) => ({ ...prev, attempts: newAttempts }));

      if (newAttempts >= 3) {
        setError("Too many incorrect attempts. Please try again later.");
        setCurrentStep(TransactionVerificationStep.READY);
      } else {
        setError(`Incorrect answer. ${3 - newAttempts} attempts remaining.`);
        setTimeout(() => setError(""), 3000);
      }
    }
  };

  // Complete verification and submit to contract
  const completeVerification = async () => {
    setCurrentStep(TransactionVerificationStep.VERIFYING);

    try {
      // Create verification proof data
      const verificationProofData = {
        result: ["true"], // Transaction history verification passed
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        verificationData: {
          questionCorrect: verificationData.questionCorrect,
          transactionHistoryHash: `tx_history_${address?.slice(
            -8
          )}_${Date.now()}`,
          walletAddress: address,
        },
        address,
      };

      console.log(
        "🔐 Generated transaction verification proof:",
        verificationProofData
      );

      if (!walletClient || !address) {
        throw new Error("Wallet not connected");
      }

      const abi = parseAbi([
        "function setWebVerified(address _wallet, bool _verified) external",
      ]);

      const txHash = await walletClient.writeContract({
        address: WEB_PROOF_VERIFIER_ADDRESS,
        abi,
        functionName: "setWebVerified",
        args: [address, true],
      });

      console.log("✅ Transaction submitted:", txHash);

      // Wait for transaction confirmation
      await publicClient?.waitForTransactionReceipt({ hash: txHash });

      setCurrentStep(TransactionVerificationStep.COMPLETE);
      setIsComplete(true);
      console.log("✅ Transaction history verification complete!");
    } catch (error: any) {
      console.error("❌ Verification failed:", error);
      setError(error.message || "Failed to complete verification");
      setCurrentStep(TransactionVerificationStep.READY);
    }
  };

  // Start verification process
  const startWebProof = async () => {
    if (currentStep !== TransactionVerificationStep.READY) {
      console.log("🔐 Verification already in progress");
      return;
    }

    try {
      await loadTransactionHistory();
    } catch (error: any) {
      console.error("❌ Verification failed:", error);
      setError(error.message || "Failed to start verification");
    }
  };

  // Reset states
  const reset = () => {
    setCurrentStep(TransactionVerificationStep.READY);
    setIsComplete(false);
    setError("");
    setTransactionHistory(null);
    setVerificationData({
      questionCorrect: false,
      userAnswer: "",
      attempts: 0,
    });
  };

  // Navigate to next step (callback for UI)
  const proceedToNextStep = () => {
    if (currentStep === TransactionVerificationStep.READY) {
      startWebProof();
    }
  };

  return {
    currentStep,
    isComplete,
    error,
    videoRef,
    cameraStream,
    biometricData,
    recoveryPhrase,
    webcamActive,
    faceDetected,
    isListening,
    voiceProgress,
    currentTranscript,
    startWebProof,
    reset,
    proceedToNextStep,
    // New transaction verification specific props
    transactionHistory,
    question,
    submitAnswer,
    verificationData,
  };
};
