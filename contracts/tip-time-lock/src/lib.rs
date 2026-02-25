#![no_std]

mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, String, Vec};
use types::{Asset, Error, TimeLockStatus, TimeLockTip};

#[contract]
pub struct TimeLockContract;

#[contractimpl]
impl TimeLockContract {
    pub fn create_time_lock_tip(
        env: Env,
        tipper: Address,
        artist: Address,
        amount: i128,
        unlock_time: u64,
        message: String,
    ) -> Result<String, Error> {
        // Implementation will follow in next commit
        Err(Error::Unauthorized)
    }

    pub fn claim_tip(
        env: Env,
        lock_id: String,
        artist: Address,
    ) -> Result<i128, Error> {
        Err(Error::Unauthorized)
    }

    pub fn refund_tip(
        env: Env,
        lock_id: String,
        tipper: Address,
    ) -> Result<(), Error> {
        Err(Error::Unauthorized)
    }

    pub fn get_pending_tips(
        env: Env,
        artist: Address,
    ) -> Vec<TimeLockTip> {
        Vec::new(&env)
    }
}
