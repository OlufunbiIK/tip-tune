use soroban_sdk::{contracttype, symbol_short, Address, Env, String, Symbol, Vec};

use crate::types::{RoyaltySplit, TipEscrow, TipRecord};

const TIPS: Symbol = symbol_short!("TIPS");
const SPLITS: Symbol = symbol_short!("SPLITS");

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Escrow(String),
}

pub fn save_tip(env: &Env, _tip_id: u64, tip: &TipRecord) {
    let mut tips: Vec<TipRecord> = env.storage().instance().get(&TIPS).unwrap_or(Vec::new(env));
    tips.push_back(tip.clone());
    env.storage().instance().set(&TIPS, &tips);
}

pub fn get_tips(env: &Env) -> Vec<TipRecord> {
    env.storage().instance().get(&TIPS).unwrap_or(Vec::new(env))
}

pub fn save_splits(env: &Env, artist: &Address, splits: &Vec<RoyaltySplit>) {
    env.storage().instance().set(&(SPLITS, artist), splits);
}

pub fn get_splits(env: &Env, artist: &Address) -> Option<Vec<RoyaltySplit>> {
    env.storage().instance().get(&(SPLITS, artist))
}

pub fn save_escrow(env: &Env, escrow_id: String, escrow: &TipEscrow) {
    env.storage()
        .persistent()
        .set(&DataKey::Escrow(escrow_id), escrow);
}

pub fn get_escrow(env: &Env, escrow_id: String) -> Option<TipEscrow> {
    env.storage().persistent().get(&DataKey::Escrow(escrow_id))
}
