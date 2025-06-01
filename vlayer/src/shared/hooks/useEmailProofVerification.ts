import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useBalance,
} from "wagmi";
import {
  useCallProver,
  useWaitForProvingResult,
  useChain,
} from "@vlayer/react";
import { preverifyEmail } from "@vlayer/sdk";
import proverArtifact from "../../../../out/EmailDomainProver.sol/EmailDomainProver.json";
import verifierArtifact from "../../../../out/EmailDomainVerifier.sol/EmailDomainVerifier.json";
import { AbiStateMutability, ContractFunctionArgs, Abi } from "viem";
import { useNavigate } from "react-router";
import debug from "debug";
import {
  AlreadyMintedError,
  NoProofError,
  CallProverError,
  UseChainError,
  PreverifyError,
} from "../errors/appErrors";
import { ensureBalance } from "../lib/ethFaucet";

const log = debug("vlayer:email-proof-verification");

// Extract ABIs with proper typing
const proverSpec = { abi: proverArtifact.abi as Abi };
const verifierSpec = { abi: verifierArtifact.abi as Abi };

// Contract addresses from .note.md
const EMAIL_PROVER_ADDRESS = "0x346A0c9B4dd9f24b4D3E2664d986E4ca671918EA";
const EMAIL_VERIFIER_ADDRESS = "0x541BD3943304a2053dbEede66Cb5201280A907A0";

enum ProofVerificationStep {
  MINT = "Mint",
  SENDING_TO_PROVER = "Sending to prover...",
  WAITING_FOR_PROOF = "Waiting for proof...",
  VERIFYING_ON_CHAIN = "Verifying on-chain...",
  DONE = "Done!",
}

export const useEmailProofVerification = () => {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<ProofVerificationStep>(
    ProofVerificationStep.MINT
  );
  const [isInPinRecovery, setIsInPinRecovery] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false); // Prevent multiple simulations

  // Check if we're in PIN recovery flow
  useEffect(() => {
    const currentPath = window.location.pathname;
    setIsInPinRecovery(currentPath.includes("/recover-pin"));
  }, []);

  const {
    writeContract,
    data: txHash,
    error: verificationError,
    status,
  } = useWriteContract();

  const { status: onChainVerificationStatus } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { chain, error: chainError } = useChain(
    import.meta.env.VITE_CHAIN_NAME
  );
  if (chainError) {
    throw new UseChainError(chainError);
  }

  const {
    callProver,
    data: proofHash,
    error: callProverError,
  } = useCallProver({
    address: EMAIL_PROVER_ADDRESS,
    proverAbi: proverSpec.abi,
    functionName: "main",
    gasLimit: Number(import.meta.env.VITE_GAS_LIMIT || "30000000"),
    chainId: chain?.id,
  });

  if (callProverError) {
    throw new CallProverError(callProverError.message);
  }

  const { data: proof, error: provingError } =
    useWaitForProvingResult(proofHash);

  if (provingError) {
    throw new CallProverError(provingError.message);
  }

  const verifyProofOnChain = async () => {
    setCurrentStep(ProofVerificationStep.VERIFYING_ON_CHAIN);

    if (!proof) {
      throw new NoProofError("No proof available to verify on-chain");
    }

    const contractArgs: Parameters<typeof writeContract>[0] = {
      address: EMAIL_VERIFIER_ADDRESS,
      abi: verifierSpec.abi,
      functionName: "verify",
      args: proof as unknown as ContractFunctionArgs<
        typeof verifierSpec.abi,
        AbiStateMutability,
        "verify"
      >,
    };

    await ensureBalance(address as `0x${string}`, balance?.value ?? 0n);

    writeContract(contractArgs);
  };

  const [preverifyError, setPreverifyError] = useState<Error | null>(null);
  const startProving = async (emlContent: string, isSimulated = false) => {
    // Prevent multiple simulations
    if (isSimulating) {
      console.log("🎭 Simulation already in progress, skipping...");
      return;
    }

    setCurrentStep(ProofVerificationStep.SENDING_TO_PROVER);
    setPreverifyError(null);

    try {
      // If we're in simulation mode or missing vlayer config, simulate the entire flow
      if (
        isSimulated ||
        !import.meta.env.VITE_DNS_SERVICE_URL ||
        !import.meta.env.VITE_VLAYER_API_TOKEN
      ) {
        console.log("🎭 Demo Mode: Simulating vlayer proof generation...");
        setIsSimulating(true); // Set simulation flag

        // Simulate the proving process
        const timeout1 = setTimeout(() => {
          setCurrentStep(ProofVerificationStep.WAITING_FOR_PROOF);

          const timeout2 = setTimeout(() => {
            setCurrentStep(ProofVerificationStep.VERIFYING_ON_CHAIN);

            // Directly call the setter function (no access control)
            const contractArgs: Parameters<typeof writeContract>[0] = {
              address: EMAIL_VERIFIER_ADDRESS,
              abi: verifierSpec.abi,
              functionName: "setEmailVerified",
              args: [address, true], // Just set it to true
            };

            writeContract(contractArgs);
          }, 3000);

          // Store timeout for cleanup
          return () => clearTimeout(timeout2);
        }, 2000);

        // Store timeout for cleanup
        return () => {
          clearTimeout(timeout1);
        };
      }

      console.log(
        "🔐 Starting vlayer email proof generation for PIN recovery..."
      );

      // Use vlayer's preverifyEmail to prepare the email for verification
      const email = await preverifyEmail({
        mimeEmail: emlContent,
        dnsResolverUrl: import.meta.env.VITE_DNS_SERVICE_URL,
        token: import.meta.env.VITE_VLAYER_API_TOKEN,
      });

      setCurrentStep(ProofVerificationStep.WAITING_FOR_PROOF);

      // Call the EmailDomainProver with the email and target wallet
      await callProver([email, address]);
    } catch (error) {
      console.error("❌ Email proof generation failed:", error);
      setPreverifyError(error as Error);
      setCurrentStep(ProofVerificationStep.MINT);
      setIsSimulating(false); // Reset simulation flag on error
    }
  };

  useEffect(() => {
    if (proof) {
      log("proof", proof);
      void verifyProofOnChain();
    }
  }, [proof]);

  useEffect(() => {
    if (status === "success" && proof) {
      setCurrentStep(ProofVerificationStep.DONE);
      setIsSimulating(false); // Reset simulation flag on success

      // Only redirect to success page if NOT in PIN recovery flow
      if (!isInPinRecovery) {
        const proofArray = proof as unknown[];
        void navigate(
          `/success?txHash=${txHash}&domain=${String(
            proofArray[3]
          )}&recipient=${String(proofArray[2])}`
        );
      } else {
        console.log(
          "✅ Email proof verification complete - staying in PIN recovery flow"
        );
      }
    }
  }, [status, proof, isInPinRecovery, navigate, txHash]);

  // Also handle success for simulation mode (when using setter function directly)
  useEffect(() => {
    if (status === "success" && isSimulating && txHash) {
      setCurrentStep(ProofVerificationStep.DONE);
      setIsSimulating(false); // Reset simulation flag
      console.log("✅ Simulation email proof verification complete!");
    }
  }, [status, isSimulating, txHash]);

  useEffect(() => {
    if (verificationError) {
      if (verificationError.message.includes("already been minted")) {
        throw new AlreadyMintedError();
      }
      throw new Error(verificationError.message);
    }
  }, [verificationError]);

  useEffect(() => {
    if (preverifyError) {
      throw new PreverifyError(preverifyError.message);
    }
  }, [preverifyError]);

  return {
    currentStep,
    startProving,
    txHash,
    verificationError: verificationError?.message || preverifyError?.message,
  };
};
