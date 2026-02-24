use soroban_sdk::{contracttype, Env, String};
use crate::types::Subscription;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Subscription(String),
}

pub fn write_subscription(env: &Env, id: &String, sub: &Subscription) {
    env.storage().persistent().set(&DataKey::Subscription(id.clone()), sub);
}

pub fn read_subscription(env: &Env, id: &String) -> Option<Subscription> {
    env.storage().persistent().get(&DataKey::Subscription(id.clone()))
}

pub fn remove_subscription(env: &Env, id: &String) {
    env.storage().persistent().remove(&DataKey::Subscription(id.clone()));
}