# GeoLedger — Full Deployment Plan

> Current score: **68/100** · Target: **production** · ETA: **4–6 weeks**
>
> This document is the single source of truth from code fixes → deployed startup.
> Work top-to-bottom. Each phase must be complete before the next starts.

---

## Quick reference: what's real vs stub right now

| Component | Status | Blocks launch? |
|---|---|---|
| OTP auth + JWT | ✅ Real | No |
| Donations API (CRUD) | ✅ Real | No |
| Evidence upload (IPFS) | ✅ Real | No |
| NGO verification contract | ✅ Real | No |
| Evidence contract | ✅ Real | No |
| Donation registry contract | ✅ Real (storage bug) | Partial |
| Frontend map + dashboard | ✅ Real | No |
| AI chatbot (Gemini) | ✅ Real | No |
| ImpactEscrow contract | ❌ Stub — emits event only | YES |
| TokenManager contract | ❌ Stub — TODO comments | YES |
| verify_impact ACL | ❌ Missing — anyone can call | YES |
| Soroban tx signing (frontend) | ❌ Missing — chain ID is a string | YES |
| Persistent contract storage | ❌ All use instance (64KB limit) | YES |
| JWT_SECRET fallback | ❌ Defaults to `'dev'` | YES |

---

## Phase 1 — Make it real
### Week 1–2 · Nothing ships until all 5 items below are done.

---

### 1.1 Fix ImpactEscrow — real XLM transfer

**File:** `contracts/impact_escrow/src/lib.rs`

The current `release()` just emits an event. Replace the entire contract with this:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone)]
pub struct EscrowRecord {
    pub donor: Address,
    pub ngo: Address,
    pub amount: i128,
    pub released: bool,
    pub donation_id: u32,
}

const ADMIN_KEY: &str = "ADMIN";

#[contract]
pub struct ImpactEscrow;

#[contractimpl]
impl ImpactEscrow {
    /// Call once on deploy. Sets the admin (your backend wallet).
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("already initialised");
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
    }

    /// Called by donation_registry when a donation is made.
    /// Funds must already be in this contract's account before calling.
    pub fn lock(env: Env, donation_id: u32, donor: Address, ngo: Address, amount: i128) {
        // Only donation_registry contract can call lock
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();

        let record = EscrowRecord {
            donor,
            ngo,
            amount,
            released: false,
            donation_id,
        };
        env.storage()
            .persistent()
            .set(&donation_id, &record);
        env.storage()
            .persistent()
            .extend_ttl(&donation_id, 100_000, 100_000);
    }

    /// Called by admin after NGO uploads verified evidence.
    pub fn release(env: Env, admin: Address, donation_id: u32, native_token: Address) {
        admin.require_auth();

        // Verify admin matches stored admin
        let stored_admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        if admin != stored_admin {
            panic!("not admin");
        }

        let mut record: EscrowRecord = env.storage()
            .persistent()
            .get(&donation_id)
            .expect("donation not found");

        if record.released {
            panic!("already released");
        }

        // Transfer XLM to NGO using Stellar native token interface
        let token_client = token::Client::new(&env, &native_token);
        token_client.transfer(
            &env.current_contract_address(), // from: this escrow contract
            &record.ngo,                      // to: the NGO wallet
            &record.amount,
        );

        record.released = true;
        env.storage().persistent().set(&donation_id, &record);

        env.events().publish(
            (symbol_short!("released"), donation_id),
            (record.ngo.clone(), record.amount),
        );
    }

    /// Refund to donor if NGO fails to submit evidence (timeout path).
    pub fn refund(env: Env, admin: Address, donation_id: u32, native_token: Address) {
        admin.require_auth();

        let stored_admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        if admin != stored_admin {
            panic!("not admin");
        }

        let mut record: EscrowRecord = env.storage()
            .persistent()
            .get(&donation_id)
            .expect("donation not found");

        if record.released {
            panic!("already released");
        }

        let token_client = token::Client::new(&env, &native_token);
        token_client.transfer(
            &env.current_contract_address(),
            &record.donor,
            &record.amount,
        );

        record.released = true;
        env.storage().persistent().set(&donation_id, &record);

        env.events().publish(
            (symbol_short!("refunded"), donation_id),
            (record.donor.clone(), record.amount),
        );
    }

    pub fn get_escrow(env: Env, donation_id: u32) -> Option<EscrowRecord> {
        env.storage().persistent().get(&donation_id)
    }
}
```

**Add to `contracts/impact_escrow/Cargo.toml`:**
```toml
[dependencies]
soroban-sdk = { version = "21.0.0", features = ["token"] }
```

**Get the native XLM token contract address for your network:**
```bash
# Testnet
stellar contract id asset --asset native --network testnet
# → CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC (example)

# Mainnet — look up from Stellar laboratory
```

Store this address in your backend `.env` as `NATIVE_TOKEN_CONTRACT_ID`.

---

### 1.2 Fix TokenManager — or remove it entirely

**Decision point first:** TokenManager is redundant if you use native XLM directly in the escrow (recommended for MVP). If you want to support custom tokens later, keep it. For now:

**Option A (recommended for MVP) — delete TokenManager, use native XLM:**
```bash
rm -rf contracts/token_manager
```
Remove `token_manager` from `contracts/workspace/Cargo.toml` and from `scripts/deploy_contracts.sh`.

**Option B — implement TokenManager properly:**

**File:** `contracts/token_manager/src/lib.rs`
```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env};

#[contract]
pub struct TokenManager;

#[contractimpl]
impl TokenManager {
    /// Deposit native XLM into the escrow contract on behalf of donor.
    /// The donor must have already authorised this transfer.
    pub fn deposit(env: Env, from: Address, escrow_contract: Address, amount: i128, native_token: Address) {
        from.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let token_client = token::Client::new(&env, &native_token);
        token_client.transfer(&from, &escrow_contract, &amount);
    }

    /// Withdraw — only called by escrow contract during release/refund.
    pub fn withdraw(env: Env, caller: Address, to: Address, amount: i128, native_token: Address) {
        caller.require_auth();
        let token_client = token::Client::new(&env, &native_token);
        token_client.transfer(&caller, &to, &amount);
    }
}
```

---

### 1.3 Add ACL to verify_impact

**File:** `contracts/donation_registry/src/lib.rs`

Find the `verify_impact` function and replace it:

```rust
/// Only the NGO that owns this donation project can verify impact.
pub fn verify_impact(
    env: Env,
    ngo_address: Address,
    donation_id: u32,
    evidence_hash: String,
) {
    // Require the NGO to sign this transaction
    ngo_address.require_auth();

    // Load the donation record
    let mut donation: DonationRecord = env.storage()
        .persistent()
        .get(&donation_id)
        .expect("donation not found");

    // Verify the caller is the NGO assigned to this donation
    if donation.ngo != ngo_address {
        panic!("not authorised: caller is not the assigned NGO");
    }

    if donation.impact_verified {
        panic!("already verified");
    }

    donation.impact_verified = true;
    donation.evidence_hash = Some(evidence_hash.clone());

    env.storage().persistent().set(&donation_id, &donation);
    env.storage()
        .persistent()
        .extend_ttl(&donation_id, 100_000, 100_000);

    // Trigger escrow release via cross-contract call
    // (your escrow contract address stored in instance storage at init)
    let escrow_contract: Address = env.storage()
        .instance()
        .get(&"ESCROW")
        .expect("escrow not configured");

    env.events().publish(
        (symbol_short!("verified"), donation_id),
        (ngo_address, evidence_hash),
    );

    // Cross-contract call to release funds
    let escrow_client = impact_escrow::Client::new(&env, &escrow_contract);
    escrow_client.release(
        &env.current_contract_address(),
        &donation_id,
        &donation.native_token,
    );
}
```

---

### 1.4 Wire Freighter wallet → real Soroban transaction

This is the biggest frontend task. Currently `chain_create_tx` is stored as a raw string from the client. You need to actually build, sign, and submit a Soroban transaction.

**Install dependencies:**
```bash
cd frontend
npm install @stellar/stellar-sdk @stellar/freighter-api
```

**Create `frontend/src/lib/stellar.ts`:**
```typescript
import {
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  SorobanRpc,
  Contract,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
  ? Networks.PUBLIC
  : Networks.TESTNET;

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL
  || "https://soroban-testnet.stellar.org";

const DONATION_REGISTRY_CONTRACT = process.env.NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT!;
const NATIVE_TOKEN_CONTRACT = process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT!;

export const server = new SorobanRpc.Server(RPC_URL);

/**
 * Build the Soroban transaction to lock funds in escrow and register donation.
 * Returns XDR string for Freighter to sign.
 */
export async function buildDonationTx(params: {
  donorPublicKey: string;
  ngoAddress: string;
  donationId: number;
  amountStroops: bigint; // 1 XLM = 10_000_000 stroops
}): Promise<string> {
  const { donorPublicKey, ngoAddress, donationId, amountStroops } = params;

  const account = await server.getAccount(donorPublicKey);
  const contract = new Contract(DONATION_REGISTRY_CONTRACT);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(
      contract.call(
        "create_donation",
        new Address(donorPublicKey).toScVal(),
        new Address(ngoAddress).toScVal(),
        nativeToScVal(donationId, { type: "u32" }),
        nativeToScVal(amountStroops, { type: "i128" }),
        new Address(NATIVE_TOKEN_CONTRACT).toScVal(),
      )
    )
    .setTimeout(30)
    .build();

  // Simulate first to get the resource footprint
  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, sim).build();
  return preparedTx.toXDR();
}

/**
 * Submit a signed XDR transaction and wait for confirmation.
 */
export async function submitTx(signedXDR: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXDR, NETWORK);
  const result = await server.sendTransaction(tx);

  if (result.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult)}`);
  }

  // Poll for confirmation
  let response = await server.getTransaction(result.hash);
  let attempts = 0;
  while (
    response.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 30
  ) {
    await new Promise((r) => setTimeout(r, 2000));
    response = await server.getTransaction(result.hash);
    attempts++;
  }

  if (response.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction did not confirm: ${response.status}`);
  }

  return result.hash;
}
```

**Update `frontend/src/hooks/useFreighter.ts` (create if missing):**
```typescript
import { useState, useEffect } from "react";
import {
  isConnected,
  getPublicKey,
  signTransaction,
} from "@stellar/freighter-api";

export function useFreighter() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    isConnected().then((res) => {
      if (res.isConnected) {
        setConnected(true);
        getPublicKey().then((r) => setPublicKey(r.publicKey));
      }
    });
  }, []);

  const connect = async () => {
    const result = await getPublicKey();
    if (!result.error) {
      setPublicKey(result.publicKey);
      setConnected(true);
    }
  };

  const sign = async (xdr: string, network: "TESTNET" | "PUBLIC" = "TESTNET") => {
    const result = await signTransaction(xdr, { networkPassphrase: network === "TESTNET"
      ? "Test SDF Network ; September 2015"
      : "Public Global Stellar Network ; September 2015"
    });
    if (result.error) throw new Error(result.error.message);
    return result.signedTxXdr;
  };

  return { publicKey, connected, connect, sign };
}
```

**Update your donation flow component to call the real chain:**
```typescript
// In your DonationFlow component (wherever you currently call the API)
import { buildDonationTx, submitTx } from "@/lib/stellar";
import { useFreighter } from "@/hooks/useFreighter";

// Inside the submit handler:
const { sign, publicKey } = useFreighter();

const handleDonate = async () => {
  if (!publicKey) throw new Error("Wallet not connected");

  const amountStroops = BigInt(Math.round(amountXLM * 10_000_000));

  // 1. Build the transaction
  const xdr = await buildDonationTx({
    donorPublicKey: publicKey,
    ngoAddress: selectedNgo.walletAddress,
    donationId: donationRecord.id,
    amountStroops,
  });

  // 2. Get Freighter to sign it
  const signedXdr = await sign(xdr);

  // 3. Submit on-chain
  const txHash = await submitTx(signedXdr);

  // 4. Save the real tx hash to backend
  await api.post("/donations/confirm", {
    donationId: donationRecord.id,
    txHash,
  });
};
```

**Add to `frontend/.env.local`:**
```bash
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT=<deployed_contract_id>
NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT=<native_xlm_contract_id>
```

---

### 1.5 Migrate all contracts from instance → persistent storage

This applies to **every** contract. Instance storage has a ~64KB limit across all keys. Persistent storage has per-key TTL and no aggregate size limit.

**Pattern to apply everywhere:**

```rust
// BEFORE (breaks at scale):
env.storage().instance().set(&key, &value);
let val = env.storage().instance().get(&key).unwrap();

// AFTER (production-safe):
env.storage().persistent().set(&key, &value);
env.storage().persistent().extend_ttl(&key, 100_000, 100_000);
let val = env.storage().persistent().get(&key).unwrap();
```

**TTL values:**
- `100_000` ledgers ≈ ~6 days at 5s/ledger
- For long-lived records (donations, NGO registration), use `5_000_000` ≈ ~9 months
- Call `extend_ttl` every time you read or write a record to keep it alive

**Files to update:**
- `contracts/donation_registry/src/lib.rs` — all donation records, NGO maps
- `contracts/ngo_verification/src/lib.rs` — NGO whitelist
- `contracts/nft_minting/src/lib.rs` — NFT ownership map, all token records
- `contracts/evidence/src/lib.rs` — evidence IPFS hash records

Keep `instance()` only for contract-level config (admin address, contract addresses, counters) — things that are always loaded anyway.

---

## Phase 2 — Harden
### Week 3–4 · Security before any real users.

---

### 2.1 Fix JWT_SECRET

**File:** `backend/src/config/env.ts`

```typescript
// BEFORE:
JWT_SECRET: process.env.JWT_SECRET || 'dev',

// AFTER:
JWT_SECRET: (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'dev') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production. Refusing to start.');
    }
    console.warn('⚠️  Using insecure JWT_SECRET. Set JWT_SECRET env var.');
  }
  return secret || 'dev-only-not-for-production';
})(),
```

**Generate a real secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 2.2 Lock CORS to your actual domain

**File:** `backend/src/app.ts`

```typescript
// BEFORE:
origin: (origin, callback) => {
  if (!origin || origin.endsWith('.vercel.app')) callback(null, true);
  else callback(new Error('Not allowed by CORS'));
}

// AFTER:
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

origin: (origin, callback) => {
  if (!origin) return callback(null, true); // allow server-to-server
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
  callback(new Error(`CORS: ${origin} not allowed`));
}
```

**Add to your production env:**
```bash
ALLOWED_ORIGINS=https://geoledger.vercel.app,https://geoledger.xyz
```

---

### 2.3 Remove OTP code from response body

**File:** `backend/src/routes/otp.ts`

```typescript
// BEFORE:
if (process.env.DISABLE_EMAILS === '1') {
  return res.json({ ok: true, code });
}

// AFTER:
if (process.env.DISABLE_EMAILS === '1' && process.env.NODE_ENV !== 'production') {
  console.log(`[DEV OTP] code for ${email}: ${code}`);
  // Log to console only — never send in response body
  return res.json({ ok: true });
}
```

Also make sure your production deploy script checks:
```bash
# In your deployment CI — fail if this is set in prod
if [ "$NODE_ENV" = "production" ] && [ "$DISABLE_EMAILS" = "1" ]; then
  echo "ERROR: DISABLE_EMAILS must not be set in production"
  exit 1
fi
```

---

### 2.4 Resolve dead auth routes

**File:** `backend/src/controllers/auth.controller.ts`

Every method returns `501 Not Implemented`. You have two options:

**Option A — OTP-only (recommended for MVP, simpler):**
```typescript
// Remove or redirect the dead routes
router.post('/login', (req, res) => {
  res.status(410).json({
    error: 'This endpoint is deprecated. Use /api/otp/send and /api/otp/verify.'
  });
});
router.post('/register', (req, res) => {
  res.status(410).json({
    error: 'This endpoint is deprecated. Use /api/otp/send and /api/otp/verify.'
  });
});
```

**Option B — Implement password auth** (if you want both paths):
```typescript
import bcrypt from 'bcryptjs';

export async function register(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'user already exists' });

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash: hash } });

  const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email } });
}
```

---

### 2.5 Add database migrations to CI

**File:** `.github/workflows/ci.yml`

Add after the install step:
```yaml
- name: Run database migrations
  run: npx prisma migrate deploy
  working-directory: backend
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Run tests
  run: npm test
  working-directory: backend
```

**Also add to your deployment script / `package.json`:**
```json
{
  "scripts": {
    "start": "prisma migrate deploy && node dist/app.js",
    "deploy": "npm run build && prisma migrate deploy"
  }
}
```

---

### 2.6 Clean up debug statements

**File:** `backend/src/app.ts`

```bash
# Find all console.log in source (not tests)
grep -rn "console\.log" backend/src --include="*.ts" | grep -v ".test."
```

Replace with a proper logger:
```bash
npm install pino pino-pretty
```

```typescript
// backend/src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Replace console.log('something') with:
// logger.info({ event: 'something' });
// logger.error({ err }, 'something failed');
```

Delete `frontend/src/hooks/useAuth.ts` (0-byte file):
```bash
rm frontend/src/hooks/useAuth.ts
```

---

## Phase 3 — Scale prep
### Week 5–6 · Before any marketing or growth push.

---

### 3.1 Fix tokens_of O(n) in NFT contract

**File:** `contracts/nft_minting/src/lib.rs`

Current implementation loops all NFTs to count by owner. Replace with a per-owner index:

```rust
/// Maintain a list of token IDs per owner as a separate key.
fn owner_tokens_key(owner: &Address) -> String {
    // Use owner address as part of the key
    format!("owner_tokens_{}", owner)
}

pub fn mint(env: Env, to: Address, donation_id: u32) -> u32 {
    let token_id = /* your existing ID generation */;

    // Store the token
    env.storage().persistent().set(&token_id, &NFTRecord { owner: to.clone(), donation_id });

    // Update owner index
    let key = owner_tokens_key(&to);
    let mut tokens: Vec<u32> = env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(&env));
    tokens.push_back(token_id);
    env.storage().persistent().set(&key, &tokens);
    env.storage().persistent().extend_ttl(&key, 5_000_000, 5_000_000);

    token_id
}

/// O(1) count, O(n_owned) enumeration — both acceptable
pub fn tokens_of(env: Env, owner: Address) -> Vec<u32> {
    let key = owner_tokens_key(&owner);
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(&env))
}
```

---

### 3.2 Add contract upgrade authority

Without this you can't fix bugs in deployed contracts. Every contract needs an upgrade function gated to an admin key:

```rust
use soroban_sdk::xdr::ToXdr;

/// In each contract's impl block:
pub fn upgrade(env: Env, admin: Address, new_wasm_hash: soroban_sdk::BytesN<32>) {
    admin.require_auth();
    let stored_admin: Address = env.storage().instance().get(&"ADMIN").unwrap();
    if admin != stored_admin {
        panic!("not admin");
    }
    env.deployer().update_current_contract_wasm(new_wasm_hash);
}

/// To upgrade a deployed contract:
// stellar contract upload --wasm contracts/target/wasm32-unknown-unknown/release/contract.wasm
// stellar contract invoke --id <CONTRACT_ID> -- upgrade --admin <ADMIN_ADDRESS> --new_wasm_hash <HASH>
```

---

### 3.3 Add monitoring

**Install Sentry in backend:**
```bash
cd backend && npm install @sentry/node
```

```typescript
// backend/src/app.ts — add at very top before other imports
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// After all routes, add error handler:
app.use(Sentry.Handlers.errorHandler());
```

**Install Sentry in frontend:**
```bash
cd frontend && npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Uptime monitoring:** Sign up at https://betterstack.com (free tier) and add monitors for:
- `https://your-api.railway.app/health`
- `https://geoledger.vercel.app`

Add a health endpoint to your backend:
```typescript
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});
```

---

## Phase 4 — Deploy
### Week 6 · The actual launch sequence.

---

### 4.1 Environment variables — full list

Create this before any deployment. Never commit these to git.

**Backend (Railway / Render):**
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/geoledger
JWT_SECRET=<64-char-hex-from-crypto>
ALLOWED_ORIGINS=https://geoledger.vercel.app

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Pinata (IPFS)
PINATA_API_KEY=your-key
PINATA_SECRET_API_KEY=your-secret

# Stellar / Soroban
STELLAR_NETWORK=mainnet                         # or testnet
SOROBAN_RPC_URL=https://mainnet.sorobanrpc.com  # or testnet URL
ADMIN_SECRET_KEY=S...                           # your admin keypair secret
NATIVE_TOKEN_CONTRACT_ID=<native_xlm_contract>
DONATION_REGISTRY_CONTRACT_ID=<deployed_id>
IMPACT_ESCROW_CONTRACT_ID=<deployed_id>
NGO_VERIFICATION_CONTRACT_ID=<deployed_id>
EVIDENCE_CONTRACT_ID=<deployed_id>
NFT_CONTRACT_ID=<deployed_id>

# Email (Resend — replace Ethereal)
RESEND_API_KEY=re_...

# Gemini
GEMINI_API_KEY=your-key

# Sentry
SENTRY_DSN=https://...@sentry.io/...

LOG_LEVEL=info
```

**Frontend (Vercel):**
```bash
NEXT_PUBLIC_API_URL=https://your-api.railway.app
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://mainnet.sorobanrpc.com
NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT=<deployed_id>
NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT=<native_xlm_contract_id>
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

### 4.2 Replace Ethereal email with Resend

```bash
cd backend && npm install resend
```

```typescript
// backend/src/services/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(to: string, code: string) {
  await resend.emails.send({
    from: 'GeoLedger <noreply@geoledger.xyz>',
    to,
    subject: 'Your GeoLedger login code',
    html: `<p>Your one-time code is: <strong>${code}</strong></p><p>Expires in 10 minutes.</p>`,
  });
}
```

Sign up at https://resend.com — free tier: 3000 emails/month. Add your domain in the Resend dashboard and verify DNS.

---

### 4.3 Deploy contracts (testnet first, then mainnet)

```bash
# Install Stellar CLI if not already installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install stellar-cli --features opt

# Build all contracts
cd contracts
cargo build --target wasm32-unknown-unknown --release

# Fund a testnet account for deploy
stellar keys generate admin --network testnet
stellar keys fund admin --network testnet

# Deploy each contract (testnet)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/donation_registry.wasm \
  --source admin \
  --network testnet \
  > .contract-ids/donation_registry_testnet.txt

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/impact_escrow.wasm \
  --source admin \
  --network testnet \
  > .contract-ids/impact_escrow_testnet.txt

# Repeat for ngo_verification, nft_minting, evidence

# Initialise each contract with admin + cross-contract addresses
stellar contract invoke \
  --id $(cat .contract-ids/impact_escrow_testnet.txt) \
  --source admin \
  --network testnet \
  -- init \
  --admin $(stellar keys address admin)

stellar contract invoke \
  --id $(cat .contract-ids/donation_registry_testnet.txt) \
  --source admin \
  --network testnet \
  -- init \
  --admin $(stellar keys address admin) \
  --escrow_contract $(cat .contract-ids/impact_escrow_testnet.txt) \
  --ngo_contract $(cat .contract-ids/ngo_verification_testnet.txt)
```

Test the full flow on testnet before touching mainnet. Use Stellar Laboratory (https://laboratory.stellar.org) to inspect transactions.

---

### 4.4 Deploy backend — Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# From your project root
railway init
railway up --service backend

# Set all environment variables
railway variables set NODE_ENV=production JWT_SECRET=<your-secret> ...

# Add Postgres
railway add --plugin postgresql
# This auto-sets DATABASE_URL

# Run migrations
railway run --service backend npm run migrate
```

**Add `railway.json` to backend root:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

---

### 4.5 Deploy frontend — Vercel

```bash
# If not already on Vercel
npm install -g vercel
cd frontend && vercel

# Set all NEXT_PUBLIC_ env vars in Vercel dashboard
# Project Settings → Environment Variables

# Deploy
vercel --prod
```

Set your custom domain in Vercel: Settings → Domains → Add `geoledger.xyz`.

---

### 4.6 Firebase functions

```bash
cd functions
npm install
firebase login
firebase use your-project-id
firebase deploy --only functions
```

---

### 4.7 Final pre-launch checklist

Run this top to bottom before you tell anyone the product exists:

**Contracts:**
- [ ] `release()` moves actual XLM — verify on testnet with Stellar Explorer
- [ ] `verify_impact` rejects calls from non-NGO addresses
- [ ] All 5 contracts deployed and initialized on mainnet
- [ ] Contract IDs saved in `.contract-ids/mainnet/`
- [ ] Admin keypair backed up (offline, encrypted)

**Backend:**
- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` is 64-char random hex, not 'dev'
- [ ] `ALLOWED_ORIGINS` matches exact Vercel domain
- [ ] `DISABLE_EMAILS` is NOT set
- [ ] `prisma migrate deploy` ran successfully
- [ ] `/health` endpoint returns 200
- [ ] All `console.log` debug statements removed
- [ ] Sentry error reporting working (throw a test error)
- [ ] Resend email delivery working (send a test OTP)

**Frontend:**
- [ ] Freighter wallet connects
- [ ] Donation flow builds + signs + submits a real Soroban transaction on testnet
- [ ] Transaction hash appears in Stellar Explorer
- [ ] Evidence upload works (file reaches IPFS, hash stored on-chain)
- [ ] NGO dashboard shows donations correctly
- [ ] Donor can see their NFT after verified donation
- [ ] `useAuth.ts` (0-byte file) deleted
- [ ] `UI_REDESIGN_GUIDE.md` (0-byte file) deleted or populated

**Infrastructure:**
- [ ] SSL cert active on custom domain
- [ ] Uptime monitor configured (BetterStack or similar)
- [ ] Postgres backups enabled (Railway enables automatically)
- [ ] IPFS pinning active on Pinata

---

## Deployment stack reference

| Layer | Service | Notes |
|---|---|---|
| Frontend | Vercel | Free hobby → Pro $20/mo when needed |
| Backend API | Railway | Free trial → $5/mo Starter |
| Database | Railway Postgres | Managed, auto-backups |
| Blockchain | Stellar Mainnet | $0 deploy cost, ~0.00001 XLM per tx |
| IPFS | Pinata | Free 1GB, then $20/mo |
| Email | Resend | Free 3000/mo, then $20/mo |
| Error tracking | Sentry | Free 5k errors/mo |
| Uptime | BetterStack | Free 10 monitors |
| Domain | Namecheap / Cloudflare | ~$10/yr |

**Total cost to launch: ~$0–35/month** on free tiers.

---

## What to build next (post-launch)

Once you have real users and real donations flowing:

1. **Admin dashboard** — visualize all donations, escrow states, NGO verification queue
2. **NGO onboarding flow** — self-service KYC, not just whitelist
3. **Multi-token support** — accept USDC (Circle's Stellar USDC) not just XLM
4. **Impact verification oracle** — third-party verification, not just NGO self-report
5. **Donor rewards** — tiered NFTs based on cumulative donation amount
6. **Mobile app** — React Native + Freighter mobile SDK

---

*Last updated: 2026 · GeoLedger is real. Ship it.*