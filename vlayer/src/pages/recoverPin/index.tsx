import {
  useAccount,
  useConnect,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { useNavigate, useSearchParams } from "react-router";
import { useState, useEffect, useRef } from "react";
import { injected } from "wagmi/connectors";
import { parseAbi } from "viem";
import {
  ChevronLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  KeyIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { v4 as uuidv4 } from "uuid";
import { useEmailProofVerification } from "../../shared/hooks/useEmailProofVerification";
import useExampleInbox from "../../shared/hooks/useExampleInbox";
import { useWebProofVerification } from "../../shared/hooks/useWebProofVerification";
import ZKProofService from "../update7702/zkProofService";

// Contract addresses from .note.md
const REGISTRY_ADDRESS = "0x9469A68F08f692a7df72E6fE66674b4833657C96";

// Registry ABI for the recover function
const REGISTRY_ABI = [
  {
    type: "function",
    name: "recover",
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
  {
    type: "function",
    name: "isVerifiedToRecover",
    inputs: [{ name: "wallet", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

// Import the enum for proper type checking
enum TransactionVerificationStep {
  READY = "Ready to start verification",
  LOADING_HISTORY = "Loading your transaction history...",
  QUESTION_1 = "Answer verification question 1",
  QUESTION_2 = "Answer verification question 2",
  VERIFYING = "Verifying answers...",
  COMPLETE = "Verification complete!",
}

// PIN input component for new PIN setup
const PinInput = ({
  onComplete,
  disabled,
  title = "Enter PIN",
}: {
  onComplete: (pin: string) => void;
  disabled: boolean;
  title?: string;
}) => {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if PIN is complete
    if (newPin.every((digit) => digit !== "")) {
      onComplete(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    // Reset PIN when title changes (for confirm step)
    setPin(["", "", "", "", "", ""]);
  }, [title]);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-center text-gray-700">
        {title}
      </h3>
      <div className="flex gap-3 justify-center">
        {pin.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={disabled}
            className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100 text-black"
          />
        ))}
      </div>
    </div>
  );
};

// Input with copy functionality
const InputWithCopy = ({ label, value }: { label: string; value: string }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    alert(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
        <span className="flex-1 font-mono text-sm text-gray-800 break-all">
          {value}
        </span>
        <button
          onClick={copyToClipboard}
          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs flex items-center gap-1 shrink-0"
        >
          <ClipboardDocumentIcon className="w-3 h-3" />
          Copy
        </button>
      </div>
    </div>
  );
};

export const RecoverPinContainer = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Get email ID from URL params (for email collection step)
  const uniqueEmail = searchParams.get("uniqueEmail");
  const emailIdFromParams = uniqueEmail?.split("@")[0];

  // Component state - determine step based on URL params
  const [step, setStep] = useState(() => {
    if (uniqueEmail) return 3; // If we have uniqueEmail param, we're in email collection mode
    return 1; // Otherwise start from beginning
  });

  const [error, setError] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Recovery state
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [recoveryProofStep, setRecoveryProofStep] = useState("");
  const [recoveryTxHash, setRecoveryTxHash] = useState("");

  // Get ZK proof service instance
  const zkProofService = ZKProofService.getInstance();

  // Get prestored user email from localStorage (set during registration)
  const storedUserEmail = localStorage.getItem("userEmail");

  // Email proof setup - use from params or generate new
  const emailId = emailIdFromParams || uuidv4();
  const recoveryEmail = `${emailId}@proving.vlayer.xyz`;

  // Email subject for PIN recovery - must match EmailDomainProver contract requirements
  const emailSubject = `Recover my PIN for wallet at address: ${address}`;

  // Hooks for email proof verification - handle updated interface
  const {
    emlFetched,
    error: emailFetchError,
    isSimulated,
  } = useExampleInbox(
    step === 3 ? emailId : undefined // Only fetch when in step 3
  );

  // Determine if email service is disabled based on error type
  const isEmailServiceDisabled =
    emailFetchError?.includes("Rate limited") ||
    emailFetchError?.includes("temporarily unavailable") ||
    emailFetchError?.includes("403");

  const {
    currentStep: emailProofStep,
    startProving,
    txHash,
    verificationError,
  } = useEmailProofVerification();

  // Debug log for email proof step
  console.log("📧 Email Proof Step Debug:", {
    emailProofStep,
    txHash: !!txHash,
    step,
    isComplete: emailProofStep === "Done!" && !!txHash,
  });

  // Hook for transaction history verification
  const {
    currentStep: webProofStep,
    startWebProof,
    isComplete: webProofComplete,
    error: webProofError,
    videoRef,
    cameraStream,
    biometricData,
    recoveryPhrase,
    proceedToNextStep,
    isListening,
    voiceProgress,
    currentTranscript,
    // New transaction verification props
    question,
    submitAnswer,
    verificationData,
  } = useWebProofVerification();

  // State for user input
  const [userAnswer, setUserAnswer] = useState("");

  // Check if user has a registered email for recovery
  useEffect(() => {
    if (!storedUserEmail && step > 1) {
      setError(
        "No registered email found. Please complete registration first to enable PIN recovery."
      );
    }
  }, [storedUserEmail, step]);

  // Update step when URL parameters change
  useEffect(() => {
    if (uniqueEmail && step !== 3 && step < 4) {
      console.log("📧 Email parameter detected, moving to step 3");
      setStep(3);
    }
  }, [uniqueEmail, step]);

  // Handle answer submission
  const handleAnswerSubmit = () => {
    if (!userAnswer.trim()) {
      setError("Please enter an answer");
      return;
    }

    submitAnswer(userAnswer);
    setUserAnswer(""); // Clear input
  };

  // Clear error when user starts typing
  useEffect(() => {
    if (userAnswer && error) {
      setError("");
    }
  }, [userAnswer, error]);

  // Step handlers
  const handleStartRecovery = () => {
    if (!storedUserEmail) {
      setError(
        "No registered email found. Please complete registration first to enable PIN recovery."
      );
      return;
    }
    setError(""); // Clear any existing errors
    setStep(2);
  };

  const handleEmailSent = () => {
    setError(""); // Clear any existing errors
    // Navigate to the same page but with uniqueEmail parameter (like vlayer template)
    navigate(`/recover-pin?uniqueEmail=${recoveryEmail}`);
  };

  const handleNewPinComplete = (pin: string) => {
    if (!newPin) {
      setNewPin(pin);
      setError("");
    } else {
      setConfirmPin(pin);
      if (pin === newPin) {
        // Call the recovery function instead of just saving locally
        completeRecovery(newPin);
        setError("");
      } else {
        setError("PINs do not match. Please try again.");
        setNewPin("");
        setConfirmPin("");
      }
    }
  };

  // Email verification effect - like collectEmail page in vlayer template
  useEffect(() => {
    if (emlFetched && step === 3 && emailProofStep === "Mint") {
      const storedEml = localStorage.getItem("emlFile");

      if (storedEml && storedEml.length > 0) {
        try {
          // Pass simulation flag to the prover
          startProving(storedEml, isSimulated);
          setError(""); // Clear any existing errors
        } catch (error) {
          console.error("❌ Error starting proof generation:", error);
          setError(
            `Proof generation failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else {
        setError(
          "Email content not found. Please try sending the email again."
        );
      }
    }
  }, [emlFetched, step, emailProofStep, startProving, isSimulated]);

  // Handle email fetch errors
  useEffect(() => {
    if (emailFetchError && step === 3) {
      setError(emailFetchError);
    }
  }, [emailFetchError, step]);

  // Email proof completion effect - stay on PIN recovery instead of redirecting
  useEffect(() => {
    console.log("🔍 Debug step transition:", {
      emailProofStep,
      step,
      condition: emailProofStep === "Done!" && step === 3,
    });

    // Only auto-transition if we haven't manually moved already
    if (emailProofStep === "Done!" && step === 3) {
      console.log(
        "✅ Email proof verified - auto-transition will be available"
      );
      setError(""); // Clear any existing errors
      // Don't auto-transition anymore - let user click button
    }
  }, [emailProofStep, step]);

  // Manual step transition function
  const handleContinueToFaceScan = () => {
    if (isTransitioning) {
      console.log("🚫 Transition already in progress, ignoring click");
      return;
    }

    console.log("🔘 Manual transition to step 4 triggered");
    console.log("📊 Current state:", {
      emailProofStep,
      txHash: !!txHash,
      step,
      uniqueEmail: !!uniqueEmail,
    });
    setIsTransitioning(true);
    setError(""); // Clear any existing errors

    try {
      // Direct transition without setTimeout
      console.log("🔄 Setting step to 4...");
      setStep(4);
      console.log("🔄 Step set to 4 completed");
    } catch (error) {
      console.error("❌ Error setting step:", error);
      setIsTransitioning(false);
    }

    // Reset transition state after a brief moment
    setTimeout(() => {
      setIsTransitioning(false);
      console.log("✅ Transition completed, step should be:", step);
    }, 500);
  };

  // Debug step changes
  useEffect(() => {
    console.log("📍 Step changed to:", step);
    if (step === 4) {
      console.log(
        "🎯 Successfully reached step 4 - Transaction History Verification!"
      );
    }
  }, [step]);

  // Force step 4 when transitioning (backup mechanism)
  useEffect(() => {
    if (isTransitioning && step !== 4) {
      console.log("🔧 Force setting step to 4 during transition");
      setTimeout(() => setStep(4), 100);
    }
  }, [isTransitioning, step]);

  // Transaction history verification completion effect
  useEffect(() => {
    if (webProofComplete && step === 4) {
      console.log(
        "✅ Transaction history verification complete! Moving to PIN setup"
      );
      setError(""); // Clear any existing errors
      setStep(5); // Move to PIN setup
    }
  }, [webProofComplete, step]);

  // Reset flow
  const resetFlow = () => {
    setStep(1);
    setError("");
    setNewPin("");
    setConfirmPin("");
    navigate("/recover-pin"); // Go back to start without params
  };

  // Complete verification and submit to contract - this will be called when PIN is set
  const completeRecovery = async (pin: string) => {
    if (!address || !walletClient || !publicClient) {
      setError("Wallet not connected");
      return;
    }

    setIsGeneratingProof(true);
    setError("");

    try {
      // Step 1: Check if user is verified to recover
      setRecoveryProofStep("Checking verification status...");

      const walletAsUint = BigInt(address);
      const isVerified = await publicClient.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "isVerifiedToRecover",
        args: [walletAsUint],
      });

      if (!isVerified) {
        throw new Error("Email and web verification required for recovery");
      }

      // Step 2: Generate ZK proof with new PIN
      setRecoveryProofStep("Generating zero-knowledge proof...");
      console.log("🔄 Starting ZK proof generation for recovery");
      console.log("Wallet Address:", address);
      console.log("New PIN:", pin);

      const proof = await zkProofService.generateFullProof(address, pin);

      // Step 3: Call Registry.recover() with the generated proof
      setRecoveryProofStep("Submitting recovery to blockchain...");
      console.log("🔄 Submitting to Registry recover function...");

      const hash = await walletClient.writeContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "recover",
        args: [
          [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
          [
            [BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])],
            [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])],
          ],
          [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
          BigInt(proof.publicSignals[0]), // wallet
          BigInt(proof.publicSignals[1]), // intent (0 for register/recover)
          BigInt(proof.publicSignals[2]), // credential_hash
          BigInt(proof.publicSignals[3]), // nonce
          BigInt(proof.publicSignals[4]), // result_hash
        ],
      });

      console.log("✅ Recovery transaction submitted:", hash);
      setRecoveryTxHash(hash);

      // Wait for transaction confirmation
      setRecoveryProofStep("Waiting for transaction confirmation...");
      await publicClient.waitForTransactionReceipt({ hash });

      // Save new PIN locally (encrypted storage would be better in production)
      localStorage.setItem("czechout_recovery_pin", pin);
      localStorage.setItem("userPin", pin); // Update the current PIN

      console.log("✅ PIN recovery complete!");
      setStep(6); // Move to success
    } catch (error: any) {
      console.error("❌ Recovery failed:", error);
      setError(`Recovery failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsGeneratingProof(false);
      setRecoveryProofStep("");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
            Connect Wallet to Recover PIN
          </h1>
          <button
            onClick={() => connect({ connector: injected() })}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg font-medium"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-xl font-bold text-gray-800">Recover PIN</h1>
          <div className="w-16"></div> {/* Spacer */}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-8">
        {/* Progress Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5, 6].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 6 && (
                  <div
                    className={`w-8 h-1 ${
                      step > stepNum ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Labels */}
        <div className="flex justify-center mb-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {step === 1 && "Recovery Information"}
              {step === 2 && "Send Recovery Email"}
              {step === 3 && "Email Proof Verification"}
              {step === 4 && "Transaction History Verification"}
              {step === 5 && "Set New PIN"}
              {step === 6 && "Recovery Complete"}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-12">
          {/* Step 1: Recovery Information */}
          {step === 1 && (
            <div className="text-center">
              <KeyIcon className="w-16 h-16 text-blue-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                PIN Recovery with vlayer 2FA
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Secure PIN recovery using vlayer's zero-knowledge email and web
                proofs
              </p>

              <div className="space-y-6 mb-10">
                <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <EnvelopeIcon className="w-8 h-8 text-blue-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-blue-800">
                      Step 1: Email Proof
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Send recovery email from your registered address for
                      vlayer verification
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <GlobeAltIcon className="w-8 h-8 text-purple-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-purple-800">
                      Step 2: Transaction History
                    </h3>
                    <p className="text-purple-700 text-sm">
                      Verify your identity using your blockchain transaction
                      patterns and history
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <KeyIcon className="w-8 h-8 text-green-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-green-800">
                      Step 3: New PIN
                    </h3>
                    <p className="text-green-700 text-sm">
                      Set a new 6-digit PIN for your account
                    </p>
                  </div>
                </div>
              </div>

              {storedUserEmail && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-8">
                  <p className="text-green-800 text-sm">
                    ✅ <strong>Registered Email Found:</strong>{" "}
                    {storedUserEmail}
                    <br />
                    <span className="text-green-700">
                      You can proceed with PIN recovery using this email
                      address.
                    </span>
                  </p>
                </div>
              )}

              {!storedUserEmail && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-8">
                  <p className="text-red-800 text-sm">
                    ❌ <strong>No Registered Email Found</strong>
                    <br />
                    You need to complete registration first to enable PIN
                    recovery.
                    <br />
                    <button
                      onClick={() => navigate("/register")}
                      className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                    >
                      Go to Registration
                    </button>
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-8">
                <p className="text-yellow-800 text-sm">
                  🔐 <strong>Security Notice:</strong> This process uses
                  vlayer's zero-knowledge proofs to verify your identity without
                  revealing sensitive information.
                </p>
              </div>

              <button
                onClick={handleStartRecovery}
                disabled={!storedUserEmail}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
              >
                Start PIN Recovery
              </button>
            </div>
          )}

          {/* Step 2: Send Recovery Email */}
          {step === 2 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                Send Recovery Email
              </h2>
              <p className="text-xl text-gray-600 mb-10 text-center">
                Send an email from your registered address for vlayer
                verification
              </p>

              <div className="space-y-6">
                {storedUserEmail && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-6">
                    <div className="text-green-800 text-sm">
                      📧 <strong>Your Registered Email:</strong>{" "}
                      {storedUserEmail}
                      <br />
                      <span className="text-green-700">
                        You must send the recovery email FROM this address for
                        vlayer to verify.
                      </span>
                    </div>
                  </div>
                )}

                <InputWithCopy
                  label="Send TO (vlayer Email Service)"
                  value={recoveryEmail}
                />
                <InputWithCopy
                  label="Subject Line (Must be exact)"
                  value={emailSubject}
                />

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="text-blue-800 text-sm">
                    📧 <strong>vlayer Email Requirements:</strong>
                    <br />
                    1. <strong>Use your email client</strong> (Gmail, Outlook,
                    etc.)
                    <br />
                    2. <strong>Send FROM your registered email:</strong>{" "}
                    {storedUserEmail}
                    <br />
                    3. <strong>Send TO the address above</strong> (copy the
                    vlayer email address)
                    <br />
                    4. <strong>Use EXACT subject line above</strong> (copy/paste
                    recommended)
                    <br />
                    5. <strong>Email body can be empty</strong> - vlayer only
                    needs the subject
                    <br />
                    6. <strong>Email must have DKIM signature</strong> - most
                    providers include this automatically
                    <br />
                    7. Click "I've Sent the Email" below and wait for vlayer
                    processing
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-lg">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleEmailSent}
                    disabled={!storedUserEmail}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                  >
                    I've Sent the Email
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Email Proof Verification */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6">
                {emlFetched ? (
                  <CheckCircleIcon className="w-20 h-20 text-green-500" />
                ) : (
                  <ArrowPathIcon className="w-20 h-20 text-blue-500 animate-spin" />
                )}
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                vlayer Email Proof Verification
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                {!emlFetched
                  ? "Waiting for vlayer to receive and process your email..."
                  : "Email received! Generating zero-knowledge proof..."}
              </p>

              <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl mb-8">
                <div className="text-lg text-blue-700">
                  <div className="flex justify-between items-center mb-3">
                    <span>Email Received:</span>
                    <span
                      className={`font-medium ${
                        emlFetched ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      {emlFetched ? "✅ Yes" : "⏳ Waiting..."}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span>vlayer Proof Generation:</span>
                    <span className="font-medium text-blue-600">
                      {emailProofStep}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>On-Chain Verification:</span>
                    <span className="font-medium text-blue-600">
                      {txHash ? "✅ Complete" : "⏳ Pending..."}
                    </span>
                  </div>
                </div>
              </div>

              {verificationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-lg mb-6">
                  <div className="font-semibold mb-2">Verification Error:</div>
                  <div className="text-sm">{verificationError}</div>
                </div>
              )}

              {/* Manual continue button when email proof is complete */}
              {emailProofStep === "Done!" && (
                <div className="text-center mt-8">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-6">
                    <p className="text-green-800 text-sm">
                      ✅ Email verification complete! Ready to proceed to
                      transaction history verification.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={handleContinueToFaceScan}
                      disabled={isTransitioning}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 px-8 rounded-xl font-medium text-lg shadow-lg inline-flex items-center justify-center gap-2"
                    >
                      {isTransitioning ? (
                        <>
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          Transitioning...
                        </>
                      ) : (
                        "Continue to Transaction History Verification"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Transaction History Verification */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6">
                {webProofComplete ? (
                  <CheckCircleIcon className="w-20 h-20 text-green-500" />
                ) : webProofStep.includes("Loading") ? (
                  <ArrowPathIcon className="w-20 h-20 text-blue-500 animate-spin" />
                ) : webProofStep.includes("question") ? (
                  <KeyIcon className="w-20 h-20 text-purple-500" />
                ) : webProofStep.includes("Verifying") ? (
                  <ArrowPathIcon className="w-20 h-20 text-green-500 animate-spin" />
                ) : (
                  <KeyIcon className="w-20 h-20 text-purple-500" />
                )}
              </div>

              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Transaction History Verification
              </h2>

              <p className="text-xl text-gray-600 mb-8">
                {webProofStep.includes("Ready")
                  ? "Answer questions about your transaction history to verify your identity"
                  : webProofStep.includes("Loading")
                  ? "Loading your transaction history..."
                  : webProofStep.includes("question")
                  ? "Please answer the verification question"
                  : webProofStep.includes("Verifying")
                  ? "Verifying your answers and submitting to blockchain..."
                  : webProofComplete
                  ? "Transaction history verification successful!"
                  : "Processing verification..."}
              </p>

              {/* Start Verification Button */}
              {webProofStep.includes("Ready") && (
                <div className="mb-8">
                  <button
                    onClick={startWebProof}
                    className="bg-purple-500 hover:bg-purple-600 text-white py-3 px-8 rounded-xl font-medium shadow-lg text-lg"
                  >
                    🔍 Start Transaction History Verification
                  </button>
                </div>
              )}

              {/* Question Display */}
              {webProofStep.includes("question") && (
                <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl mb-8">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4">
                    ❓ Verification Question
                  </h3>
                  <div className="bg-white p-4 rounded-lg border-2 border-purple-300 mb-4">
                    <p className="text-lg font-medium text-gray-800">
                      {question}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setUserAnswer("yes");
                          submitAnswer("yes");
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => {
                          setUserAnswer("no");
                          submitAnswer("no");
                        }}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {verificationData.attempts > 0 && (
                    <div className="mt-4 text-sm text-orange-600">
                      Attempts used: {verificationData.attempts}/3
                    </div>
                  )}
                </div>
              )}

              {/* Verification Progress */}
              <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl mb-8">
                <div className="text-lg text-purple-700">
                  <div className="flex justify-between items-center mb-3">
                    <span>Email Proof:</span>
                    <span className="font-medium text-green-600">
                      ✅ Complete
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Transaction History Question:</span>
                    <span
                      className={`font-medium ${
                        verificationData.questionCorrect
                          ? "text-green-600"
                          : webProofStep.includes("question")
                          ? "text-blue-600"
                          : "text-gray-600"
                      }`}
                    >
                      {verificationData.questionCorrect
                        ? "✅ Correct"
                        : webProofStep.includes("question")
                        ? "❓ In Progress..."
                        : "⏳ Pending..."}
                    </span>
                  </div>
                </div>
              </div>

              {webProofError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-lg mb-6">
                  Error: {webProofError}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl mb-8">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">
                  🔐 Secure Transaction History Verification
                </h3>
                <p className="text-blue-700 mb-4">
                  This verification method uses your blockchain transaction
                  history to confirm your identity:
                </p>
                <div className="text-sm text-blue-600 space-y-1">
                  <div>
                    • <strong>EIP-7702 Transactions:</strong> Advanced account
                    abstraction usage patterns
                  </div>
                  <div>
                    • <strong>State Channel Activity:</strong> Layer 2 scaling
                    solution engagement
                  </div>
                  <div>
                    • <strong>Transaction Volume:</strong> Overall blockchain
                    interaction history
                  </div>
                  <div>
                    • <strong>Usage Duration:</strong> Account age and activity
                    timeline
                  </div>
                  <div>
                    • <strong>Privacy-Preserving:</strong> Only you know your
                    exact transaction counts
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {webProofStep.includes("Loading") && (
                <div className="flex items-center justify-center gap-3 text-blue-600 text-lg">
                  <ArrowPathIcon className="w-6 h-6 animate-spin" />
                  Analyzing your transaction history...
                </div>
              )}

              {/* Verifying State */}
              {webProofStep.includes("Verifying") && (
                <div className="flex items-center justify-center gap-3 text-green-600 text-lg">
                  <ArrowPathIcon className="w-6 h-6 animate-spin" />
                  Submitting verification to blockchain...
                </div>
              )}
            </div>
          )}

          {/* Step 5: Set New PIN */}
          {step === 5 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                Set New PIN
              </h2>
              <p className="text-xl text-gray-600 mb-10 text-center">
                {!newPin
                  ? "Enter your new 6-digit PIN"
                  : "Confirm your new PIN"}
              </p>

              {isGeneratingProof ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-center">
                    <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      Generating Recovery Proof
                    </h3>
                    <p className="text-gray-600">{recoveryProofStep}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                    <p className="text-blue-800 text-sm text-center">
                      🔐 Creating zero-knowledge proof to securely update your
                      PIN on-chain...
                      <br />
                      This process ensures your privacy while proving your
                      identity.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <PinInput
                    onComplete={handleNewPinComplete}
                    disabled={false}
                    title={!newPin ? "Enter New PIN" : "Confirm New PIN"}
                  />

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-center text-lg">
                      {error}
                    </div>
                  )}

                  <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
                    <div className="text-sm text-green-700 text-center">
                      🔒 Your new PIN will be securely stored and encrypted
                      using zero-knowledge proofs
                    </div>
                  </div>

                  {newPin && (
                    <div className="text-center text-sm text-gray-500">
                      ✅ First PIN entered. Please confirm by entering it again.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 6: Success */}
          {step === 6 && (
            <div className="text-center">
              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                PIN Recovery Complete!
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Your PIN has been successfully reset using vlayer's secure 2FA
                and zero-knowledge proofs
              </p>

              <div className="bg-green-50 border border-green-200 p-6 rounded-xl mb-8">
                <div className="text-lg text-green-700 space-y-2">
                  <div className="flex justify-between">
                    <span>Email Verification:</span>
                    <span className="font-medium">✅ Complete</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction History Verification:</span>
                    <span className="font-medium">✅ Complete</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New PIN:</span>
                    <span className="font-medium">✅ Set & Encrypted</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registry Contract:</span>
                    <span className="font-medium">✅ Updated</span>
                  </div>
                </div>
              </div>

              {recoveryTxHash && (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl mb-8">
                  <div className="text-blue-800 text-sm">
                    <div className="font-semibold mb-2">
                      Recovery Transaction:
                    </div>
                    <div className="font-mono text-xs break-all bg-white p-2 rounded border">
                      {recoveryTxHash}
                    </div>
                    <a
                      href={`https://eth-sepolia.blockscout.com/tx/${recoveryTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View on Blockscout
                      <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                    </a>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-8">
                <p className="text-blue-800 text-sm">
                  🔐 <strong>Zero-Knowledge Recovery Complete:</strong>
                  <br />
                  Your identity was verified using vlayer's ZK proofs, your new
                  PIN was securely registered on-chain via the Registry
                  contract, and your verification status has been reset for
                  future use.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={resetFlow}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                >
                  Reset Another PIN
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
