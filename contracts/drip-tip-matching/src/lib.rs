#![no_std]
use soroban_sdk::{contractimpl, Address, Env, Vec, Symbol, symbol_short};
mod types;
mod errors;
mod events;

use types::{MatchingPool, PoolStatus};
use errors::Error;
use events::*;

#[derive(Clone)]
pub enum DataKey {
    Pool(Vec<u8>),
}

pub struct TipMatchingContract;

#[contractimpl]
impl TipMatchingContract {
    /// Create a new matching pool with sponsor funding.
    /// 
    /// # Arguments
    /// * `sponsor` - The address funding the matching pool
    /// * `artist` - The recipient benefiting from the matches
    /// * `pool_amount` - Total amount sponsor contributes (sponsor's budget)
    /// * `match_ratio` - Match ratio (100 = 1:1, 50 = 1:2, etc.)
    /// * `match_cap_total` - Maximum total amount to match (0 for unlimited)
    /// * `end_time` - Timestamp when pool expires
    pub fn create_matching_pool(
        env: Env,
        sponsor: Address,
        artist: Address,
        pool_amount: i128,
        match_ratio: u32,
        match_cap_total: i128,
        end_time: u64,
    ) -> Result<Vec<u8>, Error> {
        sponsor.require_auth();

        // Validate parameters
        if pool_amount <= 0 {
            return Err(Error::InvalidParameters);
        }
        if match_ratio == 0 {
            return Err(Error::InvalidMatchRatio);
        }
        if match_cap_total != 0 && match_cap_total < pool_amount {
            return Err(Error::InvalidMatchCap);
        }
        if end_time <= env.ledger().timestamp() {
            return Err(Error::InvalidParameters);
        }

        // Generate unique pool ID from timestamp and sponsor
        let mut pool_id_data = sponsor.0.to_bytes();
        pool_id_data.append(&mut env.ledger().timestamp().to_be_bytes().into());
        let pool_id = env.crypto().sha256(&pool_id_data);

        let pool = MatchingPool {
            pool_id: pool_id.clone(),
            sponsor: sponsor.clone(),
            artist: artist.clone(),
            pool_amount,
            matched_amount: 0,
            remaining_amount: pool_amount,
            match_ratio,
            match_cap_total,
            start_time: env.ledger().timestamp(),
            end_time,
            status: PoolStatus::Active,
            created_at: env.ledger().timestamp(),
            refunded_at: 0,
        };

        env.storage().persistent().set(&DataKey::Pool(pool_id.clone()), &pool);

        emit_pool_created(
            &env,
            &pool_id,
            &sponsor,
            &artist,
            pool_amount,
            match_ratio,
            match_cap_total,
            end_time,
        );

        Ok(pool_id)
    }

    /// Apply matching to a tip.
    /// Calculates matched amount based on pool's ratio, cap, and available funds.
    /// Enforces guardrails to prevent overmatching.
    pub fn apply_match(
        env: Env,
        pool_id: Vec<u8>,
        tip_amount: i128,
        tipper: Address,
    ) -> Result<i128, Error> {
        if tip_amount <= 0 {
            return Err(Error::InvalidParameters);
        }

        let mut pool: MatchingPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(pool_id.clone()))
            .ok_or(Error::PoolNotFound)?;

        // Check pool status and timing
        let current_time = env.ledger().timestamp();
        if current_time > pool.end_time {
            pool.status = PoolStatus::Expired;
            env.storage().persistent().set(&DataKey::Pool(pool_id.clone()), &pool);
            emit_pool_depleted(&env, &pool_id, symbol_short!("expired"), pool.matched_amount);
            return Err(Error::PoolExpired);
        }

        if pool.status != PoolStatus::Active {
            return Err(Error::PoolNotActive);
        }

        if pool.remaining_amount <= 0 {
            pool.status = PoolStatus::Exhausted;
            env.storage().persistent().set(&DataKey::Pool(pool_id.clone()), &pool);
            emit_pool_depleted(&env, &pool_id, symbol_short!("exhausted"), pool.matched_amount);
            return Err(Error::EmptyPool);
        }

        // Calculate match amount from tip
        let matched_amount = (tip_amount as i128)
            .checked_mul(pool.match_ratio as i128)
            .ok_or(Error::InsufficientPoolAmount)?
            .checked_div(100)
            .ok_or(Error::InsufficientPoolAmount)?;

        // Apply cap constraints
        let mut actual_match = matched_amount;

        // Constraint 1: Cannot exceed remaining sponsor budget
        if actual_match > pool.remaining_amount {
            actual_match = pool.remaining_amount;
        }

        // Constraint 2: Cannot exceed total match cap if configured
        if pool.match_cap_total > 0 {
            let max_allowed = pool.match_cap_total
                .checked_sub(pool.matched_amount)
                .ok_or(Error::MatchWouldExceedCap)?;
            if actual_match > max_allowed {
                // Would exceed cap
                if max_allowed <= 0 {
                    pool.status = PoolStatus::Exhausted;
                    env.storage().persistent().set(&DataKey::Pool(pool_id.clone()), &pool);
                    emit_pool_depleted(&env, &pool_id, symbol_short!("capped"), pool.matched_amount);
                    return Err(Error::MatchWouldExceedCap);
                }
                actual_match = max_allowed;
            }
        }

        // Update pool accounting
        pool.matched_amount = pool.matched_amount
            .checked_add(actual_match)
            .ok_or(Error::InsufficientPoolAmount)?;
        pool.remaining_amount = pool.remaining_amount
            .checked_sub(actual_match)
            .ok_or(Error::InsufficientPoolAmount)?;

        // Check if pool is now exhausted
        if pool.remaining_amount <= 0 || (pool.match_cap_total > 0 && pool.matched_amount >= pool.match_cap_total) {
            pool.status = PoolStatus::Exhausted;
        }

        env.storage().persistent().set(&DataKey::Pool(pool_id.clone()), &pool);

        emit_tip_matched(&env, &pool_id, &tipper, tip_amount, actual_match, pool.matched_amount);

        Ok(actual_match)
    }

    /// Get current pool status
    pub fn get_pool_status(env: Env, pool_id: Vec<u8>) -> Result<MatchingPool, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Pool(pool_id))
            .ok_or(Error::PoolNotFound)
    }

    /// Get remaining match budget for a pool
    pub fn get_remaining_budget(env: Env, pool_id: Vec<u8>) -> Result<i128, Error> {
        let pool: MatchingPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(pool_id))
            .ok_or(Error::PoolNotFound)?;

        Ok(pool.remaining_amount)
    }

    /// Get total matched amount so far
    pub fn get_matched_amount(env: Env, pool_id: Vec<u8>) -> Result<i128, Error> {
        let pool: MatchingPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(pool_id))
            .ok_or(Error::PoolNotFound)?;

        Ok(pool.matched_amount)
    }

    /// Cancel a pool and return unmatched funds to sponsor.
    /// Only the sponsor can cancel.
    pub fn cancel_pool(
        env: Env,
        pool_id: Vec<u8>,
        sponsor: Address,
    ) -> Result<i128, Error> {
        sponsor.require_auth();

        let mut pool: MatchingPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(pool_id.clone()))
            .ok_or(Error::PoolNotFound)?;

        // Verify sponsor authorization
        if pool.sponsor != sponsor {
            return Err(Error::Unauthorized);
        }

        // Check if already refunded
        if pool.refunded_at > 0 {
            return Err(Error::PoolAlreadyRefunded);
        }

        let refund = pool.remaining_amount;
        pool.remaining_amount = 0;
        pool.status = PoolStatus::Cancelled;
        pool.refunded_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Pool(pool_id.clone()), &pool);

        emit_pool_cancelled(&env, &pool_id, refund, pool.matched_amount);

        Ok(refund)
    }

    /// Close a pool after end_time or when depleted.
    /// Anyone can close an inactive pool.
    pub fn close_pool(
        env: Env,
        pool_id: Vec<u8>,
    ) -> Result<(), Error> {
        let mut pool: MatchingPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(pool_id.clone()))
            .ok_or(Error::PoolNotFound)?;

        let current_time = env.ledger().timestamp();

        // Can close if:
        // 1. Pool is exhausted, or
        // 2. Pool has expired and enough time has passed
        let can_close = pool.status == PoolStatus::Exhausted
            || (current_time > pool.end_time && pool.status != PoolStatus::Cancelled);

        if !can_close {
            return Err(Error::PoolNotActive);
        }

        let reason = if current_time > pool.end_time {
            symbol_short!("expired")
        } else {
            symbol_short!("depleted")
        };

        pool.status = PoolStatus::Closed;

        env.storage().persistent().set(&DataKey::Pool(pool_id.clone()), &pool);

        emit_pool_closed(&env, &pool_id, reason, pool.matched_amount);

        Ok(())
    }

    /// Check if pool is active (not expired or exhausted)
    pub fn is_pool_active(env: Env, pool_id: Vec<u8>) -> Result<bool, Error> {
        let pool: MatchingPool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(pool_id))
            .ok_or(Error::PoolNotFound)?;

        if pool.status != PoolStatus::Active {
            return Ok(false);
        }

        if env.ledger().timestamp() > pool.end_time {
            return Ok(false);
        }

        if pool.remaining_amount <= 0 {
            return Ok(false);
        }

        Ok(true)
    }
}