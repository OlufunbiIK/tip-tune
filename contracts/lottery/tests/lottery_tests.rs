#![cfg(test)]
use soroban_sdk::{Env, Address, String, testutils::{Address as _, Ledger as _}};
use lottery::{Lottery, LotteryClient, LotteryStatus};

#[test]
fn test_lottery_full_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let artist = Address::generate(&env);
    let tipper1 = Address::generate(&env);
    let tipper2 = Address::generate(&env);

    let client = LotteryClient::new(&env, &env.register_contract(None, Lottery));

    let pool_id = String::from_str(&env, "pool1");

    // Create lottery
    client.create_lottery(&pool_id, &artist, &5, &(env.ledger().timestamp() + 100));

    // Enter lottery
    client.enter_lottery(&pool_id, &tipper1, &100); // 10 tickets
    client.enter_lottery(&pool_id, &tipper2, &200); // 20 tickets

    // Fast-forward time
    let new_time = env.ledger().timestamp() + 200;
    env.ledger().with_mut(|l| l.timestamp = new_time);

    // Draw winner
    let winner = client.draw_winner(&pool_id);
    assert!(winner == tipper1 || winner == tipper2);

    // Claim prize
    let prize = client.claim_prize(&pool_id, &winner);
    assert_eq!(prize, 15); // (100 * 0.05) + (200 * 0.05) = 5 + 10 = 15

    // Try to claim again
    let result = client.try_claim_prize(&pool_id, &winner);
    assert!(result.is_err());
}

#[test]
fn test_lottery_cancellation_and_refund() {
    let env = Env::default();
    env.mock_all_auths();

    let artist = Address::generate(&env);
    let tipper = Address::generate(&env);

    let client = LotteryClient::new(&env, &env.register_contract(None, Lottery));
    let pool_id = String::from_str(&env, "pool2");

    client.create_lottery(&pool_id, &artist, &10, &(env.ledger().timestamp() + 100));
    client.enter_lottery(&pool_id, &tipper, &100);

    // Cancel lottery
    client.cancel_lottery(&pool_id);

    // Try to enter cancelled lottery
    let enter_result = client.try_enter_lottery(&pool_id, &tipper, &100);
    assert!(enter_result.is_err());

    // Claim refund
    let refund = client.claim_refund(&pool_id, &tipper);
    assert_eq!(refund, 10); // 100 * 0.10 = 10
}

#[test]
fn test_claim_window_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let artist = Address::generate(&env);
    let tipper = Address::generate(&env);

    let client = LotteryClient::new(&env, &env.register_contract(None, Lottery));
    let pool_id = String::from_str(&env, "pool3");

    client.create_lottery(&pool_id, &artist, &10, &(env.ledger().timestamp() + 100));
    client.enter_lottery(&pool_id, &tipper, &100);

    let draw_time = env.ledger().timestamp() + 200;
    env.ledger().with_mut(|l| l.timestamp = draw_time);
    let winner = client.draw_winner(&pool_id);

    // Fast-forward past claim window (7 days + 1 second)
    let expiry_time = env.ledger().timestamp() + 604801;
    env.ledger().with_mut(|l| l.timestamp = expiry_time);

    let result = client.try_claim_prize(&pool_id, &winner);
    assert!(result.is_err());
}