# GeoLedger

Transparent charitable donations on the Stellar blockchain. Donors lock funds in
Soroban smart contract escrow -- NGOs release funds only after uploading verified,
geo-tagged impact evidence to IPFS.

**Live testnet contracts:**
| Contract | ID |
|---|---|
| Donation Registry | CC2ZBCQND2XPH54ELEJTK2GYBML2MACHR74TKZXD2VUVJV6ESSNYQD44 |
| Impact Escrow | CCMDVSI4VEX4RGU6QWTFLNKKCRSRFXTLBMMRMN5VB7XWTMGR5UUZEAID |
| NGO Verification | CAB4Z7W4RSKUXZLAY2SQCQJOM7CH4ZJBAKPI33B6RFMS53TDMNQ2ORFQ |

## Stack
- **Contracts** - Rust + Stellar Soroban (6 contracts)
- **Backend** - Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Frontend** - Next.js 14 + TypeScript + Leaflet
- **Storage** - IPFS via Pinata
- **Auth** - OTP email (Resend) + Google OAuth (Firebase)
- **Wallet** - Freighter (Stellar)

## Local setup
### Prerequisites
- Node.js 20+
- Rust + `stellar-cli`
- PostgreSQL
- Freighter browser extension

### Backend
```bash
cd backend
cp .env.example .env   # fill in values
npm install
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env.local   # fill in values
npm install
npm run dev
```

### Contracts (testnet)
```bash
cd contracts
stellar keys generate admin --network testnet
stellar keys fund admin --network testnet
./scripts/deploy_phase1_testnet.sh
```

## Environment variables
See `backend/.env.example` and `frontend/.env.example` for all required variables.

## License
MIT
