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

  return (
    <div className="mt-5 flex justify-center">
      {address ? (
        <Link
          to={`/${getStepPath(StepKind.register)}`}
          id="nextButton"
          data-testid="start-page-button"
        >
          Continue to Register
        </Link>
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
