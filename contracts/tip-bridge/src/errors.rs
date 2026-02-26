use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotInitialized        = 1,
    AlreadyInitialized    = 2,
    Unauthorized          = 3,
    BridgeNotFound        = 4,
    AlreadyCompleted      = 5,
    AlreadyCancelled      = 6,
    InvalidAmount         = 7,
    InsufficientBalance   = 8,
    InvalidOracleSignature = 9,
    UnsupportedChain      = 10,
    BridgeExpired         = 11,
    InvalidProof          = 12,
    AmountBelowMinimum    = 13,
    AmountAboveMaximum    = 14,
    FeeTooHigh            = 15,
}