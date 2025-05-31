import { useEffect } from "react";
import { injected, useAccount, useConnect, useDisconnect } from "wagmi";
import { useNavigate } from "react-router";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";

export const useConnectWallet = () => {
  const { connect } = useConnect();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

//   useEffect(() => {
//     if (address) {
//       navigate(`/${getStepPath(StepKind.register)}`);
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
