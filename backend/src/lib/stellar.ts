import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { createHash } from 'crypto';
import { config } from '../config/env';

const CONFIRMATION_MAX_ATTEMPTS = 20;
const CONFIRMATION_POLL_INTERVAL_MS = 1500;

export const server = new SorobanRpc.Server(config.SOROBAN_RPC_URL, { allowHttp: true });

export function getNetworkPassphrase() {
  const network = config.STELLAR_NETWORK.toLowerCase();

  switch (network) {
    case 'public':
    case 'mainnet':
      return Networks.PUBLIC;
    case 'futurenet':
      return Networks.FUTURENET;
    case 'sandbox':
      return Networks.SANDBOX;
    case 'standalone':
      return Networks.STANDALONE;
    case 'testnet':
    default:
      return Networks.TESTNET;
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function hashCidToBuffer(cid: string) {
  return createHash('sha256').update(cid).digest();
}

export function hashCidToScVal(cid: string) {
  return xdr.ScVal.scvBytes(hashCidToBuffer(cid));
}

async function buildContractTx(sourcePublicKey: string, contractId: string, functionName: string, args: xdr.ScVal[]) {
  const account = await server.getAccount(sourcePublicKey);
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(new Contract(contractId).call(functionName, ...args))
    .setTimeout(30)
    .build();
}

export async function readContractValue(
  sourcePublicKey: string,
  contractId: string,
  functionName: string,
  args: xdr.ScVal[]
) {
  const tx = await buildContractTx(sourcePublicKey, contractId, functionName, args);
  const simulation = await server.simulateTransaction(tx);

  if (!SorobanRpc.Api.isSimulationSuccess(simulation) || !simulation.result) {
    const reason = SorobanRpc.Api.isSimulationError(simulation) ? simulation.error : 'no simulation result';
    throw new Error(`Soroban simulation failed: ${reason}`);
  }

  return scValToNative(simulation.result.retval);
}

async function buildPreparedXdr(sourcePublicKey: string, contractId: string, functionName: string, args: xdr.ScVal[]) {
  const tx = await buildContractTx(sourcePublicKey, contractId, functionName, args);
  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

export async function isNGOVerifiedOnChain(ngoId: number, sourcePublicKey: string) {
  const value = await readContractValue(sourcePublicKey, requiredEnv('NGO_VERIFICATION_CONTRACT_ID'), 'is_verified', [
    nativeToScVal(ngoId, { type: 'u32' }),
  ]);
  return value === true;
}

export async function buildEvidenceTx(args: {
  ngoAddress: string;
  projectId: number;
  ipfsCid: string;
}) {
  return buildPreparedXdr(args.ngoAddress, requiredEnv('EVIDENCE_CONTRACT_ID'), 'submit_evidence', [
    nativeToScVal(args.projectId, { type: 'u64' }),
    hashCidToScVal(args.ipfsCid),
    new Address(args.ngoAddress).toScVal(),
  ]);
}

export async function buildVerifyImpactTx(args: {
  ngoAddress: string;
  donationId: number;
  ipfsCid: string;
}) {
  return buildPreparedXdr(args.ngoAddress, requiredEnv('DONATION_REGISTRY_CONTRACT_ID'), 'verify_impact', [
    nativeToScVal(args.donationId, { type: 'u32' }),
    new Address(args.ngoAddress).toScVal(),
    hashCidToScVal(args.ipfsCid),
  ]);
}

export async function verifyTxOnChain(txHash: string) {
  for (let attempt = 0; attempt < CONFIRMATION_MAX_ATTEMPTS; attempt += 1) {
    const response = await server.getTransaction(txHash);

    if (response.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return true;
    }

    if (response.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      return false;
    }

    await delay(CONFIRMATION_POLL_INTERVAL_MS);
  }

  return false;
}
