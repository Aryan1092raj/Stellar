import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import {
  CONFIRMATION_MAX_ATTEMPTS,
  CONFIRMATION_POLL_INTERVAL_MS,
  COORDINATE_SCALE,
  DEFAULT_SOROBAN_RPC_URL,
  STELLAR_NETWORK_NAMES,
  STROOPS_PER_XLM,
} from './constants';

export const server = new SorobanRpc.Server(
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || DEFAULT_SOROBAN_RPC_URL,
  { allowHttp: true }
);

export type BuildDonationTxInput = {
  donorPublicKey: string;
  amountXLM: number;
  ngoId: number;
  projectId?: number | null;
  donorLat: number;
  donorLon: number;
  donationRegistryContractId?: string;
  nativeTokenContractId?: string;
};

export function getNetworkPassphrase() {
  const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || STELLAR_NETWORK_NAMES.TESTNET).toLowerCase();

  switch (network) {
    case STELLAR_NETWORK_NAMES.PUBLIC:
    case STELLAR_NETWORK_NAMES.MAINNET:
      return Networks.PUBLIC;
    case STELLAR_NETWORK_NAMES.FUTURENET:
      return Networks.FUTURENET;
    case STELLAR_NETWORK_NAMES.SANDBOX:
      return Networks.SANDBOX;
    case STELLAR_NETWORK_NAMES.STANDALONE:
      return Networks.STANDALONE;
    case STELLAR_NETWORK_NAMES.TESTNET:
    default:
      return Networks.TESTNET;
  }
}

function getDonationRegistryContractId(override?: string) {
  const contractId =
    override ||
    process.env.NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT ||
    process.env.NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT_ID;

  if (!contractId) {
    throw new Error('Donation registry contract is not configured');
  }

  return contractId;
}

function getNativeTokenContractId(override?: string) {
  const contractId =
    override ||
    process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT ||
    process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT_ID;

  if (!contractId) {
    throw new Error('Native token contract is not configured');
  }

  return contractId;
}

function toStroops(amountXLM: number) {
  if (!Number.isFinite(amountXLM) || amountXLM <= 0) {
    throw new Error('Donation amount must be greater than zero');
  }

  return BigInt(Math.round(amountXLM * STROOPS_PER_XLM));
}

function toContractCoordinate(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error('Donation coordinates are invalid');
  }

  return Math.round(value * COORDINATE_SCALE);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function buildDonationTx(input: BuildDonationTxInput) {
  const contract = new Contract(getDonationRegistryContractId(input.donationRegistryContractId));
  const nativeTokenContractId = getNativeTokenContractId(input.nativeTokenContractId);
  const account = await server.getAccount(input.donorPublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(
      contract.call(
        'record_donation',
        new Address(input.donorPublicKey).toScVal(),
        nativeToScVal(toStroops(input.amountXLM), { type: 'i128' }),
        nativeToScVal(input.ngoId, { type: 'u32' }),
        nativeToScVal(input.projectId ?? 0, { type: 'u32' }),
        nativeToScVal(toContractCoordinate(input.donorLat), { type: 'i32' }),
        nativeToScVal(toContractCoordinate(input.donorLon), { type: 'i32' }),
        new Address(nativeTokenContractId).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

export async function submitTx(signedXDR: string) {
  const signedTransaction = TransactionBuilder.fromXDR(signedXDR, getNetworkPassphrase());
  const sendResponse = await server.sendTransaction(signedTransaction);

  if (sendResponse.status === 'ERROR') {
    throw new Error(`Soroban transaction rejected: ${sendResponse.hash}`);
  }

  for (let attempt = 0; attempt < CONFIRMATION_MAX_ATTEMPTS; attempt += 1) {
    const response = await server.getTransaction(sendResponse.hash);

    if (response.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return sendResponse.hash;
    }

    if (response.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Soroban transaction failed: ${sendResponse.hash}`);
    }

    await delay(CONFIRMATION_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for Soroban transaction: ${sendResponse.hash}`);
}
