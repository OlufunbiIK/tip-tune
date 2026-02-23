#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

#[test]
fn test_set_splits() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track_001");
    let collab1 = Address::generate(&env);
    let collab2 = Address::generate(&env);

    let mut collabs = Vec::new(&env);
    collabs.push_back(Collaborator {
        address: collab1.clone(),
        percentage: 6000, // 60%
    });
    collabs.push_back(Collaborator {
        address: collab2.clone(),
        percentage: 4000, // 40%
    });

    client.set_splits(&track_id, &collabs);

    let retrieved = client.get_splits(&track_id);
    assert_eq!(retrieved.len(), 2);
    assert_eq!(retrieved.get(0).unwrap().percentage, 6000);
    assert_eq!(retrieved.get(1).unwrap().percentage, 4000);
}

#[test]
fn test_receive_and_distribute() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track_dist");
    let collab1 = Address::generate(&env);
    let collab2 = Address::generate(&env);

    let mut collabs = Vec::new(&env);
    collabs.push_back(Collaborator {
        address: collab1.clone(),
        percentage: 7000, // 70%
    });
    collabs.push_back(Collaborator {
        address: collab2.clone(),
        percentage: 3000, // 30%
    });

    client.set_splits(&track_id, &collabs);

    let result = client.receive_and_distribute(&track_id, &1000, &Asset::Native);

    assert_eq!(result.len(), 2);
    assert_eq!(result.get(0).unwrap(), (collab1.clone(), 700));
    assert_eq!(result.get(1).unwrap(), (collab2.clone(), 300));
}

#[test]
fn test_rounding_no_loss() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track_round");
    let collab1 = Address::generate(&env);
    let collab2 = Address::generate(&env);
    let collab3 = Address::generate(&env);

    let mut collabs = Vec::new(&env);
    collabs.push_back(Collaborator {
        address: collab1.clone(),
        percentage: 3333, // 33.33%
    });
    collabs.push_back(Collaborator {
        address: collab2.clone(),
        percentage: 3333, // 33.33%
    });
    collabs.push_back(Collaborator {
        address: collab3.clone(),
        percentage: 3334, // 33.34%
    });

    client.set_splits(&track_id, &collabs);

    let result = client.receive_and_distribute(
        &track_id,
        &100, // Small amount to trigger rounding
        &Asset::Native,
    );

    // Verify no funds are lost: sum of distributions must equal original amount
    let mut total: i128 = 0;
    for dist in result.iter() {
        let (_, amount) = dist;
        total += amount;
    }
    assert_eq!(total, 100);
}

#[test]
fn test_multiple_assets() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track_multi_asset");
    let collab1 = Address::generate(&env);

    let mut collabs = Vec::new(&env);
    collabs.push_back(Collaborator {
        address: collab1.clone(),
        percentage: 10000, // 100%
    });

    client.set_splits(&track_id, &collabs);

    // Test with Native asset
    let result_native = client.receive_and_distribute(&track_id, &500, &Asset::Native);
    assert_eq!(result_native.get(0).unwrap(), (collab1.clone(), 500));

    // Test with Token asset
    let token_addr = Address::generate(&env);
    let result_token = client.receive_and_distribute(&track_id, &750, &Asset::Token(token_addr));
    assert_eq!(result_token.get(0).unwrap(), (collab1.clone(), 750));
}

#[test]
fn test_batch_distribute() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track1 = String::from_str(&env, "track_batch1");
    let track2 = String::from_str(&env, "track_batch2");
    let collab1 = Address::generate(&env);

    let mut collabs = Vec::new(&env);
    collabs.push_back(Collaborator {
        address: collab1.clone(),
        percentage: 10000,
    });

    client.set_splits(&track1, &collabs);
    client.set_splits(&track2, &collabs);

    let mut batch = Vec::new(&env);
    batch.push_back((track1, 1000_i128, Asset::Native));
    batch.push_back((track2, 2000_i128, Asset::Native));

    client.batch_distribute(&batch);

    assert_eq!(client.get_distribution_count(), 2);
}

#[test]
fn test_invalid_percentage() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track_invalid");
    let collab1 = Address::generate(&env);

    let mut collabs = Vec::new(&env);
    collabs.push_back(Collaborator {
        address: collab1.clone(),
        percentage: 0, // Invalid: 0%
    });

    let result = client.try_set_splits(&track_id, &collabs);
    assert_eq!(result, Err(Ok(Error::InvalidPercentage)));
}

#[test]
fn test_total_exceeds_100() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track_over100");
    let collab1 = Address::generate(&env);
    let collab2 = Address::generate(&env);

    let mut collabs = Vec::new(&env);
    collabs.push_back(Collaborator {
        address: collab1.clone(),
        percentage: 6000,
    });
    collabs.push_back(Collaborator {
        address: collab2.clone(),
        percentage: 5000,
    });

    let result = client.try_set_splits(&track_id, &collabs);
    assert_eq!(result, Err(Ok(Error::TotalExceeds100)));
}

#[test]
fn test_track_not_found() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "nonexistent");
    let result = client.try_receive_and_distribute(&track_id, &1000, &Asset::Native);
    assert_eq!(result, Err(Ok(Error::TrackNotFound)));
}

#[test]
fn test_invalid_amount() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track_inv_amt");
    let collab1 = Address::generate(&env);

    let mut collabs = Vec::new(&env);
    collabs.push_back(Collaborator {
        address: collab1.clone(),
        percentage: 10000,
    });

    client.set_splits(&track_id, &collabs);

    let result = client.try_receive_and_distribute(&track_id, &0, &Asset::Native);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    let result = client.try_receive_and_distribute(&track_id, &-100, &Asset::Native);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_no_collaborators() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AutoRoyaltyDistribution);
    let client = AutoRoyaltyDistributionClient::new(&env, &contract_id);

    let track_id = String::from_str(&env, "track_empty");
    let collabs: Vec<Collaborator> = Vec::new(&env);

    let result = client.try_set_splits(&track_id, &collabs);
    assert_eq!(result, Err(Ok(Error::NoCollaborators)));
}
