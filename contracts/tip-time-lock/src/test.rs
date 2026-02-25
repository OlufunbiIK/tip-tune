#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, token, Address, Env};

fn create_token_contract<'a>(
    env: &Env,
    admin: &Address,
) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let contract_address = env.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(env, &contract_address.address()),
        token::StellarAssetClient::new(env, &contract_address.address()),
    )
}

#[test]
fn test_tip_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TimeLockContract);
    let client = TimeLockContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let tipper = Address::generate(&env);
    let artist = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&tipper, &1000);

    let current_time = 10000;
    env.ledger().set_timestamp(current_time);

    let unlock_time = current_time + 1000;
    let amount = 100;
    let message = String::from_str(&env, "Happy Birthday!");

    let lock_id = client.create_time_lock_tip(&tipper, &artist, &amount, &token.address, &unlock_time, &message);

    // Check balance
    assert_eq!(token.balance(&tipper), 900);
    assert_eq!(token.balance(&contract_id), 100);

    // Try to claim before unlock
    let result = client.try_claim_tip(&lock_id, &artist);
    assert!(result.is_err());

    // Advance time to unlock
    env.ledger().set_timestamp(unlock_time);

    // Claim
    client.claim_tip(&lock_id, &artist);

    // Check balance
    assert_eq!(token.balance(&artist), 100);
    assert_eq!(token.balance(&contract_id), 0);

    // Check pending tips
    let pending = client.get_pending_tips(&artist);
    assert_eq!(pending.len(), 0);
}

#[test]
fn test_refund_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TimeLockContract);
    let client = TimeLockContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let tipper = Address::generate(&env);
    let artist = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&tipper, &1000);

    let current_time = 10000;
    env.ledger().set_timestamp(current_time);

    let unlock_time = current_time + 1000;
    let amount = 100;
    let message = String::from_str(&env, "Testing refund");

    let lock_id = client.create_time_lock_tip(&tipper, &artist, &amount, &token.address, &unlock_time, &message);

    // Try to refund before 30 days
    env.ledger().set_timestamp(unlock_time + 100);
    let result = client.try_refund_tip(&lock_id, &tipper);
    assert!(result.is_err());

    // Advance time to 30 days after unlock
    let thirty_days = 30 * 24 * 60 * 60;
    env.ledger().set_timestamp(unlock_time + thirty_days);

    // Refund
    client.refund_tip(&lock_id, &tipper);

    // Check balances
    assert_eq!(token.balance(&tipper), 1000);
    assert_eq!(token.balance(&contract_id), 0);
}

#[test]
fn test_get_pending_tips() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TimeLockContract);
    let client = TimeLockContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let tipper = Address::generate(&env);
    let artist = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&tipper, &1000);

    let current_time = 10000;
    env.ledger().set_timestamp(current_time);

    client.create_time_lock_tip(&tipper, &artist, &100, &token.address, &(current_time + 1000), &String::from_str(&env, "Tip 1"));
    client.create_time_lock_tip(&tipper, &artist, &200, &token.address, &(current_time + 2000), &String::from_str(&env, "Tip 2"));

    let pending = client.get_pending_tips(&artist);
    assert_eq!(pending.len(), 2);
    assert_eq!(pending.get(0).unwrap().amount, 100);
    assert_eq!(pending.get(1).unwrap().amount, 200);
}
