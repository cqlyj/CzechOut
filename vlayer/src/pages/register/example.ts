import { privateKeyToAccount } from 'viem/accounts'
import { walletClient } from './client'
 
const eoa = privateKeyToAccount('0x...')
 
const authorization = await walletClient.signAuthorization({ 
  account: eoa, 
  contractAddress: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2', 
}) 
        const hash = await walletClient.sendTransaction({
  authorizationList: [authorization],
  data: '0xdeadbeef',
  to: eoa.address,
})