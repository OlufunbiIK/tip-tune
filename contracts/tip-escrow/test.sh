#!/bin/bash
set -e

echo "🧪 Running Tip Escrow Contract Tests..."

cd contracts/tip-escrow

# Run tests
cargo test

echo "✅ All tests passed!"
