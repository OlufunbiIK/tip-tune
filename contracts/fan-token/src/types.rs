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
    /// Optional maximum supply cap. 0 means uncapped.
    pub max_supply: i128,
    /// Total tokens burned so far.
    pub burned_supply: i128,
    /// Whether transfers are enabled for this token.
    pub transfers_enabled: bool,
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
    /// Minting would exceed the max supply cap
    CapExceeded = 9,
    /// Cannot burn more than the holder's balance
    InsufficientBalanceBurn = 10,
    /// Address is already a trusted minter
    AlreadyTrustedMinter = 11,
    /// Address is not a trusted minter
    NotTrustedMinter = 12,
    /// Metadata is frozen and cannot be updated
    MetadataFrozen = 13,
}
