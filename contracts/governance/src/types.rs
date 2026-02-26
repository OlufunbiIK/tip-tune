use soroban_sdk::{contracttype, Address, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ProposalAction {
    pub contract: Address,
    pub function: String,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub proposal_id: String,
    pub proposer: Address,
    pub description: String,
    pub actions: Vec<ProposalAction>,
    pub votes_for: i128,
    pub votes_against: i128,
    pub created_at: u64,
    pub voting_ends_at: u64,
    pub execution_available_at: u64,
    pub status: ProposalStatus,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VoteRecord {
    pub voter: Address,
    pub proposal_id: String,
    pub support: bool,
    pub voting_power: i128,
    pub voted_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct DelegationRecord {
    pub delegator: Address,
    pub delegatee: Address,
    pub delegated_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct GovernanceConfig {
    pub admin: Address,
    pub token: Address,
    pub voting_period_ledgers: u32,
    pub timelock_ledgers: u32,
    pub quorum_basis_points: u32,  // e.g. 1000 = 10%
    pub proposal_threshold: i128,  // min tokens to create proposal
}