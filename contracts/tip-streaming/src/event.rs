use soroban_sdk::{Address, Env, String, symbol_short};

pub fn stream_started(
    env: &Env,
    stream_id: &String,
    listener: &Address,
    artist: &Address,
    rate_per_second: i128,
    deposited_amount: i128,
) {
    env.events().publish(
        (symbol_short!("STREAM"), symbol_short!("START")),
        (stream_id, listener, artist, rate_per_second, deposited_amount),
    );
}

pub fn stream_stopped(
    env: &Env,
    stream_id: &String,
    listener: &Address,
    artist: &Address,
    amount_paid: i128,
    refunded: i128,
) {
    env.events().publish(
        (symbol_short!("STREAM"), symbol_short!("STOP")),
        (stream_id, listener, artist, amount_paid, refunded),
    );
}

pub fn stream_interrupted(
    env: &Env,
    stream_id: &String,
    listener: &Address,
    artist: &Address,
    amount_paid: i128,
) {
    env.events().publish(
        (symbol_short!("STREAM"), symbol_short!("INTR")),
        (stream_id, listener, artist, amount_paid),
    );
}

pub fn payment_settled(
    env: &Env,
    stream_id: &String,
    artist: &Address,
    amount: i128,
) {
    env.events().publish(
        (symbol_short!("STREAM"), symbol_short!("PAY")),
        (stream_id, artist, amount),
    );
}