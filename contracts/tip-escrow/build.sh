#!/bin/bash
set -e

echo "🚀 Building Tip Escrow Contract..."

# Build the contract
cargo build --target wasm32-unknown-unknown --release

echo "✅ Build complete!"
echo "📦 WASM file: target/wasm32-unknown-unknown/release/tip_escrow.wasm"

# Optimize the WASM (optional, requires soroban-cli)
if command -v soroban &> /dev/null; then
    echo "🔧 Optimizing WASM..."
    soroban contract optimize \
        --wasm target/wasm32-unknown-unknown/release/tip_escrow.wasm \
        --wasm-out target/wasm32-unknown-unknown/release/tip_escrow_optimized.wasm
    echo "✅ Optimized WASM: target/wasm32-unknown-unknown/release/tip_escrow_optimized.wasm"
else
    echo "⚠️  soroban-cli not found. Skipping optimization."
    echo "   Install: cargo install --locked soroban-cli"
fi
