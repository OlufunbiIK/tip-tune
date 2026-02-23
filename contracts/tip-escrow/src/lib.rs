#![no_std]

mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, String, Vec};
use types::{Asset, Error, RoyaltySplit, TipEscrow, TipRecord};

#[contract]
pub struct TipEscrowContract;

#[contractimpl]
impl TipEscrowContract {
    pub fn create_escrow(
        env: Env,
        tipper: Address,
        artist: Address,
        amount: i128,
        asset: Asset,
    ) -> Result<String, Error> {
        tipper.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Lock funds inside contract
        match &asset {
            Asset::Token(token_address) => {
                let token_client = token::Client::new(&env, token_address);
                token_client.transfer(&tipper, &env.current_contract_address(), &amount);
            }
        }

        let mut counter: u32 = env
            .storage()
            .instance()
            .get(&symbol_short!("CNT"))
            .unwrap_or(0);
        counter += 1;
        env.storage()
            .instance()
            .set(&symbol_short!("CNT"), &counter);

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

        let escrow_id = String::from_slice(&env, &buf[i..]);

        let escrow = TipEscrow {
            escrow_id: escrow_id.clone(),
            tipper,
            artist,
            amount,
            asset,
        };

        storage::save_escrow(&env, escrow_id.clone(), &escrow);

        // Emit event
        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("created")),
            escrow.clone(),
        );

        Ok(escrow_id)
    }

    pub fn get_escrow(env: Env, escrow_id: String) -> Result<TipEscrow, Error> {
        storage::get_escrow(&env, escrow_id).ok_or(Error::EscrowNotFound)
    }

    /// Send a tip to an artist with optional royalty distribution
    pub fn send_tip(
        env: Env,
        sender: Address,
        artist: Address,
        token_address: Address,
        amount: i128,
    ) -> u64 {
        sender.require_auth();

        let token_client = token::Client::new(&env, &token_address);
        let tip_id = env.ledger().sequence() as u64;

        // Check if artist has royalty splits configured
        if let Some(splits) = storage::get_splits(&env, &artist) {
            // Distribute according to splits
            let mut remaining = amount;

            for split in splits.iter() {
                let split_amount = (amount * split.percentage as i128) / 10000;
                if split_amount > 0 {
                    token_client.transfer(&sender, &split.recipient, &split_amount);
                    remaining -= split_amount;
                }
            }

            // Send remaining to artist
            if remaining > 0 {
                token_client.transfer(&sender, &artist, &remaining);
            }
        } else {
            // No splits, send full amount to artist
            token_client.transfer(&sender, &artist, &amount);
        }

        // Record tip
        let tip = TipRecord {
            sender: sender.clone(),
            artist: artist.clone(),
            amount,
            timestamp: env.ledger().timestamp(),
        };
        storage::save_tip(&env, tip_id, &tip);

        tip_id
    }

    /// Configure royalty splits for an artist
    pub fn set_royalty_splits(env: Env, artist: Address, splits: Vec<RoyaltySplit>) {
        artist.require_auth();

        // Validate splits total <= 100%
        let total: u32 = splits.iter().map(|s| s.percentage).sum();
        assert!(total <= 10000, "Total splits exceed 100%");

        storage::save_splits(&env, &artist, &splits);
    }

    /// Get royalty splits for an artist
    pub fn get_royalty_splits(env: Env, artist: Address) -> Option<Vec<RoyaltySplit>> {
        storage::get_splits(&env, &artist)
    }

    /// Get all tips
    pub fn get_tips(env: Env) -> Vec<TipRecord> {
        storage::get_tips(&env)
    }
}
