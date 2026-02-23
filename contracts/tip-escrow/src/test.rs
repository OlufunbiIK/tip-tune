#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env, Vec};

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
fn test_send_tip_without_splits() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TipEscrowContract);
    let client = TipEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let artist = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&sender, &1000);

    let tip_id = client.send_tip(&sender, &artist, &token.address, &100);

    assert_eq!(token.balance(&artist), 100);
    assert_eq!(token.balance(&sender), 900);
    let _ = tip_id; // Verify tip_id is returned
}

#[test]
fn test_send_tip_with_splits() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TipEscrowContract);
    let client = TipEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let artist = Address::generate(&env);
    let collaborator = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&sender, &1000);

    // Set 20% split to collaborator
    let mut splits = Vec::new(&env);
    splits.push_back(RoyaltySplit {
        recipient: collaborator.clone(),
        percentage: 2000, // 20%
    });
    client.set_royalty_splits(&artist, &splits);

    client.send_tip(&sender, &artist, &token.address, &100);

    assert_eq!(token.balance(&collaborator), 20);
    assert_eq!(token.balance(&artist), 80);
    assert_eq!(token.balance(&sender), 900);
}

#[test]
fn test_get_royalty_splits() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TipEscrowContract);
    let client = TipEscrowContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let collaborator = Address::generate(&env);

    let mut splits = Vec::new(&env);
    splits.push_back(RoyaltySplit {
        recipient: collaborator.clone(),
        percentage: 3000,
    });

    client.set_royalty_splits(&artist, &splits);

    let retrieved = client.get_royalty_splits(&artist).unwrap();
    assert_eq!(retrieved.len(), 1);
    assert_eq!(retrieved.get(0).unwrap().percentage, 3000);
}

#[test]
#[should_panic(expected = "Total splits exceed 100%")]
fn test_invalid_splits_total() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TipEscrowContract);
    let client = TipEscrowContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let collab1 = Address::generate(&env);
    let collab2 = Address::generate(&env);

    let mut splits = Vec::new(&env);
    splits.push_back(RoyaltySplit {
        recipient: collab1,
        percentage: 6000,
    });
    splits.push_back(RoyaltySplit {
        recipient: collab2,
        percentage: 5000,
    });

    client.set_royalty_splits(&artist, &splits);
}

#[test]
fn test_create_and_get_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TipEscrowContract);
    let client = TipEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let tipper = Address::generate(&env);
    let artist = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&tipper, &1000);

    let asset = types::Asset::Token(token.address.clone());

    let amount = 200;
    let escrow_id = client.create_escrow(&tipper, &artist, &amount, &asset);

    assert_eq!(token.balance(&tipper), 800);
    assert_eq!(token.balance(&contract_id), 200);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.tipper, tipper);
    assert_eq!(escrow.artist, artist);
    assert_eq!(escrow.amount, amount);
}
