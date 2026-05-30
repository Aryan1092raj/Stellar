#!/usr/bin/env bash
set -euo pipefail

# Requires: soroban-cli installed and env variables
# NETWORK can be testnet or futurenet
NETWORK=${NETWORK:-testnet}
RPC_URL=${SOROBAN_RPC_URL:-https://rpc-futurenet.stellar.org}

pushd "$(dirname "$0")/.." >/dev/null

build_one() {
  local crate=$1
  echo "Building $crate"
  cargo build -p "$crate" --release
}

build_one donation_registry
build_one ngo_verification
build_one impact_escrow
build_one token_manager
build_one nft_minting
build_one evidence_contract

echo "Deploy commands (run manually with IDs captured):"
echo "soroban contract deploy --wasm target/wasm32-unknown-unknown/release/donation_registry.wasm --network $NETWORK"
echo "soroban contract deploy --wasm target/wasm32-unknown-unknown/release/ngo_verification.wasm --network $NETWORK"
echo "soroban contract deploy --wasm target/wasm32-unknown-unknown/release/impact_escrow.wasm --network $NETWORK"
echo "soroban contract deploy --wasm target/wasm32-unknown-unknown/release/token_manager.wasm --network $NETWORK"
echo "soroban contract deploy --wasm target/wasm32-unknown-unknown/release/nft_minting.wasm --network $NETWORK"
echo "soroban contract deploy --wasm target/wasm32-unknown-unknown/release/evidence_contract.wasm --network $NETWORK"

popd >/dev/null
