use soroban_sdk::{Address, Env, symbol_short, Symbol};

pub fn emit_pool_created(
    env: &Env,
    pool_id: &Vec<u8>,
    sponsor: &Address,
    artist: &Address,
    pool_amount: i128,
    match_ratio: u32,
    match_cap_total: i128,
    end_time: u64,
) {
    env.events().publish(
        (symbol_short!("pool"), symbol_short!("created")),
        (pool_id, sponsor, artist, pool_amount, match_ratio, match_cap_total, end_time),
    );
}

pub fn emit_tip_matched(
    env: &Env,
    pool_id: &Vec<u8>,
    tipper: &Address,
    tip_amount: i128,
    matched_amount: i128,
    total_matched: i128,
) {
    env.events().publish(
        (symbol_short!("pool"), symbol_short!("matched")),
        (pool_id, tipper, tip_amount, matched_amount, total_matched),
    );
}

pub fn emit_pool_depleted(
    env: &Env,
    pool_id: &Vec<u8>,
    reason: Symbol,
    total_matched: i128,
) {
    env.events().publish(
        (symbol_short!("pool"), symbol_short!("depleted")),
        (pool_id, reason, total_matched),
    );
}

pub fn emit_pool_cancelled(
    env: &Env,
    pool_id: &Vec<u8>,
    refunded_amount: i128,
    total_matched: i128,
) {
    env.events().publish(
        (symbol_short!("pool"), symbol_short!("cancelled")),
        (pool_id, refunded_amount, total_matched),
    );
}

pub fn emit_pool_closed(
    env: &Env,
    pool_id: &Vec<u8>,
    reason: Symbol,
    total_matched: i128,
) {
    env.events().publish(
        (symbol_short!("pool"), symbol_short!("closed")),
        (pool_id, reason, total_matched),
    );
}