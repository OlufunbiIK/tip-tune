use soroban_sdk::contracterror;

#[contracterror]
#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    PoolNotFound,
    InsufficientPoolAmount,
    PoolExpired,
    Unauthorized,
    InvalidParameters,
}