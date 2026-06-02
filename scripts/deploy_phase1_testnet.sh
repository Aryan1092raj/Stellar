#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
FRONTEND_ENV="$ROOT_DIR/frontend/.env.local"
BUILD_DIR="$CONTRACTS_DIR/target/stellar"

NETWORK="${NETWORK:-testnet}"
ADMIN_ALIAS="${ADMIN_ALIAS:-admin}"
CONFIG_DIR="${STELLAR_CONFIG_DIR:-/private/tmp/geoledger-stellar-cli}"

if [ -f "/opt/homebrew/etc/ca-certificates/cert.pem" ]; then
  export SSL_CERT_FILE="${SSL_CERT_FILE:-/opt/homebrew/etc/ca-certificates/cert.pem}"
fi

deploy_contract() {
  local wasm_name="$1"
  stellar contract deploy \
    --wasm "$BUILD_DIR/${wasm_name}.wasm" \
    --source "$ADMIN_ALIAS" \
    --network "$NETWORK" \
    --config-dir "$CONFIG_DIR"
}

invoke_contract() {
  local contract_id="$1"
  shift
  stellar contract invoke \
    --id "$contract_id" \
    --source "$ADMIN_ALIAS" \
    --network "$NETWORK" \
    --config-dir "$CONFIG_DIR" \
    -- "$@"
}

upsert_env() {
  local key="$1"
  local value="$2"
  touch "$FRONTEND_ENV"
  if grep -q "^${key}=" "$FRONTEND_ENV"; then
    sed -i '' "s#^${key}=.*#${key}=${value}#" "$FRONTEND_ENV"
  else
    printf '%s=%s\n' "$key" "$value" >> "$FRONTEND_ENV"
  fi
}

cd "$CONTRACTS_DIR"
rm -rf "$BUILD_DIR"
stellar contract build --manifest-path "$CONTRACTS_DIR/Cargo.toml" --out-dir "$BUILD_DIR"

ADMIN_PUBLIC="$(stellar keys public-key "$ADMIN_ALIAS" --config-dir "$CONFIG_DIR")"
NATIVE_TOKEN_ID="$(stellar contract id asset --asset native --network "$NETWORK" --config-dir "$CONFIG_DIR")"

echo "Deploying NGO verification..."
NGO_VERIFICATION_ID="$(deploy_contract ngo_verification)"
echo "NGO_VERIFICATION_CONTRACT_ID=$NGO_VERIFICATION_ID"

echo "Deploying impact escrow..."
IMPACT_ESCROW_ID="$(deploy_contract impact_escrow)"
echo "IMPACT_ESCROW_CONTRACT_ID=$IMPACT_ESCROW_ID"

echo "Deploying donation registry..."
DONATION_REGISTRY_ID="$(deploy_contract donation_registry)"
echo "DONATION_REGISTRY_CONTRACT_ID=$DONATION_REGISTRY_ID"

echo "Initializing NGO verification..."
invoke_contract "$NGO_VERIFICATION_ID" initialize --admin "$ADMIN_PUBLIC"

echo "Initializing impact escrow..."
invoke_contract "$IMPACT_ESCROW_ID" initialize --admin "$ADMIN_PUBLIC"

echo "Initializing donation registry..."
invoke_contract "$DONATION_REGISTRY_ID" initialize \
  --ngo_verification "$NGO_VERIFICATION_ID" \
  --escrow "$IMPACT_ESCROW_ID"

echo "Linking escrow to donation registry..."
invoke_contract "$IMPACT_ESCROW_ID" set_registry \
  --admin "$ADMIN_PUBLIC" \
  --registry "$DONATION_REGISTRY_ID"

echo "Registering and verifying demo NGOs..."
demo_ngos=(
  "Save The Ocean Foundation"
  "Education For All Initiative"
  "Green Earth Initiative"
  "Health First Medical Aid"
  "Clean Water Project"
  "Women Empowerment Network"
  "Child Welfare Foundation"
  "Animal Rescue League"
)

ngo_id=1
for ngo_name in "${demo_ngos[@]}"; do
  invoke_contract "$NGO_VERIFICATION_ID" register \
    --caller "$ADMIN_PUBLIC" \
    --name "$ngo_name" \
    --wallet "$ADMIN_PUBLIC" >/dev/null
  invoke_contract "$NGO_VERIFICATION_ID" set_verified \
    --admin "$ADMIN_PUBLIC" \
    --ngo_id "$ngo_id" \
    --verified true >/dev/null
  ngo_id=$((ngo_id + 1))
done

upsert_env NEXT_PUBLIC_STELLAR_NETWORK "$NETWORK"
upsert_env NEXT_PUBLIC_SOROBAN_RPC_URL "https://soroban-testnet.stellar.org"
upsert_env NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT "$DONATION_REGISTRY_ID"
upsert_env NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT_ID "$DONATION_REGISTRY_ID"
upsert_env NEXT_PUBLIC_NGO_VERIFICATION_CONTRACT_ID "$NGO_VERIFICATION_ID"
upsert_env NEXT_PUBLIC_IMPACT_ESCROW_CONTRACT_ID "$IMPACT_ESCROW_ID"
upsert_env NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT "$NATIVE_TOKEN_ID"
upsert_env NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT_ID "$NATIVE_TOKEN_ID"

if ! grep -q '^NEXT_PUBLIC_BACKEND_URL=' "$FRONTEND_ENV"; then
  printf 'NEXT_PUBLIC_BACKEND_URL=http://localhost:4000\n' >> "$FRONTEND_ENV"
fi

cat <<EOF

Phase 1 testnet deploy complete.

Admin public key: $ADMIN_PUBLIC
Donation registry: $DONATION_REGISTRY_ID
NGO verification: $NGO_VERIFICATION_ID
Impact escrow: $IMPACT_ESCROW_ID
Native token: $NATIVE_TOKEN_ID

Updated: $FRONTEND_ENV
EOF
