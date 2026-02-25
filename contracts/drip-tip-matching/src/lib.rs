#![no_std]
use soroban_sdk::{contractimpl, Address, Env};
mod types;
mod errors;
mod events;

use types::{MatchingPool, PoolStatus};
use errors::Error;

pub struct TipMatchingContract;

#[contractimpl]
impl TipMatchingContract {
    pub fn create_matching_pool(
        env: Env,
        sponsor: Address,
        artist: Address,
        pool_amount: i128,
        match_ratio: u32,
        end_time: u64,
    ) -> Result<String, Error> {
        if pool_amount <= 0 || match_ratio == 0 {
            return Err(Error::InvalidParameters);
        }

        let pool_id = env.crypto().sha256(&env.ledger().timestamp().to_be_bytes());
        let pool = MatchingPool {
            pool_id: pool_id.clone(),
            sponsor: sponsor.clone(),
            artist,
            pool_amount,
            remaining_amount: pool_amount,
            match_ratio,
            start_time: env.ledger().timestamp(),
            end_time,
            status: PoolStatus::Active,
        };

        env.storage().set(&pool_id, &pool);
        events::emit_pool_created(&env, &pool_id);
        Ok(pool_id)
    }

    pub fn apply_match(
        env: Env,
        pool_id: String,
        tip_amount: i128,
        tipper: Address,
    ) -> Result<i128, Error> {
        let mut pool: MatchingPool = env.storage().get(&pool_id).ok_or(Error::PoolNotFound)?;

        let current_time = env.ledger().timestamp();
        if pool.status != PoolStatus::Active || current_time > pool.end_time {
            pool.status = PoolStatus::Expired;
            env.storage().set(&pool_id, &pool);
            return Err(Error::PoolExpired);
        }

        let matched_amount = (tip_amount * pool.match_ratio as i128) / 100;
        let actual_match = if matched_amount > pool.remaining_amount {
            pool.remaining_amount
        } else {
            matched_amount
        };

        pool.remaining_amount -= actual_match;
        if pool.remaining_amount <= 0 {
            pool.status = PoolStatus::Exhausted;
        }

        env.storage().set(&pool_id, &pool);
        events::emit_tip_matched(&env, &pool_id, &tipper, actual_match);
        Ok(actual_match)
    }

    pub fn get_pool_status(env: Env, pool_id: String) -> Result<MatchingPool, Error> {
        env.storage().get(&pool_id).ok_or(Error::PoolNotFound)
    }

    pub fn cancel_pool(
        env: Env,
        pool_id: String,
        sponsor: Address,
    ) -> Result<i128, Error> {
        let mut pool: MatchingPool = env.storage().get(&pool_id).ok_or(Error::PoolNotFound)?;

        if pool.sponsor != sponsor {
            return Err(Error::Unauthorized);
        }

        let refund = pool.remaining_amount;
        pool.remaining_amount = 0;
        pool.status = PoolStatus::Cancelled;

        env.storage().set(&pool_id, &pool);
        events::emit_pool_cancelled(&env, &pool_id, refund);
        Ok(refund)
    }
}