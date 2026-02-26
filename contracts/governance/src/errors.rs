use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotInitialized        = 1,
    AlreadyInitialized    = 2,
    Unauthorized          = 3,
    ProposalNotFound      = 4,
    AlreadyVoted          = 5,
    VotingClosed          = 6,
    VotingStillOpen       = 7,
    ProposalNotPassed     = 8,
    AlreadyExecuted       = 9,
    TimelockNotExpired    = 10,
    InvalidDescription    = 11,
    InsufficientVotingPower = 12,
    InvalidDelegatee      = 13,
    SelfDelegation        = 14,
    QuorumNotReached      = 15,
}