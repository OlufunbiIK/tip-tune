#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    assert_eq!(client.get_tip_count(), 0);
}

#[test]
fn test_verify_tip() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let tx_hash = String::from_str(&env, "tx_abc123");
    let result = client.verify_tip(&tx_hash, &500);

    assert_eq!(result, true);
    assert_eq!(client.is_verified(&tx_hash), true);
}

#[test]
fn test_prevents_double_spending() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let tx_hash = String::from_str(&env, "tx_double");

    // First verification succeeds
    let result = client.verify_tip(&tx_hash, &100);
    assert_eq!(result, true);

    // Second verification should fail (double-spending)
    let result = client.try_verify_tip(&tx_hash, &100);
    assert_eq!(result, Err(Ok(Error::AlreadyVerified)));
}

#[test]
fn test_record_verified_tip() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let tipper = Address::generate(&env);
    let artist = Address::generate(&env);
    let tip_id = String::from_str(&env, "tip_001");

    client.record_verified_tip(&tip_id, &tipper, &artist, &250);

    let tip = client.get_tip(&tip_id);
    assert_eq!(tip.tipper, tipper);
    assert_eq!(tip.artist, artist);
    assert_eq!(tip.amount, 250);
    assert_eq!(tip.verified, true);
    assert_eq!(client.get_tip_count(), 1);
    assert_eq!(client.get_user_tip_count(&tipper), 1);
}

#[test]
fn test_records_immutable() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let tipper = Address::generate(&env);
    let artist = Address::generate(&env);
    let tip_id = String::from_str(&env, "tip_immutable");

    // Record once
    client.record_verified_tip(&tip_id, &tipper, &artist, &100);

    // Attempt to record again with same tip_id should fail (immutability)
    let result = client.try_record_verified_tip(&tip_id, &tipper, &artist, &200);
    assert_eq!(result, Err(Ok(Error::DuplicateTipId)));

    // Verify original record is unchanged
    let tip = client.get_tip(&tip_id);
    assert_eq!(tip.amount, 100);
}

#[test]
fn test_invalid_amount_verify() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let tx_hash = String::from_str(&env, "tx_invalid");

    let result = client.try_verify_tip(&tx_hash, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    let result = client.try_verify_tip(&tx_hash, &-50);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_invalid_amount_record() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let tipper = Address::generate(&env);
    let artist = Address::generate(&env);
    let tip_id = String::from_str(&env, "tip_invalid");

    let result = client.try_record_verified_tip(&tip_id, &tipper, &artist, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_tip_not_found() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let tip_id = String::from_str(&env, "nonexistent");
    let result = client.try_get_tip(&tip_id);
    assert_eq!(result, Err(Ok(Error::TipNotFound)));
}

#[test]
fn test_multiple_tips_counting() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let tipper = Address::generate(&env);
    let artist1 = Address::generate(&env);
    let artist2 = Address::generate(&env);

    let tip1 = String::from_str(&env, "tip_a");
    let tip2 = String::from_str(&env, "tip_b");
    let tip3 = String::from_str(&env, "tip_c");

    client.record_verified_tip(&tip1, &tipper, &artist1, &100);
    client.record_verified_tip(&tip2, &tipper, &artist2, &200);
    client.record_verified_tip(&tip3, &tipper, &artist1, &300);

    assert_eq!(client.get_tip_count(), 3);
    assert_eq!(client.get_user_tip_count(&tipper), 3);
}

#[test]
fn test_unverified_tx_returns_false() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TipVerificationContract);
    let client = TipVerificationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let unknown_tx = String::from_str(&env, "tx_unknown");
    assert_eq!(client.is_verified(&unknown_tx), false);
}
