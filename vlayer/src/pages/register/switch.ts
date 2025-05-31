const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

export async function switchToSepolia() {
  if (!window.ethereum) throw new Error("No wallet detected");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (switchError: any) {
    // If the chain hasn't been added to MetaMask
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID,
            chainName: "Sepolia Testnet",
            rpcUrls: ["https://eth-sepolia.g.alchemy.com/v2/Wo0LTBce7DBLE8KZKQC6UsN4cyeI-WKm"],
            nativeCurrency: {
              name: "SepoliaETH",
              symbol: "ETH",
              decimals: 18,
            },
            blockExplorerUrls: ["https://eth-sepolia.blockscout.com"],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}
