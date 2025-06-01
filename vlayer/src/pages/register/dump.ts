import { proxy } from "valtio";
import { sepolia } from "viem/chains";

// Add type for window.ethereum
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (accounts: string[]) => void) => void;
  removeListener: (
    event: string,
    callback: (accounts: string[]) => void
  ) => void;
}

export const sepoliaChainTarget = {
  chainId: `0x${sepolia.id.toString(16)}`,
  chainName: "Sepolia",
  nativeCurrency: {
    name: "SepoliaETH",
    symbol: "SEP",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://eth-sepolia.blockscout.com"],
};

export const getAccount = async () => {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });

    if (accounts.length > 0) {
      appState.address = accounts[0];
    }

    await ensureNetworkTarget();
  }
};

export const connectWallet = async () => {
  if (window?.ethereum) {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (accounts.length > 0) {
      appState.address = accounts[0];
    }

    await ensureNetworkTarget();
  }
};

export const ensureNetworkTarget = async () => {
  try {
    await window.ethereum?.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: sepoliaChainTarget.chainId }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum?.request({
          method: "wallet_addEthereumChain",
          params: [sepoliaChainTarget],
        });
      } catch (addError) {
        console.error("Failed to add Sepolia network:", addError);
        throw new Error(
          "Failed to add Sepolia network. Please add it manually in MetaMask."
        );
      }
    } else {
      console.error("Failed to switch to Sepolia network:", switchError);
      throw new Error(
        "Failed to switch to Sepolia network. Please switch manually in MetaMask."
      );
    }
  }
};

export const handleAccountChanged = (accounts: string[]) => {
  appState.address = accounts[0];
};

// Contract configuration
export const REGISTRY_ADDRESS = "0x9469A68F08f692a7df72E6fE66674b4833657C96";

// Contract data
export const CONTRACT_DATA = {
  walletAddress: "1316983660714018258856208543902547530655016273103",
  intent: "0", // 0 for Register
  credential_hash:
    "10798637195398541115846500520847030454002011415890242228013493563347262743063",
  nonce: "0",
  result_hash:
    "6998534309948587417642352072861863737802915918270421050506483615366587194343",
};

export const PROOF_INPUTS = {
  pi_a: [
    "2197365074930441172562320286017592319606016523187233735472877984686949884444",
    "12419084257843043864599895314577222854595602149803275973080400317902916398412",
  ],
  pi_b: [
    [
      "8553461446515389456340504879855382892721305805980927876080791965073846935769",
      "3564027389153654170075879668253387134676664289509054989558492184521994540471",
    ],
    [
      "4239427432560049063478156083709807694857249960721213881333558021679146770154",
      "16431733289555767918428985945867533764208532043094283609636480920329279748284",
    ],
  ],
  pi_c: [
    "9820816659410945519613876028212060578037291530551799316209333014188323950644",
    "5910784747590369986348743262087862855747736048380595679644493876268696122156",
  ],
};

// Registry ABI
export const RegistryABI = [
  // {
  // 	name: 'register',
  // 	type: 'function',
  // 	stateMutability: 'nonpayable',
  // 	inputs: [
  // 		{ name: '_pA', type: 'uint[2]' },
  // 		{ name: '_pB', type: 'uint[2][2]' },
  // 		{ name: '_pC', type: 'uint[2]' },
  // 		{ name: 'wallet', type: 'uint256' },
  // 		{ name: 'intent', type: 'uint256' },
  // 		{ name: 'credential_hash', type: 'uint256' },
  // 		{ name: 'nonce', type: 'uint256' },
  // 		{ name: 'result_hash', type: 'uint256' }
  // 	],
  // 	outputs: []
  // },
  {
    type: "function",
    name: "register",
    inputs: [
      { name: "_pA", type: "uint256[2]", internalType: "uint256[2]" },
      { name: "_pB", type: "uint256[2][2]", internalType: "uint256[2][2]" },
      { name: "_pC", type: "uint256[2]", internalType: "uint256[2]" },
      { name: "wallet", type: "uint256", internalType: "uint256" },
      { name: "intent", type: "uint256", internalType: "uint256" },
      { name: "credential_hash", type: "uint256", internalType: "uint256" },
      { name: "nonce", type: "uint256", internalType: "uint256" },
      { name: "result_hash", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "recover",
    type: "function",
    stateMutability: "nonpayable",
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
  },
  {
    name: "getCredentialHash",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getUsedNonce",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "wallet", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "uintToAddress",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "_wallet", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "Registered",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "wallet", type: "uint256", indexed: true },
      { name: "credential_hash", type: "uint256", indexed: false },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Recover",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "wallet", type: "uint256", indexed: true },
      { name: "credential_hash", type: "uint256", indexed: false },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
] as const;

// App state
export const appState = proxy({
  address: "",
  error: "",
  isLoading: false,
  isContractInitialized: false,
});
