#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env};

#[test]
fn test_all() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RewardToken);
    let client = RewardTokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    // Initialize
    env.mock_all_auths();
    client.initialize(&admin, &1000);

    assert_eq!(client.balance(&admin), 1000);
    assert_eq!(client.balance(&user1), 0);

    // Transfer by admin
    client.transfer(&admin, &user1, &100);
    assert_eq!(client.balance(&admin), 900);
    assert_eq!(client.balance(&user1), 100);

    // Transfer by user
    client.transfer(&user1, &user2, &50);
    assert_eq!(client.balance(&user1), 50);
    assert_eq!(client.balance(&user2), 50);

    // Mint reward
    client.mint_reward(&user1, &200);
    assert_eq!(client.balance(&user1), 250);

    // Burn
    client.burn(&user1, &50);
    assert_eq!(client.balance(&user1), 200);

    // Approve and TransferFrom
    client.approve(&user1, &user2, &100);
    assert_eq!(client.allowance(&user1, &user2), 100);

    client.transfer_from(&user2, &user1, &admin, &50);
    assert_eq!(client.balance(&user1), 150);
    assert_eq!(client.balance(&admin), 950);
    assert_eq!(client.allowance(&user1, &user2), 50);
}
