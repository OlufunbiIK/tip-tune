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

fn setup_client(env: &Env) -> (Address, TipNftBadgeContractClient) {
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.initialize(&admin, &10000, &5000);
    (admin, client)
}

// ── Original tests (unchanged logic) ────────────────────────────────

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
fn test_badge_receipt_creation_and_query() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);
    client.record_tip(&user, &100, &false);
    let badge_id = client.mint_badge(&user, &BadgeType::FirstTip);

    let receipt = client.get_badge_receipt(&badge_id).unwrap();
    assert_eq!(receipt.badge_id, badge_id);
    assert_eq!(receipt.owner, user);
    assert_eq!(receipt.badge_type, BadgeType::FirstTip);
    assert_eq!(receipt.minted_at, 1000);
    assert_eq!(receipt.name, String::from_str(&env, "First Tip"));
}

#[test]
fn test_user_badge_receipts_are_chronological() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &10000, &5000);

    let user = Address::generate(&env);
    for _ in 0..10 {
        client.record_tip(&user, &100, &false);
    }

    let badge1 = client.mint_badge(&user, &BadgeType::FirstTip);
    env.ledger().with_mut(|li| {
        li.timestamp = 2000;
    });
    let badge2 = client.mint_badge(&user, &BadgeType::TenTips);

    let receipts = client.get_user_badge_receipts(&user);
    assert_eq!(receipts.len(), 2);
    assert_eq!(receipts.get(0).unwrap().badge_id, badge1);
    assert_eq!(receipts.get(1).unwrap().badge_id, badge2);
    assert!(receipts.get(0).unwrap().minted_at < receipts.get(1).unwrap().minted_at);
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

// ── New catalog tests ────────────────────────────────────────────────

#[test]
fn test_get_default_catalog_entry() {
    let env = setup_env(1000);
    let (_admin, client) = setup_client(&env);

    // FirstTip defaults
    let entry = client.get_badge_catalog_entry(&BadgeType::FirstTip);
    assert_eq!(entry.badge_type, BadgeType::FirstTip);
    assert_eq!(entry.tip_count_threshold, 1);
    assert_eq!(entry.name, String::from_str(&env, "First Tip"));

    // TenTips defaults
    let entry = client.get_badge_catalog_entry(&BadgeType::TenTips);
    assert_eq!(entry.tip_count_threshold, 10);

    // HundredTips defaults
    let entry = client.get_badge_catalog_entry(&BadgeType::HundredTips);
    assert_eq!(entry.tip_count_threshold, 100);

    // GenreSupporter defaults
    let entry = client.get_badge_catalog_entry(&BadgeType::GenreSupporter);
    assert_eq!(entry.genre_tips_threshold, 5);
}

#[test]
fn test_init_seeds_whale_and_early_catalog() {
    let env = setup_env(1000);
    let contract_id = env.register_contract(None, TipNftBadgeContract);
    let client = TipNftBadgeContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &7500, &3000);

    // WhaleTipper catalog entry should reflect init param
    let whale_entry = client.get_badge_catalog_entry(&BadgeType::WhaleTipper);
    assert_eq!(whale_entry.total_amount_threshold, 7500);

    // EarlySupporter catalog entry should reflect init param
    let early_entry = client.get_badge_catalog_entry(&BadgeType::EarlySupporter);
    assert_eq!(early_entry.early_cutoff, 3000);
}

#[test]
fn test_update_badge_threshold_tip_count() {
    let env = setup_env(1000);
    let (_admin, client) = setup_client(&env);
    let user = Address::generate(&env);

    // Record 5 tips — default TenTips threshold is 10
    for _ in 0..5 {
        client.record_tip(&user, &100, &false);
    }
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::TenTips),
        false
    );

    // Admin lowers TenTips threshold to 5
    client.set_badge_threshold(&BadgeType::TenTips, &5, &0, &0, &0);

    // Now the user is eligible without recording more tips
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::TenTips),
        true
    );

    // Verify catalog entry was updated
    let entry = client.get_badge_catalog_entry(&BadgeType::TenTips);
    assert_eq!(entry.tip_count_threshold, 5);
}

#[test]
fn test_update_whale_threshold_via_catalog() {
    let env = setup_env(1000);
    let (_admin, client) = setup_client(&env);
    let user = Address::generate(&env);

    // User tips 6000 total — below default 10000
    client.record_tip(&user, &6000, &false);
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::WhaleTipper),
        false
    );

    // Admin lowers whale threshold to 5000
    client.set_badge_threshold(&BadgeType::WhaleTipper, &0, &5000, &0, &0);

    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::WhaleTipper),
        true
    );
}

#[test]
fn test_update_genre_threshold_via_catalog() {
    let env = setup_env(1000);
    let (_admin, client) = setup_client(&env);
    let user = Address::generate(&env);

    // 3 genre tips — default threshold is 5
    for _ in 0..3 {
        client.record_tip(&user, &100, &true);
    }
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::GenreSupporter),
        false
    );

    // Admin lowers genre threshold to 3
    client.set_badge_threshold(&BadgeType::GenreSupporter, &0, &0, &3, &0);

    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::GenreSupporter),
        true
    );
}

#[test]
fn test_update_early_cutoff_via_catalog() {
    let env = setup_env(6000);
    let (_admin, client) = setup_client(&env);
    let user = Address::generate(&env);

    // First tip at 6000 — default cutoff was 5000
    client.record_tip(&user, &100, &false);
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::EarlySupporter),
        false
    );

    // Admin extends cutoff to 7000
    client.set_badge_threshold(&BadgeType::EarlySupporter, &0, &0, &0, &7000);

    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::EarlySupporter),
        true
    );
}

#[test]
fn test_update_badge_metadata() {
    let env = setup_env(1000);
    let (_admin, client) = setup_client(&env);
    let user = Address::generate(&env);

    // Update metadata for FirstTip
    let new_name = String::from_str(&env, "Pioneer Tipper");
    let new_desc = String::from_str(&env, "The very first tip sent on the platform.");
    client.set_badge_metadata(&BadgeType::FirstTip, &new_name, &new_desc);

    // Verify catalog entry
    let entry = client.get_badge_catalog_entry(&BadgeType::FirstTip);
    assert_eq!(entry.name, new_name);
    assert_eq!(entry.description, new_desc);

    // Mint a badge and confirm it uses the updated metadata
    client.record_tip(&user, &100, &false);
    let badge_id = client.mint_badge(&user, &BadgeType::FirstTip);
    let badge = client.get_badge(&badge_id).unwrap();
    assert_eq!(badge.name, new_name);
    assert_eq!(badge.description, new_desc);
}

#[test]
fn test_eligibility_recalc_after_threshold_raise() {
    let env = setup_env(1000);
    let (_admin, client) = setup_client(&env);
    let user = Address::generate(&env);

    // Record 1 tip — eligible for FirstTip (threshold 1)
    client.record_tip(&user, &100, &false);
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::FirstTip),
        true
    );

    // Admin raises FirstTip threshold to 2
    client.set_badge_threshold(&BadgeType::FirstTip, &2, &0, &0, &0);

    // User is no longer eligible (only 1 tip, needs 2)
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::FirstTip),
        false
    );

    // Record another tip
    client.record_tip(&user, &100, &false);

    // Now eligible again
    assert_eq!(
        client.check_badge_eligibility(&user, &BadgeType::FirstTip),
        true
    );
}

#[test]
fn test_threshold_update_does_not_affect_other_badges() {
    let env = setup_env(1000);
    let (_admin, client) = setup_client(&env);

    // Lower TenTips threshold
    client.set_badge_threshold(&BadgeType::TenTips, &3, &0, &0, &0);

    // FirstTip catalog should still have default threshold
    let first_entry = client.get_badge_catalog_entry(&BadgeType::FirstTip);
    assert_eq!(first_entry.tip_count_threshold, 1);

    // HundredTips catalog should still have default threshold
    let hundred_entry = client.get_badge_catalog_entry(&BadgeType::HundredTips);
    assert_eq!(hundred_entry.tip_count_threshold, 100);
}

#[test]
fn test_metadata_update_preserves_thresholds() {
    let env = setup_env(1000);
    let (_admin, client) = setup_client(&env);

    // Update WhaleTipper threshold first
    client.set_badge_threshold(&BadgeType::WhaleTipper, &0, &5000, &0, &0);

    // Then update its metadata
    let new_name = String::from_str(&env, "Mega Whale");
    let new_desc = String::from_str(&env, "For the biggest tippers.");
    client.set_badge_metadata(&BadgeType::WhaleTipper, &new_name, &new_desc);

    // Threshold should still be 5000
    let entry = client.get_badge_catalog_entry(&BadgeType::WhaleTipper);
    assert_eq!(entry.total_amount_threshold, 5000);
    assert_eq!(entry.name, new_name);
    assert_eq!(entry.description, new_desc);
}
