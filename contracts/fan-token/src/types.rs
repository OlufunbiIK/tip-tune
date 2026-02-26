use soroban_sdk::{contracterror, contracttype, Address, String};

/// Represents an artist's fan token configuration and supply.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FanToken {
    pub token_id: String,
    pub artist: Address,
    pub name: String,
    pub symbol: String,
    pub total_supply: i128,
    pub circulating_supply: i128,
    pub created_at: u64,
}

/// Represents a fan's balance of a specific artist's fan token.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FanBalance {
    pub holder: Address,
    pub artist: Address,
    pub balance: i128,
    pub earned_total: i128,
    pub last_updated: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// Artist already has a fan token
    TokenAlreadyExists = 1,
    /// Fan token not found for artist
    TokenNotFound = 2,
    /// Tip amount must be positive
    InvalidAmount = 3,
    /// Transfer amount exceeds balance
    InsufficientBalance = 4,
    /// Cannot transfer to self
    SelfTransfer = 5,
    /// Unauthorized caller
    Unauthorized = 6,
    /// Invalid token name or symbol
    InvalidMetadata = 7,
    /// Arithmetic overflow
    Overflow = 8,
}
