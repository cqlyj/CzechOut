import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
 
const relay = privateKeyToAccount('0x21f6ad4a9bcab0cf664e19f0cf0682aad455f43de3721710a1ea50519017b218')
 
export const walletClient = createWalletClient({
  account: relay,
  chain: sepolia,
  transport: http(),
})