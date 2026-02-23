#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidPercentage = 1,
    TotalExceeds100 = 2,
    TrackNotFound = 3,
    InvalidAmount = 4,
    NoCollaborators = 5,
    InvalidAsset = 6,
}

/// Represents a supported asset type
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Asset {
    Native,
    Token(Address),
}

/// Collaborator split configuration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Collaborator {
    pub address: Address,
    pub percentage: u32, // Basis points (100 = 1%, 10000 = 100%)
}

/// Distribution record for a single payout
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DistributionRecord {
    pub track_id: String,
    pub total_amount: i128,
    pub asset: Asset,
    pub distributions: Vec<(Address, i128)>,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    TrackSplits(String),
    DistributionLog(String),
    DistributionCount,
}

#[contract]
pub struct AutoRoyaltyDistribution;

#[contractimpl]
impl AutoRoyaltyDistribution {
    /// Set up collaborator splits for a track. Percentages are in basis points (10000 = 100%).
    pub fn set_splits(
        env: Env,
        track_id: String,
        collaborators: Vec<Collaborator>,
    ) -> Result<(), Error> {
        if collaborators.is_empty() {
            return Err(Error::NoCollaborators);
        }

        let mut total: u32 = 0;
        for collab in collaborators.iter() {
            if collab.percentage == 0 || collab.percentage > 10000 {
                return Err(Error::InvalidPercentage);
            }
            total += collab.percentage;
        }

        if total > 10000 {
            return Err(Error::TotalExceeds100);
        }

        env.storage()
            .persistent()
            .set(&DataKey::TrackSplits(track_id.clone()), &collaborators);

        env.events()
            .publish((symbol_short!("splits"), symbol_short!("set")), track_id);

        Ok(())
    }

    /// Get split configuration for a track
    pub fn get_splits(env: Env, track_id: String) -> Result<Vec<Collaborator>, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::TrackSplits(track_id))
            .ok_or(Error::TrackNotFound)
    }

    /// Receive a tip/royalty and automatically distribute it among collaborators.
    /// Handles rounding by giving remainder to the first collaborator (no loss).
    pub fn receive_and_distribute(
        env: Env,
        track_id: String,
        amount: i128,
        asset: Asset,
    ) -> Result<Vec<(Address, i128)>, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let collaborators: Vec<Collaborator> = env
            .storage()
            .persistent()
            .get(&DataKey::TrackSplits(track_id.clone()))
            .ok_or(Error::TrackNotFound)?;

        let mut distributions: Vec<(Address, i128)> = Vec::new(&env);
        let mut distributed: i128 = 0;

        // Calculate each collaborator's share
        for i in 0..collaborators.len() {
            let collab = collaborators.get(i).unwrap();
            let share = (amount * collab.percentage as i128) / 10000;
            distributions.push_back((collab.address.clone(), share));
            distributed += share;
        }

        // Handle rounding remainder — give it to the first collaborator to prevent loss
        let remainder = amount - distributed;
        if remainder > 0 && !distributions.is_empty() {
            let first = distributions.get(0).unwrap();
            distributions.set(0, (first.0, first.1 + remainder));
        }

        // Log the distribution
        let record = DistributionRecord {
            track_id: track_id.clone(),
            total_amount: amount,
            asset: asset.clone(),
            distributions: distributions.clone(),
            timestamp: env.ledger().timestamp(),
        };

        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::DistributionCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::DistributionCount, &(count + 1));

        // Emit distribution event
        env.events()
            .publish((symbol_short!("royalty"), symbol_short!("dist")), record);

        Ok(distributions)
    }

    /// Batch distribute royalties for multiple tracks at once (gas optimization).
    pub fn batch_distribute(
        env: Env,
        distributions: Vec<(String, i128, Asset)>,
    ) -> Result<(), Error> {
        for dist in distributions.iter() {
            let (track_id, amount, asset) = dist;
            Self::receive_and_distribute(env.clone(), track_id, amount, asset)?;
        }

        Ok(())
    }

    /// Get the total number of distributions processed
    pub fn get_distribution_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::DistributionCount)
            .unwrap_or(0)
    }
}

mod test;
