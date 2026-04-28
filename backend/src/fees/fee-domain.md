# Fee Domain Documentation

## Overview

This document describes the consolidated fee domain that unifies the previous `fees/` and `platinum-fee/` modules into a single, canonical fee management system.

## Domain Boundaries

### Core Responsibilities
- **Fee Configuration Management**: Historical and active fee configurations
- **Fee Calculation**: Platform fee computation with business rules
- **Fee Recording**: Persistent storage of fee records
- **Fee Collection**: Tracking collection status and reconciliation
- **Fee Analytics**: Ledger queries and financial summaries

### Key Entities

#### PlatformFee
Represents a fee charged on a tip transaction:
- `tipId`: Reference to the associated tip
- `feePercentage`: Percentage applied to calculate the fee
- `feeAmountXLM`: Fee amount in XLM (stored as decimal for precision)
- `feeAmountUSD`: Fee amount in USD (optional, for reporting)
- `collectionStatus`: PENDING | COLLECTED | WAIVED
- `stellarTxHash`: Transaction hash when fee is collected
- `collectedAt`: Timestamp when fee was collected

#### FeeConfiguration
Historical fee configurations with effective dates:
- `feePercentage`: Platform fee percentage
- `minimumFeeXLM`: Minimum fee per transaction
- `maximumFeeXLM`: Maximum fee per transaction
- `waivedForVerifiedArtists`: Whether verified artists are exempt
- `effectiveFrom`: Date when configuration becomes active
- `createdBy`: Admin who created the configuration

### Business Rules

1. **Historical Configurations**: Never overwrite configurations - create new records
2. **Effective Dating**: Use the most recent configuration with effectiveFrom <= now
3. **Verified Artist Waiver**: Verified artists may have fees waived based on configuration
4. **Fee Calculation**: Apply percentage, then enforce min/max bounds
5. **Collection Status**: Track fee collection lifecycle (pending → collected/waived)

### Integration Points

- **Tips Service**: Automatically records fees when tips are created
- **Stellar Service**: Handles fee collection transactions
- **Artist Service**: Provides verification status for fee waivers
- **Analytics**: Uses fee data for financial reporting

### Migration Strategy

1. **Entity Unification**: Use the more robust platinum-fee entity structure
2. **Service Consolidation**: Merge functionality from both services
3. **API Compatibility**: Maintain existing endpoints during transition
4. **Data Migration**: Ensure existing data is compatible with new schema
5. **Deprecation**: Mark old module for removal after validation

### API Endpoints

- `GET /fees/configuration` - Get active fee configuration
- `POST /fees/configuration` - Update fee configuration (admin)
- `GET /fees/configuration/history` - Get configuration history
- `GET /fees/ledger` - Get fee ledger with pagination
- `GET /fees/totals` - Get platform fee totals
- `GET /fees/artist/:artistId/summary` - Get artist fee summary
- `POST /fees/:feeId/collect` - Mark fee as collected (admin)

### Testing Strategy

- **Configuration Tests**: Verify historical configuration management
- **Calculation Tests**: Validate fee calculation logic
- **Recording Tests**: Ensure fee recording accuracy
- **Query Tests**: Test ledger queries and summaries
- **Integration Tests**: Verify end-to-end fee workflows
