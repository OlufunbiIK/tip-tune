use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotInitialized        = 1,
    AlreadyInitialized    = 2,
    Unauthorized          = 3,
    StreamNotFound        = 4,
    StreamAlreadyActive   = 5,
    StreamAlreadyStopped  = 6,
    InvalidRate           = 7,
    InsufficientBalance   = 8,
    InvalidAmount         = 9,
    SameListenerArtist    = 10,
    RateTooLow            = 11,
    RateTooHigh           = 12,
    BalanceBelowMinimum   = 13,
    StreamExpired         = 14,
}