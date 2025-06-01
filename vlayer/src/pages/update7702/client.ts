import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";

const relay = privateKeyToAccount(
  "0x344f59f3270a57ac589cce3a23b9f75bb665e0be31f4ed4cb238ed5e03d9318b"
);

export const walletClient = createWalletClient({
  account: relay,
  chain: sepolia,
  transport: http(
    "https://eth-sepolia.g.alchemy.com/v2/Wo0LTBce7DBLE8KZKQC6UsN4cyeI-WKm"
  ),
});
