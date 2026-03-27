use soroban_sdk::contracterror;

#[contracterror]
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
#[repr(u32)]
pub enum Error {
    PoolNotFound = 1,
    InsufficientPoolAmount = 2,
    PoolExpired = 3,
    Unauthorized = 4,
    InvalidParameters = 5,
    MatchWouldExceedCap = 6,      // Match would exceed sponsor's match cap
    PoolAlreadyRefunded = 7,      // Pool already refunded
    PoolNotActive = 8,             // Pool not in active state
    InvalidMatchRatio = 9,         // Match ratio must be > 0
    InvalidMatchCap = 10,          // Match cap must be >= 0 and >= pool amount
    EmptyPool = 11,                // Pool has no funds to match
    PoolStale = 12,                // Pool has been inactive for too long
}