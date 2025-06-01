import { useAccount, useConnect } from "wagmi";
import { useNavigate } from "react-router";
import { useState, useEffect, useRef } from "react";
import { injected } from "wagmi/connectors";
import {
  ChevronLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import YellowService from "../../services/yellowService";
import type { OffChainTransaction } from "../../services/yellowService";

// PIN input component
const PinInput = ({
  onComplete,
  disabled,
}: {
  onComplete: (pin: string) => void;
  disabled: boolean;
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

  return (
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
  );
};

// Face verification circle component
const FaceVerificationCircle = ({ onSuccess }: { onSuccess: () => void }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const startScan = () => {
    setIsScanning(true);
    // Simulate face scan after 3 seconds
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      onSuccess();
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-48 h-48 rounded-full border-4 cursor-pointer transition-all duration-300 ${
          scanComplete
            ? "border-green-500 bg-green-50"
            : isScanning
              ? "border-blue-500 bg-blue-50 animate-pulse"
              : "border-gray-300 bg-gray-50 hover:border-blue-400"
        }`}
        onClick={!scanComplete ? startScan : undefined}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {scanComplete ? (
            <CheckCircleIcon className="w-16 h-16 text-green-600" />
          ) : isScanning ? (
            <ArrowPathIcon className="w-16 h-16 text-blue-600 animate-spin" />
          ) : (
            <CameraIcon className="w-16 h-16 text-gray-400" />
          )}
        </div>
        {isScanning && (
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping"></div>
        )}
      </div>
      <p className="mt-4 text-sm text-gray-600 text-center">
        {scanComplete
          ? "✅ Face verified successfully!"
          : isScanning
            ? "🔍 Scanning your face..."
            : "👆 Tap to verify your face"}
      </p>
    </div>
  );
};

export const SendMoneyContainer = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const navigate = useNavigate();
  const yellowService = YellowService.getInstance();

  // Component state
  const [step, setStep] = useState(1); // 1: Face, 2: Amount, 3: PIN, 4: Processing, 5: Success
  const [faceVerified, setFaceVerified] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [pin, setPin] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [transactionResult, setTransactionResult] = useState<any>(null);

  // Balance state
  const [nitroliteBalance, setNitroliteBalance] = useState(0);
  const [needsDelegation, setNeedsDelegation] = useState(false);

  // Load current balance from cache
  useEffect(() => {
    const cachedBalance = yellowService.getCachedBalance();
    setNitroliteBalance(cachedBalance.amount);
  }, []);

  // Handle face verification success
  const handleFaceSuccess = () => {
    setFaceVerified(true);
    setTimeout(() => setStep(2), 1000);
  };

  // Handle amount input
  const handleAmountSubmit = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setError("Please enter a valid recipient address");
      return;
    }

    // Check if we need delegation (amount > balance)
    if (amountNum > nitroliteBalance) {
      setNeedsDelegation(true);
    }

    setError("");
    setStep(3);
  };

  // Handle PIN verification
  const handlePinComplete = (enteredPin: string) => {
    setPin(enteredPin);
    // For demo, accept PIN "123456"
    if (enteredPin === "123456") {
      setStep(4);
      processTransaction();
    } else {
      setError("Incorrect PIN. Try 123456 for demo.");
      setTimeout(() => {
        setPin("");
        setError("");
      }, 2000);
    }
  };

  // Process the transaction
  const processTransaction = async () => {
    setProcessing(true);
    setError("");

    try {
      const amountNum = parseFloat(amount);

      if (needsDelegation) {
        // EIP-7702 Delegation flow
        console.log(
          "💰 Amount exceeds balance, initiating EIP-7702 delegation..."
        );

        // Simulate delegation process
        await new Promise((resolve) => setTimeout(resolve, 3000));

        setTransactionResult({
          type: "delegation",
          message: "EIP-7702 delegation completed successfully!",
          txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
          amount: amountNum,
          recipient: recipientAddress,
        });
      } else {
        // Off-chain state channel transaction
        console.log("🔄 Processing off-chain transaction...");

        // Create transaction record
        const transaction: OffChainTransaction = {
          id: `tx-${Date.now()}`,
          type: "send",
          amount: amountNum,
          asset: "USDC",
          participant: recipientAddress,
          timestamp: new Date().toISOString(),
          status: "completed",
        };

        // Add to Yellow service (saves to cache)
        yellowService.addTransaction(transaction);

        // Update local balance calculation
        const newBalance = nitroliteBalance - amountNum;

        // Update cached balance in localStorage
        const updatedBalance = {
          asset: "USDC",
          amount: newBalance,
          formatted: `${newBalance.toFixed(2)} USDC`,
        };
        localStorage.setItem(
          "czechout_nitrolite_balance",
          JSON.stringify(updatedBalance)
        );

        setNitroliteBalance(newBalance);

        setTransactionResult({
          type: "offchain",
          message: "Off-chain transaction completed successfully!",
          txHash: transaction.id,
          amount: amountNum,
          recipient: recipientAddress,
        });
      }

      setStep(5);
    } catch (error) {
      console.error("Transaction error:", error);
      setError("Transaction failed. Please try again.");
      setStep(3);
    } finally {
      setProcessing(false);
    }
  };

  // Reset transaction flow
  const resetFlow = () => {
    setStep(1);
    setFaceVerified(false);
    setAmount("");
    setRecipientAddress("");
    setPin("");
    setError("");
    setTransactionResult(null);
    setNeedsDelegation(false);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
            Connect Wallet to Send
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
          <h1 className="text-xl font-bold text-gray-800">Send Money</h1>
          <div className="w-16"></div> {/* Spacer */}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-8">
        {/* Progress Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium ${
                    step >= stepNum
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 5 && (
                  <div
                    className={`w-12 h-1.5 ${
                      step > stepNum ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-12">
          {/* Step 1: Face Verification */}
          {step === 1 && (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Verify Your Identity
              </h2>
              <p className="text-xl text-gray-600 mb-10">
                Look at the camera to verify your face
              </p>
              <FaceVerificationCircle onSuccess={handleFaceSuccess} />
            </div>
          )}

          {/* Step 2: Amount Input */}
          {step === 2 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                Enter Amount
              </h2>
              <p className="text-xl text-gray-600 mb-10 text-center">
                Available: {nitroliteBalance.toFixed(2)} USDC
              </p>

              <div className="space-y-8">
                <div>
                  <label className="block text-2xl font-medium text-gray-700 mb-4 text-center">
                    Amount (USDC)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-8 py-6 border-3 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-4xl font-bold text-center text-black bg-gray-50 shadow-inner"
                  />
                  {parseFloat(amount) > nitroliteBalance && (
                    <p className="text-orange-600 text-lg mt-3 text-center">
                      ⚠️ Amount exceeds balance. EIP-7702 delegation will be
                      used.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xl font-medium text-gray-700 mb-4">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full px-6 py-5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-black"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-lg">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleAmountSubmit}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: PIN Verification */}
          {step === 3 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                Enter Your PIN
              </h2>
              <p className="text-xl text-gray-600 mb-10 text-center">
                Enter your 6-digit PIN to confirm the transaction
              </p>

              <div className="space-y-8">
                <PinInput
                  onComplete={handlePinComplete}
                  disabled={processing}
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-center text-lg">
                    {error}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                  <div className="text-lg text-blue-700">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">{amount} USDC</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span>Method:</span>
                      <span className="font-medium">
                        {needsDelegation ? "EIP-7702 Delegation" : "Off-chain"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Processing */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6">
                <ArrowPathIcon className="w-20 h-20 text-blue-500 animate-spin" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Processing Transaction
              </h2>
              <p className="text-xl text-gray-600">
                {needsDelegation
                  ? "Setting up EIP-7702 delegation..."
                  : "Creating off-chain transaction..."}
              </p>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && transactionResult && (
            <div className="text-center">
              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Payment Successful!
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                {transactionResult.message}
              </p>

              <div className="bg-green-50 border border-green-200 p-6 rounded-xl mb-8">
                <div className="text-lg text-green-700 space-y-2">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">
                      {transactionResult.amount} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium">
                      {transactionResult.type === "delegation"
                        ? "EIP-7702"
                        : "Off-chain"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TX ID:</span>
                    <span className="font-mono text-base">
                      {transactionResult.txHash.substring(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={resetFlow}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                >
                  Send Another Payment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
