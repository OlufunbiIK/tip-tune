#![cfg(test)]
use soroban_sdk::{Env, Address};
use crate::LotteryContract;

#[test]
fn test_lottery_flow() {
    let env = Env::default();
    let artist = Address::random(&env);
    let tipper = Address::random(&env);

    // Create lottery
    LotteryContract::create_lottery(env.clone(), "pool1".to_string(), artist.clone(), 5, env.ledger().timestamp() + 10).unwrap();

    // Enter lottery
    let tickets = LotteryContract::enter_lottery(env.clone(), "pool1".to_string(), tipper.clone(), 100).unwrap();
    assert_eq!(tickets, 10);

    // Try draw before time
    let draw_before = LotteryContract::draw_winner(env.clone(), "pool1".to_string());
    assert!(draw_before.is_err());

    // Fast-forward time
    env.ledger().set_timestamp(env.ledger().timestamp() + 20);

    // Draw winner
    let winner = LotteryContract::draw_winner(env.clone(), "pool1".to_string()).unwrap();
    assert_eq!(winner, tipper);

    // Claim prize
    let prize = LotteryContract::claim_prize(env.clone(), "pool1".to_string(), tipper.clone()).unwrap();
    assert!(prize > 0);
}