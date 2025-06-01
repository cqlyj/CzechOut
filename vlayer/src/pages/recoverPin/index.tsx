import { useAccount, useConnect } from "wagmi";
import { useNavigate, useSearchParams } from "react-router";
import { useState, useEffect, useRef } from "react";
import { injected } from "wagmi/connectors";
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

  // Hook for web proof verification (placeholder)
  const {
    currentStep: webProofStep,
    startWebProof,
    isComplete: webProofComplete,
    error: webProofError,
  } = useWebProofVerification();

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
    if (uniqueEmail && step !== 3) {
      console.log("📧 Email parameter detected, moving to step 3");
      setStep(3);
    }
  }, [uniqueEmail, step]);

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
        // Save new PIN (in real app, this would be encrypted and stored securely)
        localStorage.setItem("czechout_recovery_pin", pin);
        setStep(6);
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
    if (emailProofStep === "Done!" && step === 3) {
      console.log("✅ Email proof verified - continuing to web proof");
      setError(""); // Clear any existing errors
      setTimeout(() => {
        setStep(4);
      }, 1000);
    }
  }, [emailProofStep, step]);

  // Web proof completion effect
  useEffect(() => {
    if (webProofComplete && step === 4) {
      console.log("✅ Web proof verification complete! Moving to PIN setup");
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
              {step === 4 && "Web Proof Verification"}
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
                      Step 2: Web Proof
                    </h3>
                    <p className="text-purple-700 text-sm">
                      Complete biometric verification using vlayer's face scan
                      web proofs
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
            </div>
          )}

          {/* Step 4: Web Proof Verification (Placeholder) */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6">
                {webProofComplete ? (
                  <CheckCircleIcon className="w-20 h-20 text-green-500" />
                ) : webProofStep === "Ready" ? (
                  <GlobeAltIcon className="w-20 h-20 text-purple-500" />
                ) : (
                  <ArrowPathIcon className="w-20 h-20 text-purple-500 animate-spin" />
                )}
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                vlayer Web Proof Verification
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                {webProofStep === "Ready"
                  ? "Complete the second factor authentication"
                  : webProofComplete
                  ? "Web proof verification successful!"
                  : "Verifying your web identity with vlayer..."}
              </p>

              <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl mb-8">
                <div className="text-lg text-purple-700">
                  <div className="flex justify-between items-center mb-3">
                    <span>Email Proof:</span>
                    <span className="font-medium text-green-600">
                      ✅ Complete
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span>Web Authentication:</span>
                    <span
                      className={`font-medium ${
                        webProofComplete
                          ? "text-green-600"
                          : webProofStep === "Ready"
                          ? "text-gray-600"
                          : "text-purple-600"
                      }`}
                    >
                      {webProofComplete
                        ? "✅ Complete"
                        : webProofStep === "Ready"
                        ? "⏳ Waiting..."
                        : webProofStep}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>2FA Status:</span>
                    <span
                      className={`font-medium ${
                        webProofComplete ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {webProofComplete ? "✅ Verified" : "⏳ Pending..."}
                    </span>
                  </div>
                </div>
              </div>

              {webProofError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-lg mb-6">
                  Error: {webProofError}
                </div>
              )}

              <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl mb-8">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">
                  🔐 vlayer Web Proof Authentication
                </h3>
                <p className="text-purple-700 mb-4">
                  This second factor uses vlayer's web proof technology with
                  face scan verification to confirm your identity through secure
                  biometric authentication.
                </p>
                <div className="text-sm text-purple-600">
                  Features:
                  <br />
                  • Zero-knowledge web proofs with biometric verification
                  <br />
                  • Secure face scan authentication without storing biometric
                  data
                  <br />• Privacy-preserving identity verification using vlayer
                </div>
              </div>

              {webProofStep === "Ready" && (
                <button
                  onClick={startWebProof}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-6 px-8 rounded-2xl font-medium text-xl shadow-lg"
                >
                  Start vlayer Web Proof Verification
                </button>
              )}

              {webProofStep !== "Ready" && !webProofComplete && (
                <div className="text-sm text-purple-500">
                  🔐 Generating vlayer zero-knowledge web proof for secure
                  verification
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
                  </div>
                </div>

                {newPin && (
                  <div className="text-center text-sm text-gray-500">
                    ✅ First PIN entered. Please confirm by entering it again.
                  </div>
                )}
              </div>
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
              </p>

              <div className="bg-green-50 border border-green-200 p-6 rounded-xl mb-8">
                <div className="text-lg text-green-700 space-y-2">
                  <div className="flex justify-between">
                    <span>Email Verification:</span>
                    <span className="font-medium">✅ Complete</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Web Verification:</span>
                    <span className="font-medium">✅ Complete</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New PIN:</span>
                    <span className="font-medium">✅ Set & Encrypted</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-8">
                <p className="text-blue-800 text-sm">
                  🔐 <strong>Security Summary:</strong>
                  <br />
                  Your identity was verified using vlayer's zero-knowledge
                  proofs without exposing your private information. Your new PIN
                  is encrypted and stored securely.
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
