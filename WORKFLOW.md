# GeoLedger Workflow

GeoLedger is a full-stack Stellar/Soroban donation platform. The current app uses real wallet signing, OTP or Google auth, PostgreSQL via Prisma, Pinata/IPFS evidence, Gemini chat, and Soroban contract IDs from environment variables.

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL for persistent data
- Rust + Stellar CLI for contract work
- Freighter browser extension for donor wallet transactions
- API keys for Resend, Firebase, Pinata, Gemini, and deployed contract IDs

## Local Setup

Backend:

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:4000`
- Infra health: `GET http://127.0.0.1:4000/health`
- API health: `GET http://127.0.0.1:4000/api/health`

## Environment

Backend reads `backend/.env`.

Required production values:

```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.example
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-secret>
RESEND_API_KEY=...
FIREBASE_SERVICE_ACCOUNT=...
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
GEMINI_API_KEY=...
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
DONATION_REGISTRY_CONTRACT_ID=...
NGO_VERIFICATION_CONTRACT_ID=...
IMPACT_ESCROW_CONTRACT_ID=...
TOKEN_MANAGER_CONTRACT_ID=...
NFT_MINTING_CONTRACT_ID=...
EVIDENCE_CONTRACT_ID=...
NATIVE_TOKEN_CONTRACT_ID=...
```

Frontend reads `frontend/.env.local`.

Required public values:

```bash
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:4000
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT=...
NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

Optional:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=...
```

If `NEXT_PUBLIC_MAPBOX_TOKEN` is absent, the frontend map falls back to OpenStreetMap tiles.

## Contract Deployment

Use the active scripts in `scripts/`:

```bash
./scripts/deploy_phase1_testnet.sh
./scripts/deploy_contracts.sh
```

After deploy, copy the printed contract IDs into `backend/.env` and `frontend/.env.local`. Do not hardcode network passphrases in code; derive network behavior from the `STELLAR_NETWORK` and `NEXT_PUBLIC_STELLAR_NETWORK` environment values.

## NGO Data

Seed small local data:

```bash
cd backend
npm run seed:ngos
```

Import a CSV:

```bash
cd backend
npm run import:ngos -- --file data/indian-ngos.sample.csv --source ngo-darpan --status pending
```

Preview without writing:

```bash
cd backend
npm run import:ngos -- --file ../datset.csv --source curated-india-ngos --dry-run
```

Refresh the frontend fallback list:

```bash
node scripts/generate_curated_ngos.mjs datset.csv frontend/public/data/curated-india-ngos.json
```

## API Reference

Base API prefix is `/api`, except root `/health`.

### Health

```bash
GET /health
GET /api/health
```

### Auth and OTP

```bash
POST /api/auth/google
POST /api/otp/send
POST /api/otp/verify
```

Password-auth stubs are intentionally gone from the active login path. Use OTP or Google auth.

### NGOs

```bash
GET  /api/ngos
POST /api/ngos
```

### Projects

```bash
GET  /api/projects
POST /api/projects
GET  /api/projects/:id
```

### Donations

```bash
GET  /api/donations
POST /api/donations
POST /api/donations/confirm
POST /api/donations/:id/verify/prepare
POST /api/donations/:id/verify/confirm
```

Donor payment confirmation stores the real Stellar transaction hash through `POST /api/donations/confirm`.

### Evidence

```bash
POST /api/evidence/prepare
POST /api/evidence/confirm
GET  /api/evidence/retrieve/:cid
GET  /api/evidence/health
```

`POST /api/evidence/upload` is retired and returns `410`. Use the prepare and confirm flow so the IPFS CID and on-chain evidence transaction stay linked.

### Chat

```bash
POST /api/chat/message
GET  /api/chat/suggestions
GET  /api/chat/health
```

## Retired Endpoints

The old fake wallet demo API and voice-agent route are removed from the active router. Do not build new flows against:

```bash
/api/demo/*
/api/voice-agent/*
/api/impact/*
```

Use real Freighter signing for donations and `/api/donations/:id/verify/*` for impact verification.

## Testing

Backend:

```bash
cd backend
npm run build
npm test
```

Frontend:

```bash
cd frontend
npm run build
npm test
```

Repo hygiene:

```bash
git diff --check
```

## Deployment Checklist

- `NODE_ENV=production`
- `JWT_SECRET` is strong and not the development fallback
- `ALLOWED_ORIGINS` contains only production frontend domains
- `DISABLE_EMAILS` is not `1` in production
- `DATABASE_URL` is present and migrations have run
- Contract IDs are copied from the latest testnet/mainnet deploy
- Backend `/health` returns database `ok`
- Frontend Freighter donation flow produces a Stellar Expert transaction link

## Troubleshooting

Freighter not detected:

- Use the browser profile where the Freighter extension is installed.
- Enable the extension for `localhost` or `127.0.0.1`.
- Refresh after unlocking the wallet.

Plain HTML/no styling in development:

- Hard-refresh the browser.
- If needed, stop Next.js, remove `frontend/.next`, and restart.

Database errors:

```bash
psql "$DATABASE_URL" -c "SELECT 1"
cd backend && npx prisma migrate dev
```

IPFS errors:

```bash
curl https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: $PINATA_API_KEY" \
  -H "pinata_secret_api_key: $PINATA_SECRET_KEY"
```
