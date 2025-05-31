import { Link, useSearchParams, useNavigate } from "react-router";
import { truncateHashOrAddr } from "../../shared/lib/utils";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { 
  ensureNetworkTarget, 
  REGISTRY_ADDRESS, 
  RegistryABI, 
  CONTRACT_DATA, 
  PROOF_INPUTS,
  appState
} from './dump';

// Add type for window.ethereum
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (accounts: string[]) => void) => void;
  removeListener: (event: string, callback: (accounts: string[]) => void) => void;
}

export const RegisterContainer = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (walletClient) {
      console.log("Wallet Client Chain:", walletClient.chain);
      console.log("Wallet Client Account:", walletClient.account);
      console.log("Wallet Client Transport:", walletClient.transport);
    }
  }, [walletClient]);

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isContractInitialized, setIsContractInitialized] = useState(false);

  useEffect(() => {
    const initContract = async () => {
      if (typeof window.ethereum !== 'undefined' && publicClient) {
        try {
          await ensureNetworkTarget();
          setIsContractInitialized(true);
        } catch (err) {
          console.error("Failed to initialize contract:", err);
          setError("Failed to initialize contract. Please refresh the page.");
        }
      } else {
        setError("Please install MetaMask to use this application.");
      }
    };

    initContract();
  }, [publicClient]);

  const validatePin = (pin: string): boolean => {
    return /^\d{4,6}$/.test(pin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!address || !walletClient || !publicClient) {
      setError("Wallet not connected");
      setIsLoading(false);
      return;
    }
    if (!email || !pin || !confirmPin) {
      setError("All fields are required");
      setIsLoading(false);
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match");
      setIsLoading(false);
      return;
    }
    if (!validatePin(pin)) {
      setError("PIN must be 4-6 digits");
      setIsLoading(false);
      return;
    }
    if (!isContractInitialized) {
      setError("Contract not initialized. Please refresh the page.");
      setIsLoading(false);
      return;
    }

    try {
      await ensureNetworkTarget();

      if (!walletClient) {
        throw new Error("Wallet client not initialized");
      }

      localStorage.setItem("registered_address", address);
      localStorage.setItem("user_email", email);
      localStorage.setItem("user_pin", pin);

      // Format proof with proper type assertions
      const proof = {
        a: [BigInt(PROOF_INPUTS.pi_a[0]), BigInt(PROOF_INPUTS.pi_a[1])] as [bigint, bigint],
        b: [
          [BigInt(PROOF_INPUTS.pi_b[0][0]), BigInt(PROOF_INPUTS.pi_b[0][1])] as [bigint, bigint],
          [BigInt(PROOF_INPUTS.pi_b[1][0]), BigInt(PROOF_INPUTS.pi_b[1][1])] as [bigint, bigint],
        ] as [[bigint, bigint], [bigint, bigint]],
        c: [BigInt(PROOF_INPUTS.pi_c[0]), BigInt(PROOF_INPUTS.pi_c[1])] as [bigint, bigint]
      };

      // Format pubInputs
      const inputs = {
        wallet: BigInt(CONTRACT_DATA.walletAddress),
        intent: BigInt(CONTRACT_DATA.intent),
        credential_hash: BigInt(CONTRACT_DATA.credential_hash),
        nonce: BigInt(CONTRACT_DATA.nonce),
        result_hash: BigInt(CONTRACT_DATA.result_hash)
      };

      console.log("Attempting to register with inputs:", {
        wallet: inputs.wallet.toString(),
        intent: inputs.intent.toString(),
        credential_hash: inputs.credential_hash.toString(),
        nonce: inputs.nonce.toString(),
        result_hash: inputs.result_hash.toString()
      });

      // Directly send the transaction
      const hash = await walletClient.writeContract({
        address: REGISTRY_ADDRESS as `0x${string}`,
        abi: RegistryABI,
        functionName: 'register',
        args: [
          proof.a,
          proof.b,
          proof.c,
          inputs.wallet,
          inputs.intent,
          inputs.credential_hash,
          inputs.nonce,
          inputs.result_hash
        ],
        account: address,
        chain: sepolia
      });

      await publicClient.waitForTransactionReceipt({ hash });

      console.log('Transaction sent:', hash);
      navigate("/update7702");
    } catch (err) {
      console.error("Error:", err);
      if (err instanceof Error) {
        if (err.message.includes("user rejected")) {
          setError("Transaction was rejected. Please try again.");
        } else if (err.message.includes("AlreadyRegistered")) {
          setError("This wallet is already registered.");
        } else if (err.message.includes("InvalidProof")) {
          setError("Invalid proof. Please try again.");
        } else if (err.message.includes("NonceAlreadyUsed")) {
          setError("This nonce has already been used. Please try again.");
        } else {
          setError(`Registration failed: ${err.message}`);
        }
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 mt-5">
        <div className="flex flex-col">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black bg-white shadow-sm focus:border-black focus:ring-black text-black"
            placeholder="Enter your email"
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="pin" className="text-sm font-medium text-gray-700">
            PIN
          </label>
          <input
            type="password"
            id="pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black bg-white shadow-sm focus:border-black focus:ring-black text-black"
            placeholder="Enter your PIN"
            maxLength={6}
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="confirmPin" className="text-sm font-medium text-gray-700">
            Confirm PIN
          </label>
          <input
            type="password"
            id="confirmPin"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black bg-white shadow-sm focus:border-black focus:ring-black text-black"
            placeholder="Confirm your PIN"
            maxLength={6}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <button 
            type="submit"
            className="mt-4 bg-violet-500 text-white py-2 px-4 rounded-md hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            id="nextButton" 
            data-testid="start-page-button"
            disabled={isLoading || !isContractInitialized}
          >
            {isLoading ? "Processing..." : "Next"}
          </button>
        </div>
      </div>
    </form>
  );
};
