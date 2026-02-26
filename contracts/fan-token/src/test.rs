#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events, Ledger},
    Address, Env, String,
};

// ── Helpers ─────────────────────────────────────────────────────────

fn setup() -> (Env, FanTokenContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, FanTokenContract);
    let client = FanTokenContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let fan = Address::generate(&env);

    (env, client, artist, fan)
}

fn str(env: &Env, s: &str) -> String {
    String::from_str(env, s)
}

// ── create_fan_token ────────────────────────────────────────────────

#[test]
fn test_create_fan_token_success() {
    let (env, client, artist, _) = setup();

    let token_id =
        client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &1_000);

    // Token should have been created; verify via metadata
    let _ = token_id;

    // Verify token metadata
    let token = client.get_fan_token(&artist);
    assert_eq!(token.artist, artist);
    assert_eq!(token.total_supply, 1_000);
    assert_eq!(token.circulating_supply, 1_000);

    // Artist should hold the initial supply
    let balance = client.get_balance(&artist, &artist);
    assert_eq!(balance, 1_000);
}

#[test]
fn test_create_fan_token_zero_supply() {
    let (env, client, artist, _) = setup();

    let token_id = client.create_fan_token(&artist, &str(&env, "ZeroCoin"), &str(&env, "ZRO"), &0);

    let token = client.get_fan_token(&artist);
    assert_eq!(token.total_supply, 0);
    assert_eq!(token.circulating_supply, 0);

    // No balance record should exist for 0 supply
    let balance = client.get_balance(&artist, &artist);
    assert_eq!(balance, 0);

    let _ = token_id;
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_create_fan_token_duplicate() {
    let (env, client, artist, _) = setup();

    client.create_fan_token(&artist, &str(&env, "Coin1"), &str(&env, "C1"), &100);

    // Second creation should fail
    client.create_fan_token(&artist, &str(&env, "Coin2"), &str(&env, "C2"), &200);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_create_fan_token_negative_supply() {
    let (env, client, artist, _) = setup();

    client.create_fan_token(&artist, &str(&env, "BadCoin"), &str(&env, "BAD"), &-100);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_create_fan_token_empty_name() {
    let (env, client, artist, _) = setup();

    client.create_fan_token(&artist, &str(&env, ""), &str(&env, "SYM"), &100);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_create_fan_token_empty_symbol() {
    let (env, client, artist, _) = setup();

    client.create_fan_token(&artist, &str(&env, "Name"), &str(&env, ""), &100);
}

// ── mint_for_tip ────────────────────────────────────────────────────

#[test]
fn test_mint_for_tip_success() {
    let (env, client, artist, fan) = setup();

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    // Tip of 50 → 500 fan tokens (10x ratio)
    let minted = client.mint_for_tip(&artist, &fan, &50);
    assert_eq!(minted, 500);

    let balance = client.get_balance(&artist, &fan);
    assert_eq!(balance, 500);

    // Total supply should be updated
    let token = client.get_fan_token(&artist);
    assert_eq!(token.total_supply, 500);
    assert_eq!(token.circulating_supply, 500);
}

#[test]
fn test_mint_for_tip_accumulates() {
    let (env, client, artist, fan) = setup();

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &1_000);

    client.mint_for_tip(&artist, &fan, &10); // +100
    client.mint_for_tip(&artist, &fan, &20); // +200

    let balance = client.get_balance(&artist, &fan);
    assert_eq!(balance, 300);

    let detail = client.get_fan_balance(&artist, &fan);
    assert_eq!(detail.earned_total, 300);

    let token = client.get_fan_token(&artist);
    assert_eq!(token.total_supply, 1_300); // 1000 initial + 300 minted
    assert_eq!(token.circulating_supply, 1_300);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_mint_for_tip_zero_amount() {
    let (env, client, artist, fan) = setup();

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &0);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_mint_for_tip_negative_amount() {
    let (env, client, artist, fan) = setup();

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &-10);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_mint_for_tip_no_token() {
    let (_, client, artist, fan) = setup();

    // No token created for artist
    client.mint_for_tip(&artist, &fan, &10);
}

// ── get_balance ─────────────────────────────────────────────────────

#[test]
fn test_get_balance_nonexistent() {
    let (_, client, artist, fan) = setup();

    // No token, no balance → returns 0
    let balance = client.get_balance(&artist, &fan);
    assert_eq!(balance, 0);
}

// ── transfer_fan_tokens ─────────────────────────────────────────────

#[test]
fn test_transfer_fan_tokens_success() {
    let (env, client, artist, fan) = setup();
    let fan2 = Address::generate(&env);

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &100); // fan gets 1000 tokens

    // Transfer 400 from fan to fan2
    client.transfer_fan_tokens(&fan, &fan2, &artist, &400);

    assert_eq!(client.get_balance(&artist, &fan), 600);
    assert_eq!(client.get_balance(&artist, &fan2), 400);
}

#[test]
fn test_transfer_preserves_earned_total() {
    let (env, client, artist, fan) = setup();
    let fan2 = Address::generate(&env);

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &100); // 1000 tokens

    client.transfer_fan_tokens(&fan, &fan2, &artist, &300);

    // Sender's earned_total should remain unchanged
    let detail = client.get_fan_balance(&artist, &fan);
    assert_eq!(detail.earned_total, 1_000);
    assert_eq!(detail.balance, 700);

    // Receiver's earned_total is 0 (not earned through tipping)
    let detail2 = client.get_fan_balance(&artist, &fan2);
    assert_eq!(detail2.earned_total, 0);
    assert_eq!(detail2.balance, 300);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_transfer_insufficient_balance() {
    let (env, client, artist, fan) = setup();
    let fan2 = Address::generate(&env);

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &10); // 100 tokens

    client.transfer_fan_tokens(&fan, &fan2, &artist, &200);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_transfer_to_self() {
    let (env, client, artist, fan) = setup();

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &10);

    client.transfer_fan_tokens(&fan, &fan, &artist, &50);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_transfer_zero_amount() {
    let (env, client, artist, fan) = setup();
    let fan2 = Address::generate(&env);

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &10);

    client.transfer_fan_tokens(&fan, &fan2, &artist, &0);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_transfer_no_token_exists() {
    let (env, client, artist, fan) = setup();
    let fan2 = Address::generate(&env);

    client.transfer_fan_tokens(&fan, &fan2, &artist, &10);
}

// ── Supply tracking ─────────────────────────────────────────────────

#[test]
fn test_total_supply_tracked_across_mints() {
    let (env, client, artist, fan) = setup();
    let fan2 = Address::generate(&env);

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &500);

    client.mint_for_tip(&artist, &fan, &10); // +100
    client.mint_for_tip(&artist, &fan2, &25); // +250

    let token = client.get_fan_token(&artist);
    assert_eq!(token.total_supply, 850);
    assert_eq!(token.circulating_supply, 850);
}

// ── Events ──────────────────────────────────────────────────────────

#[test]
fn test_create_emits_event() {
    let (env, client, artist, _) = setup();

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &100);

    let events = env.events().all();
    // At least one event should have been published
    assert!(!events.is_empty());
}

#[test]
fn test_mint_emits_event() {
    let (env, client, artist, fan) = setup();

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &10);

    let events = env.events().all();
    assert!(events.len() >= 2); // create + mint
}

#[test]
fn test_transfer_emits_event() {
    let (env, client, artist, fan) = setup();
    let fan2 = Address::generate(&env);

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &10);

    client.transfer_fan_tokens(&fan, &fan2, &artist, &50);

    let events = env.events().all();
    assert!(events.len() >= 3); // create + mint + transfer
}

// ── Multiple artists ────────────────────────────────────────────────

#[test]
fn test_multiple_artists_independent() {
    let (env, client, artist, fan) = setup();
    let artist2 = Address::generate(&env);

    client.create_fan_token(&artist, &str(&env, "Coin1"), &str(&env, "C1"), &100);

    client.create_fan_token(&artist2, &str(&env, "Coin2"), &str(&env, "C2"), &200);

    client.mint_for_tip(&artist, &fan, &10); // 100 tokens of artist1
    client.mint_for_tip(&artist2, &fan, &5); // 50 tokens of artist2

    assert_eq!(client.get_balance(&artist, &fan), 100);
    assert_eq!(client.get_balance(&artist2, &fan), 50);

    // Supplies independent
    assert_eq!(client.get_fan_token(&artist).total_supply, 200);
    assert_eq!(client.get_fan_token(&artist2).total_supply, 250);
}

// ── Timestamp tracking ─────────────────────────────────────────────

#[test]
fn test_last_updated_tracks_time() {
    let (env, client, artist, fan) = setup();

    env.ledger().with_mut(|li| li.timestamp = 1000);

    client.create_fan_token(&artist, &str(&env, "ArtistCoin"), &str(&env, "ART"), &0);

    client.mint_for_tip(&artist, &fan, &10);

    let detail = client.get_fan_balance(&artist, &fan);
    assert_eq!(detail.last_updated, 1000);

    env.ledger().with_mut(|li| li.timestamp = 2000);

    client.mint_for_tip(&artist, &fan, &5);

    let detail = client.get_fan_balance(&artist, &fan);
    assert_eq!(detail.last_updated, 2000);
}
