# Deployment Guide

## Architecture

```
Frontend (Vercel) ───► Backend (Render) ───► Render Postgres
                           │
                           ▼
                   Soroban Contracts (Stellar Testnet)
                           │
                           ▼
                   Pinata IPFS (evidence storage)
```

---

## Prerequisites

| Resource | What you need | Source |
|----------|---------------|--------|
| **Stellar testnet account** | Secret key prefixed with `S` | Stellar Laboratory or Freighter wallet |
| **Soroban CLI** | `cargo install soroban-cli --features opt` | Rust/Cargo |
| **Pinata account** | API Key + Secret Key | https://pinata.cloud → API Keys |
| **Resend account** | API Key + verified sender domain | https://resend.com → API Keys |
| **Firebase project** | Service account JSON + Web API key | https://console.firebase.google.com → Project settings → Service accounts |
| **Gemini API key** (optional) | API key for chatbot | https://ai.google.dev → API keys |
| **Render account** | For backend + PostgreSQL | https://render.com |
| **Vercel account** | For frontend | https://vercel.com |
| **GitHub repo** | This repo connected to Render + Vercel | Already set up |

---

## Step 1: Deploy Soroban Smart Contracts (Testnet)

Build and deploy all 6 contracts to Stellar testnet:

```bash
# 1. Install Soroban CLI (if not already)
cargo install soroban-cli --features opt

# 2. Add WASM target
rustup target add wasm32-unknown-unknown

# 3. Fund a testnet account (create one if needed)
# Get testnet XLM from: https://friendbot.stellar.org/

# 4. Deploy all contracts
NETWORK=testnet SOROBAN_RPC_URL=https://soroban-testnet.stellar.org \
  ./scripts/deploy_contracts.sh testnet "S<your_secret_key>"
```

This deploys 6 contracts and writes their IDs to `.env`, `backend/.env`, and `frontend/.env.local`:

| Contract | Variable |
|----------|----------|
| DonationRegistry | `DONATION_REGISTRY_CONTRACT_ID` |
| NGOVerification | `NGO_VERIFICATION_CONTRACT_ID` |
| ImpactEscrow | `IMPACT_ESCROW_CONTRACT_ID` |
| TokenManager | `TOKEN_MANAGER_CONTRACT_ID` |
| NFTMinting | `NFT_MINTING_CONTRACT_ID` |
| Evidence | `EVIDENCE_CONTRACT_ID` |

**Keep the output IDs** — you'll need them for both backend and frontend env vars.

---

## Step 2: Create PostgreSQL Database (Render)

1. In Render Dashboard → **New +** → **PostgreSQL**
2. Choose free plan
3. After creation, copy the **Internal Database URL**
4. Keep it private — this is your `DATABASE_URL`

---

## Step 3: Deploy Backend (Render — Node Environment)

Do **not** use Docker — use Render's Node environment for simplicity.

1. **Render Dashboard → New + → Web Service**
2. **Connect your GitHub repo** (select Stellar)
3. **Settings:**

   | Field | Value |
   |-------|-------|
   | **Name** | `stellar-backend` |
   | **Root Directory** | `backend` |
   | **Runtime** | Node |
   | **Build Command** | `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` |
   | **Start Command** | `npm start` |
   | **Health Check Path** | `/health` |
   | **Plan** | Free |

4. **Add these environment variables:**

   ```bash
   NODE_ENV=production
   HOST=0.0.0.0
   PORT=4000
   DATABASE_URL=<Render Postgres Internal URL from Step 2>
   JWT_SECRET=<run: openssl rand -base64 32>
   ALLOWED_ORIGINS=https://<your-frontend>.vercel.app
   FRONTEND_URL=https://<your-frontend>.vercel.app

   # Stellar Contracts (from Step 1)
   STELLAR_NETWORK=testnet
   STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
   SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
   DONATION_REGISTRY_CONTRACT_ID=<from Step 1>
   NGO_VERIFICATION_CONTRACT_ID=<from Step 1>
   EVIDENCE_CONTRACT_ID=<from Step 1>

   # Pinata IPFS
   PINATA_API_KEY=<from Pinata dashboard>
   PINATA_SECRET_KEY=<from Pinata dashboard>

   # Resend Email
   RESEND_API_KEY=<from Resend dashboard>
   RESEND_FROM=GeoLedger <otp@yourdomain.com>

   # Firebase
   FIREBASE_SERVICE_ACCOUNT=<paste the full Firebase service account JSON as a single line>
   ```

   **Optional:**
   ```bash
   GEMINI_API_KEY=<for chatbot>
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. Click **Create Web Service**

Render will build and deploy. Monitor logs for any errors.

### About Pinata env var names

The code checks `PINATA_API_KEY`/`PINATA_SECRET_KEY` first, then falls back to `IPFS_PINATA_API_KEY`/`IPFS_PINATA_SECRET`. Using the non-prefixed names (above) is preferred.

### About Firebase

The `FIREBASE_SERVICE_ACCOUNT` env var should be the **full service account JSON** as a single line (not a file path). You can minify it with:

```bash
cat your-firebase-service-account.json | jq -c . | pbcopy  # macOS
cat your-firebase-service-account.json | jq -c . | xclip    # Linux
```

---

## Step 4: Deploy Frontend (Vercel)

1. **Vercel Dashboard → Add New → Project**
2. **Import your GitHub repo** (Stellar)
3. **Settings:**

   | Field | Value |
   |-------|-------|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | Next.js |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `.next` |

4. **Add environment variables:**

   ```bash
   NEXT_PUBLIC_BACKEND_URL=https://<your-backend>.onrender.com
   NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
   NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
   NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

   NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT=<from Step 1>
   NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT_ID=<from Step 1>
   NEXT_PUBLIC_NGO_VERIFICATION_CONTRACT_ID=<from Step 1>
   NEXT_PUBLIC_IMPACT_ESCROW_CONTRACT_ID=<from Step 1>
   NEXT_PUBLIC_TOKEN_MANAGER_CONTRACT_ID=<from Step 1>
   NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT=<from Step 1>
   NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT_ID=<from Step 1>

   NEXT_PUBLIC_FIREBASE_API_KEY=<Firebase Web API key>
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
   ```

5. Click **Deploy**

---

## Step 5: Connect Frontend to Backend

After both services are deployed:

1. **Copy your Vercel frontend URL** (e.g. `https://stellar-frontend.vercel.app`)
2. **Update backend env vars** in Render Dashboard:
   - `ALLOWED_ORIGINS=https://stellar-frontend.vercel.app`
   - `FRONTEND_URL=https://stellar-frontend.vercel.app`
3. **Redeploy the backend** (Render → Manual Deploy → Deploy latest commit)
4. **Update frontend env var** in Vercel:
   - `NEXT_PUBLIC_BACKEND_URL=https://stellar-backend.onrender.com`
5. **Redeploy the frontend** (Vercel → Deploy)

---

## Step 6: Verify Deployment

Check each layer:

```bash
# Backend health
curl https://<your-backend>.onrender.com/health
# Expected: {"status":"ok","db":true,"ts":"..."}

# Frontend
# Visit https://<your-frontend>.vercel.app — should load without errors

# API health
curl https://<your-backend>.onrender.com/api/health
# Expected: {"success":true,"data":{"status":"healthy",...}}
```

Also check Render logs for:
- Prisma migration output (should show "Already applied" or new migrations)
- Any connection errors to Postgres, Pinata, Resend, etc.

---

## Environment Variable Quick Reference

### Backend (Render)

| Variable | Required | Source |
|----------|----------|--------|
| `NODE_ENV` | Yes | Set to `production` |
| `HOST` | Yes | Set to `0.0.0.0` |
| `PORT` | No (default 4000) | Render assigns automatically |
| `DATABASE_URL` | **Yes** | Render Postgres → Internal Database URL |
| `JWT_SECRET` | **Yes** | `openssl rand -base64 32` |
| `ALLOWED_ORIGINS` | **Yes** | Your Vercel frontend URL |
| `FRONTEND_URL` | Yes | Same as ALLOWED_ORIGINS |
| `DONATION_REGISTRY_CONTRACT_ID` | Yes | From contract deploy |
| `NGO_VERIFICATION_CONTRACT_ID` | Yes | From contract deploy |
| `EVIDENCE_CONTRACT_ID` | **Yes** | From contract deploy |
| `PINATA_API_KEY` | Yes | Pinata dashboard → API Keys |
| `PINATA_SECRET_KEY` | Yes | Pinata dashboard → API Keys |
| `RESEND_API_KEY` | Yes | Resend dashboard → API Keys |
| `RESEND_FROM` | Yes | Verified sender email |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Firebase Console → Service accounts |
| `STELLAR_NETWORK` | No | Defaults to `testnet` |
| `STELLAR_HORIZON_URL` | No | Default provided |
| `SOROBAN_RPC_URL` | No | Default provided |
| `GEMINI_API_KEY` | No | For chatbot |
| `RATE_LIMIT_WINDOW_MS` | No | Default 60000 |
| `RATE_LIMIT_MAX_REQUESTS` | No | Default 100 |

### Frontend (Vercel)

| Variable | Required | Source |
|----------|----------|--------|
| `NEXT_PUBLIC_BACKEND_URL` | **Yes** | Your Render backend URL |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | Default `TESTNET` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | **Yes** | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | **Yes** | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | **Yes** | Firebase Console |
| Contract IDs | Yes | From contract deploy |

---

## CI/CD

The CI workflow (`.github/workflows/ci.yml`) runs on every push/PR to `main`:

- **Backend**: Spins up a PostgreSQL 16 container, runs `prisma migrate deploy`, and runs tests
- **Frontend**: Builds with Next.js
- **Functions**: Build step only

No GitHub secrets are needed for CI — the PostgreSQL service container handles the database.

---

## Dockerfile (Alternative Deployment)

If you prefer Docker-based deployment on Render or elsewhere, the included `backend/Dockerfile` produces a production image. For Render Docker deployments, set the same env vars listed above.

**Note:** The Dockerfile runs `prisma generate` at build time but does **not** run `prisma migrate deploy` on startup. For Render Docker, add a startup script or set the Docker CMD to:

```bash
npx prisma migrate deploy && node dist/server.js
```

---

## Local Development

```bash
# Backend
cd backend
cp .env.example .env   # fill in values
npm install
npm run dev            # ts-node-dev with hot reload

# Frontend
cd frontend
cp .env.example .env.local  # fill in values
npm install
npm run dev                  # next dev on port 3000
```
