use soroban_sdk::{Address, Env, String};
use crate::types::{StreamConfig, StreamRecord};

const CONFIG_KEY: &str = "CONFIG";
const STREAM_PREFIX: &str = "STREAM";
const STREAM_COUNT_KEY: &str = "STREAM_COUNT";
const ACTIVE_STREAM_PREFIX: &str = "ACTIVE";

pub fn get_config(env: &Env) -> Option<StreamConfig> {
    env.storage().instance().get(&CONFIG_KEY)
}

pub fn set_config(env: &Env, config: &StreamConfig) {
    env.storage().instance().set(&CONFIG_KEY, config);
}

pub fn get_stream(env: &Env, stream_id: &String) -> Option<StreamRecord> {
    let key = (STREAM_PREFIX, stream_id);
    env.storage().persistent().get(&key)
}

pub fn set_stream(env: &Env, stream_id: &String, record: &StreamRecord) {
    let key = (STREAM_PREFIX, stream_id);
    env.storage().persistent().set(&key, record);
}

pub fn get_active_stream(env: &Env, listener: &Address, artist: &Address) -> Option<String> {
    let key = (ACTIVE_STREAM_PREFIX, listener, artist);
    env.storage().persistent().get(&key)
}

pub fn set_active_stream(env: &Env, listener: &Address, artist: &Address, stream_id: &String) {
    let key = (ACTIVE_STREAM_PREFIX, listener, artist);
    env.storage().persistent().set(&key, stream_id);
}

pub fn remove_active_stream(env: &Env, listener: &Address, artist: &Address) {
    let key = (ACTIVE_STREAM_PREFIX, listener, artist);
    env.storage().persistent().remove(&key);
}

pub fn get_stream_count(env: &Env) -> u32 {
    env.storage().instance().get(&STREAM_COUNT_KEY).unwrap_or(0)
}

pub fn increment_stream_count(env: &Env) -> u32 {
    let count = get_stream_count(env) + 1;
    env.storage().instance().set(&STREAM_COUNT_KEY, &count);
    count
}