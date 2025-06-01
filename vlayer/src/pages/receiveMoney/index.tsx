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
  ClipboardDocumentIcon,
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
          className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none disabled:bg-gray-100 text-black"
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
              ? "border-green-500 bg-green-50 animate-pulse"
              : "border-gray-300 bg-gray-50 hover:border-green-400"
        }`}
        onClick={!scanComplete ? startScan : undefined}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {scanComplete ? (
            <CheckCircleIcon className="w-16 h-16 text-green-600" />
          ) : isScanning ? (
            <ArrowPathIcon className="w-16 h-16 text-green-600 animate-spin" />
          ) : (
            <CameraIcon className="w-16 h-16 text-gray-400" />
          )}
        </div>
        {isScanning && (
          <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping"></div>
        )}
      </div>
      <p className="mt-4 text-sm text-gray-600 text-center">
        {scanComplete
          ? "✅ Payer verified successfully!"
          : isScanning
            ? "🔍 Scanning payer's face..."
            : "👆 Payer: Tap to verify your face"}
      </p>
    </div>
  );
};

export const ReceiveMoneyContainer = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const navigate = useNavigate();
  const yellowService = YellowService.getInstance();

  // Component state
  const [step, setStep] = useState(1); // 1: Amount (receiver), 2: Face (payer), 3: Review (payer), 4: PIN (payer), 5: Success
  const [faceVerified, setFaceVerified] = useState(false);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [transactionResult, setTransactionResult] = useState<any>(null);

  // Balance state
  const [nitroliteBalance, setNitroliteBalance] = useState(0);
  const [payerBalance, setPayerBalance] = useState(0); // Simulated payer balance

  // Load current balance from cache
  useEffect(() => {
    const cachedBalance = yellowService.getCachedBalance();
    setNitroliteBalance(cachedBalance.amount);
    // Simulate payer has some balance for the demo
    setPayerBalance(100.5);
  }, []);

  // Handle face verification success (by payer)
  const handleFaceSuccess = () => {
    setFaceVerified(true);
    setTimeout(() => setStep(3), 1000);
  };

  // Handle amount input (by receiver)
  const handleAmountSubmit = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid amount to receive");
      return;
    }

    setError("");
    setStep(2); // Move to payer face verification
  };

  // Handle amount confirmation (by payer)
  const handlePayerConfirm = () => {
    setStep(4); // Move to PIN entry
  };

  // Handle PIN verification (by payer)
  const handlePinComplete = (enteredPin: string) => {
    setPin(enteredPin);
    // For demo, accept PIN "123456"
    if (enteredPin === "123456") {
      setStep(5);
      processTransaction();
    } else {
      setError("Incorrect PIN. Try 123456 for demo.");
      setTimeout(() => {
        setPin("");
        setError("");
      }, 2000);
    }
  };

  // Process the transaction (payer sends money to receiver)
  const processTransaction = async () => {
    setProcessing(true);
    setError("");

    try {
      const amountNum = parseFloat(amount);

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Create receive transaction record
      const transaction: OffChainTransaction = {
        id: `rx-${Date.now()}`,
        type: "receive",
        amount: amountNum,
        asset: "USDC",
        participant: "0xPayerAddress...", // In real app, this would be the payer's address
        timestamp: new Date().toISOString(),
        status: "completed",
      };

      // Add to Yellow service (saves to cache)
      yellowService.addTransaction(transaction);

      // Update receiver's balance
      const newBalance = nitroliteBalance + amountNum;

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
        type: "receive",
        message: "Payment received successfully!",
        txHash: transaction.id,
        amount: amountNum,
        from: "Payer",
        to: address,
      });
    } catch (error) {
      console.error("Transaction error:", error);
      setError("Payment failed. Please try again.");
      setStep(4);
    } finally {
      setProcessing(false);
    }
  };

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      alert("Address copied to clipboard!");
    }
  };

  // Reset transaction flow
  const resetFlow = () => {
    setStep(1);
    setFaceVerified(false);
    setAmount("");
    setPin("");
    setError("");
    setTransactionResult(null);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
            Connect Wallet to Receive
          </h1>
          <button
            onClick={() => connect({ connector: injected() })}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-medium"
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
          <h1 className="text-xl font-bold text-gray-800">Receive Money</h1>
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
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 5 && (
                  <div
                    className={`w-12 h-1.5 ${
                      step > stepNum ? "bg-green-500" : "bg-gray-200"
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
              {step === 1 && "Set amount to receive"}
              {step === 2 && "Payer verification"}
              {step === 3 && "Payer confirms amount"}
              {step === 4 && "Payer authorizes payment"}
              {step === 5 && "Payment completed"}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-12">
          {/* Step 1: Amount Input (by receiver) */}
          {step === 1 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                Set Amount to Receive
              </h2>
              <p className="text-xl text-gray-600 mb-10 text-center">
                Your Balance: {nitroliteBalance.toFixed(2)} USDC
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
                    className="w-full px-8 py-6 border-3 border-gray-300 rounded-2xl focus:ring-4 focus:ring-green-500 focus:border-green-500 text-4xl font-bold text-center text-black bg-gray-50 shadow-inner"
                  />
                </div>

                {/* Your Address Display */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                  <label className="block text-sm font-medium text-green-700 mb-2">
                    Your Receive Address
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-green-800 flex-1 break-all">
                      {address}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs flex items-center gap-1 shrink-0"
                    >
                      <ClipboardDocumentIcon className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-lg">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleAmountSubmit}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                >
                  Request Payment from Payer
                </button>

                <div className="text-center text-sm text-gray-500">
                  💡 Next: Hand your device to the payer for verification
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Face Verification (by payer) */}
          {step === 2 && (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Payer: Verify Your Identity
              </h2>
              <p className="text-xl text-gray-600 mb-10">
                Look at the camera to verify your face before paying
              </p>
              <FaceVerificationCircle onSuccess={handleFaceSuccess} />

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-700">
                  👤 <strong>Payer:</strong> You are about to pay{" "}
                  <strong>{amount} USDC</strong>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Amount Review (by payer) */}
          {step === 3 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                Payer: Confirm Payment
              </h2>
              <p className="text-xl text-gray-600 mb-10 text-center">
                Review the payment details
              </p>

              <div className="space-y-8">
                {/* Payment Details */}
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">
                    Payment Details
                  </h3>
                  <div className="text-lg text-blue-700 space-y-2">
                    <div className="flex justify-between">
                      <span>Amount to Pay:</span>
                      <span className="font-bold text-2xl">{amount} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>To:</span>
                      <span className="font-mono text-sm">
                        {address?.substring(0, 16)}...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Your Balance:</span>
                      <span className="font-medium">
                        {payerBalance.toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>After Payment:</span>
                      <span className="font-medium">
                        {(payerBalance - parseFloat(amount || "0")).toFixed(2)}{" "}
                        USDC
                      </span>
                    </div>
                  </div>
                </div>

                {parseFloat(amount) > payerBalance && (
                  <div className="bg-orange-50 border border-orange-200 text-orange-700 px-6 py-4 rounded-lg">
                    ⚠️ Insufficient balance. EIP-7702 delegation will be used.
                  </div>
                )}

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
                    Cancel
                  </button>
                  <button
                    onClick={handlePayerConfirm}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: PIN Verification (by payer) */}
          {step === 4 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                Payer: Enter Your PIN
              </h2>
              <p className="text-xl text-gray-600 mb-10 text-center">
                Enter your 6-digit PIN to authorize the payment
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

                <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
                  <div className="text-lg text-green-700">
                    <div className="flex justify-between">
                      <span>Paying:</span>
                      <span className="font-medium">{amount} USDC</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span>Method:</span>
                      <span className="font-medium">
                        {parseFloat(amount) > payerBalance
                          ? "EIP-7702 Delegation"
                          : "Off-chain"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-500">
                  🔐 Your PIN authenticates this payment
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && !processing && transactionResult && (
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
                    <span>Amount Received:</span>
                    <span className="font-medium">
                      {transactionResult.amount} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>From:</span>
                    <span className="font-medium">
                      {transactionResult.from}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TX ID:</span>
                    <span className="font-mono text-base">
                      {transactionResult.txHash.substring(0, 16)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Balance:</span>
                    <span className="font-medium">
                      {nitroliteBalance.toFixed(2)} USDC
                    </span>
                  </div>
                </div>
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
                  Receive Another Payment
                </button>
              </div>
            </div>
          )}

          {/* Processing state */}
          {step === 5 && processing && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6">
                <ArrowPathIcon className="w-20 h-20 text-green-500 animate-spin" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Processing Payment
              </h2>
              <p className="text-xl text-gray-600">
                {parseFloat(amount) > payerBalance
                  ? "Setting up EIP-7702 delegation..."
                  : "Creating off-chain transaction..."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
