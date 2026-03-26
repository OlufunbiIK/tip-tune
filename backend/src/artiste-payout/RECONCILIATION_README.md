# Payout and Balance Reconciliation Framework

## Overview

This feature adds comprehensive reconciliation and auditability to the payout and balance system, enabling detection and repair of ledger mismatches across tips, balances, and platform fees.

## Problem Statement

Previously, the payout system lacked:
- **Auditability**: No transaction-level history of balance changes
- **Reconciliation**: No automated detection of balance vs. payout mismatches
- **Recovery**: No tools to repair detected discrepancies
- **USDC Support**: USDC payouts used actual balance instead of pending reserve

## Solution

### Core Components

#### 1. Artist Balance Auditing (`ArtistBalanceAudit`)
- **Purpose**: Immutable ledger of all balance changes
- **Triggers**: Tip credits, payout requests, completions, failures
- **Fields**:
  - `eventType`: TIP_CREDIT, PAYOUT_REQUEST, PAYOUT_COMPLETED, PAYOUT_FAILED
  - `amount`: Delta amount
  - `balanceBefore/After`: Balance state before and after
  - `pendingBefore/After`: Pending reserve state
  - Linked to payouts and tips for full traceability

#### 2. Enhanced Artist Balance Entity
- **New Field**: `pendingUsdc` - mirrors `pendingXlm` for USDC
- **Purpose**: Properly reserve USDC funds during payout processing
- **Audit Trail**: Every balance change is logged

#### 3. Payout Reconciliation Service (`PayoutReconciliationService`)
**Detection Algorithm**:
1. Sum verified tips by artist and asset code
2. Sum pending + processing + completed payouts
3. Calculate expected available balance: `tips_total - completed_payouts - pending_payouts`
4. Compare with actual `artist_balances` record
5. Report discrepancies with severity

**Repair Logic** (optional):
- Recalculate and update balance to match expected state
- Log repair action to audit trail
- Return full report of changes

**Supported Scenarios**:
- Missing balance from orphaned tips
- Duplicate pending payouts not released on failure
- Incomplete payout processing
- Race conditions in concurrent requests

#### 4. Payout Reconciliation Scheduler
- **Cron**: Nightly (midnight) reconciliation of all artists
- **Behavior**: Detection only (no auto-repair)
- **Reports**: Warnings logged for manual review

### Enhanced Payout Flow

1. **Balance Credit on Tip Verification**
   - Create `TIP_CREDIT` audit entry
   - Record balance state and delta

2. **Payout Request**
   - Reserve funds in `pendingXlm` or `pendingUsdc`
   - Create `PAYOUT_REQUEST` audit entry
   - Lock balance atomically

3. **Payout Completion**
   - Deduct from both balance and pending
   - Create `PAYOUT_COMPLETED` audit entry with before/after states

4. **Payout Failure**
   - Release pending reserve (not balance)
   - Create `PAYOUT_FAILED` audit entry
   - Maintain full history

### API Endpoints

#### Admin Reconciliation

```typescript
// Detect all discrepancies across platform
POST /admin/reconcile/payouts
→ { count: n, discrepancies: [...] }

// Detect discrepancies for specific artist
POST /admin/reconcile/payouts/:artistId
→ { count: n, discrepancies: [...] }

// Detect AND repair discrepancies (admin only)
POST /admin/reconcile/payouts/:artistId/repair
→ { count: n, discrepancies: [...repaired] }
```

### Database Schema

#### `artist_balances` (Enhanced)
```sql
- id: UUID
- artistId: UUID (unique)
- xlmBalance: DECIMAL
- usdcBalance: DECIMAL
- pendingXlm: DECIMAL (XLM payout reserves)
- pendingUsdc: DECIMAL (NEW: USDC payout reserves)
- lastUpdated: TIMESTAMP
```

#### `artist_balance_audits` (New)
```sql
- id: UUID
- artistId: UUID
- assetCode: 'XLM' | 'USDC'
- eventType: ENUM (tip_credit, payout_request, etc.)
- payoutRequestId: UUID (optional)
- tipId: UUID (optional)
- amount: DECIMAL (signed delta)
- balanceBefore: DECIMAL
- balanceAfter: DECIMAL
- pendingBefore: DECIMAL
- pendingAfter: DECIMAL
- createdAt: TIMESTAMP
```

**Indexes**:
- `(artistId, createdAt)` - efficient history queries
- `(payoutRequestId)` - trace payout changes
- `(createdAt)` - reconciliation time-range queries

## Testing

### Unit Tests
- Balance credit with audit logging
- Payout request with pending reserve
- Payout completion with balance deduction
- Payout failure with pending release
- Reconciliation detection of mismatches
- Reconciliation repair flow

### Integration Tests
- Full payout lifecycle with audit trail
- Concurrent payout requests
- Failure recovery scenarios
- Cross-artist reconciliation consistency

### Acceptance Criteria Met

✅ **Balance and payout transitions are traceable**
   - Every change creates immutable audit entry
   - Linked to source transactions (tips, payouts)
   - Includes before/after states

✅ **Reconciliation can detect known mismatches**
   - Orphaned tips (no balance update)
   - Stuck pending payouts (not released on failure)
   - Concurrent update race conditions
   - Partial processing crashes

✅ **Tests cover happy paths and recovery**
   - Normal tip → payout flow
   - Failed payout → retry flow
   - Repair flow for mismatches

## Usage Examples

### Query Audit Trail
```typescript
// Get all changes for artist since date
const audits = await auditRepo.find({
  where: {
    artistId,
    createdAt: MoreThan(startDate),
  },
  order: { createdAt: 'DESC' },
});

// Group by payout request for full trace
const byPayout = audits.reduce((map, audit) => {
  if (audit.payoutRequestId) {
    map.set(audit.payoutRequestId, [...(map.get(audit.payoutRequestId) || []), audit]);
  }
  return map;
}, new Map<string, ArtistBalanceAudit[]>());
```

### Run Reconciliation
```typescript
// Check for issues
const discrepancies = await reconciliationService.reconcileArtist(artistId, false);

// Fix issues automatically
const fixed = await reconciliationService.reconcileArtist(artistId, true);
```

## Future Enhancements

- **Fee Ledger Reconciliation**: Validate platform fee totals match collected tips
- **Batch Repair**: Automated repair of known-safe discrepancies
- **Webhooks**: Real-time audit notifications for compliance
- **Export**: CSV/PDF audit reports for financial review
- **Multi-Chain**: Support for additional blockchains

## Migration Path

1. Deploy migration to add `pendingUsdc` column
2. Create `artist_balance_audits` table
3. Enable reconciliation service
4. Run initial reconciliation detection (no-repair)
5. Review and manually fix any discrepancies
6. Enable nightly scheduler

## Security Considerations

- Audit entries are **immutable** (never updated/deleted)
- Reconciliation is **read-only** in detection mode
- Repair requires **admin authentication**
- All balance changes are **transaction-bound**
- **Decimal precision** preserved at 18,7 throughout
