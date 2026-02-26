#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    ConfigNotFound = 2,
    AlreadyOnAllowlist = 3,
    NotOnAllowlist = 4,
    InvalidTokenConfig = 5,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum AllowlistMode {
    Open,
    AllowlistOnly,
    TokenGated,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AllowlistConfig {
    pub artist: Address,
    pub mode: AllowlistMode,
    pub is_active: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AllowlistEntry {
    pub artist: Address,
    pub address: Address,
    pub added_at: u64,
    pub added_by: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenGateConfig {
    pub token_address: Address,
    pub min_balance: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Config(Address),
    Entry(Address, Address),
    TokenGate(Address),
}

#[contract]
pub struct ArtistAllowlistContract;

#[contractimpl]
impl ArtistAllowlistContract {
    /// Set or update the allowlist mode for an artist
    pub fn set_allowlist_mode(env: Env, artist: Address, mode: AllowlistMode) -> Result<(), Error> {
        artist.require_auth();

        let config: AllowlistConfig = match env
            .storage()
            .persistent()
            .get(&DataKey::Config(artist.clone()))
        {
            Some(existing) => AllowlistConfig { mode, ..existing },
            None => AllowlistConfig {
                artist: artist.clone(),
                mode,
                is_active: true,
                created_at: env.ledger().timestamp(),
            },
        };

        env.storage()
            .persistent()
            .set(&DataKey::Config(artist.clone()), &config);

        env.events().publish(
            (symbol_short!("allowlst"), symbol_short!("mode")),
            (artist, mode),
        );

        Ok(())
    }

    /// Configure token gate parameters for token-gated mode
    pub fn set_token_gate(
        env: Env,
        artist: Address,
        token_address: Address,
        min_balance: i128,
    ) -> Result<(), Error> {
        artist.require_auth();

        if min_balance <= 0 {
            return Err(Error::InvalidTokenConfig);
        }

        let gate = TokenGateConfig {
            token_address,
            min_balance,
        };

        env.storage()
            .persistent()
            .set(&DataKey::TokenGate(artist.clone()), &gate);

        env.events().publish(
            (symbol_short!("allowlst"), symbol_short!("tkngate")),
            (artist, min_balance),
        );

        Ok(())
    }

    /// Add an address to an artist's allowlist
    pub fn add_to_allowlist(env: Env, artist: Address, address: Address) -> Result<(), Error> {
        artist.require_auth();

        if env
            .storage()
            .persistent()
            .has(&DataKey::Entry(artist.clone(), address.clone()))
        {
            return Err(Error::AlreadyOnAllowlist);
        }

        let entry = AllowlistEntry {
            artist: artist.clone(),
            address: address.clone(),
            added_at: env.ledger().timestamp(),
            added_by: artist.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Entry(artist.clone(), address.clone()), &entry);

        env.events().publish(
            (symbol_short!("allowlst"), symbol_short!("added")),
            (artist, address),
        );

        Ok(())
    }

    /// Remove an address from an artist's allowlist
    pub fn remove_from_allowlist(env: Env, artist: Address, address: Address) -> Result<(), Error> {
        artist.require_auth();

        if !env
            .storage()
            .persistent()
            .has(&DataKey::Entry(artist.clone(), address.clone()))
        {
            return Err(Error::NotOnAllowlist);
        }

        env.storage()
            .persistent()
            .remove(&DataKey::Entry(artist.clone(), address.clone()));

        env.events().publish(
            (symbol_short!("allowlst"), symbol_short!("removed")),
            (artist, address),
        );

        Ok(())
    }

    /// Check if a tipper is allowed to tip an artist
    pub fn check_can_tip(env: Env, artist: Address, tipper: Address) -> bool {
        let config: AllowlistConfig = match env
            .storage()
            .persistent()
            .get(&DataKey::Config(artist.clone()))
        {
            Some(c) => c,
            None => return true,
        };

        if !config.is_active {
            return true;
        }

        match config.mode {
            AllowlistMode::Open => true,
            AllowlistMode::AllowlistOnly => env
                .storage()
                .persistent()
                .has(&DataKey::Entry(artist, tipper)),
            AllowlistMode::TokenGated => {
                let gate: TokenGateConfig =
                    match env.storage().persistent().get(&DataKey::TokenGate(artist)) {
                        Some(g) => g,
                        None => return false,
                    };
                let client = token::Client::new(&env, &gate.token_address);
                client.balance(&tipper) >= gate.min_balance
            }
        }
    }

    /// Get the current allowlist config for an artist
    pub fn get_config(env: Env, artist: Address) -> Result<AllowlistConfig, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Config(artist))
            .ok_or(Error::ConfigNotFound)
    }

    /// Check if an address is on the allowlist
    pub fn is_on_allowlist(env: Env, artist: Address, address: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Entry(artist, address))
    }
}

mod test;
