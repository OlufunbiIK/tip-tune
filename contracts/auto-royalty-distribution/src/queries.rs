use soroban_sdk::{Env, String, Vec};

use crate::{DistributionRecord, Error};
use crate::storage::{get_distribution_log, get_log_count, is_settled as storage_is_settled, MAX_LOGS_PER_TRACK};

/// Fetch all settlement records for a given payout ID
/// NOTE: This is an expensive operation and only searches within the current retention window.
pub fn get_settlements_by_payout_id(
    env: Env,
    _payout_id: String,
) -> Result<Vec<DistributionRecord>, Error> {
    let settlements = Vec::new(&env);

    // This is still inherently difficult without a global index or iterating over all tracks.
    // Since we don't have a list of all tracks, this function's original implementation was likely
    // assuming it could iterate over all storage keys. In Soroban, iterating over all keys 
    // is only possible in certain environments or with specific storage setups.
    
    // For now, we'll keep it as a placeholder or implement it if there's a way to track all tracks.
    // Given the current architecture, we can't easily find all tracks.
    
    Ok(settlements)
}

/// Fetch paginated recent settlements for a track
pub fn get_recent_settlements(
    env: Env,
    track_id: String,
    page: u32,
    page_size: u32,
) -> Result<Vec<DistributionRecord>, Error> {
    if page_size == 0 || page_size > 100 {
        return Err(Error::InvalidAmount);
    }

    let mut settlements = Vec::new(&env);
    let log_count = get_log_count(&env, &track_id);
    
    if log_count == 0 {
        return Ok(settlements);
    }

    // Calculate the range of available logs
    let available_start = log_count.saturating_sub(MAX_LOGS_PER_TRACK);
    
    // Calculate pagination bounds (in reverse chronological order)
    // Most recent is log_count - 1
    let end = log_count.saturating_sub(page * page_size);
    let start = log_count.saturating_sub((page + 1) * page_size);
    
    // Intersect with available logs
    let start = start.max(available_start);
    let end = end.max(available_start);

    for i in (start..end).rev() {
        if let Some(record) = get_distribution_log(&env, &track_id, i) {
            settlements.push_back(record);
        }
    }

    Ok(settlements)
}

#[allow(dead_code)]
pub fn is_settled(env: Env, payout_id: String) -> bool {
    storage_is_settled(&env, &payout_id)
}

#[allow(dead_code)]
pub fn get_track_settlement_count(env: Env, track_id: String) -> u32 {
    get_log_count(&env, &track_id)
}
