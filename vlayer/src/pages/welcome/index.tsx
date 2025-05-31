import { Link } from "react-router";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";
import { useConnectWallet } from "./useConnectWallet";
import { useAccount } from "wagmi";

export const WelcomePage = () => {
  const { connectWallet } = useConnectWallet();
  const { address } = useAccount();

  const handleConnectClick = () => {
    console.log('Connect Wallet button clicked');
    connectWallet();
  };

  const handleContinue = () => {
    window.location.href = "http://localhost:3000";
  };

  return (
    <div className="mt-5 flex justify-center">
      {address ? (
        <button
          onClick={handleContinue}
          id="nextButton"
          data-testid="start-page-button"
          className="bg-violet-500 text-white py-2 px-4 rounded-md hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        >
          Continue
        </button>
      ) : (
        <button 
          onClick={handleConnectClick}
          id="nextButton"
          data-testid="connect-wallet-button"
          className="bg-violet-500 text-white py-2 px-4 rounded-md hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};
