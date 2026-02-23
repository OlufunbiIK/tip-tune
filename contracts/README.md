# TipTune Smart Contracts

Soroban smart contracts for TipTune's tip escrow and royalty distribution system.

## Overview

The **Tip Escrow Contract** enables:
- Secure tip payments from fans to artists
- Automatic royalty distribution to collaborators
- Configurable revenue splits
- On-chain tip history

## Prerequisites

- Rust 1.74+
- `wasm32-unknown-unknown` target
- Soroban CLI (for deployment)

```bash
# Install Rust target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli
```

## Project Structure

```
contracts/
├── tip-escrow/
│   ├── src/
│   │   ├── lib.rs        # Main contract logic
│   │   ├── types.rs      # Data structures
│   │   ├── storage.rs    # Storage helpers
│   │   └── test.rs       # Test suite
│   ├── Cargo.toml        # Dependencies
│   ├── build.sh          # Build script
│   ├── deploy.sh         # Deployment script
│   └── test.sh           # Test runner
└── README.md
```

## Quick Start

### Build

```bash
cd contracts/tip-escrow
./build.sh
```

### Test

```bash
./test.sh
```

Or run directly:
```bash
cargo test
```

### Deploy to Testnet

```bash
# Configure Soroban CLI with your identity
soroban keys generate default --network testnet

# Deploy
./deploy.sh
```

The contract ID will be saved to `.contract-id` and displayed in the output.

### Deploy to Mainnet

```bash
NETWORK=mainnet ./deploy.sh
```

## Contract Functions

### `send_tip`

Send a tip to an artist with automatic royalty distribution.

```rust
pub fn send_tip(
    env: Env,
    sender: Address,
    artist: Address,
    token_address: Address,
    amount: i128,
) -> u64
```

**Parameters:**
- `sender` - Address sending the tip
- `artist` - Artist receiving the tip
- `token_address` - Token contract address (e.g., USDC, XLM)
- `amount` - Tip amount in stroops

**Returns:** Tip ID

### `set_royalty_splits`

Configure royalty splits for an artist.

```rust
pub fn set_royalty_splits(
    env: Env,
    artist: Address,
    splits: Vec<RoyaltySplit>
)
```

**Parameters:**
- `artist` - Artist address (requires auth)
- `splits` - Vector of royalty splits (max 100%)

**Example:**
```rust
// 20% to collaborator, 80% to artist
RoyaltySplit {
    recipient: collaborator_address,
    percentage: 2000  // Basis points (2000 = 20%)
}
```

### `get_royalty_splits`

Get configured royalty splits for an artist.

```rust
pub fn get_royalty_splits(
    env: Env,
    artist: Address
) -> Option<Vec<RoyaltySplit>>
```

### `get_tips`

Retrieve all recorded tips.

```rust
pub fn get_tips(env: Env) -> Vec<TipRecord>
```

## Data Types

### `TipRecord`

```rust
pub struct TipRecord {
    pub sender: Address,
    pub artist: Address,
    pub amount: i128,
    pub timestamp: u64,
}
```

### `RoyaltySplit`

```rust
pub struct RoyaltySplit {
    pub recipient: Address,
    pub percentage: u32,  // Basis points (100 = 1%)
}
```

## Testing

The contract includes comprehensive tests:

- ✅ Send tip without splits
- ✅ Send tip with royalty splits
- ✅ Get royalty splits
- ✅ Validate split percentages
- ✅ Authorization checks

Run tests:
```bash
cargo test
```

## Integration with Backend

Add the deployed contract ID to your backend `.env`:

```env
STELLAR_TIP_ESCROW_CONTRACT=C...
```

Use the Stellar SDK to invoke contract functions from your NestJS backend.

## CI/CD

GitHub Actions workflow for automated testing:

```yaml
# See: .github/workflows/contracts.yml
```

## Security Considerations

- All tip transfers require sender authorization
- Royalty splits are validated (max 100%)
- Contract uses Soroban SDK security best practices
- Audit recommended before mainnet deployment

## Gas Optimization

The contract is optimized for minimal gas usage:
- Efficient storage patterns
- Minimal computation
- Optimized WASM output

## License

MIT

## Support

For issues or questions:
- GitHub Issues: [OlufunbiIK/tip-tune](https://github.com/OlufunbiIK/tip-tune/issues)
- Discord: [TipTune Community](https://discord.gg/tkbwMmJE)
