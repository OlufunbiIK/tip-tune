use soroban_sdk::{contracttype, Address, Env, String, Vec};
use crate::{Collaborator, DistributionRecord};

pub(crate) const DAY_IN_LEDGERS: u32 = 17280;
pub(crate) const PERSISTENT_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
pub(crate) const PERSISTENT_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS;
pub(crate) const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
pub(crate) const INSTANCE_THRESHOLD: u32 = 2 * DAY_IN_LEDGERS;
pub(crate) const MAX_LOGS_PER_TRACK: u32 = 50;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StorageKey {
    TrackOwner(String),
    TrackSplits(String),
    DistributionLog(String, u32), // track_id, index (0..MAX_LOGS_PER_TRACK)
    LogCount(String),             // track_id -> total count ever
    GlobalLogCount,               // total distributions ever
    Settled(String),              // payout_id -> bool
}

pub fn extend_persistent(env: &Env, key: &StorageKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
}

pub fn extend_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}

pub fn get_track_owner(env: &Env, track_id: &String) -> Option<Address> {
    let key = StorageKey::TrackOwner(track_id.clone());
    let owner = env.storage().persistent().get(&key);
    if owner.is_some() {
        extend_persistent(env, &key);
    }
    owner
}

pub fn set_track_owner(env: &Env, track_id: &String, owner: &Address) {
    let key = StorageKey::TrackOwner(track_id.clone());
    env.storage().persistent().set(&key, owner);
    extend_persistent(env, &key);
}

pub fn get_track_splits(env: &Env, track_id: &String) -> Option<Vec<Collaborator>> {
    let key = StorageKey::TrackSplits(track_id.clone());
    let splits = env.storage().persistent().get(&key);
    if splits.is_some() {
        extend_persistent(env, &key);
    }
    splits
}

pub fn set_track_splits(env: &Env, track_id: &String, collaborators: &Vec<Collaborator>) {
    let key = StorageKey::TrackSplits(track_id.clone());
    env.storage().persistent().set(&key, collaborators);
    extend_persistent(env, &key);
}

pub fn get_log_count(env: &Env, track_id: &String) -> u32 {
    let key = StorageKey::LogCount(track_id.clone());
    let count = env.storage().persistent().get(&key).unwrap_or(0);
    if count > 0 {
        extend_persistent(env, &key);
    }
    count
}

pub fn add_distribution_log(env: &Env, track_id: &String, record: &DistributionRecord) {
    let total_count = get_log_count(env, track_id);
    let index = total_count % MAX_LOGS_PER_TRACK;
    
    let log_key = StorageKey::DistributionLog(track_id.clone(), index);
    env.storage().persistent().set(&log_key, record);
    extend_persistent(env, &log_key);
    
    let count_key = StorageKey::LogCount(track_id.clone());
    env.storage().persistent().set(&count_key, &(total_count + 1));
    extend_persistent(env, &count_key);
    
    // Update global count (instance storage)
    let global_count: u64 = env.storage().instance().get(&StorageKey::GlobalLogCount).unwrap_or(0);
    env.storage().instance().set(&StorageKey::GlobalLogCount, &(global_count + 1));
    extend_instance(env);
}

#[allow(dead_code)]
pub fn get_global_log_count(env: &Env) -> u64 {
    extend_instance(env);
    env.storage().instance().get(&StorageKey::GlobalLogCount).unwrap_or(0)
}
    
    let storage_index = absolute_index % MAX_LOGS_PER_TRACK;
    let key = StorageKey::DistributionLog(track_id.clone(), storage_index);
    let log = env.storage().persistent().get(&key);
    if log.is_some() {
        extend_persistent(env, &key);
    }
    log
}

pub fn is_settled(env: &Env, payout_id: &String) -> bool {
    let key = StorageKey::Settled(payout_id.clone());
    let settled = env.storage().persistent().get(&key).unwrap_or(false);
    if settled {
        extend_persistent(env, &key);
    }
    settled
}

pub fn set_settled(env: &Env, payout_id: &String) {
    let key = StorageKey::Settled(payout_id.clone());
    env.storage().persistent().set(&key, &true);
    extend_persistent(env, &key);
}

pub fn get_global_log_count(env: &Env) -> u64 {
    extend_instance(env);
    env.storage().instance().get(&StorageKey::GlobalLogCount).unwrap_or(0)
}
