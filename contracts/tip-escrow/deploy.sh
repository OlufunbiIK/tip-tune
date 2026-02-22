#!/bin/bash
set -e

# Configuration
NETWORK="${NETWORK:-testnet}"
WASM_FILE="target/wasm32-unknown-unknown/release/tip_escrow.wasm"

echo "🚀 Deploying Tip Escrow Contract to $NETWORK..."

# Check if soroban-cli is installed
if ! command -v soroban &> /dev/null; then
    echo "❌ Error: soroban-cli not found"
    echo "Install: cargo install --locked soroban-cli"
    exit 1
fi

# Check if WASM file exists
if [ ! -f "$WASM_FILE" ]; then
    echo "❌ WASM file not found. Building..."
    ./build.sh
fi

# Deploy contract
echo "📤 Deploying contract..."
CONTRACT_ID=$(soroban contract deploy \
    --wasm "$WASM_FILE" \
    --network "$NETWORK" \
    --source-account default)

echo "✅ Contract deployed successfully!"
echo "📝 Contract ID: $CONTRACT_ID"
echo ""
echo "Save this contract ID to your .env file:"
echo "STELLAR_TIP_ESCROW_CONTRACT=$CONTRACT_ID"

# Save to file
echo "$CONTRACT_ID" > .contract-id
echo "💾 Contract ID saved to .contract-id"
