#![no_std]

pub mod events;
pub mod storage;
pub mod types;

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
    /// own balance.
    pub fn create_fan_token(
        env: Env,
        artist: Address,
        name: String,
        symbol: String,
        initial_supply: i128,
    ) -> Result<String, Error> {
        artist.require_auth();

        // Validate inputs
        if initial_supply < 0 {
            return Err(Error::InvalidAmount);
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
        }

        events::token_created(&env, &token_id, &artist, &name, &symbol);

        Ok(token_id)
    }

    /// Mint fan tokens for a fan when they send a tip to an artist.
    ///
    /// The artist must authorize the mint (typically called by the tipping
    /// contract on behalf of the artist). Fan tokens minted =
    /// `tip_amount * TIP_TO_TOKEN_RATIO`.
    pub fn mint_for_tip(
        env: Env,
        artist: Address,
        fan: Address,
        tip_amount: i128,
    ) -> Result<i128, Error> {
        artist.require_auth();

        if tip_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut token = storage::get_fan_token(&env, &artist).ok_or(Error::TokenNotFound)?;

        let tokens_to_mint = tip_amount
            .checked_mul(TIP_TO_TOKEN_RATIO)
            .ok_or(Error::Overflow)?;

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
            return Err(Error::TokenNotFound);
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
}
