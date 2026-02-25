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
        asset_address: Address,
        unlock_time: u64,
        message: String,
    ) -> Result<String, Error> {
        tipper.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let current_time = env.ledger().timestamp();
        if unlock_time <= current_time {
            return Err(Error::InvalidUnlockTime);
        }

        // Lock funds inside contract
        let token_client = token::Client::new(&env, &asset_address);
        token_client.transfer(&tipper, &env.current_contract_address(), &amount);

        let counter = storage::increment_counter(&env);
        
        // Generate lock_id (simple string conversion of counter)
        let mut buf = [0u8; 10];
        let mut i = 10;
        let mut n = counter;
        if n == 0 {
            i -= 1;
            buf[i] = b'0';
        } else {
            while n > 0 {
                i -= 1;
                buf[i] = b'0' + (n % 10) as u8;
                n /= 10;
            }
        }
        let lock_id_str = core::str::from_utf8(&buf[i..]).unwrap();
        let lock_id = String::from_slice(&env, lock_id_str);

        let tip = TimeLockTip {
            lock_id: lock_id.clone(),
            tipper,
            artist,
            amount,
            asset: Asset::Token(asset_address),
            unlock_time,
            message,
            status: TimeLockStatus::Locked,
            created_at: current_time,
        };

        storage::save_tip(&env, lock_id.clone(), &tip);

        // Emit event
        env.events().publish(
            (symbol_short!("tip_lock"), tip.tipper.clone(), tip.artist.clone()),
            tip.clone(),
        );

        Ok(lock_id)
    }

    pub fn claim_tip(
        env: Env,
        lock_id: String,
        artist: Address,
    ) -> Result<i128, Error> {
        artist.require_auth();

        let mut tip = storage::get_tip(&env, lock_id).ok_or(Error::LockNotFound)?;

        if tip.artist != artist {
            return Err(Error::Unauthorized);
        }

        if tip.status != TimeLockStatus::Locked {
            return Err(Error::AlreadyClaimedOrRefunded);
        }

        let current_time = env.ledger().timestamp();
        if current_time < tip.unlock_time {
            return Err(Error::NotUnlockedYet);
        }

        tip.status = TimeLockStatus::Claimed;
        storage::update_tip(&env, &tip);

        // Transfer funds to artist
        match &tip.asset {
            Asset::Token(token_address) => {
                let token_client = token::Client::new(&env, token_address);
                token_client.transfer(&env.current_contract_address(), &artist, &tip.amount);
            }
        }

        // Emit event
        env.events().publish(
            (symbol_short!("tip_claim"), tip.tipper.clone(), tip.artist.clone()),
            tip.clone(),
        );

        Ok(tip.amount)
    }

    pub fn refund_tip(
        env: Env,
        lock_id: String,
        tipper: Address,
    ) -> Result<(), Error> {
        tipper.require_auth();

        let mut tip = storage::get_tip(&env, lock_id).ok_or(Error::LockNotFound)?;

        if tip.tipper != tipper {
            return Err(Error::Unauthorized);
        }

        if tip.status != TimeLockStatus::Locked {
            return Err(Error::AlreadyClaimedOrRefunded);
        }

        let current_time = env.ledger().timestamp();
        // Refund available 30 days after unlock_time
        let refund_delay = 30 * 24 * 60 * 60; // 30 days in seconds
        if current_time < tip.unlock_time + refund_delay {
            return Err(Error::RefundNotAvailableYet);
        }

        tip.status = TimeLockStatus::Refunded;
        storage::update_tip(&env, &tip);

        // Transfer funds back to tipper
        match &tip.asset {
            Asset::Token(token_address) => {
                let token_client = token::Client::new(&env, token_address);
                token_client.transfer(&env.current_contract_address(), &tipper, &tip.amount);
            }
        }

        // Emit event
        env.events().publish(
            (symbol_short!("tip_rfnd"), tip.tipper.clone(), tip.artist.clone()),
            tip.clone(),
        );

        Ok(())
    }

    pub fn get_pending_tips(
        env: Env,
        artist: Address,
    ) -> Vec<TimeLockTip> {
        Vec::new(&env)
    }
}
