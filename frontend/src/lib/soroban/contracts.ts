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

function encodeArg(a: any) {
  if (typeof a === 'number') return a; // nativeToScVal will infer i64/i128 as needed when used properly
  if (typeof a === 'string' && a.startsWith('G')) return new Address(a);
  return a;
}

async function buildInvokeXdr(contractId: string, functionName: string, args: any[]): Promise<string> {
  const c = new Contract(contractId);
  const source = (await getFreighter().getUserInfo()).publicKey;
  const acc = await rpc.getAccount(source);
  const account = new Account(acc.accountId(), acc.sequenceNumber());
  const encoded = args.map(encodeArg);
  const op = c.call(functionName, ...encoded.map((v) => (v instanceof Address ? v.toScVal() : nativeToScVal(v))));
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
  donor_lat: number;
  donor_lon: number;
}): Promise<{ txHash: string }>{
  const f = getFreighter();
  await f.isConnected();
  // Build XDR for record_donation(donor, amount, ngo_id, project_id=0, donor_lat, donor_lon)
  const xdr = await buildInvokeXdr(args.contractId, 'record_donation', [
    args.donor,
    args.amount,
    args.ngo_id,
    0,
    args.donor_lat,
    args.donor_lon,
  ]);
  const signed = await f.signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
  const res = await f.submitTransaction(signed);
  return { txHash: res.hash };
}

export async function verifyImpactOnChain(args: { contractId: string; donation_id: number; verifier: string }): Promise<{ txHash: string }>{
  const f = getFreighter();
  await f.isConnected();
  const xdr = await buildInvokeXdr(args.contractId, 'verify_impact', [args.donation_id, args.verifier]);
  const signed = await f.signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
  const res = await f.submitTransaction(signed);
  return { txHash: res.hash };
}
