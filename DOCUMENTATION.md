# GeoLedger Documentation Index

## Start Here

1. [README.md](README.md) - project overview, quick start, and repository map
2. [WORKFLOW.md](WORKFLOW.md) - current local setup, API reference, and deploy checklist
3. [UI_INTEGRATION.md](UI_INTEGRATION.md) - frontend replacement contract for new UI work
4. [DEPLOY.md](DEPLOY.md) - deployment-oriented notes and environment checklist
5. [QUICKREF.txt](QUICKREF.txt) - short command reference

## By Task

### Getting Started

- Installation: [README.md](README.md#quick-start-local)
- Environment setup: `backend/.env.example` and `frontend/.env.example`
- First run: [WORKFLOW.md](WORKFLOW.md#local-setup)

### Development

- API reference: [WORKFLOW.md](WORKFLOW.md#api-reference)
- New UI integration: [UI_INTEGRATION.md](UI_INTEGRATION.md)
- Evidence flow: [WORKFLOW.md](WORKFLOW.md#api-reference)
- NGO import: [WORKFLOW.md](WORKFLOW.md#ngo-data)

### Testing

- Backend: `cd backend && npm run build && npm test`
- Frontend: `cd frontend && npm run build && npm test`
- Diff hygiene: `git diff --check`

### Deployment

- Deploy guide: [WORKFLOW.md](WORKFLOW.md#deployment-checklist)
- Deploy automation: [deploy.sh](deploy.sh)
- Contract scripts: `scripts/deploy_contracts.sh` and `scripts/deploy_phase1_testnet.sh`

## File Structure

```text
README.md              project overview
WORKFLOW.md            current setup, API, and deploy checklist
UI_INTEGRATION.md      frontend/backend wiring contract
QUICKREF.txt           short command reference
DEPLOY.md              deployment notes
start.sh               local startup helper
deploy.sh              deployment automation
```

## Retired Material

The old fake wallet demo API, voice-agent route, Firebase hosting config, and duplicate contract deploy script were removed during cleanup. Use real Freighter wallet signing, `/api/chat/message`, `/api/evidence/prepare`, and `/api/evidence/confirm`.
