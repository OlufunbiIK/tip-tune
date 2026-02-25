use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Eq, PartialEq, Debug)]
pub enum Error {
    Unauthorized = 1,
    TipTooLow = 2,
    TrackNotFound = 3,
    AlreadyUnlocked = 4,
}