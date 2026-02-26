use soroban_sdk::{Address, Env, String};
use crate::types::{GovernanceConfig, Proposal, VoteRecord, DelegationRecord};

const CONFIG_KEY: &str = "CONFIG";
const PROPOSAL_PREFIX: &str = "PROPOSAL";
const VOTE_PREFIX: &str = "VOTE";
const DELEGATION_PREFIX: &str = "DELEGATION";
const PROPOSAL_COUNT_KEY: &str = "PROP_COUNT";

pub fn get_config(env: &Env) -> Option<GovernanceConfig> {
    env.storage().instance().get(&CONFIG_KEY)
}

pub fn set_config(env: &Env, config: &GovernanceConfig) {
    env.storage().instance().set(&CONFIG_KEY, config);
}

pub fn get_proposal(env: &Env, proposal_id: &String) -> Option<Proposal> {
    let key = (PROPOSAL_PREFIX, proposal_id);
    env.storage().persistent().get(&key)
}

pub fn set_proposal(env: &Env, proposal_id: &String, proposal: &Proposal) {
    let key = (PROPOSAL_PREFIX, proposal_id);
    env.storage().persistent().set(&key, proposal);
}

pub fn get_vote(env: &Env, proposal_id: &String, voter: &Address) -> Option<VoteRecord> {
    let key = (VOTE_PREFIX, proposal_id, voter);
    env.storage().persistent().get(&key)
}

pub fn set_vote(env: &Env, proposal_id: &String, voter: &Address, record: &VoteRecord) {
    let key = (VOTE_PREFIX, proposal_id, voter);
    env.storage().persistent().set(&key, record);
}

pub fn get_delegation(env: &Env, delegator: &Address) -> Option<DelegationRecord> {
    let key = (DELEGATION_PREFIX, delegator);
    env.storage().persistent().get(&key)
}

pub fn set_delegation(env: &Env, delegator: &Address, record: &DelegationRecord) {
    let key = (DELEGATION_PREFIX, delegator);
    env.storage().persistent().set(&key, record);
}

pub fn get_proposal_count(env: &Env) -> u32 {
    env.storage().instance().get(&PROPOSAL_COUNT_KEY).unwrap_or(0)
}

pub fn increment_proposal_count(env: &Env) -> u32 {
    let count = get_proposal_count(env) + 1;
    env.storage().instance().set(&PROPOSAL_COUNT_KEY, &count);
    count
}