use soroban_sdk::{Address, Env, String, symbol_short};

pub fn proposal_created(
    env: &Env,
    proposal_id: &String,
    proposer: &Address,
    voting_ends_at: u64,
) {
    env.events().publish(
        (symbol_short!("GOV"), symbol_short!("PROPOSE")),
        (proposal_id, proposer, voting_ends_at),
    );
}

pub fn vote_cast(
    env: &Env,
    proposal_id: &String,
    voter: &Address,
    support: bool,
    voting_power: i128,
) {
    env.events().publish(
        (symbol_short!("GOV"), symbol_short!("VOTE")),
        (proposal_id, voter, support, voting_power),
    );
}

pub fn proposal_executed(
    env: &Env,
    proposal_id: &String,
    executor: &Address,
) {
    env.events().publish(
        (symbol_short!("GOV"), symbol_short!("EXEC")),
        (proposal_id, executor),
    );
}

pub fn delegation_set(
    env: &Env,
    delegator: &Address,
    delegatee: &Address,
) {
    env.events().publish(
        (symbol_short!("GOV"), symbol_short!("DELEG")),
        (delegator, delegatee),
    );
}

pub fn proposal_cancelled(env: &Env, proposal_id: &String) {
    env.events().publish(
        (symbol_short!("GOV"), symbol_short!("CANCEL")),
        (proposal_id,),
    );
}