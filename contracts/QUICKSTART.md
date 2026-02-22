# Tip Escrow Contract - Quick Reference

## Installation

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli
```

## Commands

```bash
# Build
cd contracts/tip-escrow
cargo build --target wasm32-unknown-unknown --release

# Test
cargo test

# Deploy to testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/tip_escrow.wasm \
  --network testnet \
  --source-account default

# Invoke contract
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source-account default \
  -- send_tip \
  --sender <SENDER_ADDRESS> \
  --artist <ARTIST_ADDRESS> \
  --token_address <TOKEN_ADDRESS> \
  --amount 1000000
```

## Contract Interface

### send_tip
```rust
fn send_tip(
    sender: Address,
    artist: Address,
    token_address: Address,
    amount: i128
) -> u64
```

### set_royalty_splits
```rust
fn set_royalty_splits(
    artist: Address,
    splits: Vec<RoyaltySplit>
)
```

### get_royalty_splits
```rust
fn get_royalty_splits(artist: Address) -> Option<Vec<RoyaltySplit>>
```

### get_tips
```rust
fn get_tips() -> Vec<TipRecord>
```

## Example: Configure Splits

```bash
# 30% to producer, 20% to featured artist, 50% to main artist
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source-account artist \
  -- set_royalty_splits \
  --artist <ARTIST_ADDRESS> \
  --splits '[
    {"recipient": "<PRODUCER_ADDRESS>", "percentage": 3000},
    {"recipient": "<FEATURED_ADDRESS>", "percentage": 2000}
  ]'
```

## Percentage Calculation

Percentages are in **basis points** (1 basis point = 0.01%):
- 100 = 1%
- 1000 = 10%
- 2000 = 20%
- 10000 = 100%

## Environment Setup

```bash
# Generate testnet identity
soroban keys generate default --network testnet

# Fund account (testnet)
soroban keys fund default --network testnet

# Check balance
soroban keys address default
```

## Troubleshooting

**Build fails**: Ensure wasm32 target is installed
```bash
rustup target add wasm32-unknown-unknown
```

**Deploy fails**: Check Soroban CLI version
```bash
soroban --version  # Should be 21.x.x
cargo install --locked soroban-cli --force
```

**Tests fail**: Clean and rebuild
```bash
cargo clean
cargo test
```
