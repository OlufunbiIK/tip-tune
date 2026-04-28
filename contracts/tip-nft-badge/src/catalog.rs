use soroban_sdk::{contracttype, symbol_short, Address, Env, String};

use crate::{BadgeType, DataKey};

/// Configurable catalog entry for a badge type.
///
/// Stores metadata (name, description) and the relevant threshold value.
/// Only one threshold field is active per badge variant; the others are ignored.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeCatalogEntry {
    pub badge_type: BadgeType,
    pub name: String,
    pub description: String,
    /// Used by FirstTip / TenTips / HundredTips — minimum tip count
    pub tip_count_threshold: u64,
    /// Used by WhaleTipper — minimum total amount tipped
    pub total_amount_threshold: i128,
    /// Used by GenreSupporter — minimum genre-specific tip count
    pub genre_tips_threshold: u64,
    /// Used by EarlySupporter — unix-seconds cutoff for first tip
    pub early_cutoff: u64,
}

/// Return the default catalog entry for a given badge type.
/// These match the original hardcoded values.
pub fn default_catalog_entry(env: &Env, badge_type: BadgeType) -> BadgeCatalogEntry {
    match badge_type {
        BadgeType::FirstTip => BadgeCatalogEntry {
            badge_type,
            name: String::from_str(env, "First Tip"),
            description: String::from_str(env, "Awarded for sending the first recorded tip."),
            tip_count_threshold: 1,
            total_amount_threshold: 0,
            genre_tips_threshold: 0,
            early_cutoff: 0,
        },
        BadgeType::TenTips => BadgeCatalogEntry {
            badge_type,
            name: String::from_str(env, "Ten Tips"),
            description: String::from_str(env, "Awarded after ten recorded tips."),
            tip_count_threshold: 10,
            total_amount_threshold: 0,
            genre_tips_threshold: 0,
            early_cutoff: 0,
        },
        BadgeType::HundredTips => BadgeCatalogEntry {
            badge_type,
            name: String::from_str(env, "Hundred Tips"),
            description: String::from_str(env, "Awarded after one hundred recorded tips."),
            tip_count_threshold: 100,
            total_amount_threshold: 0,
            genre_tips_threshold: 0,
            early_cutoff: 0,
        },
        BadgeType::WhaleTipper => BadgeCatalogEntry {
            badge_type,
            name: String::from_str(env, "Whale Tipper"),
            description: String::from_str(env, "Awarded for crossing the whale tipping threshold."),
            tip_count_threshold: 0,
            total_amount_threshold: 10_000,
            genre_tips_threshold: 0,
            early_cutoff: 0,
        },
        BadgeType::EarlySupporter => BadgeCatalogEntry {
            badge_type,
            name: String::from_str(env, "Early Supporter"),
            description: String::from_str(
                env,
                "Awarded for tipping before the early supporter cutoff.",
            ),
            tip_count_threshold: 0,
            total_amount_threshold: 0,
            genre_tips_threshold: 0,
            early_cutoff: 0, // populated from init parameter at first write
        },
        BadgeType::GenreSupporter => BadgeCatalogEntry {
            badge_type,
            name: String::from_str(env, "Genre Supporter"),
            description: String::from_str(env, "Awarded for five or more genre-specific tips."),
            tip_count_threshold: 0,
            total_amount_threshold: 0,
            genre_tips_threshold: 5,
            early_cutoff: 0,
        },
    }
}

/// Storage key for a catalog entry keyed by badge-type ordinal.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CatalogKey {
    Entry(u32),
}

/// Read a catalog entry from storage, falling back to the default if absent.
pub fn get_catalog_entry(env: &Env, badge_type: BadgeType) -> BadgeCatalogEntry {
    let ordinal = badge_type_ordinal(&badge_type);
    if let Some(entry) = env
        .storage()
        .persistent()
        .get::<CatalogKey, BadgeCatalogEntry>(&CatalogKey::Entry(ordinal))
    {
        entry
    } else {
        default_catalog_entry(env, badge_type)
    }
}

/// Write a catalog entry to storage.
pub fn set_catalog_entry(env: &Env, entry: &BadgeCatalogEntry) {
    let ordinal = badge_type_ordinal(&entry.badge_type);
    env.storage()
        .persistent()
        .set(&CatalogKey::Entry(ordinal), entry);
}

/// Ensure the caller is the stored admin. Panics if not.
pub fn require_admin(env: &Env) {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("Not initialized");
    admin.require_auth();
}

/// Admin: update the name and description for a badge type.
/// Returns the updated catalog entry.
pub fn update_badge_metadata(
    env: &Env,
    badge_type: BadgeType,
    name: String,
    description: String,
) -> BadgeCatalogEntry {
    require_admin(env);
    let mut entry = get_catalog_entry(env, badge_type);
    entry.name = name;
    entry.description = description;
    set_catalog_entry(env, &entry);
    env.events()
        .publish((symbol_short!("catalog"), symbol_short!("meta")), (badge_type, entry.clone()));
    entry
}

/// Admin: update the threshold for a badge type.
/// Only the relevant threshold field is updated depending on the badge variant.
/// Returns the updated catalog entry.
pub fn update_badge_threshold(
    env: &Env,
    badge_type: BadgeType,
    tip_count_threshold: u64,
    total_amount_threshold: i128,
    genre_tips_threshold: u64,
    early_cutoff: u64,
) -> BadgeCatalogEntry {
    require_admin(env);
    let mut entry = get_catalog_entry(env, badge_type);
    entry.tip_count_threshold = tip_count_threshold;
    entry.total_amount_threshold = total_amount_threshold;
    entry.genre_tips_threshold = genre_tips_threshold;
    entry.early_cutoff = early_cutoff;
    set_catalog_entry(env, &entry);
    env.events()
        .publish((symbol_short!("catalog"), symbol_short!("thresh")), (badge_type, entry.clone()));
    entry
}

/// Map a BadgeType to its u32 ordinal.
pub fn badge_type_ordinal(badge_type: &BadgeType) -> u32 {
    match badge_type {
        BadgeType::FirstTip => 0,
        BadgeType::TenTips => 1,
        BadgeType::HundredTips => 2,
        BadgeType::WhaleTipper => 3,
        BadgeType::EarlySupporter => 4,
        BadgeType::GenreSupporter => 5,
    }
}
