#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env};

fn setup_env(timestamp: u64) -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = timestamp;
    });
    env
}

#[test]
fn test_initialize() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    assert_eq!(client.get_total_badges(), 0);
}

#[test]
fn test_record_tip_and_stats() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);
    client.record_tip(&user, &500, &false);
    client.record_tip(&user, &300, &true);

    let stats = client.get_user_stats(&user);
    assert_eq!(stats.tip_count, 2);
    assert_eq!(stats.total_amount, 800);
    assert_eq!(stats.genre_tips, 1);
    assert_eq!(stats.first_tip_time, 1000);
}

#[test]
fn test_first_tip_badge() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);

    // Not eligible before any tip
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::FirstTip),
        false
    );

    // Record first tip
    client.record_tip(&user, &100, &false);

    // Now eligible
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::FirstTip),
        true
    );

    // Mint badge
    let badge_id = client.mint_badge(&user, &BadgeType::FirstTip);

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.len(), 1);
    assert_eq!(badges.get(0).unwrap(), badge_id);

    // Verify badge metadata
    let badge = client.get_badge(&badge_id).unwrap();
    assert_eq!(badge.owner, user);
    assert_eq!(badge.badge_type, BadgeType::FirstTip);
}

#[test]
fn test_ten_tips_badge() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);

    // Record 9 tips — not eligible yet
    for _ in 0..9 {
        client.record_tip(&user, &100, &false);
    }
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::TenTips),
        false
    );

    // Record 10th tip
    client.record_tip(&user, &100, &false);
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::TenTips),
        true
    );

    let badge_id = client.mint_badge(&user, &BadgeType::TenTips);
    let badge = client.get_badge(&badge_id).unwrap();
    assert_eq!(badge.badge_type, BadgeType::TenTips);
}

#[test]
fn test_whale_tipper_badge() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000); // Whale threshold: 10000

    let user = Address::generate(&env);

    // Below threshold
    client.record_tip(&user, &5000, &false);
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::WhaleTipper),
        false
    );

    // At threshold
    client.record_tip(&user, &5000, &false);
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::WhaleTipper),
        true
    );

    let badge_id = client.mint_badge(&user, &BadgeType::WhaleTipper);
    let badge = client.get_badge(&badge_id).unwrap();
    assert_eq!(badge.badge_type, BadgeType::WhaleTipper);
}

#[test]
fn test_early_supporter_badge() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000); // Early adopter cutoff: 5000

    let user = Address::generate(&env);

    // Tip within early period
    client.record_tip(&user, &100, &false);
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::EarlySupporter),
        true
    );

    let badge_id = client.mint_badge(&user, &BadgeType::EarlySupporter);
    let badge = client.get_badge(&badge_id).unwrap();
    assert_eq!(badge.badge_type, BadgeType::EarlySupporter);
}

#[test]
fn test_early_supporter_not_eligible_after_cutoff() {
    let env = setup_env(6000); // After the cutoff
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000); // Cutoff at 5000

    let user = Address::generate(&env);
    client.record_tip(&user, &100, &false);

    // First tip at timestamp=6000 > cutoff=5000, not eligible
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::EarlySupporter),
        false
    );
}

#[test]
fn test_genre_supporter_badge() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);

    // 4 genre tips — not eligible
    for _ in 0..4 {
        client.record_tip(&user, &100, &true);
    }
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::GenreSupporter),
        false
    );

    // 5th genre tip
    client.record_tip(&user, &100, &true);
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::GenreSupporter),
        true
    );

    let badge_id = client.mint_badge(&user, &BadgeType::GenreSupporter);
    let badge = client.get_badge(&badge_id).unwrap();
    assert_eq!(badge.badge_type, BadgeType::GenreSupporter);
}

#[test]
fn test_no_duplicate_minting() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);
    client.record_tip(&user, &100, &false);

    // Mint first tip badge
    client.mint_badge(&user, &BadgeType::FirstTip);

    // Attempt to mint again — should fail
    let result = client.try_mint_badge(&user, &BadgeType::FirstTip);
    assert_eq!(result, Err(Ok(Error::AlreadyMinted)));
}

#[test]
fn test_not_eligible_mint() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);

    // No tips recorded — try to mint FirstTip
    let result = client.try_mint_badge(&user, &BadgeType::FirstTip);
    assert_eq!(result, Err(Ok(Error::NotEligible)));
}

#[test]
fn test_multiple_badges_per_user() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);

    // Record 10 tips to qualify for FirstTip and TenTips
    for _ in 0..10 {
        client.record_tip(&user, &100, &false);
    }

    let badge1 = client.mint_badge(&user, &BadgeType::FirstTip);
    let badge2 = client.mint_badge(&user, &BadgeType::TenTips);

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.len(), 2);
    assert_eq!(badges.get(0).unwrap(), badge1);
    assert_eq!(badges.get(1).unwrap(), badge2);

    assert_eq!(client.get_total_badges(), 2);
}

#[test]
fn test_user_with_no_badges() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);
    let badges = client.get_user_badges(&user);
    assert_eq!(badges.len(), 0);
}
