import { sepolia } from "wagmi/chains";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

const appKitProjectId = `0716afdbbb2cc3df69721a879b92ad5b`;

// Force Sepolia only - no localhost/anvil
const chains: [typeof sepolia] = [sepolia];
const networks = chains;

const wagmiAdapter = new WagmiAdapter({
  projectId: appKitProjectId,
  chains,
  networks,
});

createAppKit({
  adapters: [wagmiAdapter],
  projectId: appKitProjectId,
  networks,
  defaultNetwork: sepolia,
  metadata: {
    name: "vlayer-email-proof-example",
    description: "vlayer Email Proof Example",
    url: "https://vlayer.xyz",
    icons: ["https://avatars.githubusercontent.com/u/179229932"],
  },
  themeVariables: {
    "--w3m-color-mix": "#551fbc",
    "--w3m-color-mix-strength": 40,
  },
});

const proverConfig = {
  proverUrl: import.meta.env.VITE_PROVER_URL,
  token: import.meta.env.VITE_VLAYER_API_TOKEN,
};

const { wagmiConfig } = wagmiAdapter;

export { wagmiConfig, proverConfig };
