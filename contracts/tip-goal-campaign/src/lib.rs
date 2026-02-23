#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    InvalidDeadline = 2,
    CampaignNotFound = 3,
    CampaignAlreadyFinalized = 4,
    CampaignNotExpired = 5,
    DeadlinePassed = 6,
    Unauthorized = 7,
}

/// The result when a campaign is finalized
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum CampaignResult {
    GoalMet,
    GoalNotMet,
}

/// Status of a campaign
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum CampaignStatus {
    Active,
    Succeeded,
    Failed,
}

/// A single contribution record
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Contribution {
    pub contributor: Address,
    pub amount: i128,
    pub timestamp: u64,
}

/// Full campaign data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    pub campaign_id: String,
    pub artist: Address,
    pub goal_amount: i128,
    pub current_amount: i128,
    pub deadline: u64,
    pub status: CampaignStatus,
    pub contributions: Vec<Contribution>,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Campaign(String),
    CampaignCount,
    UserContributions(Address),
}

#[contract]
pub struct TipGoalCampaignContract;

#[contractimpl]
impl TipGoalCampaignContract {
    /// Create a new crowdfunding-style tip campaign with a goal and deadline
    pub fn create_campaign(
        env: Env,
        artist: Address,
        goal_amount: i128,
        deadline: u64,
    ) -> Result<String, Error> {
        artist.require_auth();

        if goal_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let current_time = env.ledger().timestamp();
        if deadline <= current_time {
            return Err(Error::InvalidDeadline);
        }

        // Generate campaign ID
        let mut counter: u32 = env
            .storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0);
        counter += 1;
        env.storage()
            .instance()
            .set(&DataKey::CampaignCount, &counter);

        let mut buf = [0u8; 10];
        let mut i = 10;
        let mut n = counter;
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
        let campaign_id = String::from_slice(&env, &buf[i..]);

        let campaign = Campaign {
            campaign_id: campaign_id.clone(),
            artist: artist.clone(),
            goal_amount,
            current_amount: 0,
            deadline,
            status: CampaignStatus::Active,
            contributions: Vec::new(&env),
            created_at: current_time,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id.clone()), &campaign);

        // Emit creation event
        env.events().publish(
            (symbol_short!("campaign"), symbol_short!("created")),
            (campaign_id.clone(), artist, goal_amount, deadline),
        );

        Ok(campaign_id)
    }

    /// Contribute to an active campaign
    pub fn contribute(
        env: Env,
        campaign_id: String,
        contributor: Address,
        amount: i128,
    ) -> Result<(), Error> {
        contributor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id.clone()))
            .ok_or(Error::CampaignNotFound)?;

        if campaign.status != CampaignStatus::Active {
            return Err(Error::CampaignAlreadyFinalized);
        }

        let current_time = env.ledger().timestamp();
        if current_time > campaign.deadline {
            return Err(Error::DeadlinePassed);
        }

        let contribution = Contribution {
            contributor: contributor.clone(),
            amount,
            timestamp: current_time,
        };

        campaign.contributions.push_back(contribution);
        campaign.current_amount += amount;

        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id.clone()), &campaign);

        // Update user contribution tracking
        let mut user_campaigns: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::UserContributions(contributor.clone()))
            .unwrap_or(Vec::new(&env));

        // Only add campaign_id if not already tracked
        let mut found = false;
        for existing in user_campaigns.iter() {
            if existing == campaign_id {
                found = true;
                break;
            }
        }
        if !found {
            user_campaigns.push_back(campaign_id.clone());
            env.storage().persistent().set(
                &DataKey::UserContributions(contributor.clone()),
                &user_campaigns,
            );
        }

        // Emit contribution event
        env.events().publish(
            (symbol_short!("campaign"), symbol_short!("contrib")),
            (campaign_id, contributor, amount),
        );

        Ok(())
    }

    /// Finalize a campaign: release funds to artist if goal met, or mark as failed for refunds
    pub fn finalize_campaign(env: Env, campaign_id: String) -> Result<CampaignResult, Error> {
        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id.clone()))
            .ok_or(Error::CampaignNotFound)?;

        if campaign.status != CampaignStatus::Active {
            return Err(Error::CampaignAlreadyFinalized);
        }

        let current_time = env.ledger().timestamp();
        if current_time <= campaign.deadline {
            // Allow early finalization only if goal is already met
            if campaign.current_amount < campaign.goal_amount {
                return Err(Error::CampaignNotExpired);
            }
        }

        let result = if campaign.current_amount >= campaign.goal_amount {
            campaign.status = CampaignStatus::Succeeded;
            CampaignResult::GoalMet
        } else {
            campaign.status = CampaignStatus::Failed;
            CampaignResult::GoalNotMet
        };

        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id.clone()), &campaign);

        // Emit finalization event
        env.events().publish(
            (symbol_short!("campaign"), symbol_short!("final")),
            (campaign_id, result.clone()),
        );

        Ok(result)
    }

    /// Get campaign details
    pub fn get_campaign(env: Env, campaign_id: String) -> Result<Campaign, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)
    }

    /// Get campaigns a user has contributed to
    pub fn get_user_campaigns(env: Env, user: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::UserContributions(user))
            .unwrap_or(Vec::new(&env))
    }

    /// Get the total number of campaigns created
    pub fn get_campaign_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0)
    }
}

mod test;
