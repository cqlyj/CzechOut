import { Link } from "react-router";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";
import { useConnectWallet } from "./useConnectWallet";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";

export const WelcomePage = () => {
  const { connectWallet } = useConnectWallet();
  const { address } = useAccount();
  const [isRegistered, setIsRegistered] = useState(false);

  const checkRegistration = async () => {
    try {
      // Get registration status from localStorage
      const storedAddress = localStorage.getItem('registered_address');
      if (storedAddress === address) {
        setIsRegistered(true);
        return;
      }

      // If not in localStorage, check with API
      const response = await fetch('http://localhost:3000/api/check-registration', {
        headers: {
          'x-wallet-address': address || ''
        }
      });
      const data = await response.json();
      setIsRegistered(data.isRegistered);
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  const handleRegistration = async () => {
    if (!address) return;
    
    try {
      const response = await fetch('http://localhost:3000/api/check-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      const data = await response.json();
      if (data.success) {
        // Store in localStorage
        localStorage.setItem('registered_address', address);
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Error registering:', error);
    }
  };

  useEffect(() => {
    if (address) {
      checkRegistration();
    }
  }, [address]);

  const handleConnectClick = () => {
    console.log('Connect Wallet button clicked');
    connectWallet();
  };

  const handleContinue = () => {
    if (!isRegistered) {
      handleRegistration();
    }
    window.location.href = "http://localhost:3000";
  };

  return (
    <div className="mt-5 flex justify-center">
      {address ? (
        <button
          onClick={handleContinue}
          id="nextButton"
          data-testid="start-page-button"
        >
          {isRegistered ? 'Continue' : 'Register and Continue'}
        </button>
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
