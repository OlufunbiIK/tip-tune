use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StreamStatus {
    Active,
    Stopped,
    Interrupted,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct StreamRecord {
    pub stream_id: String,
    pub listener: Address,
    pub artist: Address,
    pub rate_per_second: i128,
    pub deposited_amount: i128,
    pub amount_paid: i128,
    pub started_at: u64,
    pub stopped_at: Option<u64>,
    pub last_settled_at: u64,
    pub status: StreamStatus,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct StreamConfig {
    pub admin: Address,
    pub token: Address,
    pub fee_collector: Address,
    pub fee_basis_points: u32,   // e.g. 50 = 0.5%
    pub min_rate_per_second: i128,
    pub max_rate_per_second: i128,
    pub min_deposit: i128,
}