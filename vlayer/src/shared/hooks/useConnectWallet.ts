import { useEffect } from "react";
import { injected, useAccount, useConnect, useDisconnect } from "wagmi";
import { useNavigate } from "react-router";

export const useConnectWallet = () => {
  const { connect } = useConnect();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

//   useEffect(() => {
//     if (address) {
//       void navigate("/send-email");
//     }
//   }, [address, navigate]);

  const connectWallet = () => {
    connect({
      connector: injected(),
    });
  };

  const disconnectWallet = () => {
    disconnect();
  };

  return { connectWallet, disconnectWallet };
};
