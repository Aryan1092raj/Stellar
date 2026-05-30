#!/usr/bin/env bash
set -euo pipefail

# Deploy all Soroban contracts and append contract IDs to .env.local (frontend) and .env (backend) if present.
# Requires soroban CLI installed and SOROBAN_RPC_URL + network passphrase configured.
# Usage: ./scripts/deploy_contracts.sh <network> <secret_key>
# Example: ./scripts/deploy_contracts.sh futurenet "SB..."

NETWORK=${1:-futurenet}
SECRET_KEY=${2:-}
if [ -z "$SECRET_KEY" ]; then
  echo "Missing secret key argument" >&2
  exit 1
fi

RPC_URL=${SOROBAN_RPC_URL:-"https://rpc-futurenet.stellar.org"}

function deploy() {
  local package="$1" wasm_name="$2"
  echo "Building $package..." >&2
  (cd contracts && cargo build -p "$package" --target wasm32-unknown-unknown --release)
  local wasm="contracts/target/wasm32-unknown-unknown/release/${wasm_name}.wasm"
  echo "Optimizing $wasm..." >&2
  soroban contract optimize --wasm "$wasm" --wasm-out "${wasm%.wasm}.opt.wasm"
  echo "Deploying $package..." >&2
  local id
  id=$(soroban contract deploy --wasm "${wasm%.wasm}.opt.wasm" --source "$SECRET_KEY" --network "$NETWORK")
  echo "$package deployed: $id" >&2
  echo "$id"
}

DONATION_ID=$(deploy donation_registry donation_registry)
NGO_VERIF_ID=$(deploy ngo_verification ngo_verification)
IMPACT_ESCROW_ID=$(deploy impact_escrow impact_escrow)
TOKEN_MANAGER_ID=$(deploy token_manager token_manager)
NFT_MINT_ID=$(deploy nft_minting nft_minting)
EVIDENCE_ID=$(deploy evidence_contract evidence_contract)

append_env() {
  local file="$1"
  local prefix="${2:-}"
  if [ -f "$file" ]; then
    grep -q "${prefix}DONATION_REGISTRY_CONTRACT_ID=" "$file" && \
      sed -i '' "s#${prefix}DONATION_REGISTRY_CONTRACT_ID=.*#${prefix}DONATION_REGISTRY_CONTRACT_ID=$DONATION_ID#" "$file" || echo "${prefix}DONATION_REGISTRY_CONTRACT_ID=$DONATION_ID" >> "$file"
    grep -q "${prefix}NGO_VERIFICATION_CONTRACT_ID=" "$file" && \
      sed -i '' "s#${prefix}NGO_VERIFICATION_CONTRACT_ID=.*#${prefix}NGO_VERIFICATION_CONTRACT_ID=$NGO_VERIF_ID#" "$file" || echo "${prefix}NGO_VERIFICATION_CONTRACT_ID=$NGO_VERIF_ID" >> "$file"
    grep -q "${prefix}IMPACT_ESCROW_CONTRACT_ID=" "$file" && \
      sed -i '' "s#${prefix}IMPACT_ESCROW_CONTRACT_ID=.*#${prefix}IMPACT_ESCROW_CONTRACT_ID=$IMPACT_ESCROW_ID#" "$file" || echo "${prefix}IMPACT_ESCROW_CONTRACT_ID=$IMPACT_ESCROW_ID" >> "$file"
    grep -q "${prefix}TOKEN_MANAGER_CONTRACT_ID=" "$file" && \
      sed -i '' "s#${prefix}TOKEN_MANAGER_CONTRACT_ID=.*#${prefix}TOKEN_MANAGER_CONTRACT_ID=$TOKEN_MANAGER_ID#" "$file" || echo "${prefix}TOKEN_MANAGER_CONTRACT_ID=$TOKEN_MANAGER_ID" >> "$file"
    grep -q "${prefix}NFT_MINTING_CONTRACT_ID=" "$file" && \
      sed -i '' "s#${prefix}NFT_MINTING_CONTRACT_ID=.*#${prefix}NFT_MINTING_CONTRACT_ID=$NFT_MINT_ID#" "$file" || echo "${prefix}NFT_MINTING_CONTRACT_ID=$NFT_MINT_ID" >> "$file"
    grep -q "${prefix}EVIDENCE_CONTRACT_ID=" "$file" && \
      sed -i '' "s#${prefix}EVIDENCE_CONTRACT_ID=.*#${prefix}EVIDENCE_CONTRACT_ID=$EVIDENCE_ID#" "$file" || echo "${prefix}EVIDENCE_CONTRACT_ID=$EVIDENCE_ID" >> "$file"
  fi
}

append_env .env
append_env frontend/.env.local "NEXT_PUBLIC_"
append_env backend/.env

echo "All contracts deployed. IDs:"
echo "DonationRegistry: $DONATION_ID"
echo "NGOVerification: $NGO_VERIF_ID"
echo "ImpactEscrow: $IMPACT_ESCROW_ID"
echo "TokenManager: $TOKEN_MANAGER_ID"
echo "NFTMinting: $NFT_MINT_ID"
echo "Evidence: $EVIDENCE_ID"
