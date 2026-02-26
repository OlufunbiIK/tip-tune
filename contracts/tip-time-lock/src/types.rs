use soroban_sdk::{contracterror, contracttype, Address, String};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    LockNotFound = 2,
    NotUnlockedYet = 3,
    AlreadyClaimedOrRefunded = 4,
    Unauthorized = 5,
    InvalidUnlockTime = 6,
    RefundNotAvailableYet = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Asset {
    Token(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TimeLockStatus {
    Locked,
    Claimed,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TimeLockTip {
    pub lock_id: String,
    pub tipper: Address,
    pub artist: Address,
    pub amount: i128,
    pub asset: Asset,
    pub unlock_time: u64,
    pub message: String,
    pub status: TimeLockStatus,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Tip(String),
    ArtistTips(Address),
    Counter,
}
