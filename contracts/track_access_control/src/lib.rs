#![no_std]

use soroban_sdk::{contractimpl, Address, Env, Symbol, Map};
mod error;
use error::Error;

#[derive(Clone)]
pub struct TrackAccess {
    pub track_id: String,
    pub artist: Address,
    pub min_tip_amount: i128,
    pub is_gated: bool,
    pub total_unlocks: u32,
    pub created_at: u64,
}

#[derive(Clone)]
pub struct AccessGrant {
    pub track_id: String,
    pub listener: Address,
    pub unlocked_at: u64,
    pub tip_amount_paid: i128,
}

pub struct TrackAccessControl;

#[contractimpl]
impl TrackAccessControl {

    // Storage keys
    fn track_key(track_id: &String) -> Symbol {
        Symbol::short(&format!("track_{}", track_id))
    }

    fn grant_key(track_id: &String, listener: &Address) -> Symbol {
        Symbol::short(&format!("grant_{}_{}", track_id, listener))
    }

    /// Artist sets a track gate
    pub fn set_track_access(env: Env, artist: Address, track_id: String, min_tip_amount: i128) -> Result<(), Error> {
        let caller = env.invoker();
        if caller != artist {
            return Err(Error::Unauthorized);
        }

        let track = TrackAccess {
            track_id: track_id.clone(),
            artist: artist.clone(),
            min_tip_amount,
            is_gated: true,
            total_unlocks: 0,
            created_at: env.ledger().timestamp(),
        };

        env.storage().set(&Self::track_key(&track_id), &track);

        // Emit event
        env.events().publish(
            (Symbol::short("TrackGateSet"),),
            (track_id.clone(), min_tip_amount),
        );

        Ok(())
    }

    /// Unlock a track by tipping
    pub fn unlock_track(env: Env, listener: Address, track_id: String, tip_amount: i128) -> Result<bool, Error> {
        let mut track: TrackAccess = env
            .storage()
            .get(&Self::track_key(&track_id))
            .ok_or(Error::TrackNotFound)?;

        // Check tip meets minimum
        if tip_amount < track.min_tip_amount {
            return Err(Error::TipTooLow);
        }

        // Check if already unlocked
        let grant_key = Self::grant_key(&track_id, &listener);
        if env.storage().has(&grant_key) {
            return Err(Error::AlreadyUnlocked);
        }

        // Save AccessGrant
        let grant = AccessGrant {
            track_id: track_id.clone(),
            listener: listener.clone(),
            unlocked_at: env.ledger().timestamp(),
            tip_amount_paid: tip_amount,
        };

        env.storage().set(&grant_key, &grant);

        // Update track unlock count
        track.total_unlocks += 1;
        env.storage().set(&Self::track_key(&track_id), &track);

        // Emit event
        env.events().publish(
            (Symbol::short("TrackUnlocked"),),
            (track_id.clone(), listener.clone(), tip_amount),
        );

        Ok(true)
    }

    /// Check if listener has access
    pub fn check_access(env: Env, listener: Address, track_id: String) -> bool {
        let grant_key = Self::grant_key(&track_id, &listener);
        env.storage().has(&grant_key)
    }

    /// Remove a track gate
    pub fn remove_gate(env: Env, artist: Address, track_id: String) -> Result<(), Error> {
        let caller = env.invoker();
        if caller != artist {
            return Err(Error::Unauthorized);
        }

        let mut track: TrackAccess = env
            .storage()
            .get(&Self::track_key(&track_id))
            .ok_or(Error::TrackNotFound)?;

        track.is_gated = false;
        env.storage().set(&Self::track_key(&track_id), &track);

        env.events().publish(
            (Symbol::short("TrackGateRemoved"),),
            (track_id.clone(),),
        );

        Ok(())
    }
}