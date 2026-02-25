use soroban_sdk::{Address, Env};

pub fn emit_pool_created(env: &Env, pool_id: &str) {
    env.events().publish((Symbol::short("PoolCreated"),), pool_id);
}

pub fn emit_tip_matched(env: &Env, pool_id: &str, tipper: &Address, amount: i128) {
    env.events().publish((Symbol::short("TipMatched"),), (pool_id, tipper, amount));
}

pub fn emit_pool_cancelled(env: &Env, pool_id: &str, refunded_amount: i128) {
    env.events().publish((Symbol::short("PoolCancelled"),), (pool_id, refunded_amount));
}