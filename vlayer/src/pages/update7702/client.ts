import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia } from 'viem/chains'
 
const relay = privateKeyToAccount('0x21f6ad4a9bcab0cf664e19f0cf0682aad455f43de3721710a1ea50519017b218')
 
export const walletClient = createWalletClient({
  account: relay,
  chain: sepolia,
  transport: http("https://eth-sepolia.g.alchemy.com/v2/Wo0LTBce7DBLE8KZKQC6UsN4cyeI-WKm"),
})