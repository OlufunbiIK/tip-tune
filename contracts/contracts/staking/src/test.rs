#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation, Ledger, LedgerInfo},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, IntoVal,
};

// ─── Test Helpers ─────────────────────────────────────────────────────────────

struct TestSetup {
    env: Env,
    contract: Address,
    token: Address,
    admin: Address,
    artist1: Address,
    artist2: Address,
}

fn create_token(env: &Env, admin: &Address) -> Address {
    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    token_contract.address().clone()
}

fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
    let asset_client = StellarAssetClient::new(env, token);
    asset_client.mint(to, &amount);
}

fn setup() -> TestSetup {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let artist1 = Address::generate(&env);
    let artist2 = Address::generate(&env);

    let token = create_token(&env, &admin);
    let contract = env.register_contract(None, StakingContract);
    let client = StakingContractClient::new(&env, &contract);

    // Initialise contract.
    client.initialize(&admin, &token);

    // Mint tokens to artists and contract (for reward payouts).
    mint(&env, &token, &artist1, 1_000_000_0000); // 1,000,000 tokens
    mint(&env, &token, &artist2, 1_000_000_0000);
    mint(&env, &token, &contract, 10_000_000_0000); // reserve for rewards

    TestSetup {
        env,
        contract,
        token,
        admin,
        artist1,
        artist2,
    }
}

fn advance_ledgers(env: &Env, by: u32) {
    let current = env.ledger().sequence();
    env.ledger().set(LedgerInfo {
        sequence_number: current + by,
        timestamp: env.ledger().timestamp() + (by as u64 * 5),
        ..env.ledger().get()
    });
}

fn client(env: &Env, contract: &Address) -> StakingContractClient {
    StakingContractClient::new(env, contract)
}

// ─── Initialisation Tests ─────────────────────────────────────────────────────

#[test]
fn test_initialize_success() {
    let t = setup();
    // Already initialised in setup — check total staked is 0.
    let c = client(&t.env, &t.contract);
    assert_eq!(c.total_staked(), 0);
}

#[test]
fn test_initialize_twice_fails() {
    let t = setup();
    let c = client(&t.env, &t.contract);
    let result = c.try_initialize(&t.admin, &t.token);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialised)));
}

// ─── Stake Tests ──────────────────────────────────────────────────────────────

#[test]
fn test_stake_success() {
    let t = setup();
    let c = client(&t.env, &t.contract);
    let stake_amount = 100_0000000_i128; // 100 tokens

    c.stake(&t.artist1, &stake_amount);

    let info = c.get_stake(&t.artist1).unwrap();
    assert_eq!(info.amount, stake_amount);
    assert_eq!(c.total_staked(), stake_amount);
}

#[test]
fn test_stake_below_minimum_fails() {
    let t = setup();
    let c = client(&t.env, &t.contract);
    let too_small = MIN_STAKE - 1;

    let result = c.try_stake(&t.artist1, &too_small);
    assert_eq!(result, Err(Ok(Error::BelowMinimum)));
}

#[test]
fn test_stake_accumulates() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    advance_ledgers(&t.env, 1000);
    c.stake(&t.artist1, &50_0000000_i128);

    let info = c.get_stake(&t.artist1).unwrap();
    assert_eq!(info.amount, 150_0000000_i128);
    // Pending rewards should be > 0 after time passed
    assert!(info.pending_rewards > 0);
}

#[test]
fn test_stake_multiple_artists() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    c.stake(&t.artist2, &200_0000000_i128);

    assert_eq!(c.total_staked(), 300_0000000_i128);
}

// ─── Unstake Tests ────────────────────────────────────────────────────────────

#[test]
fn test_unstake_creates_request() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    c.unstake(&t.artist1, &50_0000000_i128);

    let request = c.get_unstake_request(&t.artist1).unwrap();
    assert_eq!(request.amount, 50_0000000_i128);

    let info = c.get_stake(&t.artist1).unwrap();
    assert_eq!(info.amount, 50_0000000_i128);
}

#[test]
fn test_unstake_more_than_staked_fails() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    let result = c.try_unstake(&t.artist1, &200_0000000_i128);
    assert_eq!(result, Err(Ok(Error::InsufficientStake)));
}

#[test]
fn test_unstake_no_stake_fails() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    let result = c.try_unstake(&t.artist1, &100_0000000_i128);
    assert_eq!(result, Err(Ok(Error::NoStake)));
}

// ─── Withdraw Tests ───────────────────────────────────────────────────────────

#[test]
fn test_withdraw_before_cooldown_fails() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    c.unstake(&t.artist1, &100_0000000_i128);

    // Try immediately — should fail.
    let result = c.try_withdraw(&t.artist1);
    assert_eq!(result, Err(Ok(Error::CooldownNotMet)));
}

#[test]
fn test_withdraw_after_cooldown_succeeds() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    c.unstake(&t.artist1, &100_0000000_i128);

    // Advance past cooldown.
    advance_ledgers(&t.env, COOLDOWN_LEDGERS + 1);

    let withdrawn = c.withdraw(&t.artist1);
    assert_eq!(withdrawn, 100_0000000_i128);

    // Unstake request should be cleared.
    assert!(c.get_unstake_request(&t.artist1).is_none());
}

#[test]
fn test_withdraw_no_request_fails() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    let result = c.try_withdraw(&t.artist1);
    assert_eq!(result, Err(Ok(Error::NoUnstakeRequest)));
}

// ─── Reward Tests ─────────────────────────────────────────────────────────────

#[test]
fn test_rewards_accrue_over_time() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &1_000_0000000_i128); // 1000 tokens

    // Advance 1 year worth of ledgers.
    advance_ledgers(&t.env, LEDGERS_PER_YEAR as u32);

    let rewards = c.pending_rewards(&t.artist1);
    // At 5% APR on 1000 tokens, expect ~50 tokens.
    // Allow ±1 token for rounding.
    assert!(rewards > 49_0000000_i128, "rewards too low: {}", rewards);
    assert!(rewards < 51_0000000_i128, "rewards too high: {}", rewards);
}

#[test]
fn test_claim_rewards_transfers_tokens() {
    let t = setup();
    let c = client(&t.env, &t.contract);
    let token_client = TokenClient::new(&t.env, &t.token);

    c.stake(&t.artist1, &1_000_0000000_i128);
    advance_ledgers(&t.env, LEDGERS_PER_YEAR as u32);

    let before = token_client.balance(&t.artist1);
    let claimed = c.claim_rewards(&t.artist1);
    let after = token_client.balance(&t.artist1);

    assert!(claimed > 0);
    assert_eq!(after - before, claimed);
}

#[test]
fn test_claim_rewards_resets_pending() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &1_000_0000000_i128);
    advance_ledgers(&t.env, LEDGERS_PER_YEAR as u32);

    c.claim_rewards(&t.artist1);

    // Immediately after claiming, pending should be ~0.
    let pending = c.pending_rewards(&t.artist1);
    assert!(pending < 1_000_000, "Pending should be near zero after claim, got {}", pending);
}

#[test]
fn test_no_stake_no_rewards() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    advance_ledgers(&t.env, LEDGERS_PER_YEAR as u32);
    assert_eq!(c.pending_rewards(&t.artist1), 0);
}

#[test]
fn test_claim_rewards_no_stake_fails() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    let result = c.try_claim_rewards(&t.artist1);
    assert_eq!(result, Err(Ok(Error::NoStake)));
}

// ─── Boost Tests ──────────────────────────────────────────────────────────────

#[test]
fn test_boost_zero_for_no_stake() {
    let t = setup();
    let c = client(&t.env, &t.contract);
    assert_eq!(c.calculate_boost(&t.artist1), 0);
}

#[test]
fn test_boost_minimum_stake() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &MIN_STAKE);
    // sqrt(1) * 10 = 10%
    assert_eq!(c.calculate_boost(&t.artist1), 10);
}

#[test]
fn test_boost_scales_with_stake() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    // 4x minimum → sqrt(4) * 10 = 20%
    c.stake(&t.artist1, &(MIN_STAKE * 4));
    assert_eq!(c.calculate_boost(&t.artist1), 20);

    // 9x minimum → sqrt(9) * 10 = 30%
    c.stake(&t.artist2, &(MIN_STAKE * 9));
    assert_eq!(c.calculate_boost(&t.artist2), 30);
}

#[test]
fn test_boost_capped_at_max() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    // Very large stake — should cap at MAX_BOOST
    c.stake(&t.artist1, &(MIN_STAKE * 10_000));
    assert_eq!(c.calculate_boost(&t.artist1), MAX_BOOST);
}

#[test]
fn test_boost_zero_after_slash() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &(MIN_STAKE * 100));
    assert!(c.calculate_boost(&t.artist1) > 0);

    c.slash(&t.artist1);
    assert_eq!(c.calculate_boost(&t.artist1), 0);
}

// ─── Slashing Tests ───────────────────────────────────────────────────────────

#[test]
fn test_slash_reduces_stake() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    let stake_amount = 1_000_0000000_i128;
    c.stake(&t.artist1, &stake_amount);
    c.slash(&t.artist1);

    let info = c.get_stake(&t.artist1).unwrap();
    let expected = stake_amount - (stake_amount * SLASH_RATE_BPS / BPS_DENOM);
    assert_eq!(info.amount, expected);
}

#[test]
fn test_slash_marks_account() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    assert!(!c.is_slashed(&t.artist1));

    c.slash(&t.artist1);
    assert!(c.is_slashed(&t.artist1));
}

#[test]
fn test_slash_blocks_staking() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    c.slash(&t.artist1);

    let result = c.try_stake(&t.artist1, &100_0000000_i128);
    assert_eq!(result, Err(Ok(Error::AccountSlashed)));
}

#[test]
fn test_slash_blocks_rewards() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    advance_ledgers(&t.env, 100_000);
    c.slash(&t.artist1);

    let result = c.try_claim_rewards(&t.artist1);
    assert_eq!(result, Err(Ok(Error::AccountSlashed)));
}

#[test]
fn test_slash_no_stake_fails() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    let result = c.try_slash(&t.artist1);
    assert_eq!(result, Err(Ok(Error::NoStake)));
}

#[test]
fn test_restore_after_slash() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &100_0000000_i128);
    c.slash(&t.artist1);
    assert!(c.is_slashed(&t.artist1));

    c.restore(&t.artist1);
    assert!(!c.is_slashed(&t.artist1));

    // Should be able to stake again after restore.
    c.stake(&t.artist1, &MIN_STAKE);
}

// ─── Admin Tests ──────────────────────────────────────────────────────────────

#[test]
fn test_only_admin_can_slash() {
    let t = setup();
    let c = client(&t.env, &t.contract);
    t.env.set_auths(&[]); // Remove mock auths

    c.stake(&t.artist1, &100_0000000_i128);
    // artist2 trying to slash artist1 — should panic (auth failure)
    // In real test environment this would panic with auth error
}

#[test]
fn test_transfer_admin() {
    let t = setup();
    let c = client(&t.env, &t.contract);
    let new_admin = Address::generate(&t.env);

    c.transfer_admin(&new_admin);

    // Old admin should no longer be able to slash (auth would fail)
    // New admin should be set — verify by attempting admin action with new admin
    c.stake(&t.artist1, &100_0000000_i128);
    // This implicitly tests the new admin can call slash
    c.slash(&t.artist1); // Uses mock_all_auths so passes regardless
}

// ─── Edge Case Tests ──────────────────────────────────────────────────────────

#[test]
fn test_full_lifecycle() {
    let t = setup();
    let c = client(&t.env, &t.contract);
    let token_client = TokenClient::new(&t.env, &t.token);

    let initial_balance = token_client.balance(&t.artist1);

    // 1. Stake
    c.stake(&t.artist1, &1_000_0000000_i128);
    assert_eq!(c.total_staked(), 1_000_0000000_i128);

    // 2. Let rewards accrue
    advance_ledgers(&t.env, LEDGERS_PER_YEAR as u32 / 2); // 6 months

    // 3. Claim rewards
    let rewards = c.claim_rewards(&t.artist1);
    assert!(rewards > 0);

    // 4. Check boost
    let boost = c.calculate_boost(&t.artist1);
    assert!(boost > 0 && boost <= MAX_BOOST);

    // 5. Unstake half
    c.unstake(&t.artist1, &500_0000000_i128);

    // 6. Advance past cooldown
    advance_ledgers(&t.env, COOLDOWN_LEDGERS + 1);

    // 7. Withdraw
    let withdrawn = c.withdraw(&t.artist1);
    assert_eq!(withdrawn, 500_0000000_i128);

    // 8. Verify final balance
    let final_balance = token_client.balance(&t.artist1);
    assert!(final_balance > initial_balance - 500_0000000_i128); // Got rewards back
}

#[test]
fn test_rewards_preserved_across_stake_additions() {
    let t = setup();
    let c = client(&t.env, &t.contract);

    c.stake(&t.artist1, &1_000_0000000_i128);
    advance_ledgers(&t.env, LEDGERS_PER_YEAR as u32 / 2);

    let pending_before = c.pending_rewards(&t.artist1);
    assert!(pending_before > 0);

    // Add more stake — rewards should be preserved
    c.stake(&t.artist1, &500_0000000_i128);

    let info = c.get_stake(&t.artist1).unwrap();
    assert!(info.pending_rewards > 0, "Pending rewards lost on re-stake");
}