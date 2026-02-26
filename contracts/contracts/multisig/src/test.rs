#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token::StellarAssetClient,
    Address, Env, String,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

struct TestSetup {
    env:      Env,
    contract: Address,
    token:    Address,
    admin:    Address,
    tipper:   Address,
    artist:   Address,
    signer1:  Address,
    signer2:  Address,
    signer3:  Address,
}

fn setup() -> TestSetup {
    let env = Env::default();
    env.mock_all_auths();

    let admin   = Address::generate(&env);
    let tipper  = Address::generate(&env);
    let artist  = Address::generate(&env);
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);

    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let token = token_contract.address().clone();
    StellarAssetClient::new(&env, &token).mint(&tipper, &10_000_0000000_i128);

    let contract = env.register_contract(None, MultisigContract);
    let client   = MultisigContractClient::new(&env, &contract);
    client.initialize(&admin, &token);
    client.add_signer(&signer1);
    client.add_signer(&signer2);
    client.add_signer(&signer3);

    TestSetup { env, contract, token, admin, tipper, artist, signer1, signer2, signer3 }
}

fn client<'a>(env: &'a Env, contract: &Address) -> MultisigContractClient<'a> {
    MultisigContractClient::new(env, contract)
}

fn advance(env: &Env, by: u32) {
    let seq = env.ledger().sequence();
    env.ledger().set(LedgerInfo {
        sequence_number: seq + by,
        timestamp: env.ledger().timestamp() + (by as u64 * 5),
        ..env.ledger().get()
    });
}

// ─── Init Tests ───────────────────────────────────────────────────────────────

#[test]
fn test_initialize_success() {
    let t = setup();
    assert_eq!(client(&t.env, &t.contract).get_admin().unwrap(), t.admin);
}

#[test]
fn test_initialize_twice_fails() {
    let t = setup();
    assert_eq!(
        client(&t.env, &t.contract).try_initialize(&t.admin, &t.token),
        Err(Ok(Error::AlreadyInitialised))
    );
}

// ─── Signer Tests ─────────────────────────────────────────────────────────────

#[test]
fn test_add_signer() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let s  = Address::generate(&t.env);
    c.add_signer(&s);
    let signers = c.get_signers();
    let mut found = false;
    for i in 0..signers.len() {
        if signers.get(i).unwrap() == s { found = true; }
    }
    assert!(found);
}

#[test]
fn test_add_duplicate_signer_fails() {
    let t = setup();
    assert_eq!(
        client(&t.env, &t.contract).try_add_signer(&t.signer1),
        Err(Ok(Error::AlreadyWhitelisted))
    );
}

#[test]
fn test_remove_signer() {
    let t = setup();
    let c = client(&t.env, &t.contract);
    c.remove_signer(&t.signer3);
    let signers = c.get_signers();
    for i in 0..signers.len() {
        assert_ne!(signers.get(i).unwrap(), t.signer3);
    }
}

// ─── Create Tip Tests ─────────────────────────────────────────────────────────

#[test]
fn test_create_tip_success() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &1_000_0000000_i128, &2);
    let p  = c.get_tip(&id).unwrap();
    assert_eq!(p.amount,        1_000_0000000_i128);
    assert_eq!(p.required_sigs, 2);
    assert_eq!(p.status,        TipStatus::Pending);
    assert_eq!(p.approvals.len(), 0);
}

#[test]
fn test_create_tip_locks_tokens() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let tc = soroban_sdk::token::Client::new(&t.env, &t.token);
    let before = tc.balance(&t.tipper);
    c.create_multisig_tip(&t.tipper, &t.artist, &500_0000000_i128, &1);
    assert_eq!(before - tc.balance(&t.tipper), 500_0000000_i128);
}

#[test]
fn test_create_tip_unique_ids() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id1 = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &1);
    let id2 = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &1);
    assert_ne!(id1, id2);
}

#[test]
fn test_create_tip_zero_amount_fails() {
    let t = setup();
    assert_eq!(
        client(&t.env, &t.contract).try_create_multisig_tip(&t.tipper, &t.artist, &0, &1),
        Err(Ok(Error::InvalidAmount))
    );
}

#[test]
fn test_create_tip_zero_sigs_fails() {
    let t = setup();
    assert_eq!(
        client(&t.env, &t.contract).try_create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &0),
        Err(Ok(Error::ZeroSigners))
    );
}

#[test]
fn test_create_tip_too_many_sigs_fails() {
    let t = setup();
    assert_eq!(
        client(&t.env, &t.contract).try_create_multisig_tip(
            &t.tipper, &t.artist, &100_0000000_i128, &(MAX_REQUIRED_SIGS + 1)
        ),
        Err(Ok(Error::TooManySigners))
    );
}

// ─── Approve Tests ────────────────────────────────────────────────────────────

#[test]
fn test_approve_returns_false_below_threshold() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &2);
    assert!(!c.approve_tip(&id, &t.signer1));
}

#[test]
fn test_approve_returns_true_at_threshold() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &1);
    assert!(c.approve_tip(&id, &t.signer1));
}

#[test]
fn test_approve_transfers_to_artist() {
    let t   = setup();
    let c   = client(&t.env, &t.contract);
    let tc  = soroban_sdk::token::Client::new(&t.env, &t.token);
    let amt = 500_0000000_i128;
    let id  = c.create_multisig_tip(&t.tipper, &t.artist, &amt, &1);
    let before = tc.balance(&t.artist);
    c.approve_tip(&id, &t.signer1);
    assert_eq!(tc.balance(&t.artist) - before, amt);
}

#[test]
fn test_approve_status_becomes_executed() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &1);
    c.approve_tip(&id, &t.signer1);
    assert_eq!(c.get_tip(&id).unwrap().status, TipStatus::Executed);
}

#[test]
fn test_approve_collects_multiple_sigs() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &3);
    c.approve_tip(&id, &t.signer1);
    assert_eq!(c.get_pending_approvals(&id).len(), 1);
    c.approve_tip(&id, &t.signer2);
    assert_eq!(c.get_pending_approvals(&id).len(), 2);
    assert!(c.approve_tip(&id, &t.signer3)); // executes
}

#[test]
fn test_duplicate_approval_fails() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &3);
    c.approve_tip(&id, &t.signer1);
    assert_eq!(c.try_approve_tip(&id, &t.signer1), Err(Ok(Error::AlreadyApproved)));
}

#[test]
fn test_non_whitelisted_approver_fails() {
    let t     = setup();
    let c     = client(&t.env, &t.contract);
    let rando = Address::generate(&t.env);
    let id    = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &1);
    assert_eq!(c.try_approve_tip(&id, &rando), Err(Ok(Error::NotWhitelisted)));
}

#[test]
fn test_approve_expired_tip_fails() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &2);
    advance(&t.env, TIMEOUT_LEDGERS + 1);
    assert_eq!(c.try_approve_tip(&id, &t.signer1), Err(Ok(Error::TipExpired)));
}

#[test]
fn test_approvals_needed_decrements() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &3);
    assert_eq!(c.approvals_needed(&id), 3);
    c.approve_tip(&id, &t.signer1);
    assert_eq!(c.approvals_needed(&id), 2);
    c.approve_tip(&id, &t.signer2);
    assert_eq!(c.approvals_needed(&id), 1);
}

// ─── Cancel Tests ─────────────────────────────────────────────────────────────

#[test]
fn test_tipper_can_cancel_anytime() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &3);
    c.cancel_tip(&id, &t.tipper);
    assert_eq!(c.get_tip(&id).unwrap().status, TipStatus::Cancelled);
}

#[test]
fn test_cancel_refunds_tipper() {
    let t   = setup();
    let c   = client(&t.env, &t.contract);
    let tc  = soroban_sdk::token::Client::new(&t.env, &t.token);
    let amt = 300_0000000_i128;
    let before = tc.balance(&t.tipper);
    let id  = c.create_multisig_tip(&t.tipper, &t.artist, &amt, &3);
    c.cancel_tip(&id, &t.tipper);
    assert_eq!(tc.balance(&t.tipper), before);
}

#[test]
fn test_non_tipper_cannot_cancel_before_timeout() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &3);
    assert_eq!(c.try_cancel_tip(&id, &t.signer1), Err(Ok(Error::TipNotExpired)));
}

#[test]
fn test_anyone_can_cancel_after_timeout() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &3);
    advance(&t.env, TIMEOUT_LEDGERS + 1);
    c.cancel_tip(&id, &t.signer1);
    assert_eq!(c.get_tip(&id).unwrap().status, TipStatus::Cancelled);
}

#[test]
fn test_cancel_executed_tip_fails() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &1);
    c.approve_tip(&id, &t.signer1);
    assert_eq!(c.try_cancel_tip(&id, &t.tipper), Err(Ok(Error::TipNotPending)));
}

// ─── Timeout Tests ────────────────────────────────────────────────────────────

#[test]
fn test_is_expired_false_before_timeout() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &2);
    assert!(!c.is_expired(&id));
}

#[test]
fn test_is_expired_true_after_timeout() {
    let t  = setup();
    let c  = client(&t.env, &t.contract);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &100_0000000_i128, &2);
    advance(&t.env, TIMEOUT_LEDGERS + 1);
    assert!(c.is_expired(&id));
}

// ─── Full Lifecycle ───────────────────────────────────────────────────────────

#[test]
fn test_full_2_of_3_lifecycle() {
    let t   = setup();
    let c   = client(&t.env, &t.contract);
    let tc  = soroban_sdk::token::Client::new(&t.env, &t.token);
    let amt = 1_000_0000000_i128;

    // Create proposal requiring 2 of 3 sigs.
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &amt, &2);

    // First sig — not executed yet.
    assert!(!c.approve_tip(&id, &t.signer1));
    assert_eq!(c.approvals_needed(&id), 1);

    // Second sig — executes and pays artist.
    let before = tc.balance(&t.artist);
    assert!(c.approve_tip(&id, &t.signer2));
    assert_eq!(tc.balance(&t.artist) - before, amt);
    assert_eq!(c.get_tip(&id).unwrap().status, TipStatus::Executed);
}

#[test]
fn test_full_timeout_and_refund_lifecycle() {
    let t   = setup();
    let c   = client(&t.env, &t.contract);
    let tc  = soroban_sdk::token::Client::new(&t.env, &t.token);
    let amt = 200_0000000_i128;

    let before = tc.balance(&t.tipper);
    let id = c.create_multisig_tip(&t.tipper, &t.artist, &amt, &3);

    // Only 1 of 3 sigs collected.
    c.approve_tip(&id, &t.signer1);

    // Timeout — anyone cancels and tipper is refunded.
    advance(&t.env, TIMEOUT_LEDGERS + 1);
    c.cancel_tip(&id, &t.signer2);
    assert_eq!(tc.balance(&t.tipper), before);
}