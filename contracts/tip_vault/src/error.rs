use soroban_sdk::{contracterror, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum TipVaultError {
    VaultNotFound = 1,
    NotVaultOwner = 2,
    InsufficientBalance = 3,
    ReleaseTooEarly = 4,
}