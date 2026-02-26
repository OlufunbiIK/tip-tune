use soroban_sdk::{symbol_short, Address, Env, String};

pub fn subscription_created(env: &Env, subscription_id: String, subscriber: Address) {
    env.events()
        .publish((symbol_short!("sub_crt"), subscription_id), subscriber);
}

pub fn payment_processed(env: &Env, subscription_id: String, amount: i128) {
    env.events()
        .publish((symbol_short!("sub_paid"), subscription_id), amount);
}

pub fn subscription_cancelled(env: &Env, subscription_id: String, subscriber: Address) {
    env.events()
        .publish((symbol_short!("sub_canc"), subscription_id), subscriber);
}

pub fn subscription_paused(env: &Env, subscription_id: String, subscriber: Address) {
    env.events()
        .publish((symbol_short!("sub_paus"), subscription_id), subscriber);
}

pub fn subscription_resumed(env: &Env, subscription_id: String, subscriber: Address) {
    env.events()
        .publish((symbol_short!("sub_resm"), subscription_id), subscriber);
}