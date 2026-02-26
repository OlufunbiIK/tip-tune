#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, String};

fn setup_env_with_time(timestamp: u64) -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = timestamp;
    });
    env
}

#[test]
fn test_create_campaign() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &5000, &2000);

    let campaign = client.get_campaign(&campaign_id);
    assert_eq!(campaign.artist, artist);
    assert_eq!(campaign.goal_amount, 5000);
    assert_eq!(campaign.deadline, 2000);
    assert_eq!(campaign.current_amount, 0);
    assert_eq!(campaign.status, CampaignStatus::Active);
    assert_eq!(campaign.contributions.len(), 0);
    assert_eq!(client.get_campaign_count(), 1);
}

#[test]
fn test_contribute() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &5000, &2000);

    client.contribute(&campaign_id, &contributor, &1500);

    let campaign = client.get_campaign(&campaign_id);
    assert_eq!(campaign.current_amount, 1500);
    assert_eq!(campaign.contributions.len(), 1);
    assert_eq!(
        campaign.contributions.get(0).unwrap().contributor,
        contributor
    );
    assert_eq!(campaign.contributions.get(0).unwrap().amount, 1500);
}

#[test]
fn test_multiple_contributions() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor1 = Address::generate(&env);
    let contributor2 = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &5000, &2000);

    client.contribute(&campaign_id, &contributor1, &2000);
    client.contribute(&campaign_id, &contributor2, &1500);
    client.contribute(&campaign_id, &contributor1, &500);

    let campaign = client.get_campaign(&campaign_id);
    assert_eq!(campaign.current_amount, 4000);
    assert_eq!(campaign.contributions.len(), 3);
}

#[test]
fn test_finalize_goal_met() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &1000, &2000);

    client.contribute(&campaign_id, &contributor, &1000);

    // Goal is met, can finalize early
    let result = client.finalize_campaign(&campaign_id);
    assert_eq!(result, CampaignResult::GoalMet);

    let campaign = client.get_campaign(&campaign_id);
    assert_eq!(campaign.status, CampaignStatus::Succeeded);
}

#[test]
fn test_finalize_goal_not_met_after_deadline() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &5000, &2000);

    client.contribute(&campaign_id, &contributor, &1000);

    // Advance time past deadline
    env.ledger().with_mut(|li| {
        li.timestamp = 2001;
    });

    let result = client.finalize_campaign(&campaign_id);
    assert_eq!(result, CampaignResult::GoalNotMet);

    let campaign = client.get_campaign(&campaign_id);
    assert_eq!(campaign.status, CampaignStatus::Failed);
}

#[test]
fn test_cannot_finalize_active_early_without_goal() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &5000, &2000);

    client.contribute(&campaign_id, &contributor, &100);

    // Cannot finalize before deadline if goal is not met
    let result = client.try_finalize_campaign(&campaign_id);
    assert_eq!(result, Err(Ok(Error::CampaignNotExpired)));
}

#[test]
fn test_cannot_contribute_after_deadline() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &5000, &2000);

    // Advance time past deadline
    env.ledger().with_mut(|li| {
        li.timestamp = 2001;
    });

    let result = client.try_contribute(&campaign_id, &contributor, &100);
    assert_eq!(result, Err(Ok(Error::DeadlinePassed)));
}

#[test]
fn test_cannot_contribute_to_finalized() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &1000, &2000);

    client.contribute(&campaign_id, &contributor, &1000);
    client.finalize_campaign(&campaign_id);

    let result = client.try_contribute(&campaign_id, &contributor, &500);
    assert_eq!(result, Err(Ok(Error::CampaignAlreadyFinalized)));
}

#[test]
fn test_cannot_double_finalize() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &1000, &2000);

    client.contribute(&campaign_id, &contributor, &1000);
    client.finalize_campaign(&campaign_id);

    let result = client.try_finalize_campaign(&campaign_id);
    assert_eq!(result, Err(Ok(Error::CampaignAlreadyFinalized)));
}

#[test]
fn test_invalid_goal_amount() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);

    let result = client.try_create_campaign(&artist, &0, &2000);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    let result = client.try_create_campaign(&artist, &-100, &2000);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_invalid_deadline() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);

    // Deadline in the past
    let result = client.try_create_campaign(&artist, &5000, &500);
    assert_eq!(result, Err(Ok(Error::InvalidDeadline)));

    // Deadline at current time
    let result = client.try_create_campaign(&artist, &5000, &1000);
    assert_eq!(result, Err(Ok(Error::InvalidDeadline)));
}

#[test]
fn test_campaign_not_found() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let fake_id = String::from_str(&env, "999");
    let result = client.try_get_campaign(&fake_id);
    assert_eq!(result, Err(Ok(Error::CampaignNotFound)));
}

#[test]
fn test_user_campaign_tracking() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);

    let campaign1 = client.create_campaign(&artist, &5000, &2000);
    let campaign2 = client.create_campaign(&artist, &3000, &2000);

    client.contribute(&campaign1, &contributor, &100);
    client.contribute(&campaign2, &contributor, &200);

    let user_campaigns = client.get_user_campaigns(&contributor);
    assert_eq!(user_campaigns.len(), 2);
}

#[test]
fn test_invalid_contribution_amount() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &5000, &2000);

    let result = client.try_contribute(&campaign_id, &contributor, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_goal_exceeded() {
    let env = setup_env_with_time(1000);
    let contract_id = env.register_contract(None, TipGoalCampaignContract);
    let client = TipGoalCampaignContractClient::new(&env, &contract_id);

    let artist = Address::generate(&env);
    let contributor = Address::generate(&env);
    let campaign_id = client.create_campaign(&artist, &1000, &2000);

    // Over-contribute
    client.contribute(&campaign_id, &contributor, &2000);

    let campaign = client.get_campaign(&campaign_id);
    assert_eq!(campaign.current_amount, 2000);

    let result = client.finalize_campaign(&campaign_id);
    assert_eq!(result, CampaignResult::GoalMet);
}
