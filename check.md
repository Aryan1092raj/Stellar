# GeoLedger — Codex Cleanup & Verification Prompt

## What this repo is (read first, touch nothing yet)

GeoLedger is a blockchain-based charitable donation platform on Stellar Soroban.

**The only flow that matters:**
```
Donor (Freighter wallet)
  → signs Soroban tx → record_donation()
  → XLM locked in ImpactEscrow contract
  → NGO uploads geo-tagged evidence → IPFS hash stored on-chain
  → verify_impact() called (NGO-only ACL)
  → ImpactEscrow.release() → XLM sent to NGO wallet
  → Donor receives impact NFT
```

**Repo structure:**
```
contracts/          6 Soroban smart contracts in Rust
  donation_registry   core: records donations, calls escrow, enforces NGO ACL
  impact_escrow       holds XLM, releases to NGO on verification
  ngo_verification    NGO whitelist — only verified NGOs can receive funds
  nft_minting         mints impact NFT to donor after verified donation
  evidence            stores IPFS hashes on-chain
  token_manager       deposit/withdraw wrapper (may be unused)

backend/            Express + TypeScript REST API
  routes/             otp, donations, ngos, evidence, auth, admin
  services/           email (Resend), firebase admin
  prisma/             PostgreSQL schema

frontend/           Next.js 14 + TypeScript
  components/         map (Leaflet), DonationFlow, AuthModal, NGO dashboard
  hooks/              useFreighter, useGoogleAuth
  lib/                stellar.ts (buildDonationTx, submitTx), firebase.ts

scripts/            deploy_phase1_testnet.sh
```

**Deployed testnet contract IDs (do not change these):**
- DONATION_REGISTRY: CC2ZBCQND2XPH54ELEJTK2GYBML2MACHR74TKZXD2VUVJV6ESSNYQD44
- IMPACT_ESCROW:     CCMDVSI4VEX4RGU6QWTFLNKKCRSRFXTLBMMRMN5VB7XWTMGR5UUZEAID
- NGO_VERIFICATION:  CAB4Z7W4RSKUXZLAY2SQCQJOM7CH4ZJBAKPI33B6RFMS53TDMNQ2ORFQ

---

## Step 1 — Audit before touching anything

Run these commands and paste the output before making any changes:

```bash
# Dead files
find . -name "*.ts" -o -name "*.tsx" -o -name "*.md" | xargs wc -l 2>/dev/null | grep "^\s*0"

# AI slop patterns: repeated fetch logic, duplicate error shapes, copy-paste handlers
grep -rn "catch (err)" backend/src --include="*.ts" | wc -l
grep -rn "catch (error)" backend/src --include="*.ts" | wc -l
grep -rn ": any" backend/src --include="*.ts"
grep -rn ": any" frontend/src --include="*.ts" --include="*.tsx"

# Unused imports
npx ts-unused-exports backend/tsconfig.json 2>/dev/null | head -40
npx ts-unused-exports frontend/tsconfig.json 2>/dev/null | head -40

# TODO comments still in contracts
grep -rn "TODO\|FIXME\|HACK\|XXX" contracts/

# Duplicate route definitions
grep -rn "router\.\(get\|post\|put\|delete\)" backend/src/routes --include="*.ts" | sort | uniq -d
```

---

## Step 2 — Remove AI slop (do not change logic, only remove duplication)

### 2a. Standardise error handling in backend

Every catch block across all route files must use this exact shape and nothing else:
```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}
```

Find every catch block that uses a different shape (returning `{ message }`, `{ msg }`, 
`{ success: false, error }`, nested objects, etc.) and normalise it to `{ error: string }`.

Do this for every file in `backend/src/routes/` and `backend/src/controllers/`.

### 2b. Consolidate duplicate Stellar/Soroban helpers

Check `frontend/src/lib/stellar.ts` and any other file that imports from `@stellar/stellar-sdk`.
If any component directly constructs a `SorobanRpc.Server` or calls `TransactionBuilder` 
outside of `stellar.ts`, move that logic into `stellar.ts` and import from there.
There must be exactly ONE place that builds Soroban transactions.

### 2c. Remove or gate demo mode entirely

Find `backend/src/routes/demo.ts` (and any file named `demo.*`).
Check if it is imported and used in `app.ts`.
If it exists:
  - If `NODE_ENV === 'production'` guard is missing, add it now
  - Remove the 8-wallet demo state from memory — it is not needed for production
  - Gate the entire router: if production, return 404 on all demo routes

### 2d. Remove duplicate NGO registration logic

Search for any place outside `backend/src/routes/ngos.ts` that contains 
NGO upsert or registration logic. Backend must have ONE place that handles NGO data.
If found elsewhere, extract to a `backend/src/services/ngo.service.ts` and import from there.

### 2e. Remove repeated IPFS upload logic

Search for any file that directly calls `pinata.pinFileToIPFS` or `pinata.pinJSONToIPFS`
outside of the evidence service. Centralise all Pinata calls into 
`backend/src/services/ipfs.service.ts` and import from there everywhere.

---

## Step 3 — Verification flow audit (most important section)

This is the core of the product. Every step must be airtight.

### 3a. NGO verification — trace the full path

Read these files in order:
1. `contracts/ngo_verification/src/lib.rs` — confirm `is_verified(ngo_id)` returns bool
2. `backend/src/routes/ngos.ts` — confirm it calls the on-chain `is_verified` before
   allowing any NGO operation, not just checking the database
3. `frontend/src/components/` — wherever the NGO dashboard renders, confirm it shows
   verification status fetched from the backend (not hardcoded)

**If the backend only checks a DB flag and not the on-chain contract:** fix it.
The backend must call the Soroban `ngo_verification.is_verified(ngo_id)` 
via the Stellar SDK, not just trust its own database. The source of truth is on-chain.

Add this check to the NGO route middleware:
```typescript
// backend/src/middleware/verifyNGO.ts
import { server } from '../lib/stellar'; // your SorobanRpc.Server instance
import { Contract, scValToNative, nativeToScVal } from '@stellar/stellar-sdk';

export async function requireVerifiedNGO(req, res, next) {
  const ngoId = req.user?.ngoId; // from JWT
  if (!ngoId) return res.status(403).json({ error: 'NGO ID missing from token' });

  try {
    const contract = new Contract(process.env.NGO_VERIFICATION_CONTRACT_ID!);
    const result = await server.simulateTransaction(
      // read-only call to is_verified
    );
    const isVerified = scValToNative(result.result.retval);
    if (!isVerified) return res.status(403).json({ error: 'NGO not verified on-chain' });
    next();
  } catch {
    return res.status(503).json({ error: 'Could not verify NGO on-chain' });
  }
}
```

Apply `requireVerifiedNGO` middleware to:
- `POST /api/evidence` (NGO submitting evidence)
- `POST /api/donations/:id/verify` (NGO triggering impact verification)

### 3b. Impact verification — trace the full path

Read `backend/src/routes/donations.ts` and find the route that handles impact verification.

It must do exactly this in order — fix anything that deviates:
```
1. Auth check: req.user is an NGO (role === 'ngo')
2. On-chain check: NGO is verified via ngo_verification contract (from 3a above)
3. Load donation from DB, confirm ngoId matches req.user.ngoId
4. Confirm evidence has been submitted (evidence IPFS hash exists for this donation)
5. Build + submit Soroban tx: donation_registry.verify_impact(ngo_address, donation_id, evidence_hash)
6. Wait for tx confirmation (poll getTransaction until SUCCESS)
7. Update donation status in DB to 'verified'
8. Return { txHash, status: 'verified' }
```

If the backend is not actually submitting a Soroban transaction in step 5 
(i.e. it only updates the DB), that is a critical bug. Fix it.

The backend must sign the Soroban transaction with the admin keypair from
`process.env.ADMIN_SECRET_KEY` and submit it. This is what triggers 
`impact_escrow.release()` which moves the actual XLM.

### 3c. Evidence submission — trace the full path

Read `backend/src/routes/evidence.ts`.

It must do exactly this in order:
```
1. Auth: NGO only
2. On-chain NGO verification check (middleware from 3a)
3. Receive file upload (multer)
4. Upload to IPFS via Pinata → get CID
5. Delete temp file from disk
6. Submit Soroban tx: evidence.submit_evidence(donation_id, ngo_address, ipfs_cid, lat, lng)
7. Wait for confirmation
8. Save evidence record to DB with ipfsCid and txHash
9. Return { ipfsCid, txHash }
```

If step 6 is missing (evidence stored in DB but not on-chain), fix it.

---

## Step 4 — Payment gateway audit

The payment gateway is Soroban smart contracts. There must be no ambiguity about
where money moves. Trace and confirm every step:

### 4a. Donation creation (money in)

File: `frontend/src/components/DonationFlow.tsx` and `frontend/src/lib/stellar.ts`

Confirm this exact sequence happens when a donor submits a donation:
```
1. Frontend calls buildDonationTx({ donorPublicKey, ngoAddress, donationId, amountStroops })
2. stellar.ts simulates the transaction via SorobanRpc.Server.simulateTransaction()
3. If simulation succeeds, the prepared XDR is returned
4. Frontend calls Freighter: signTransaction(xdr)
5. Freighter popup appears, donor approves
6. Frontend calls submitTx(signedXdr) which calls server.sendTransaction()
7. Frontend polls server.getTransaction(hash) until SUCCESS or FAILED
8. On SUCCESS: POST /api/donations/confirm with { donationId, txHash }
9. Backend saves txHash to DB, marks donation as 'on_chain'
```

If any step calls a backend route to SUBMIT the transaction (i.e. the backend 
submits on behalf of the user), that is wrong. The donor must sign with their 
own Freighter wallet. The backend only CONFIRMS after the fact.

### 4b. Escrow lock (confirm funds are held)

In `contracts/donation_registry/src/lib.rs`, find `record_donation`.
Confirm it calls `impact_escrow::Client::new(&env, &escrow_address).lock(...)`.
This is what moves XLM from the donor into escrow. If this cross-contract call
is missing or commented out, add it.

### 4c. Escrow release (money out)

In `contracts/impact_escrow/src/lib.rs`, find `release`.
Confirm it calls `token::Client::new(&env, &native_token).transfer(
  &env.current_contract_address(), &ngo_address, &amount
)`.
This is the actual XLM movement. If this is still a stub (emits event only),
that is the most critical bug in the entire project. Fix it.

### 4d. No other money paths

Search for any route, function, or component that:
- Sends XLM outside of the Soroban contract flow
- References Stripe, PayPal, or any fiat payment processor
- Has a "direct transfer" bypass that skips the escrow

```bash
grep -rn "stripe\|paypal\|fiat\|direct.*transfer\|bypass" \
  backend/src frontend/src --include="*.ts" --include="*.tsx" -i
```

If anything is found that is not a comment explaining why it's NOT used, remove it.

---

## Step 5 — Pre-deployment error check

Run all of these. Every single one must pass with zero errors before this prompt is done.

```bash
# Contracts
cd contracts
stellar contract build
# Expected: all 6 contracts, 0 warnings, 0 errors

# Backend
cd ../backend
npx tsc --noEmit
# Expected: 0 errors

npm run build
# Expected: build successful

# Frontend  
cd ../frontend
npx tsc --noEmit
# Expected: 0 errors

npm run build
# Expected: build successful, Stellar SDK warnings are acceptable (upstream)

# Git
cd ..
git diff --check
# Expected: no whitespace errors

# No secrets
grep -rn "SXXXXXXX\|re_[a-zA-Z0-9]\{20\}" . \
  --exclude-dir=node_modules --exclude-dir=.git \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env*"
# Expected: no matches (no hardcoded secret keys)
```

---

## Acceptance criteria

This prompt is complete only when ALL of the following are true:

- [ ] `stellar contract build` — 0 warnings, 0 errors for all 6 contracts
- [ ] `tsc --noEmit` — 0 errors in backend
- [ ] `tsc --noEmit` — 0 errors in frontend
- [ ] `npm run build` passes in both backend and frontend
- [ ] No `: any` types remain in backend or frontend source
- [ ] Every error response is exactly `{ error: string }`
- [ ] NGO verification middleware reads from Soroban on-chain, not just DB
- [ ] Evidence submission writes IPFS CID on-chain via the evidence contract
- [ ] Impact verification submits a real Soroban tx, not just a DB update
- [ ] `impact_escrow.release()` calls `token.transfer()` — not a stub
- [ ] `donation_registry.record_donation()` calls `impact_escrow.lock()` — cross-contract call present
- [ ] Donor signs Soroban tx via Freighter — backend does not submit on donor's behalf
- [ ] No hardcoded secret keys in any source file
- [ ] `git diff --check` passes

Paste the output of every verification command listed in Step 5.