use soroban_sdk::{contracttype, Address, Env, String, Vec};

use crate::{BadgeType, DataKey};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeMintReceipt {
    pub badge_id: String,
    pub badge_type: BadgeType,
    pub name: String,
    pub description: String,
    pub owner: Address,
    pub minted_at: u64,
}

pub fn set_badge_receipt(env: &Env, receipt: &BadgeMintReceipt) {
    env.storage()
        .persistent()
        .set(&DataKey::BadgeReceipt(receipt.badge_id.clone()), receipt);
}

pub fn get_badge_receipt(env: &Env, badge_id: String) -> Option<BadgeMintReceipt> {
    env.storage()
        .persistent()
        .get(&DataKey::BadgeReceipt(badge_id))
}

pub fn append_user_receipt(env: &Env, user: Address, badge_id: &String) {
    let mut user_receipts: Vec<String> = env
        .storage()
        .persistent()
        .get(&DataKey::UserBadgeReceipts(user.clone()))
        .unwrap_or(Vec::new(env));
    user_receipts.push_back(badge_id.clone());
    env.storage()
        .persistent()
        .set(&DataKey::UserBadgeReceipts(user), &user_receipts);
}

pub fn get_user_badge_receipt_ids(env: &Env, user: Address) -> Vec<String> {
    env.storage()
        .persistent()
        .get(&DataKey::UserBadgeReceipts(user))
        .unwrap_or(Vec::new(env))
}

pub fn get_user_badge_receipts(env: &Env, user: Address) -> Vec<BadgeMintReceipt> {
    let ids = get_user_badge_receipt_ids(env, user);
    let mut receipts = Vec::new(env);
    for id in ids {
        if let Some(receipt) = get_badge_receipt(env, id) {
            receipts.push_back(receipt);
        }
    }
    receipts
}
