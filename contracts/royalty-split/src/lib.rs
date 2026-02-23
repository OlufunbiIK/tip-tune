#![no_std]

use soroban_sdk::{contract, contractimpl, contracterror, contracttype, Address, Env, String, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidPercentage = 1,
    TotalNot100 = 2,
    TrackNotFound = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Split(String),
}

#[contract]
pub struct RoyaltySplit;

#[contractimpl]
impl RoyaltySplit {
    pub fn set_royalty_split(
        env: Env,
        track_id: String,
        collaborators: Vec<(Address, u32)>,
    ) -> Result<(), Error> {
        let mut total_percentage: u32 = 0;
        for param in collaborators.clone() {
            let (_, percentage) = param;
            if percentage <= 0 || percentage > 100 {
                return Err(Error::InvalidPercentage);
            }
            total_percentage += percentage;
        }

        if total_percentage != 100 {
            return Err(Error::TotalNot100);
        }

        env.storage().persistent().set(&DataKey::Split(track_id), &collaborators);
        Ok(())
    }

    pub fn distribute_royalties(
        env: Env,
        track_id: String,
        amount: i128,
    ) -> Result<Vec<(Address, i128)>, Error> {
        if amount <= 0 {
            // Nothing to distribute but return empty
            return Ok(Vec::new(&env));
        }
        
        let split: Vec<(Address, u32)> = env
            .storage()
            .persistent()
            .get(&DataKey::Split(track_id))
            .ok_or(Error::TrackNotFound)?;

        let mut distributions = Vec::new(&env);
        for param in split {
            let (collab, percentage) = param;
            let share = (amount * (percentage as i128)) / 100;
            distributions.push_back((collab, share));
        }

        Ok(distributions)
    }
}

mod test;
