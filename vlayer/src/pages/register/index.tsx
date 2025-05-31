import { Link, useSearchParams, useNavigate } from "react-router";
import { truncateHashOrAddr } from "../../shared/lib/utils";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { switchToSepolia } from "./switch";
import { useAccount } from "wagmi";
import { privateKeyToAccount } from "viem/accounts";

// Add type for window.ethereum
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (accounts: string[]) => void) => void;
  removeListener: (event: string, callback: (accounts: string[]) => void) => void;
}

// Import the ABIs
const RegistryABI = [
  "function register(uint256[2] memory _pA, uint256[2][2] memory _pB, uint256[2] memory _pC, uint256 wallet, uint256 intent, uint256 credential_hash, uint256 nonce, uint256 result_hash) external",
  "function getCredentialHash(uint256 wallet) external view returns (uint256)",
  "function getUsedNonce(uint256 wallet, uint256 nonce) external view returns (bool)"
];

// Contract configuration
const REGISTRY_ADDRESS = "0xeE7fE61ba80E9EB65BA36c025863B884c1606939"; // Replace with actual Registry contract address

// Contract data
const CONTRACT_DATA = {
  pin: "111111",
  walletAddress: "1316983660714018258856208543902547530655016273103",
  intent: "0", // 0 for Register
  credential_hash: "10798637195398541115846500520847030454002011415890242228013493563347262743063",
  nonce: "0",
  result_hash: "6998534309948587417642352072861863737802915918270421050506483615366587194343"
};

const PROOF_INPUTS = {
  pi_a: [
    "2197365074930441172562320286017592319606016523187233735472877984686949884444",
    "12419084257843043864599895314577222854595602149803275973080400317902916398412",
    "1"
  ],
  pi_b: [
    [
      "3564027389153654170075879668253387134676664289509054989558492184521994540471",
      "8553461446515389456340504879855382892721305805980927876080791965073846935769"
    ],
    [
      "16431733289555767918428985945867533764208532043094283609636480920329279748284",
      "4239427432560049063478156083709807694857249960721213881333558021679146770154"
    ],
    [
      "1",
      "0"
    ]
  ],
  pi_c: [
    "9820816659410945519613876028212060578037291530551799316209333014188323950644",
    "5910784747590369986348743262087862855747736048380595679644493876268696122156",
    "1"
  ],
  protocol: "groth16",
  curve: "bn128"
};

export const RegisterContainer = () => {
  const navigate = useNavigate();
  const { address } = useAccount();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isContractInitialized, setIsContractInitialized] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    const initContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum as unknown as ethers.Eip1193Provider);
          
          // Check and switch to Sepolia if needed
          const network = await provider.getNetwork();
          if (network.chainId !== BigInt(11155111)) { // Sepolia chainId
            try {
              await (window.ethereum as unknown as EthereumProvider).request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
              });
            } catch (switchError: any) {
              // This error code indicates that the chain has not been added to MetaMask
              if (switchError.code === 4902) {
                try {
                  await (window.ethereum as unknown as EthereumProvider).request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                      chainId: '0xaa36a7',
                      chainName: 'Sepolia',
                      nativeCurrency: {
                        name: 'SepoliaETH',
                        symbol: 'SEP',
                        decimals: 18
                      },
                      rpcUrls: ['https://rpc.sepolia.org'],
                      blockExplorerUrls: ['https://sepolia.etherscan.io']
                    }]
                  });
                } catch (addError) {
                  setError("Failed to add Sepolia network. Please add it manually in MetaMask.");
                  return;
                }
              } else {
                setError("Failed to switch to Sepolia network. Please switch manually in MetaMask.");
                return;
              }
            }
          }

          const signer = await provider.getSigner();
          const contract = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, signer);
          setContract(contract);
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
  }, []);

  const validatePin = (pin: string): boolean => {
    return /^\d{4,6}$/.test(pin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!address) {
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
    if (!contract || !isContractInitialized) {
      setError("Contract not initialized. Please refresh the page.");
      setIsLoading(false);
      return;
    }

    try {
      await switchToSepolia();
      localStorage.setItem("registered_address", address);
      localStorage.setItem("user_email", email);
      localStorage.setItem("user_pin", pin);

      // Format proof
      const proof = {
        a: [PROOF_INPUTS.pi_a[0], PROOF_INPUTS.pi_a[1]],
        b: [
          [PROOF_INPUTS.pi_b[0][0], PROOF_INPUTS.pi_b[0][1]],
          [PROOF_INPUTS.pi_b[1][0], PROOF_INPUTS.pi_b[1][1]],
        ],
        c: [PROOF_INPUTS.pi_c[0], PROOF_INPUTS.pi_c[1]]
      };

      // Format pubInputs
      const inputs = {
        wallet: BigInt(CONTRACT_DATA.walletAddress),
        intent: BigInt(CONTRACT_DATA.intent),
        credential_hash: BigInt(CONTRACT_DATA.credential_hash),
        nonce: BigInt(CONTRACT_DATA.nonce),
        result_hash: BigInt(CONTRACT_DATA.result_hash)
      };

      // Call agree function with all required parameters
      const tx = await contract.agree(
        proof.a,
        proof.b,
        proof.c,
        inputs.wallet,
        inputs.intent,
        inputs.credential_hash,
        inputs.nonce,
        inputs.result_hash,
        address, // from address
        address, // to address
        ethers.ZeroAddress, // tokenAddress (zero address for ETH)
        0 // amount (0 for registration)
      );

      // Wait for transaction confirmation
      await tx.wait();

      // Use React Router navigation instead of window.location
      navigate("/dashboard");
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
