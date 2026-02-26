use soroban_sdk::{Env, String};
use crate::types::{BridgeConfig, BridgeRecord, BridgeBackRecord};

const CONFIG_KEY: &str = "CONFIG";
const BRIDGE_PREFIX: &str = "BRIDGE";
const BRIDGE_BACK_PREFIX: &str = "BRIDGE_BACK";
const TOTAL_FEES_KEY: &str = "TOTAL_FEES";

pub fn get_config(env: &Env) -> Option<BridgeConfig> {
    env.storage().instance().get(&CONFIG_KEY)
}

pub fn set_config(env: &Env, config: &BridgeConfig) {
    env.storage().instance().set(&CONFIG_KEY, config);
}

pub fn get_bridge(env: &Env, bridge_id: &String) -> Option<BridgeRecord> {
    let key = (BRIDGE_PREFIX, bridge_id);
    env.storage().persistent().get(&key)
}

pub fn set_bridge(env: &Env, bridge_id: &String, record: &BridgeRecord) {
    let key = (BRIDGE_PREFIX, bridge_id);
    env.storage().persistent().set(&key, record);
}

pub fn get_bridge_back(env: &Env, bridge_id: &String) -> Option<BridgeBackRecord> {
    let key = (BRIDGE_BACK_PREFIX, bridge_id);
    env.storage().persistent().get(&key)
}

pub fn set_bridge_back(env: &Env, bridge_id: &String, record: &BridgeBackRecord) {
    let key = (BRIDGE_BACK_PREFIX, bridge_id);
    env.storage().persistent().set(&key, record);
}

pub fn get_total_fees(env: &Env) -> i128 {
    env.storage().instance().get(&TOTAL_FEES_KEY).unwrap_or(0)
}

pub fn add_fees(env: &Env, amount: i128) {
    let current = get_total_fees(env);
    env.storage().instance().set(&TOTAL_FEES_KEY, &(current + amount));
}