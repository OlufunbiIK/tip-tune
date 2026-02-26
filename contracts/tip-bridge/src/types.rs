use soroban_sdk::{contracttype, Address, Bytes, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BridgeStatus {
    Pending,
    Completed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct BridgeRecord {
    pub bridge_id: String,
    pub source_chain: String,
    pub sender: Bytes,
    pub recipient: Address,
    pub amount: i128,
    pub fee: i128,
    pub net_amount: i128,
    pub initiated_at: u64,
    pub expires_at: u64,
    pub status: BridgeStatus,
    pub proof: Vec<Bytes>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct BridgeBackRecord {
    pub bridge_id: String,
    pub destination_chain: String,
    pub sender: Address,
    pub recipient: Bytes,
    pub amount: i128,
    pub fee: i128,
    pub net_amount: i128,
    pub initiated_at: u64,
    pub status: BridgeStatus,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct BridgeConfig {
    pub admin: Address,
    pub oracle: Address,
    pub wrapped_token: Address,
    pub fee_collector: Address,
    pub fee_basis_points: u32,   // e.g. 50 = 0.5%
    pub min_amount: i128,
    pub max_amount: i128,
    pub bridge_ttl_ledgers: u32,
}