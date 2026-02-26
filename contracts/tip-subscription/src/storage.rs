use soroban_sdk::{contracttype, Env, String};
use crate::types::Subscription;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Subscription(String),
}

const LIFETIME_THRESHOLD: u32 = 100_000; // ~160 days at 5s/ledger
const EXTEND_TO: u32 = 200_000;

pub fn write_subscription(env: &Env, id: &String, sub: &Subscription) {
    let key = DataKey::Subscription(id.clone());
    env.storage().persistent().set(&key, sub);
    env.storage()
        .persistent()
        .extend_ttl(&key, LIFETIME_THRESHOLD, EXTEND_TO);
}

pub fn read_subscription(env: &Env, id: &String) -> Option<Subscription> {
    let key = DataKey::Subscription(id.clone());
    let sub = env.storage().persistent().get(&key);
    if sub.is_some() {
        env.storage()
            .persistent()
            .extend_ttl(&key, LIFETIME_THRESHOLD, EXTEND_TO);
    }
    sub
}

pub fn remove_subscription(env: &Env, id: &String) {
    env.storage().persistent().remove(&DataKey::Subscription(id.clone()));
}