import { proxy, snapshot } from 'valtio';
import type { EventLog } from 'web3';
import Web3 from 'web3';

import abiDraw from './abiDraw.json';
import abiFomo from './abiFomo.json';
import abiJackpot from './abiJackpot.json';
import abiMarketplace from './abiMarketplace.json';
import abiNFT from './abiNFT.json';
import abiReferral from './abiReferral.json';
import abiToken from './abiToken.json';
import { appState } from './state';

export const opBNBChainTarget = {
	chainId: '0x15EB',
	chainName: 'opBNB Testnet',
	nativeCurrency: {
		symbol: 'tBNB',
		decimals: 18,
	},
	rpcUrls: ['https://opbnb-testnet-rpc.bnbchain.org'],
	blockExplorerUrls: ['https://opbnb-testnet.bscscan.com'],
};

export const getAccount = async () => {
	if (window.ethereum) {
		const accounts = await window.ethereum.request({
			method: 'eth_accounts',
		});

		if (accounts.length > 0) {
			appState.address = accounts[0];
		}

		await ensureNetworkTarget();
	}
};

export const connectWallet = async () => {
	if (window?.ethereum) {
		const accounts = await window.ethereum.request({
			method: 'eth_requestAccounts',
		});

		if (accounts.length > 0) {
			appState.address = accounts[0];
		}

		await ensureNetworkTarget();
	}
};

export const ensureNetworkTarget = async () => {
	await window.ethereum?.request({
		method: 'wallet_addEthereumChain',
		params: [opBNBChainTarget],
	});
	await window.ethereum?.request({
		method: 'wallet_switchEthereumChain',
		params: [
			{
				chainId: opBNBChainTarget.chainId,
			},
		],
	});
};

export const handleAccountChanged = (accounts: string[]) => {
	appState.address = accounts[0];
	appState.referredAddress = undefined;
};

export enum SmartContract {
	Token = '0x69fBe552E6361A7620Bb2C106259Be301049E087',
	Marketplace = '0xe43BeE387e5d89c299730f7B7b581D35af753494',
	Draw = '0xe0320089466D923f3401F3b50CBEBE51Fba5C868',
	NFT = '0x49430AB34Dad2622b3327B57e517D22a2488E530',
	Jackpot = '0xBBda289cEe994B0927e45F9682faCAa1e1658916',
	Referral = '0xC8155eDB016b8Dd8863c77D4EE6015326F5b8a9d',
	Fomo = '0x227eebC2f5BBb3d636d3F7027690a01A3fbA38DD',
}

export const web3 = new Web3(window.ethereum);
const web3Socket = new Web3(
	new Web3.providers.WebsocketProvider('wss://opbnb-testnet.publicnode.com'),
);

const loadContract = (abi: any, contract: SmartContract) => {
	return new web3.eth.Contract(abi, contract);
};

const marketplaceContract = loadContract(
	abiMarketplace,
	SmartContract.Marketplace,
);
const tokenContract = loadContract(abiToken, SmartContract.Token);
const nftContract = loadContract(abiNFT, SmartContract.NFT);
const jackpotContract = loadContract(abiJackpot, SmartContract.Jackpot);
const referralContract = loadContract(abiReferral, SmartContract.Referral);
const fomoContract = loadContract(abiFomo, SmartContract.Fomo);
const drawContract = loadContract(abiDraw, SmartContract.Draw);

export const faucetToken = async (address: string, amount: number) => {
	await tokenContract.methods.mint(address, amount * 10 ** 6).send({
		from: address,
	});
};

export const purchasePack = async (pack: number, card: number) => {
	const { address, referredAddress } = snapshot(appState);

	try {
		if (!address) throw new Error('Please connect wallet');

		const allowanceRequire = pack === 1 ? 100000000 : 10000000;
		const allowanceGrant = (await tokenContract.methods
			.allowance(address, SmartContract.Marketplace)
			.call()) as bigint;
		console.log(Number(allowanceGrant), '<<< allowance');
		console.log(allowanceRequire, '<<< required');
		const isAllowanceEnough = Number(allowanceGrant) >= allowanceRequire;
		console.log('allowance enough: ', isAllowanceEnough);
		if (!isAllowanceEnough) {
			await tokenContract.methods
				.approve(SmartContract.Marketplace, allowanceRequire)
				.send({ from: address });
		}

		const result = await marketplaceContract.methods
			.purchasePack(
				pack,
				card,
				referredAddress || '0x0000000000000000000000000000000000000000',
			)
			.send({
				from: address,
			});
		appState.transactionId = result.transactionHash;

		const requestIdHash = result.logs.find(
			(log) => log.address === SmartContract.Draw.toLowerCase(),
		)?.topics?.[1];

		if (requestIdHash) {
			const decString = web3.utils.hexToNumberString(requestIdHash);
			appState.requestId = decString;
		}

		return result;
	} catch (error) {
		console.log(error);
	}
};