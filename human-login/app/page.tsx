"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
// import { isRegistered } from "../lib/utils";

// @ts-ignore
declare global {
  interface Window {
    Human: any;
  }
}

export default function Home() {
  const [webcamActive, setWebcamActive] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [human, setHuman] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceLargeEnough, setFaceLargeEnough] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [samples, setSamples] = useState<number[][]>([]);
  const [guideMsg, setGuideMsg] = useState("");
  const [matchConfidence, setMatchConfidence] = useState<number | null>(null);
  const NUM_SAMPLES = 5;
  const MATCH_THRESHOLD = 0.4; // Smaller value = stricter matching

  // Normalize a vector to unit length
  function normalizeVector(vector: number[]) {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    if (magnitude === 0) return vector;
    return vector.map((val) => val / magnitude);
  }

  // Calculate cosine similarity between two vectors
  function cosineSimilarity(a: number[], b: number[]) {
    if (a.length !== b.length) return -1;
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    return dotProduct; // Since both vectors are normalized, this equals cosine similarity
  }

  // Enhanced face comparison function
  function compareFaceEmbeddings(
    newEmbedding: number[],
    storedEmbedding: number[]
  ) {
    const normalizedNew = normalizeVector(newEmbedding);
    const normalizedStored = normalizeVector(storedEmbedding);
    const similarity = cosineSimilarity(normalizedNew, normalizedStored);
    const distance = 1 - similarity;
    console.log(
      `Face comparison: distance=${distance.toFixed(
        4
      )}, threshold=${MATCH_THRESHOLD}`
    );
    return { match: distance < MATCH_THRESHOLD, distance };
  }

  // Helper to average embeddings
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

  // Face detection loop
  useEffect(() => {
    let interval: any;
    if (webcamActive && human && videoRef.current) {
      interval = setInterval(async () => {
        const result = await human.detect(videoRef.current);
        if (result.face && result.face.length > 0) {
          setFaceDetected(true);
          // Check face size (use width or height, whichever is larger)
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

          const isEnough = faceSizeRatio >= 0.3; // 30% of video width/height
          setFaceLargeEnough(isEnough);

          if (capturing && isEnough && samples.length < NUM_SAMPLES) {
            // Only add the sample if it's sufficiently different from previous ones
            // This ensures we capture different angles/expressions
            const newEmbedding = result.face[0].embedding;

            // Skip if we have no samples yet
            if (samples.length === 0) {
              setSamples([newEmbedding]);
              setCaptureProgress(100 / NUM_SAMPLES);
            } else {
              // Check if this sample is different enough from previous ones
              // This prevents capturing multiple very similar frames
              const lastSample = samples[samples.length - 1];
              const { distance } = compareFaceEmbeddings(
                newEmbedding,
                lastSample
              );

              if (distance > 0.05) {
                // Only add if somewhat different from last sample
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
        `Capturing ${samples.length}/${NUM_SAMPLES} - Slightly move your head for different angles`
      );
    else setGuideMsg("");
  }, [webcamActive, faceDetected, faceLargeEnough, capturing, samples.length]);

  // When enough samples are captured, finish registration
  useEffect(() => {
    if (capturing && samples.length === NUM_SAMPLES) {
      setCapturing(false);
      setScanning(false);

      // Average the embeddings
      const avgEmbedding = averageEmbedding(samples);

      // Store with additional metadata
      const credentials = {
        embedding: avgEmbedding,
        timestamp: Date.now(),
        version: "1.0",
      };

      // Check if there's an existing face to compare with
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

      // Always store the new credentials
      localStorage.setItem("faceCredentials", JSON.stringify(credentials));
      localStorage.setItem("alreadyRegistered", isMatch ? "true" : "false");

      setRegistering(false);
      setSamples([]);

      // Show match result briefly before redirecting
      if (matchScore !== null) {
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setTimeout(() => router.push("/dashboard"), 500);
      }
    }
  }, [capturing, samples, router]);

  // Create and initialize video element directly
  const initializeCamera = async () => {
    setError("");
    setRegistering(true);

    try {
      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Prefer front camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      console.log("Camera access granted", stream);

      // Ensure video ref exists before proceeding
      if (videoRef.current) {
        console.log("Video reference found", videoRef.current);
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          videoRef.current
            ?.play()
            .then(() => {
              console.log("Video playing");
              setWebcamActive(true);
            })
            .catch((err) => {
              console.error("Error playing video:", err);
              setError("Error playing video: " + err.message);
            });
        };
      } else {
        console.error("Video reference is null!");
        setError("Video reference not available. Try refreshing the page.");
        setRegistering(false);
        return;
      }

      // Load Human.js model with face descriptor enabled
      if (!human) {
        console.log("Loading Human.js model...");
        // @ts-ignore
        const h = new window.Human.Human({
          backend: "webgl",
          modelBasePath: "/models",
          face: {
            enabled: true,
            detector: { enabled: true, rotation: true },
            description: { enabled: true }, // Enables face descriptor (embedding)
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
        console.log("Human.js model loaded");
      }

      setRegistering(false);
    } catch (e: any) {
      console.error("Camera error:", e);
      setError(e.message || "Failed to start webcam");
      setRegistering(false);
    }
  };

  // New capture button handler
  const handleStartCapture = () => {
    setSamples([]);
    setCaptureProgress(0);
    setCapturing(true);
    setScanning(true);
    setMatchConfidence(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="border border-black rounded-3xl p-8 w-full max-w-4xl min-h-[70vh] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center">
            <div
              className="relative mb-8"
              style={{
                width: 400,
                height: 400,
                borderRadius: "50%",
                border: faceDetected ? "3px solid green" : "1px solid black",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#eee",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "auto",
                  height: "100%",
                  minWidth: "100%",
                  objectFit: "cover",
                  display: webcamActive ? "block" : "none",
                }}
              />
              {!webcamActive && (
                <div className="text-gray-400">Camera will appear here</div>
              )}
            </div>

            {/* Guide message moved below video */}
            {webcamActive && guideMsg && (
              <div className="mb-4 text-center text-base font-medium text-blue-700">
                {guideMsg}
              </div>
            )}

            {/* Match confidence display */}
            {matchConfidence !== null && (
              <div
                className={`mb-4 p-2 ${
                  matchConfidence > 70 ? "bg-green-100" : "bg-yellow-100"
                } rounded`}
              >
                Face match confidence: {matchConfidence}%
                {matchConfidence > 70
                  ? " - Strong match!"
                  : matchConfidence > 50
                  ? " - Possible match"
                  : " - New face detected"}
              </div>
            )}

            {!webcamActive ? (
              <Button
                className="text-2xl px-12 py-4 rounded-xl border border-black"
                onClick={initializeCamera}
                disabled={registering || scanning}
              >
                {registering ? "Starting camera..." : "sign up / sign in"}
              </Button>
            ) : !capturing ? (
              <Button
                className="text-2xl px-12 py-4 rounded-xl border border-black"
                onClick={handleStartCapture}
                disabled={!faceDetected || !faceLargeEnough || scanning}
              >
                {scanning ? "Scanning..." : "Start Face Capture"}
              </Button>
            ) : (
              <Button
                className="text-2xl px-12 py-4 rounded-xl border border-black"
                disabled
              >
                {scanning ? "Scanning face..." : "Capturing..."}
              </Button>
            )}
            {error && <div className="text-red-500 mt-4">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
