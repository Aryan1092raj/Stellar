# GeoLedger (Stellar Donation Platform)

A full-stack blockchain donation platform built on **Stellar/Soroban** for transparent charitable giving.

Donations are recorded with geolocation metadata, NGOs submit impact evidence, and transaction flow is backed by smart contracts and a web application stack.

## What’s in this repo

- **Smart contracts (Soroban/Rust)** for donation flow, NGO verification, escrow, token handling, NFTs, and evidence
- **Backend API** (Express + TypeScript + Prisma)
- **Frontend app** (Next.js 14 + TypeScript + React)
- **Firebase functions** workspace (Genkit/Firebase tooling)
- Deployment and utility scripts

## Architecture

```text
Frontend (Next.js)
   ↓ HTTP
Backend API (Express)
   ├─ PostgreSQL (via Prisma) OR mock mode (no DATABASE_URL)
   ├─ Stellar/Soroban integration
   ├─ IPFS upload + retrieval helpers
   ├─ Auth (JWT + Google/Firebase + OTP flow)
   └─ AI assistant route (Gemini)
```

## Repository structure

```text
/backend        Express API + Prisma schema
/frontend       Next.js UI
/contracts      Soroban smart contracts
/functions      Firebase functions workspace
/infra          Docker compose and infra helpers
/scripts        Contract deployment scripts
```

## Smart contracts

Under `/contracts`:

- `donation_registry`
- `ngo_verification`
- `impact_escrow`
- `token_manager`
- `nft_minting`
- `evidence`

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL (optional; without `DATABASE_URL`, backend falls back to in-memory mock storage for donation/project/NGO API flows)
- Rust + Stellar CLI (command: `stellar`; sometimes referenced as `stellar-cli` / `soroban-cli`) for contract development/deployment
- Freighter wallet extension (for wallet-based flows)

## Quick start (local)

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install

# Optional if using PostgreSQL
npx prisma migrate dev

npm run dev
```

Backend default address: `http://127.0.0.1:4000`

### 2) Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend default address: `http://localhost:3000`

## Environment configuration

Use:

- `backend/.env.example`
- `frontend/.env.example`

Key backend domains:

- Database: `DATABASE_URL`
- Auth: `JWT_SECRET`, Firebase service account config
- Blockchain: Soroban + contract IDs
- Evidence/IPFS: Pinata/IPFS keys
- AI: `GEMINI_API_KEY`

## Useful API routes

Base API prefix: `/api` (except root `GET /health`)

- `GET /health` → backend process + DB connectivity
- `GET /api/health` → API router uptime/status payload
- `POST /api/auth/google`
- `GET /api/donations`
- `POST /api/donations`
- `POST /api/evidence/prepare`
- `POST /api/evidence/confirm`
- `GET /api/evidence/health` (evidence/IPFS integration status)
- `POST /api/chat/message`
- `GET /api/chat/suggestions`
- `GET /api/chat/health` (Gemini integration status)

## Contracts deployment

From repo root, see deployment helpers in `/scripts`, including:

- `deploy_contracts.sh`
- `deploy_phase1_testnet.sh`

## Development commands

### Backend

```bash
cd backend
npm run dev
npm run build
npm test
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm test
```

### Firebase functions

```bash
cd functions
npm run build
npm run lint
```

## Notes

- Demo wallet endpoints are retired in current backend routing.
- The root-level `start.sh` script exists for local startup orchestration.
- Additional docs: `WORKFLOW.md`, `DOCUMENTATION.md`, `DEPLOY.md`, `QUICKREF.txt`.

## License

MIT
