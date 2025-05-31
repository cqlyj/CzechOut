import { useNavigate } from "react-router";
import { useEffect, useState, useRef } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaceSmileIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserPlusIcon,
  UserIcon,
  ShieldCheckIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

// Add type for Human.js
interface Window {
  Human: any;
}

declare global {
  interface Window {
    Human: any;
  }
}

type AuthStep = "face-scan" | "pin-entry" | "completed";
type AuthMode = "signin" | "signup" | null;

export const RegisterContainer = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Face scanning states
  const [currentStep, setCurrentStep] = useState<AuthStep>("face-scan");
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [human, setHuman] = useState<any>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceLargeEnough, setFaceLargeEnough] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [samples, setSamples] = useState<number[][]>([]);
  const [guideMsg, setGuideMsg] = useState("");
  const [matchConfidence, setMatchConfidence] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // PIN entry states
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [email, setEmail] = useState("");

  // Constants
  const NUM_SAMPLES = 5;
  const MATCH_THRESHOLD = 0.4;

  // Face recognition utilities
  function normalizeVector(vector: number[]) {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    if (magnitude === 0) return vector;
    return vector.map((val) => val / magnitude);
  }

  function cosineSimilarity(a: number[], b: number[]) {
    if (a.length !== b.length) return -1;
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    return dotProduct;
  }

  function compareFaceEmbeddings(
    newEmbedding: number[],
    storedEmbedding: number[]
  ) {
    const normalizedNew = normalizeVector(newEmbedding);
    const normalizedStored = normalizeVector(storedEmbedding);
    const similarity = cosineSimilarity(normalizedNew, normalizedStored);
    const distance = 1 - similarity;
    return { match: distance < MATCH_THRESHOLD, distance };
  }

  function averageEmbedding(samples: number[][]): number[] {
    if (samples.length === 0) return [];
    const length = samples[0].length;
    const avg = new Array(length).fill(0);
    for (const sample of samples) {
      for (let i = 0; i < length; i++) {
        avg[i] += sample[i] / samples.length;
      }
    }
    return avg;
  }

  // Initialize camera and Human.js
  const initializeCamera = async () => {
    setError("");
    setIsLoading(true);

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            ?.play()
            .then(() => {
              setWebcamActive(true);
            })
            .catch((err) => {
              setError("Error playing video: " + err.message);
            });
        };
      }

      // Initialize Human.js
      if (!human && typeof window !== "undefined" && window.Human) {
        const h = new window.Human.Human({
          backend: "webgl",
          modelBasePath: "/models",
          face: {
            enabled: true,
            detector: { enabled: true, rotation: true },
            description: { enabled: true },
            mesh: { enabled: true },
            iris: { enabled: true },
          },
          body: { enabled: false },
          hand: { enabled: false },
          object: { enabled: false },
          gesture: { enabled: false },
        });
        await h.load();
        setHuman(h);
      }

      setIsLoading(false);
    } catch (e: any) {
      setError(e.message || "Failed to start webcam");
      setIsLoading(false);
    }
  };

  // Face detection loop
  useEffect(() => {
    let interval: any;
    if (webcamActive && human && videoRef.current) {
      interval = setInterval(async () => {
        const result = await human.detect(videoRef.current);
        if (result.face && result.face.length > 0) {
          setFaceDetected(true);
          const box = result.face[0].box;
          const video = videoRef.current;
          const faceWidth = box[2] || box.width;
          const faceHeight = box[3] || box.height;
          const videoWidth = video?.videoWidth || 1;
          const videoHeight = video?.videoHeight || 1;
          const faceSizeRatio = Math.max(
            faceWidth / videoWidth,
            faceHeight / videoHeight
          );
          const isEnough = faceSizeRatio >= 0.3;
          setFaceLargeEnough(isEnough);

          if (capturing && isEnough && samples.length < NUM_SAMPLES) {
            const newEmbedding = result.face[0].embedding;
            if (samples.length === 0) {
              setSamples([newEmbedding]);
              setCaptureProgress(100 / NUM_SAMPLES);
            } else {
              const lastSample = samples[samples.length - 1];
              const { distance } = compareFaceEmbeddings(
                newEmbedding,
                lastSample
              );
              if (distance > 0.05) {
                setSamples((prev) => [...prev, newEmbedding]);
                setCaptureProgress(((samples.length + 1) / NUM_SAMPLES) * 100);
              }
            }
          }
        } else {
          setFaceDetected(false);
          setFaceLargeEnough(false);
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [webcamActive, human, capturing, samples.length]);

  // Guide message logic
  useEffect(() => {
    if (!webcamActive) setGuideMsg("");
    else if (!faceDetected) setGuideMsg("Position your face in the center");
    else if (!faceLargeEnough) setGuideMsg("Come closer to the camera");
    else if (!capturing) setGuideMsg("Ready to capture. Hold steady.");
    else if (samples.length > 0 && samples.length < NUM_SAMPLES)
      setGuideMsg(
        `Capturing ${samples.length}/${NUM_SAMPLES} - Slightly move your head`
      );
    else setGuideMsg("");
  }, [webcamActive, faceDetected, faceLargeEnough, capturing, samples.length]);

  // Process captured samples
  useEffect(() => {
    if (capturing && samples.length === NUM_SAMPLES) {
      setCapturing(false);
      const avgEmbedding = averageEmbedding(samples);

      // Check if user exists
      const storedCredentialsStr = localStorage.getItem("faceCredentials");
      let isMatch = false;
      let matchScore = null;

      if (storedCredentialsStr) {
        try {
          const storedCredentials = JSON.parse(storedCredentialsStr);
          if (storedCredentials.embedding) {
            const { match, distance } = compareFaceEmbeddings(
              avgEmbedding,
              storedCredentials.embedding
            );
            isMatch = match;
            matchScore = 100 - Math.round(distance * 100);
            setMatchConfidence(matchScore);
          }
        } catch (err) {
          console.error("Error parsing stored credentials:", err);
        }
      }

      setAuthMode(isMatch ? "signin" : "signup");

      if (isMatch && matchScore && matchScore > 70) {
        // Strong match - check if PIN exists
        const storedPin = localStorage.getItem("userPin");
        if (storedPin) {
          // Auto sign in for strong matches with existing PIN
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
          setCurrentStep("completed");
        } else {
          setCurrentStep("pin-entry");
        }
      } else {
        // New user or weak match - store face and ask for PIN/email
        const credentials = {
          embedding: avgEmbedding,
          timestamp: Date.now(),
          version: "1.0",
        };
        localStorage.setItem("faceCredentials", JSON.stringify(credentials));
        setCurrentStep("pin-entry");
      }

      setSamples([]);
    }
  }, [capturing, samples, navigate]);

  const handleStartCapture = () => {
    setSamples([]);
    setCaptureProgress(0);
    setCapturing(true);
    setMatchConfidence(null);
  };

  const validatePin = (pin: string): boolean => {
    return /^\d{6}$/.test(pin);
  };

  const handlePinSubmit = async () => {
    if (!validatePin(pin)) {
      setError("PIN must be exactly 6 digits");
      return;
    }

    if (authMode === "signin") {
      // Sign in flow - verify PIN
      const storedPin = localStorage.getItem("userPin");
      if (storedPin === pin) {
        localStorage.setItem("userLoggedIn", "true");
        navigate("/dashboard");
      } else {
        setError("Incorrect PIN");
      }
    } else if (authMode === "signup") {
      // Sign up flow - save PIN and email
      if (pin !== confirmPin) {
        setError("PINs do not match");
        return;
      }

      if (!validatePin(confirmPin)) {
        setError("Confirmation PIN must be exactly 6 digits");
        return;
      }

      if (!email || !email.trim()) {
        setError("Email address is required");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email address");
        return;
      }

      localStorage.setItem("userPin", pin);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userLoggedIn", "true");
      localStorage.setItem("registrationCompleted", "true");

      setCurrentStep("completed");
      setTimeout(() => {
        navigate("/update7702");
      }, 2000);
    }
  };

  // Animation variants
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } },
    exit: { opacity: 0, transition: { duration: 0.4 } },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.2 } },
    exit: { opacity: 0, y: -30, transition: { duration: 0.5 } },
  };

  const renderFaceScan = () => (
    <motion.div
      className="flex flex-col items-center justify-center space-y-8 h-full"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header */}
      <motion.div
        className="text-center space-y-3"
        animate={capturing ? { scale: [1, 1.01, 1] } : {}}
        transition={{ duration: 2, repeat: capturing ? Infinity : 0 }}
      >
        <div className="flex items-center justify-center space-x-4">
          <FaceSmileIcon className="w-12 h-12 text-violet-600" />
          <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
            {capturing
              ? "Scanning Your Face..."
              : "CzechOut Face Authentication"}
          </h1>
        </div>
        <p className="text-lg text-gray-600 font-medium">
          Secure authentication using advanced facial recognition technology
        </p>
      </motion.div>

      {/* Main Video Area */}
      <motion.div
        className="relative w-[400px] h-[400px] bg-gray-100 rounded-full overflow-hidden border-6"
        style={{
          borderColor: faceDetected ? "#22c55e" : "#e5e7eb",
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: webcamActive ? "block" : "none" }}
        />

        {!webcamActive && (
          <div className="flex items-center justify-center h-full text-gray-400 text-xl font-medium">
            Camera will appear here
          </div>
        )}

        {/* Scanning overlay */}
        <AnimatePresence>
          {capturing && (
            <motion.div
              className="absolute inset-0 bg-violet-500 bg-opacity-20 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-64 h-64 border-6 border-violet-500 rounded-full"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicator */}
        {capturing && captureProgress > 0 && (
          <motion.div
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-95 px-6 py-3 rounded-full shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-lg font-bold text-gray-900">
              {Math.round(captureProgress)}% Complete
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Guide message */}
      {webcamActive && guideMsg && (
        <motion.div
          className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-blue-800 font-bold text-lg text-center">
            {guideMsg}
          </p>
        </motion.div>
      )}

      {/* Match confidence display */}
      {matchConfidence !== null && (
        <motion.div
          className={`p-4 rounded-2xl max-w-xl ${
            matchConfidence > 70
              ? "bg-green-50 border-2 border-green-200"
              : "bg-yellow-50 border-2 border-yellow-200"
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center justify-center space-x-3">
            {matchConfidence > 70 ? (
              <UserIcon className="w-8 h-8 text-green-600" />
            ) : (
              <UserPlusIcon className="w-8 h-8 text-yellow-600" />
            )}
            <span
              className={`font-bold text-xl ${
                matchConfidence > 70 ? "text-green-800" : "text-yellow-800"
              }`}
            >
              {matchConfidence > 70
                ? `Welcome back! Match: ${matchConfidence}%`
                : `New face detected. Match: ${matchConfidence}%`}
            </span>
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="space-y-4">
        {!webcamActive ? (
          <motion.button
            onClick={initializeCamera}
            disabled={isLoading}
            className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:from-violet-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <span className="flex items-center space-x-3">
                <ArrowPathIcon className="w-6 h-6 animate-spin" />
                <span>Starting Camera...</span>
              </span>
            ) : (
              "Start Face Scan"
            )}
          </motion.button>
        ) : !capturing ? (
          <motion.button
            onClick={handleStartCapture}
            disabled={!faceDetected || !faceLargeEnough}
            className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:from-violet-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Begin Authentication
          </motion.button>
        ) : (
          <motion.button
            disabled
            className="bg-gray-400 text-white px-10 py-4 rounded-2xl font-bold text-xl shadow-xl"
          >
            Scanning Face...
          </motion.button>
        )}

        {error && (
          <motion.div
            className="flex items-center justify-center space-x-3 text-red-500 bg-red-50 border-2 border-red-200 rounded-2xl p-4 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ExclamationTriangleIcon className="w-6 h-6" />
            <span className="font-bold text-lg">{error}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  const renderPinEntry = () => (
    <motion.div
      className="flex flex-col items-center justify-center space-y-10 h-full"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header */}
      <motion.div
        className="w-20 h-20 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center"
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        {authMode === "signin" ? (
          <UserIcon className="w-10 h-10 text-violet-600" />
        ) : (
          <UserPlusIcon className="w-10 h-10 text-violet-600" />
        )}
      </motion.div>

      <div className="text-center space-y-3">
        <h1 className="text-5xl font-bold text-gray-900">
          {authMode === "signin" ? "Welcome Back!" : "Create Your Account"}
        </h1>
        <p className="text-gray-600 max-w-2xl text-lg">
          {authMode === "signin"
            ? "Enter your PIN to complete sign-in"
            : "Set up your security PIN and email address"}
        </p>
      </div>

      {/* PIN Entry Form */}
      <div className="space-y-6 w-full max-w-lg">
        <div className="space-y-3">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full text-center text-3xl font-mono tracking-wider py-4 px-8 border-3 border-gray-200 rounded-2xl focus:border-violet-500 focus:ring-0 outline-none bg-gray-50"
            placeholder="Enter PIN"
            maxLength={6}
          />
          {/* PIN progress dots */}
          <div className="flex justify-center space-x-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  i < pin.length ? "bg-violet-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-gray-500 text-sm text-center">
            {authMode === "signup" ? "Create a 6-digit PIN" : "Enter your PIN"}
          </p>
        </div>

        {authMode === "signup" && (
          <>
            <div className="space-y-3">
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full text-center text-3xl font-mono tracking-wider py-4 px-8 border-3 border-gray-200 rounded-2xl focus:border-violet-500 focus:ring-0 outline-none bg-gray-50"
                placeholder="Confirm 6-digit PIN"
                maxLength={6}
              />
              {/* Confirm PIN progress dots */}
              <div className="flex justify-center space-x-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                      i < confirmPin.length
                        ? confirmPin.length === pin.length && confirmPin === pin
                          ? "bg-green-500"
                          : "bg-violet-500"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-500 text-sm text-center">
                Confirm your 6-digit PIN -{" "}
                {confirmPin.length === 6 &&
                pin.length === 6 &&
                confirmPin === pin
                  ? "✓ Matches"
                  : "Enter same PIN again"}
              </p>
            </div>

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-3 px-6 border-3 border-gray-200 rounded-2xl focus:border-violet-500 focus:ring-0 outline-none text-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="Email address"
                required
              />
              <p className="text-gray-400 mt-2 text-sm text-center">
                Required for account security and recovery
              </p>
            </div>
          </>
        )}

        {error && (
          <motion.div
            className="flex items-center justify-center space-x-3 text-red-500 bg-red-50 border-2 border-red-200 rounded-2xl p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ExclamationTriangleIcon className="w-6 h-6" />
            <span className="font-bold text-lg">{error}</span>
          </motion.div>
        )}

        <motion.button
          onClick={handlePinSubmit}
          disabled={!pin || (authMode === "signup" && (!confirmPin || !email))}
          className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-4 rounded-2xl font-bold text-xl hover:from-violet-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {authMode === "signin" ? "Sign In" : "Create Account"}
        </motion.button>
      </div>
    </motion.div>
  );

  const renderCompleted = () => (
    <motion.div
      className="flex flex-col items-center justify-center space-y-10 h-full"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <CheckCircleIcon className="w-10 h-10 text-green-600" />
      </motion.div>

      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-gray-900">
          Authentication Successful!
        </h1>
        <p className="text-gray-600 max-w-3xl text-lg">
          {authMode === "signin"
            ? "Welcome back to CzechOut. Redirecting to dashboard..."
            : "Account created successfully. Setting up your EIP-7702 delegation..."}
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
            className="w-4 h-4 bg-violet-500 rounded-full"
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
    <motion.div
      className="h-screen w-full bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center px-8 py-4"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <AnimatePresence mode="wait">
        {currentStep === "face-scan" && renderFaceScan()}
        {currentStep === "pin-entry" && renderPinEntry()}
        {currentStep === "completed" && renderCompleted()}
      </AnimatePresence>
    </motion.div>
  );
};
