#![no_std]

pub mod access;
pub mod events;
pub mod queries;
pub mod storage;
pub mod types;
pub mod metadata;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, Address, Env, String};
use types::{Error, FanBalance, FanToken};

/// Conversion rate: 1 unit of tip = 10 fan tokens.
const TIP_TO_TOKEN_RATIO: i128 = 10;

#[contract]
pub struct FanTokenContract;

#[contractimpl]
impl FanTokenContract {
    /// Create a new fan token for an artist.
    ///
    /// Only the artist (caller) may create their token. Each artist can have
    /// exactly one fan token. The `initial_supply` is minted to the artist's
    /// own balance. `max_supply` sets an optional cap (0 = uncapped).
    pub fn create_fan_token(
        env: Env,
        artist: Address,
        name: String,
        symbol: String,
        initial_supply: i128,
        max_supply: i128,
    ) -> Result<String, Error> {
        artist.require_auth();

        // Validate inputs
        if initial_supply < 0 {
            return Err(Error::InvalidAmount);
        }

        if max_supply <= 0 {
            return Err(Error::InvalidAmount); // Require max_supply > 0
        }

        // If a cap is set, initial_supply must not exceed it
        if initial_supply > max_supply {
            return Err(Error::CapExceeded);
        }

        if name.is_empty() || symbol.is_empty() {
            return Err(Error::InvalidMetadata);
        }

        // One token per artist
        if storage::has_fan_token(&env, &artist) {
            return Err(Error::TokenAlreadyExists);
        }

        let token_id = storage::next_token_id(&env);
        let now = env.ledger().timestamp();

        let fan_token = FanToken {
            token_id: token_id.clone(),
            artist: artist.clone(),
            name: name.clone(),
            symbol: symbol.clone(),
            total_supply: initial_supply,
            circulating_supply: initial_supply,
            created_at: now,
            max_supply,
            burned_supply: 0,
            transfers_enabled: true, // Enable transfers by default
        };

        storage::set_fan_token(&env, &artist, &fan_token);

        // Credit initial supply to the artist
        if initial_supply > 0 {
            let balance = FanBalance {
                holder: artist.clone(),
                artist: artist.clone(),
                balance: initial_supply,
                earned_total: initial_supply,
                last_updated: now,
            };
            storage::set_balance(&env, &artist, &artist, &balance);
            storage::sync_holder(&env, &artist, &artist, balance.balance);
        }

        events::token_created(&env, &token_id, &artist, &name, &symbol);

        Ok(token_id)
    }

    /// Mint fan tokens for a fan when they send a tip to an artist.
    ///
    /// The artist or a trusted minter must authorize the mint. Fan tokens
    /// minted = `tip_amount * TIP_TO_TOKEN_RATIO`. Cap is enforced when
    /// max_supply > 0.
    pub fn mint_for_tip(
        env: Env,
        artist: Address,
        caller: Address,
        fan: Address,
        tip_amount: i128,
    ) -> Result<i128, Error> {
        access::require_artist_or_trusted(&env, &artist, &caller)?;

        if tip_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut token = storage::get_fan_token(&env, &artist).ok_or(Error::TokenNotFound)?;

        let tokens_to_mint = tip_amount
            .checked_mul(TIP_TO_TOKEN_RATIO)
            .ok_or(Error::Overflow)?;

        // Cap enforcement
        if token.max_supply > 0 {
            let new_supply = token
                .total_supply
                .checked_add(tokens_to_mint)
                .ok_or(Error::Overflow)?;
            if new_supply > token.max_supply {
                return Err(Error::CapExceeded);
            }
        }

        // Update supply
        token.total_supply = token
            .total_supply
            .checked_add(tokens_to_mint)
            .ok_or(Error::Overflow)?;
        token.circulating_supply = token
            .circulating_supply
            .checked_add(tokens_to_mint)
            .ok_or(Error::Overflow)?;
        storage::set_fan_token(&env, &artist, &token);

        // Update fan balance
        let now = env.ledger().timestamp();
        let mut fan_balance = storage::get_balance(&env, &artist, &fan).unwrap_or(FanBalance {
            holder: fan.clone(),
            artist: artist.clone(),
            balance: 0,
            earned_total: 0,
            last_updated: now,
        });

        fan_balance.balance = fan_balance
            .balance
            .checked_add(tokens_to_mint)
            .ok_or(Error::Overflow)?;
        fan_balance.earned_total = fan_balance
            .earned_total
            .checked_add(tokens_to_mint)
            .ok_or(Error::Overflow)?;
        fan_balance.last_updated = now;

        storage::set_balance(&env, &artist, &fan, &fan_balance);
        storage::sync_holder(&env, &artist, &fan, fan_balance.balance);

        events::tokens_minted(&env, &artist, &fan, tip_amount, tokens_to_mint);

        Ok(tokens_to_mint)
    }

    /// Return the fan-token balance a fan holds for a given artist.
    pub fn get_balance(env: Env, artist: Address, fan: Address) -> i128 {
        storage::get_balance(&env, &artist, &fan)
            .map(|b| b.balance)
            .unwrap_or(0)
    }

    /// Transfer fan tokens from one holder to another for a specific artist.
    pub fn transfer_fan_tokens(
        env: Env,
        from: Address,
        to: Address,
        artist: Address,
        amount: i128,
    ) -> Result<(), Error> {
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if from == to {
            return Err(Error::SelfTransfer);
        }

        // Ensure the artist token exists
        if !storage::has_fan_token(&env, &artist) {
         

        let token = storage::get_fan_token(&env, &artist).ok_or(Error::TokenNotFound)?;

        if !token.transfers_enabled {
            return Err(Error::Unauthorized); // Use Unauthorized for transfer disabled
        }   return Err(Error::TokenNotFound);
        }

        let now = env.ledger().timestamp();

        // Debit sender
        let mut from_balance =
            storage::get_balance(&env, &artist, &from).ok_or(Error::InsufficientBalance)?;

        if from_balance.balance < amount {
            return Err(Error::InsufficientBalance);
        }

        from_balance.balance = from_balance
            .balance
            .checked_sub(amount)
            .ok_or(Error::Overflow)?;
        from_balance.last_updated = now;
        storage::set_balance(&env, &artist, &from, &from_balance);
        storage::sync_holder(&env, &artist, &from, from_balance.balance);

        // Credit receiver
        let mut to_balance = storage::get_balance(&env, &artist, &to).unwrap_or(FanBalance {
            holder: to.clone(),
            artist: artist.clone(),
            balance: 0,
            earned_total: 0,
            last_updated: now,
        });

        to_balance.balance = to_balance
            .balance
            .checked_add(amount)
            .ok_or(Error::Overflow)?;
        to_balance.last_updated = now;
        storage::set_balance(&env, &artist, &to, &to_balance);
        storage::sync_holder(&env, &artist, &to, to_balance.balance);

        events::tokens_transferred(&env, &from, &to, &artist, amount);

        Ok(())
    }

    /// Return the full fan-token metadata for an artist.
    pub fn get_fan_token(env: Env, artist: Address) -> Result<FanToken, Error> {
        storage::get_fan_token(&env, &artist).ok_or(Error::TokenNotFound)
    }

    /// Return the detailed balance record for a fan.
    pub fn get_fan_balance(env: Env, artist: Address, fan: Address) -> Result<FanBalance, Error> {
        storage::get_balance(&env, &artist, &fan).ok_or(Error::InsufficientBalance)
    }

    // ── Supply controls: burn ────────────────────────────────────────

    /// Burn fan tokens from the caller's balance.
    ///
    /// Reduces both the holder's balance and the circulating supply.
    /// total_supply stays the same; burned_supply tracks total burns.
    /// Artist or trusted minter authorization is NOT required — any
    /// holder may burn their own tokens.
    pub fn burn(
        env: Env,
        artist: Address,
        holder: Address,
        amount: i128,
    ) -> Result<(), Error> {
        holder.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut token = storage::get_fan_token(&env, &artist).ok_or(Error::TokenNotFound)?;

        let mut bal =
            storage::get_balance(&env, &artist, &holder).ok_or(Error::InsufficientBalanceBurn)?;

        if bal.balance < amount {
            return Err(Error::InsufficientBalanceBurn);
        }

        bal.balance = bal.balance.checked_sub(amount).ok_or(Error::Overflow)?;
        bal.last_updated = env.ledger().timestamp();
        storage::set_balance(&env, &artist, &holder, &bal);
        storage::sync_holder(&env, &artist, &holder, bal.balance);

        token.circulating_supply = token
            .circulating_supply
            .checked_sub(amount)
            .ok_or(Error::Overflow)?;
        token.burned_supply = token.burned_supply.checked_add(amount).ok_or(Error::Overflow)?;
        storage::set_fan_token(&env, &artist, &token);

        events::tokens_burned(&env, &artist, &holder, amount);

        Ok(())
    }

    // ── Supply controls: cap ─────────────────────────────────────────

    /// Set or update the max supply cap for an artist's fan token.
    ///
    /// Only the artist may set the cap. Setting to 0 removes the cap.
    /// The new cap must be >= current total_supply.
    pub fn set_cap(env: Env, artist: Address, max_supply: i128) -> Result<(), Error> {
        artist.require_auth();

        if max_supply < 0 {
            return Err(Error::InvalidAmount);
        }

        let mut token = storage::get_fan_token(&env, &artist).ok_or(Error::TokenNotFound)?;

        // New cap must accommodate existing supply (unless uncapped)
        if max_supply > 0 && token.total_supply > max_supply {
            return Err(Error::CapExceeded);
        }

        token.max_supply = max_supply;
        storage::set_fan_token(&env, &artist, &token);

        events::cap_set(&env, &artist, max_supply);

        Ok(())
    }

    // ── Trusted-minter management ────────────────────────────────────

    /// Add a trusted minter who may call mint_for_tip on behalf of the artist.
    pub fn add_trusted_minter(
        env: Env,
        artist: Address,
        minter: Address,
    ) -> Result<(), Error> {
        access::add_trusted_minter(&env, &artist, &minter)?;
        events::trusted_minter_added(&env, &artist, &minter);
        Ok(())
    }

    /// Remove a trusted minter.
    pub fn remove_trusted_minter(
        env: Env,
        artist: Address,
        minter: Address,
    ) -> Result<(), Error> {
        access::remove_trusted_minter(&env, &artist, &minter)?;
        events::trusted_minter_removed(&env, &artist, &minter);
        Ok(())
    }

    /// Check whether an address is a trusted minter for an artist.
    pub fn is_trusted_minter(env: Env, artist: Address, minter: Address) -> bool {
        access::is_trusted_minter(&env, &artist, &minter)
    }

    // ── Metadata management ──────────────────────────────────────────

    /// Update fan token metadata (name and symbol).
    ///
    /// Only the artist can update metadata, and only if it hasn't been frozen.
    /// Once frozen, metadata cannot be changed.
    pub fn update_metadata(
        env: Env,
        artist: Address,
        name: String,
        symbol: String,
    ) -> Result<(), Error> {
        metadata::update_metadata(env, artist, name, symbol)
    }

    /// Freeze metadata for the fan token.
    ///
    /// Only the artist can freeze metadata. Once frozen, the metadata cannot be
    /// changed and the freeze cannot be reversed. This is useful for preventing
    /// unauthorized changes once the token is in production use.
    pub fn freeze_metadata(env: Env, artist: Address) -> Result<(), Error> {
        metadata::freeze_metadata(env, artist)
    }

    /// Check if metadata is frozen for a fan token.
    ///
    /// Returns true if the metadata has been frozen and cannot be updated.
    pub fn is_metadata_frozen(env: Env, artist: Address) -> bool {
        metadata::is_metadata_frozen(env, artist)
    }

    /// List token holders for an artist without scanning storage.
    pub fn list_holders(env: Env, artist: Address, page: u32, page_size: u32) -> soroban_sdk::Vec<Address> {

    // ── Transfer controls ────────────────────────────────────────────

    /// Enable or disable transfers for the fan token.
    ///
    /// Only the artist can control transfer permissions.
    pub fn set_transfers_enabled(env: Env, artist: Address, enabled: bool) -> Result<(), Error> {
        artist.require_auth();

        let mut token = storage::get_fan_token(&env, &artist).ok_or(Error::TokenNotFound)?;
        token.transfers_enabled = enabled;
        storage::set_fan_token(&env, &artist, &token);

        events::transfers_updated(&env, &artist, enabled);

        Ok(())
    }

    /// Check if transfers are enabled for the fan token.
    pub fn are_transfers_enabled(env: Env, artist: Address) -> Result<bool, Error> {
        let token = storage::get_fan_token(&env, &artist).ok_or(Error::TokenNotFound)?;
        Ok(token.transfers_enabled)
    }
        queries::list_holders(&env, &artist, page, page_size)
    }

    /// Return top fan balances ranked by token balance.
    pub fn get_top_fans(env: Env, artist: Address, limit: u32) -> soroban_sdk::Vec<FanBalance> {
        queries::top_fans(&env, &artist, limit)
    }
}
