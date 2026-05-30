// Soroban invocation via RPC using Freighter for signing/submission.
// Minimal happy-path flow targeting Testnet/Futurenet.

import { Contract, SorobanRpc, TransactionBuilder, nativeToScVal, Address, Account } from '@stellar/stellar-sdk';

type Freighter = {
  isConnected: () => Promise<boolean>;
  getUserInfo: () => Promise<{ publicKey: string; signedMessage?: string }>;
  signTransaction: (xdr: string, opts: { networkPassphrase: string }) => Promise<string>;
  submitTransaction: (xdr: string) => Promise<{ hash: string }>;
};

function getFreighter(): Freighter {
  const f = (globalThis as any).freighterApi;
  if (!f) throw new Error('Freighter not available');
  return f as Freighter;
}

const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'futurenet'
  ? 'Test SDF Future Network ; October 2022'
  : 'Test SDF Network ; September 2015';

const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://rpc-futurenet.stellar.org';
const rpc = new SorobanRpc.Server(rpcUrl, { allowHttp: true });

type TypedArg = { value: number | bigint; type: 'u32' | 'i32' | 'i128' };

function typed(value: number | bigint, type: TypedArg['type']): TypedArg {
  return { value, type };
}

function encodeArg(a: any) {
  if (a && typeof a === 'object' && 'value' in a && 'type' in a) {
    return nativeToScVal(a.value, { type: a.type });
  }
  if (typeof a === 'string' && a.startsWith('G')) return new Address(a).toScVal();
  return a;
}

function isScVal(value: any) {
  return value && typeof value.switch === 'function' && typeof value.toXDR === 'function';
}

function hashHexToBytesN(hashHex: string) {
  const normalized = hashHex.startsWith('0x') ? hashHex.slice(2) : hashHex;
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('Evidence hash must be 32 bytes encoded as 64 hex characters');
  }

  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function buildInvokeXdr(contractId: string, functionName: string, args: any[]): Promise<string> {
  const c = new Contract(contractId);
  const source = (await getFreighter().getUserInfo()).publicKey;
  const acc = await rpc.getAccount(source);
  const account = new Account(acc.accountId(), acc.sequenceNumber());
  const encoded = args.map(encodeArg);
  const op = c.call(functionName, ...encoded.map((v) => (isScVal(v) ? v : nativeToScVal(v))));
  const tx = new TransactionBuilder(account, { fee: (100_000).toString(), networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(op)
    .setTimeout(30)
    .build();
  const prepared = await rpc.prepareTransaction(tx);
  return prepared.toXDR();
}

export async function recordDonationOnChain(args: {
  contractId: string;
  donor: string;
  amount: number;
  ngo_id: number;
  project_id?: number;
  donor_lat: number;
  donor_lon: number;
  nativeTokenContractId?: string;
}): Promise<{ txHash: string }>{
  const f = getFreighter();
  await f.isConnected();

  const nativeTokenContractId =
    args.nativeTokenContractId || process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT_ID || '';
  if (!nativeTokenContractId) throw new Error('Native token contract ID is not configured');

  const amountStroops = BigInt(Math.round(args.amount * 10_000_000));
  const donorLat = Math.round(args.donor_lat * 1_000_000);
  const donorLon = Math.round(args.donor_lon * 1_000_000);

  const xdr = await buildInvokeXdr(args.contractId, 'record_donation', [
    args.donor,
    typed(amountStroops, 'i128'),
    typed(args.ngo_id, 'u32'),
    typed(args.project_id ?? 0, 'u32'),
    typed(donorLat, 'i32'),
    typed(donorLon, 'i32'),
    nativeTokenContractId,
  ]);
  const signed = await f.signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
  const res = await f.submitTransaction(signed);
  return { txHash: res.hash };
}

export async function verifyImpactOnChain(args: { contractId: string; donation_id: number; verifier: string; evidenceHashHex: string }): Promise<{ txHash: string }>{
  const f = getFreighter();
  await f.isConnected();
  const xdr = await buildInvokeXdr(args.contractId, 'verify_impact', [
    typed(args.donation_id, 'u32'),
    args.verifier,
    hashHexToBytesN(args.evidenceHashHex),
  ]);
  const signed = await f.signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
  const res = await f.submitTransaction(signed);
  return { txHash: res.hash };
}
