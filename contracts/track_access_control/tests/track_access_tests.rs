#![cfg(test)]
use soroban_sdk::{testutils::Env as _, Address, Env};
use track_access_control::{TrackAccessControl, Error};

#[test]
fn test_track_gate_and_unlock() {
    let env = Env::default();
    let artist = Address::random(&env);
    let listener = Address::random(&env);

    // Set gate
    TrackAccessControl::set_track_access(env.clone(), artist.clone(), "track1".to_string(), 50).unwrap();

    // Unlock with insufficient tip
    let result = TrackAccessControl::unlock_track(env.clone(), listener.clone(), "track1".to_string(), 30);
    assert_eq!(result, Err(Error::TipTooLow));

    // Unlock with sufficient tip
    assert_eq!(TrackAccessControl::unlock_track(env.clone(), listener.clone(), "track1".to_string(), 50), Ok(true));

    // Check access
    assert!(TrackAccessControl::check_access(env.clone(), listener.clone(), "track1".to_string()));

    // Remove gate
    assert_eq!(TrackAccessControl::remove_gate(env.clone(), artist.clone(), "track1".to_string()), Ok(()));
}