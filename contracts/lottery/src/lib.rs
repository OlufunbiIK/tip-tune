#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Env, Address, Vec, Symbol, String};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum LotteryError {
    PoolAlreadyExists = 1,
    PoolNotFound = 2,
    LotteryNotOpen = 3,
    LotteryNotDrawingTime = 4,
    NotWinner = 5,
    AlreadyClaimed = 6,
    InvalidStatus = 7,
    Unauthorized = 8,
    NoRefundAvailable = 9,
    ClaimWindowExpired = 10,
    InsufficientTickets = 11,
}

#[contracttype]
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
    pub claimed: bool,
    pub cancelled_at: Option<u64>,
}

#[contracttype]
#[derive(Clone)]
pub struct LotteryEntry {
    pub pool_id: String,
    pub tipper: Address,
    pub tickets: u32,
    pub tip_amount: i128,
    pub entered_at: u64,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum LotteryStatus {
    Open = 0,
    Drawing = 1,
    Completed = 2,
    Cancelled = 3,
}

#[contract]
pub struct Lottery;

#[contractimpl]
impl Lottery {
    pub fn create_lottery(
        env: Env,
        pool_id: String,
        artist: Address,
        contribution_rate: u32,
        draw_time: u64,
    ) -> Result<(), LotteryError> {
        artist.require_auth();

        let pool_key = Symbol::new(&env, "pool");
        let pool_ids_key = Symbol::new(&env, "pool_ids");

        let mut pool_ids: Vec<String> = env.storage().persistent().get(&pool_ids_key).unwrap_or_else(|| Vec::new(&env));

        if pool_ids.iter().any(|p| p == pool_id) {
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
            claimed: false,
            cancelled_at: None,
        };

        env.storage().persistent().set(&(pool_key, pool_id.clone()), &pool);
        pool_ids.push_back(pool_id);
        env.storage().persistent().set(&pool_ids_key, &pool_ids);

        Ok(())
    }

    pub fn enter_lottery(
        env: Env,
        pool_id: String,
        tipper: Address,
        tip_amount: i128,
    ) -> Result<u32, LotteryError> {
        tipper.require_auth();

        let pool_key = Symbol::new(&env, "pool");
        let mut pool: LotteryPool = env.storage().persistent().get(&(pool_key.clone(), pool_id.clone())).ok_or(LotteryError::PoolNotFound)?;

        if pool.status != LotteryStatus::Open {
            return Err(LotteryError::LotteryNotOpen);
        }

        if env.ledger().timestamp() >= pool.draw_time {
            return Err(LotteryError::LotteryNotOpen);
        }

        // Calculate contribution to pool
        let contribution = tip_amount * (pool.contribution_rate as i128) / 100;
        pool.balance += contribution;

        // Calculate tickets (1 ticket per 10 XLM)
        let tickets = (tip_amount / 10) as u32;
        if tickets == 0 {
            return Err(LotteryError::InsufficientTickets);
        }

        // Save entry
        let mut entries: Vec<LotteryEntry> = env.storage().persistent().get(&pool_id).unwrap_or_else(|| Vec::new(&env));
        entries.push_back(LotteryEntry {
            pool_id: pool_id.clone(),
            tipper: tipper.clone(),
            tickets,
            tip_amount,
            entered_at: env.ledger().timestamp(),
        });
        env.storage().persistent().set(&pool_id, &entries);

        env.storage().persistent().set(&(pool_key, pool_id), &pool);

        Ok(tickets)
    }

    pub fn draw_winner(env: Env, pool_id: String) -> Result<Address, LotteryError> {
        let pool_key = Symbol::new(&env, "pool");
        let mut pool: LotteryPool = env.storage().persistent().get(&(pool_key.clone(), pool_id.clone())).ok_or(LotteryError::PoolNotFound)?;

        if pool.status != LotteryStatus::Open {
            return Err(LotteryError::LotteryNotOpen);
        }

        if env.ledger().timestamp() < pool.draw_time {
            return Err(LotteryError::LotteryNotDrawingTime);
        }

        let entries: Vec<LotteryEntry> = env.storage().persistent().get(&pool_id).unwrap_or_else(|| Vec::new(&env));
        if entries.is_empty() {
            return Err(LotteryError::LotteryNotOpen);
        }

        // Weighted winner selection using PRNG
        let total_tickets: u32 = entries.iter().map(|e| e.tickets).sum();
        let winning_ticket: u32 = env.prng().gen_range::<u64>(0..total_tickets as u64) as u32;

        let mut current_sum: u32 = 0;
        let mut winner_address = entries.get(0).unwrap().tipper.clone();

        for entry in entries.iter() {
            current_sum += entry.tickets;
            if winning_ticket < current_sum {
                winner_address = entry.tipper.clone();
                break;
            }
        }

        pool.winner = Some(winner_address.clone());
        pool.status = LotteryStatus::Completed;

        env.storage().persistent().set(&(pool_key, pool_id), &pool);

        Ok(winner_address)
    }

    pub fn cancel_lottery(env: Env, pool_id: String) -> Result<(), LotteryError> {
        let pool_key = Symbol::new(&env, "pool");
        let mut pool: LotteryPool = env.storage().persistent().get(&(pool_key.clone(), pool_id.clone())).ok_or(LotteryError::PoolNotFound)?;

        pool.artist.require_auth();

        if pool.status != LotteryStatus::Open {
            return Err(LotteryError::InvalidStatus);
        }

        pool.status = LotteryStatus::Cancelled;
        pool.cancelled_at = Some(env.ledger().timestamp());

        env.storage().persistent().set(&(pool_key, pool_id), &pool);

        Ok(())
    }

    pub fn claim_refund(env: Env, pool_id: String, tipper: Address) -> Result<i128, LotteryError> {
        tipper.require_auth();

        let pool_key = Symbol::new(&env, "pool");
        let pool: LotteryPool = env.storage().persistent().get(&(pool_key.clone(), pool_id.clone())).ok_or(LotteryError::PoolNotFound)?;

        if pool.status != LotteryStatus::Cancelled {
            return Err(LotteryError::NoRefundAvailable);
        }

        let entries: Vec<LotteryEntry> = env.storage().persistent().get(&pool_id).ok_or(LotteryError::PoolNotFound)?;
        
        let mut refund_amount = 0;
        let mut found = false;
        let mut new_entries = Vec::new(&env);

        for entry in entries.iter() {
            if entry.tipper == tipper {
                refund_amount += entry.tip_amount * (pool.contribution_rate as i128) / 100;
                found = true;
            } else {
                new_entries.push_back(entry);
            }
        }

        if !found {
            return Err(LotteryError::NoRefundAvailable);
        }

        env.storage().persistent().set(&pool_id, &new_entries);

        Ok(refund_amount)
    }

    pub fn claim_prize(env: Env, pool_id: String, caller: Address) -> Result<i128, LotteryError> {
        caller.require_auth();

        let pool_key = Symbol::new(&env, "pool");
        let mut pool: LotteryPool = env.storage().persistent().get(&(pool_key.clone(), pool_id.clone())).ok_or(LotteryError::PoolNotFound)?;

        if pool.status != LotteryStatus::Completed {
            return Err(LotteryError::InvalidStatus);
        }

        if pool.claimed {
            return Err(LotteryError::AlreadyClaimed);
        }

        let winner = pool.winner.clone().ok_or(LotteryError::NotWinner)?;
        if winner != caller {
            return Err(LotteryError::NotWinner);
        }

        // Claim window: 7 days
        let claim_window = 604800;
        if env.ledger().timestamp() > pool.draw_time + claim_window {
            return Err(LotteryError::ClaimWindowExpired);
        }

        let prize = pool.balance;
        pool.balance = 0;
        pool.claimed = true;

        env.storage().persistent().set(&(pool_key, pool_id), &pool);

        Ok(prize)
    }
}