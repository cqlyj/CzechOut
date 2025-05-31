import { useConnectWallet } from "./useConnectWallet";
import { useAccount } from "wagmi";

export const ConnectWallet = () => {
  const { connectWallet, disconnectWallet } = useConnectWallet();
  const { address } = useAccount();

  const handleConnectClick = () => {
    console.log('Connect Wallet button clicked');
    connectWallet();
  };

  return (
    <div className="mt-5 flex flex-col items-center space-y-4">
      {address ? (
        <div className="flex flex-col items-center">
          <div className="text-sm text-gray-600 mb-2">
            {`${address.slice(0, 6)}...${address.slice(-4)}`}
          </div>
          <button
            onClick={disconnectWallet}
            className="text-sm text-red-500 underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnectClick}
          id="nextButton"
          data-testid="connect-wallet-button"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};
