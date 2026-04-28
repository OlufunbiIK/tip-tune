#![no_std]

mod catalog;
mod receipts;

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

pub use catalog::{BadgeCatalogEntry, CatalogKey};
pub use receipts::BadgeMintReceipt;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotEligible = 1,
    AlreadyMinted = 2,
    InvalidBadgeType = 3,
    Unauthorized = 4,
}

/// Badge types for tipping milestones
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum BadgeType {
    FirstTip = 0,
    TenTips = 1,
    HundredTips = 2,
    WhaleTipper = 3,
    EarlySupporter = 4,
    GenreSupporter = 5,
}

/// Metadata for a minted badge NFT
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeMetadata {
    pub badge_id: String,
    pub badge_type: BadgeType,
    pub name: String,
    pub description: String,
    pub owner: Address,
    pub minted_at: u64,
}

/// User stats tracked for badge eligibility
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserStats {
    pub tip_count: u64,
    pub total_amount: i128,
    pub first_tip_time: u64,
    pub genre_tips: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    UserStats(Address),
    UserBadges(Address),
    UserBadgeReceipts(Address),
    BadgeMinted(Address, u32), // user + badge_type ordinal
    BadgeRecord(String),
    BadgeReceipt(String),
    TotalBadges,
    EarlyAdopterThreshold,
    WhaleThreshold,
}

#[contract]
pub struct TipNftBadgeContract;

#[contractimpl]
impl TipNftBadgeContract {
    /// Initialize the badge contract with admin and thresholds.
    /// The whale_threshold and early_adopter_cutoff are written into the
    /// configurable catalog so that eligibility checks use catalog storage
    /// from the start.
    pub fn initialize(env: Env, admin: Address, whale_threshold: i128, early_adopter_cutoff: u64) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::WhaleThreshold, &whale_threshold);
        env.storage()
            .instance()
            .set(&DataKey::EarlyAdopterThreshold, &early_adopter_cutoff);
        env.storage().instance().set(&DataKey::TotalBadges, &0u64);

        // Seed catalog entries for WhaleTipper and EarlySupporter from init
        // params so that eligibility uses the configurable thresholds.
        let mut whale_entry = catalog::default_catalog_entry(&env, BadgeType::WhaleTipper);
        whale_entry.total_amount_threshold = whale_threshold;
        catalog::set_catalog_entry(&env, &whale_entry);

        let mut early_entry = catalog::default_catalog_entry(&env, BadgeType::EarlySupporter);
        early_entry.early_cutoff = early_adopter_cutoff;
        catalog::set_catalog_entry(&env, &early_entry);
    }

    /// Record a tip for a user (called by escrow/verification contract)
    pub fn record_tip(env: Env, user: Address, amount: i128, is_genre_tip: bool) {
        let mut stats: UserStats = Self::get_user_stats(env.clone(), user.clone());

        stats.tip_count += 1;
        stats.total_amount += amount;

        if stats.first_tip_time == 0 {
            stats.first_tip_time = env.ledger().timestamp();
        }

        if is_genre_tip {
            stats.genre_tips += 1;
        }

        env.storage()
            .persistent()
            .set(&DataKey::UserStats(user), &stats);
    }

    /// Check if a user is eligible for a specific badge type
    pub fn check_badge_eligibility(env: Env, user: Address, badge_type: BadgeType) -> bool {
        let badge_ordinal = catalog::badge_type_ordinal(&badge_type);
        if env
            .storage()
            .persistent()
            .has(&DataKey::BadgeMinted(user.clone(), badge_ordinal))
        {
            return false;
        }

        let stats = Self::get_user_stats(env.clone(), user);
        let entry = catalog::get_catalog_entry(&env, badge_type);

        match badge_type {
            BadgeType::FirstTip
            | BadgeType::TenTips
            | BadgeType::HundredTips => stats.tip_count >= entry.tip_count_threshold,
            BadgeType::WhaleTipper => stats.total_amount >= entry.total_amount_threshold,
            BadgeType::EarlySupporter => {
                stats.first_tip_time > 0 && stats.first_tip_time <= entry.early_cutoff
            }
            BadgeType::GenreSupporter => stats.genre_tips >= entry.genre_tips_threshold,
        }
    }

    /// Check eligibility for all badge types at once
    pub fn get_all_eligibility(env: Env, user: Address) -> Vec<(BadgeType, bool)> {
        let mut results = Vec::new(&env);
        let types = [
            BadgeType::FirstTip,
            BadgeType::TenTips,
            BadgeType::HundredTips,
            BadgeType::WhaleTipper,
            BadgeType::EarlySupporter,
            BadgeType::GenreSupporter,
        ];
        for t in types {
            results.push_back((
                t,
                Self::check_badge_eligibility(env.clone(), user.clone(), t),
            ));
        }
        results
    }

    /// Mint a badge NFT for a user.
    pub fn mint_badge(env: Env, user: Address, badge_type: BadgeType) -> Result<String, Error> {
        let badge_ordinal = catalog::badge_type_ordinal(&badge_type);

        if env
            .storage()
            .persistent()
            .has(&DataKey::BadgeMinted(user.clone(), badge_ordinal))
        {
            return Err(Error::AlreadyMinted);
        }

        // Check eligibility
        if !Self::check_badge_eligibility(env.clone(), user.clone(), badge_type) {
            return Err(Error::NotEligible);
        }

        let mut total: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TotalBadges)
            .unwrap_or(0);
        total += 1;
        env.storage().instance().set(&DataKey::TotalBadges, &total);

        let mut buf = [0u8; 10];
        let mut i = 10;
        let mut n = total;
        if n == 0 {
            i -= 1;
            buf[i] = b'0';
        } else {
            while n > 0 {
                i -= 1;
                buf[i] = b'0' + (n % 10) as u8;
                n /= 10;
            }
        }
        let badge_id = String::from_bytes(&env, &buf[i..]);

        let catalog_entry = catalog::get_catalog_entry(&env, badge_type);

        let metadata = BadgeMetadata {
            badge_id: badge_id.clone(),
            badge_type,
            name: catalog_entry.name,
            description: catalog_entry.description,
            owner: user.clone(),
            minted_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::BadgeMinted(user.clone(), badge_ordinal), &true);
        env.storage()
            .persistent()
            .set(&DataKey::BadgeRecord(badge_id.clone()), &metadata);

        let receipt = receipts::BadgeMintReceipt {
            badge_id: badge_id.clone(),
            badge_type,
            name: metadata.name.clone(),
            description: metadata.description.clone(),
            owner: user.clone(),
            minted_at: metadata.minted_at,
        };
        receipts::set_badge_receipt(&env, &receipt);

        let mut user_badges: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::UserBadges(user.clone()))
            .unwrap_or(Vec::new(&env));
        user_badges.push_back(badge_id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UserBadges(user.clone()), &user_badges);

        receipts::append_user_receipt(&env, user.clone(), &badge_id);

        env.events()
            .publish((symbol_short!("badge"), symbol_short!("minted")), metadata);

        Ok(badge_id)
    }

    /// Get all badge IDs for a user
    pub fn get_user_badges(env: Env, user: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::UserBadges(user))
            .unwrap_or(Vec::new(&env))
    }

    /// Get all badge metadata for a user (efficient lookup)
    pub fn get_user_badges_full(env: Env, user: Address) -> Vec<BadgeMetadata> {
        let ids = Self::get_user_badges(env.clone(), user);
        let mut full_badges = Vec::new(&env);
        for id in ids {
            if let Some(meta) = Self::get_badge(env.clone(), id) {
                full_badges.push_back(meta);
            }
        }
        full_badges
    }

    /// Get user badge mint receipts in chronological order.
    pub fn get_user_badge_receipts(env: Env, user: Address) -> Vec<BadgeMintReceipt> {
        receipts::get_user_badge_receipts(&env, user)
    }

    /// Get badge mint receipt by badge ID.
    pub fn get_badge_receipt(env: Env, badge_id: String) -> Option<BadgeMintReceipt> {
        receipts::get_badge_receipt(&env, badge_id)
    }

    /// Get badge metadata by ID
    pub fn get_badge(env: Env, badge_id: String) -> Option<BadgeMetadata> {
        env.storage()
            .persistent()
            .get(&DataKey::BadgeRecord(badge_id))
    }

    /// Get user stats
    pub fn get_user_stats(env: Env, user: Address) -> UserStats {
        env.storage()
            .persistent()
            .get(&DataKey::UserStats(user))
            .unwrap_or(UserStats {
                tip_count: 0,
                total_amount: 0,
                first_tip_time: 0,
                genre_tips: 0,
            })
    }

    /// Get total badges minted
    pub fn get_total_badges(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TotalBadges)
            .unwrap_or(0)
    }

    // ── Admin: catalog management ──────────────────────────────────────

    /// Admin: update the name and description for a badge type.
    pub fn set_badge_metadata(
        env: Env,
        badge_type: BadgeType,
        name: String,
        description: String,
    ) -> BadgeCatalogEntry {
        catalog::update_badge_metadata(&env, badge_type, name, description)
    }

    /// Admin: update the threshold values for a badge type.
    pub fn set_badge_threshold(
        env: Env,
        badge_type: BadgeType,
        tip_count_threshold: u64,
        total_amount_threshold: i128,
        genre_tips_threshold: u64,
        early_cutoff: u64,
    ) -> BadgeCatalogEntry {
        catalog::update_badge_threshold(
            &env,
            badge_type,
            tip_count_threshold,
            total_amount_threshold,
            genre_tips_threshold,
            early_cutoff,
        )
    }

    /// Read the catalog entry (with defaults) for a badge type.
    pub fn get_badge_catalog_entry(env: Env, badge_type: BadgeType) -> BadgeCatalogEntry {
        catalog::get_catalog_entry(&env, badge_type)
    }
}

mod test;
