use soroban_sdk::{Address, contracttype};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PoolStatus {
    Active,
    Exhausted,
    Expired,
    Cancelled,
    Closed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MatchingPool {
    pub pool_id: Vec<u8>,
    pub sponsor: Address,
    pub artist: Address,
    pub pool_amount: i128,           // Sponsor's total contributed amount
    pub matched_amount: i128,        // Total amount already matched
    pub remaining_amount: i128,      // Sponsor's unmatched remaining balance
    pub match_ratio: u32,            // 100 = 1:1 match
    pub match_cap_total: i128,       // Maximum total matches allowed (optional cap)
    pub start_time: u64,
    pub end_time: u64,
    pub status: PoolStatus,
    pub created_at: u64,
    pub refunded_at: u64,            // Timestamp when refunded (0 if not refunded)
}