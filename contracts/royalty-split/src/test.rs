#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

#[test]
fn test_set_and_distribute() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RoyaltySplit);
    let client = RoyaltySplitClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track1");
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let mut collaborators = Vec::new(&env);
    collaborators.push_back((user1.clone(), 60));
    collaborators.push_back((user2.clone(), 40));

    // Set split
    client.set_royalty_split(&track_id, &collaborators);

    // Distribute
    let amount = 1000;
    let distributions = client.distribute_royalties(&track_id, &amount);

    assert_eq!(distributions.len(), 2);
    assert_eq!(distributions.get(0).unwrap(), (user1.clone(), 600));
    assert_eq!(distributions.get(1).unwrap(), (user2.clone(), 400));
}

#[test]
fn test_total_not_100() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RoyaltySplit);
    let client = RoyaltySplitClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track2");
    let user1 = Address::generate(&env);

    let mut collaborators = Vec::new(&env);
    collaborators.push_back((user1.clone(), 90));

    // Set split should fail with TotalNot100
    let res = client.try_set_royalty_split(&track_id, &collaborators);
    assert_eq!(res, Err(Ok(Error::TotalNot100)));
}

#[test]
fn test_track_not_found() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RoyaltySplit);
    let client = RoyaltySplitClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track3");

    let res = client.try_distribute_royalties(&track_id, &1000);
    assert_eq!(res, Err(Ok(Error::TrackNotFound)));
}
