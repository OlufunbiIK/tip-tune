use soroban_sdk::{contracterror, contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TipRecord {
    pub sender: Address,
    pub artist: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltySplit {
    pub recipient: Address,
    pub percentage: u32, // Basis points (100 = 1%)
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    EscrowNotFound = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Asset {
    Token(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TipEscrow {
    pub escrow_id: String,
    pub tipper: Address,
    pub artist: Address,
    pub amount: i128,
    pub asset: Asset,
    pub status: EscrowStatus,
    pub release_time: u64,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Pending,
    Released,
    Refunded,
    Disputed,
}

// #[contracttype]
// #[derive(Clone, Debug, Eq, PartialEq)]
// pub struct RoyaltySplit {
//     pub track_id: String,
//     pub collaborators: Vec<(Address, u32)>, // (address, percentage)
// }
