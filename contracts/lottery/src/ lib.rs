#![no_std]

use soroban_sdk::{contractimpl, Env, Address, Vec, Symbol};
mod error;
use error::LotteryError;

#[derive(Clone)]
pub struct LotteryPool {
    pub pool_id: String,
    pub artist: Address,
    pub balance: i128,
    pub contribution_rate: u32,
    pub draw_time: u64,
    pub status: LotteryStatus,
    pub winner: Option<Address>,
    pub created_at: u64,
}

#[derive(Clone)]
pub struct LotteryEntry {
    pub pool_id: String,
    pub tipper: Address,
    pub tickets: u32,
    pub tip_amount: i128,
    pub entered_at: u64,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum LotteryStatus {
    Open,
    Drawing,
    Completed,
}

pub struct LotteryContract;

#[contractimpl]
impl LotteryContract {
    pub fn create_lottery(
        env: Env,
        pool_id: String,
        artist: Address,
        contribution_rate: u32,
        draw_time: u64,
    ) -> Result<(), LotteryError> {
        let pools = env.storage().persistent().get::<String, LotteryPool>("pools").unwrap_or_default();

        if pools.iter().any(|p| p.pool_id == pool_id) {
            return Err(LotteryError::PoolAlreadyExists);
        }

        let pool = LotteryPool {
            pool_id: pool_id.clone(),
            artist,
            balance: 0,
            contribution_rate,
            draw_time,
            status: LotteryStatus::Open,
            winner: None,
            created_at: env.ledger().timestamp(),
        };

        let mut pools = pools;
        pools.push_back(pool);
        env.storage().persistent().set("pools", &pools);
        Ok(())
    }

    pub fn enter_lottery(
        env: Env,
        pool_id: String,
        tipper: Address,
        tip_amount: i128,
    ) -> Result<u32, LotteryError> {
        let mut pools: Vec<LotteryPool> = env.storage().persistent().get("pools").unwrap_or_default();
        let pool_index = pools.iter().position(|p| p.pool_id == pool_id).ok_or(LotteryError::PoolNotFound)?;

        let mut pool = pools.get(pool_index).unwrap();
        if pool.status != LotteryStatus::Open {
            return Err(LotteryError::LotteryNotOpen);
        }

        // Calculate contribution to pool
        let contribution = tip_amount * (pool.contribution_rate as i128) / 100;
        pool.balance += contribution;

        // Calculate tickets (1 ticket per 10 XLM as example)
        let tickets = (tip_amount / 10) as u32;

        // Save entry
        let mut entries: Vec<LotteryEntry> = env.storage().persistent().get(&pool_id).unwrap_or_default();
        entries.push_back(LotteryEntry {
            pool_id: pool_id.clone(),
            tipper: tipper.clone(),
            tickets,
            tip_amount,
            entered_at: env.ledger().timestamp(),
        });
        env.storage().persistent().set(&pool_id, &entries);

        pools.set(pool_index, pool);
        env.storage().persistent().set("pools", &pools);

        Ok(tickets)
    }

    pub fn draw_winner(env: Env, pool_id: String) -> Result<Address, LotteryError> {
        let mut pools: Vec<LotteryPool> = env.storage().persistent().get("pools").unwrap_or_default();
        let pool_index = pools.iter().position(|p| p.pool_id == pool_id).ok_or(LotteryError::PoolNotFound)?;
        let mut pool = pools.get(pool_index).unwrap();

        if pool.status != LotteryStatus::Open || env.ledger().timestamp() < pool.draw_time {
            return Err(LotteryError::LotteryNotDrawingTime);
        }

        let entries: Vec<LotteryEntry> = env.storage().persistent().get(&pool_id).unwrap_or_default();
        if entries.is_empty() {
            return Err(LotteryError::LotteryNotOpen);
        }

        // Simple pseudo-randomness based on ledger timestamp and number of entries
        let rand_index = (env.ledger().timestamp() % (entries.len() as u64)) as usize;
        let winner_address = entries.get(rand_index).unwrap().tipper.clone();
        pool.winner = Some(winner_address.clone());
        pool.status = LotteryStatus::Completed;

        pools.set(pool_index, pool);
        env.storage().persistent().set("pools", &pools);

        Ok(winner_address)
    }

    pub fn claim_prize(env: Env, pool_id: String, caller: Address) -> Result<i128, LotteryError> {
        let mut pools: Vec<LotteryPool> = env.storage().persistent().get("pools").unwrap_or_default();
        let pool_index = pools.iter().position(|p| p.pool_id == pool_id).ok_or(LotteryError::PoolNotFound)?;
        let mut pool = pools.get(pool_index).unwrap();

        let winner = pool.winner.clone().ok_or(LotteryError::NotWinner)?;
        if winner != caller {
            return Err(LotteryError::NotWinner);
        }

        let prize = pool.balance;
        pool.balance = 0;
        pools.set(pool_index, pool);
        env.storage().persistent().set("pools", &pools);

        Ok(prize)
    }
}