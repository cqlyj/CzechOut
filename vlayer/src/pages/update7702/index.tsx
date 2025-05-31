import { useAccount } from "wagmi";
import { privateKeyToAccount } from "viem/accounts";
import { useNavigate } from "react-router";
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { walletClient } from "./client";
import { useState } from "react";

export const Update7702Page = () => {
  const { address } = useAccount();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthorization = async () => {
    if (!address) return;
    setIsLoading(true);
    const eoa = privateKeyToAccount
    ("0x21f6ad4a9bcab0cf664e19f0cf0682aad455f43de3721710a1ea50519017b218");
    try {
      const authorization = await walletClient.signAuthorization({ 
        account: eoa,
        chainId: 11155111,
        contractAddress: '0xeE7fE61ba80E9EB65BA36c025863B884c1606939', 
        executor: 'self',
      })

      console.log(authorization); 
      console.log(eoa, eoa.address);
      const hash = await walletClient.sendTransaction({
        authorizationList: [authorization],
        data: '0x',
        to: eoa.address,
      })
      console.log(hash);
      
      // Add 2 second delay with animation
      await new Promise(resolve => setTimeout(resolve, 5000));
      navigate(`/success?txHash=${hash}`);
    } catch (error) {
      console.error('Authorization failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <div className="mt-5 flex justify-center">
      <button
        onClick={handleAuthorization}
        disabled={isLoading}
        className="bg-violet-500 text-white py-2 px-4 rounded-md hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </div>
        ) : (
          "Sign Authorization"
        )}
      </button>
    </div>
  );
};
