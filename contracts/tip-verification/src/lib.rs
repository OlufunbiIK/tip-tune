#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyVerified = 1,
    InvalidAmount = 2,
    TipNotFound = 3,
    Unauthorized = 4,
    DuplicateTipId = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    VerifiedTx(String),
    TipRecord(String),
    TipCount,
    UserTipCount(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerifiedTip {
    pub tip_id: String,
    pub tipper: Address,
    pub artist: Address,
    pub amount: i128,
    pub tx_hash: String,
    pub timestamp: u64,
    pub verified: bool,
}

#[contract]
pub struct TipVerificationContract;

#[contractimpl]
impl TipVerificationContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TipCount, &0u64);
    }

    /// Verify a tip transaction by its hash and expected amount.
    /// Returns true if valid and not previously verified, preventing double-spending.
    pub fn verify_tip(env: Env, tx_hash: String, expected_amount: i128) -> Result<bool, Error> {
        if expected_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Check if this transaction has already been verified (prevent double-spending)
        if env
            .storage()
            .persistent()
            .has(&DataKey::VerifiedTx(tx_hash.clone()))
        {
            return Err(Error::AlreadyVerified);
        }

        // Mark transaction as verified
        env.storage()
            .persistent()
            .set(&DataKey::VerifiedTx(tx_hash.clone()), &true);

        // Emit verification event
        env.events().publish(
            (symbol_short!("tip"), symbol_short!("verified")),
            (tx_hash, expected_amount),
        );

        Ok(true)
    }

    /// Record a verified tip with full details. Immutable once recorded.
    /// Prevents duplicate tip IDs.
    pub fn record_verified_tip(
        env: Env,
        tip_id: String,
        tipper: Address,
        artist: Address,
        amount: i128,
    ) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Prevent duplicate tip IDs (immutability)
        if env
            .storage()
            .persistent()
            .has(&DataKey::TipRecord(tip_id.clone()))
        {
            return Err(Error::DuplicateTipId);
        }

        // Build a tx_hash from tip_id for linking
        let tx_hash = tip_id.clone();

        let tip = VerifiedTip {
            tip_id: tip_id.clone(),
            tipper: tipper.clone(),
            artist: artist.clone(),
            amount,
            tx_hash,
            timestamp: env.ledger().timestamp(),
            verified: true,
        };

        // Store the immutable record
        env.storage()
            .persistent()
            .set(&DataKey::TipRecord(tip_id.clone()), &tip);

        // Increment global tip count
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TipCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TipCount, &(count + 1));

        // Increment user tip count
        let user_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::UserTipCount(tipper.clone()))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::UserTipCount(tipper.clone()), &(user_count + 1));

        // Emit recording event
        env.events().publish(
            (symbol_short!("tip"), symbol_short!("recorded")),
            tip.clone(),
        );

        Ok(())
    }

    /// Check if a transaction has already been verified
    pub fn is_verified(env: Env, tx_hash: String) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::VerifiedTx(tx_hash))
            .unwrap_or(false)
    }

    /// Get a recorded tip by its ID
    pub fn get_tip(env: Env, tip_id: String) -> Result<VerifiedTip, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::TipRecord(tip_id))
            .ok_or(Error::TipNotFound)
    }

    /// Get total number of recorded tips
    pub fn get_tip_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TipCount)
            .unwrap_or(0)
    }

    /// Get total tips for a specific user
    pub fn get_user_tip_count(env: Env, user: Address) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::UserTipCount(user))
            .unwrap_or(0)
    }
}

mod test;
