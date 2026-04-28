use soroban_sdk::{symbol_short, Address, Env, String};

pub fn token_created(
    env: &Env,
    token_id: &String,
    artist: &Address,
    name: &String,
    symbol: &String,
) {
    env.events().publish(
        (symbol_short!("fan_tkn"), symbol_short!("create")),
        (
            token_id.clone(),
            artist.clone(),
            name.clone(),
            symbol.clone(),
        ),
    );
}

pub fn tokens_minted(
    env: &Env,
    artist: &Address,
    fan: &Address,
    tip_amount: i128,
    tokens_minted: i128,
) {
    env.events().publish(
        (symbol_short!("fan_tkn"), symbol_short!("mint")),
        (artist.clone(), fan.clone(), tip_amount, tokens_minted),
    );
}

pub fn tokens_transferred(env: &Env, from: &Address, to: &Address, artist: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("fan_tkn"), symbol_short!("xfer")),
        (from.clone(), to.clone(), artist.clone(), amount),
    );
}

pub fn tokens_burned(env: &Env, artist: &Address, holder: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("fan_tkn"), symbol_short!("burn")),
        (artist.clone(), holder.clone(), amount),
    );
}

pub fn cap_set(env: &Env, artist: &Address, max_supply: i128) {
    env.events().publish(
        (symbol_short!("fan_tkn"), symbol_short!("cap")),
        (artist.clone(), max_supply),
    );
}

pub fn trusted_minter_added(env: &Env, artist: &Address, minter: &Address) {
    env.events().publish(
        (symbol_short!("fan_tkn"), symbol_short!("add_m")),
        (artist.clone(), minter.clone()),
    );
}

pub fn trusted_minter_removed(env: &Env, artist: &Address, minter: &Address) {
    env.events().publish(
        (symbol_short!("fan_tkn"), symbol_short!("rm_m")),
        (artist.clone(), minter.clone()),
    );
}

pub fn transfers_updated(env: &Env, artist: &Address, enabled: bool) {
    env.events().publish(
        (symbol_short!("fan_tkn"), symbol_short!("xfer_ctrl")),
        (artist.clone(), enabled),
    );
}
