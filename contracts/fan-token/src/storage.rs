use soroban_sdk::{contracttype, Address, Env, String};

use crate::types::{FanBalance, FanToken};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Stores the FanToken for an artist
    Token(Address),
    /// Stores a FanBalance for (artist, holder)
    Balance(Address, Address),
    /// Counter for generating unique token IDs
    TokenCount,
}

const LIFETIME_THRESHOLD: u32 = 100_000;
const EXTEND_TO: u32 = 200_000;

// ── Fan Token CRUD ──────────────────────────────────────────────────

pub fn get_fan_token(env: &Env, artist: &Address) -> Option<FanToken> {
    let key = DataKey::Token(artist.clone());
    let token: Option<FanToken> = env.storage().persistent().get(&key);
    if token.is_some() {
        env.storage()
            .persistent()
            .extend_ttl(&key, LIFETIME_THRESHOLD, EXTEND_TO);
    }
    token
}

pub fn set_fan_token(env: &Env, artist: &Address, token: &FanToken) {
    let key = DataKey::Token(artist.clone());
    env.storage().persistent().set(&key, token);
    env.storage()
        .persistent()
        .extend_ttl(&key, LIFETIME_THRESHOLD, EXTEND_TO);
}

pub fn has_fan_token(env: &Env, artist: &Address) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Token(artist.clone()))
}

// ── Fan Balance CRUD ────────────────────────────────────────────────

pub fn get_balance(env: &Env, artist: &Address, holder: &Address) -> Option<FanBalance> {
    let key = DataKey::Balance(artist.clone(), holder.clone());
    let bal: Option<FanBalance> = env.storage().persistent().get(&key);
    if bal.is_some() {
        env.storage()
            .persistent()
            .extend_ttl(&key, LIFETIME_THRESHOLD, EXTEND_TO);
    }
    bal
}

pub fn set_balance(env: &Env, artist: &Address, holder: &Address, balance: &FanBalance) {
    let key = DataKey::Balance(artist.clone(), holder.clone());
    env.storage().persistent().set(&key, balance);
    env.storage()
        .persistent()
        .extend_ttl(&key, LIFETIME_THRESHOLD, EXTEND_TO);
}

// ── Token counter ───────────────────────────────────────────────────

pub fn next_token_id(env: &Env) -> String {
    let count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::TokenCount)
        .unwrap_or(0);
    let next = count + 1;
    env.storage().instance().set(&DataKey::TokenCount, &next);

    // Convert the counter to a string like "FT1", "FT2", …
    let mut buf = [0u8; 12];
    buf[0] = b'F';
    buf[1] = b'T';
    let mut n = next;
    let mut len = 0u32;
    let mut tmp = [0u8; 10];
    if n == 0 {
        tmp[0] = b'0';
        len = 1;
    } else {
        while n > 0 {
            tmp[len as usize] = b'0' + (n % 10) as u8;
            n /= 10;
            len += 1;
        }
    }
    // reverse digits into buf after "FT"
    for i in 0..len {
        buf[2 + i as usize] = tmp[(len - 1 - i) as usize];
    }
    let total_len = 2 + len as usize;

    String::from_bytes(env, &buf[..total_len])
}
