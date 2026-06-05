# UI Integration Contract

Use this when replacing the frontend UI. The visual layout can change completely, but the product idea and backend contract should stay stable.

## Core Rule

New UI code should not hardcode backend URLs or route strings in components.

Use:

```ts
import { apiRoutes } from '@/lib/api/routes';
import {
  confirmDonation,
  createProject,
  listDonations,
  listNGOs,
  listProjects,
  prepareEvidence,
  confirmEvidence,
} from '@/lib/api/client';
```

`NEXT_PUBLIC_BACKEND_URL` is centralized in `frontend/src/lib/api/routes.ts`.

## Stable Integration Files

```text
frontend/src/lib/api/routes.ts    Backend/API path contract
frontend/src/lib/api/types.ts     Shared frontend data shapes
frontend/src/lib/api/client.ts    API calls for screens
frontend/src/lib/auth.ts          OTP session storage and authenticated fetch
frontend/src/hooks/useFreighter.ts Freighter connect/sign helpers
frontend/src/lib/stellar.ts       Soroban transaction build/submit helpers
frontend/src/lib/workUpdates.ts   Donor update local persistence
```

The new UI can replace screens and visual components under:

```text
frontend/src/app/
frontend/src/components/
```

Keep the stable files above as the adapter layer unless the backend contract changes too.

## Donor Flow

Expected path:

1. Select an NGO.
2. Optionally select a campaign/project.
3. Connect Freighter.
4. Build and sign Soroban donation transaction.
5. Submit transaction.
6. Save the real tx hash with the backend.

```ts
const xdr = await buildDonationTx({
  donorPublicKey,
  amountXLM,
  ngoId,
  projectId,
  donorLat,
  donorLon,
});

const signedXdr = await sign(xdr);
const txHash = await submitTx(signedXdr);

await confirmDonation({
  donor_public_key: donorPublicKey,
  amount: amountXLM,
  ngo_id: ngoId,
  project_id: projectId,
  donor_location: { lat: donorLat, lng: donorLon },
  txHash,
});
```

## NGO Campaign Flow

NGOs can create campaigns/projects that ask for donations:

```ts
await createProject({
  name,
  description,
  ngo_id,
  target_amount,
  sector,
  cover_image_url,
  deadline,
});
```

List campaigns:

```ts
const projects = await listProjects();
```

## NGO Work Update Flow

Current evidence flow:

1. Create `FormData` with `file` and `donation_id`.
2. Call `prepareEvidence(form)`.
3. Sign returned XDR with Freighter.
4. Submit tx with `submitTx`.
5. Call `confirmEvidence`.
6. Prepare and confirm impact verification.

```ts
const prepared = await prepareEvidence(form);
const signedXdr = await sign(prepared.xdr!);
const txHash = await submitTx(signedXdr);

await confirmEvidence({
  donationId,
  ipfsCid: prepared.ipfsCid,
  txHash,
});
```

Backend currently accepts evidence files with these MIME types:

```text
image/jpeg
image/png
image/gif
application/pdf
application/json
```

Videos are not enabled yet. If the new UI needs video upload, update backend MIME validation, storage expectations, and the work update data shape first.

## Active Backend Routes

Use the client functions instead of calling these directly from components, but these are the active routes:

```text
POST /api/auth/google
POST /api/otp/send
POST /api/otp/verify

GET  /api/ngos
POST /api/ngos

GET  /api/projects
POST /api/projects

GET  /api/donations
POST /api/donations
POST /api/donations/confirm
POST /api/donations/:id/verify/prepare
POST /api/donations/:id/verify/confirm

POST /api/evidence/prepare
POST /api/evidence/confirm
GET  /api/evidence/retrieve/:cid
GET  /api/evidence/health

POST /api/chat/message
GET  /api/chat/suggestions
GET  /api/chat/health
```

Retired routes:

```text
/api/demo/*
/api/voice-agent/*
/api/impact/*
/api/evidence/upload
```

## PR Checklist For New UI

- No component hardcodes `NEXT_PUBLIC_BACKEND_URL`.
- No component calls `/api/...` directly except through `apiRoutes` or `client.ts`.
- Donor flow still calls `buildDonationTx`, `sign`, `submitTx`, and `confirmDonation`.
- NGO campaign form calls `createProject`.
- NGO evidence/work update flow calls `prepareEvidence` and `confirmEvidence`.
- Freighter connection uses `useFreighter`.
- OTP/Google login stores the same session keys.
- `npm run build` passes in `frontend`.
- `npm run build` passes in `backend`.

Useful check:

```bash
rg -n "NEXT_PUBLIC_BACKEND_URL|fetch\\(.*\\/api/|fetch\\('/api" frontend/src
```

Direct fetch is okay for external URLs such as Horizon, CoinGecko, IPFS gateway URLs, or static files in `frontend/public`.
