#![no_std]

mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, symbol_short,
    token,
};

const COOLDOWN_LEDGERS: u32 = 120_960;
const MIN_STAKE: i128 = 1_000_0000;
const REWARD_RATE_BPS: i128 = 500;
const BPS_DENOM: i128 = 10_000;
const LEDGERS_PER_YEAR: i128 = 6_307_200;
const MAX_BOOST: u32 = 200;
const SLASH_RATE_BPS: i128 = 1_000;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Stake(Address),
    Unstake(Address),
    TotalStaked,
    Slashed(Address),
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct StakeInfo {
    pub amount: i128,
    pub since_ledger: u32,
    pub pending_rewards: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct UnstakeRequest {
    pub amount: i128,
    pub available_at_ledger: u32,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    BelowMinimum = 2,
    NoStake = 3,
    InsufficientStake = 4,
    CooldownNotMet = 5,
    NoUnstakeRequest = 6,
    AccountSlashed = 7,
    TransferFailed = 8,
    NotInitialised = 9,
    AlreadyInitialised = 10,
    Overflow = 11,
}

#[contract]
pub struct StakingContract;

#[contractimpl]
impl StakingContract {

    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialised);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::TotalStaked, &0_i128);
        Ok(())
    }

    pub fn stake(env: Env, artist: Address, amount: i128) -> Result<(), Error> {
        artist.require_auth();
        Self::assert_initialised(&env)?;
        Self::assert_not_slashed(&env, &artist)?;

        if amount < MIN_STAKE {
            return Err(Error::BelowMinimum);
        }

        let token = Self::get_token(&env);
        let client = token::Client::new(&env, &token);

        let mut info = Self::get_or_default_stake(&env, &artist);
        info.pending_rewards = info
            .pending_rewards
            .checked_add(Self::calculate_accrued(&env, &info))
            .ok_or(Error::Overflow)?;

        client.transfer(&artist, &env.current_contract_address(), &amount);

        info.amount = info.amount.checked_add(amount).ok_or(Error::Overflow)?;
        info.since_ledger = env.ledger().sequence();
        env.storage().persistent().set(&DataKey::Stake(artist.clone()), &info);

        let total: i128 = env.storage().instance().get(&DataKey::TotalStaked).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalStaked, &(total.checked_add(amount).ok_or(Error::Overflow)?));

        env.events().publish((symbol_short!("staked"), artist.clone()), amount);
        Ok(())
    }

    pub fn unstake(env: Env, artist: Address, amount: i128) -> Result<(), Error> {
        artist.require_auth();
        Self::assert_initialised(&env)?;

        let mut info: StakeInfo = env.storage().persistent()
            .get(&DataKey::Stake(artist.clone()))
            .ok_or(Error::NoStake)?;

        if amount > info.amount {
            return Err(Error::InsufficientStake);
        }

        info.pending_rewards = info
            .pending_rewards
            .checked_add(Self::calculate_accrued(&env, &info))
            .ok_or(Error::Overflow)?;

        info.amount -= amount;
        info.since_ledger = env.ledger().sequence();
        env.storage().persistent().set(&DataKey::Stake(artist.clone()), &info);

        let available_at = env.ledger().sequence()
            .checked_add(COOLDOWN_LEDGERS)
            .ok_or(Error::Overflow)?;

        let existing: i128 = env.storage().persistent()
            .get(&DataKey::Unstake(artist.clone()))
            .map(|r: UnstakeRequest| r.amount)
            .unwrap_or(0);

        env.storage().persistent().set(
            &DataKey::Unstake(artist.clone()),
            &UnstakeRequest {
                amount: existing.checked_add(amount).ok_or(Error::Overflow)?,
                available_at_ledger: available_at,
            },
        );

        let total: i128 = env.storage().instance().get(&DataKey::TotalStaked).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalStaked, &(total.saturating_sub(amount)));

        env.events().publish((symbol_short!("unstaked"), artist.clone()), (amount, available_at));
        Ok(())
    }

    pub fn withdraw(env: Env, artist: Address) -> Result<i128, Error> {
        artist.require_auth();

        let request: UnstakeRequest = env.storage().persistent()
            .get(&DataKey::Unstake(artist.clone()))
            .ok_or(Error::NoUnstakeRequest)?;

        if env.ledger().sequence() < request.available_at_ledger {
            return Err(Error::CooldownNotMet);
        }

        let token = Self::get_token(&env);
        let client = token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &artist, &request.amount);

        env.storage().persistent().remove(&DataKey::Unstake(artist.clone()));
        env.events().publish((symbol_short!("withdrew"), artist.clone()), request.amount);
        Ok(request.amount)
    }

    pub fn claim_rewards(env: Env, artist: Address) -> Result<i128, Error> {
        artist.require_auth();
        Self::assert_initialised(&env)?;
        Self::assert_not_slashed(&env, &artist)?;

        let mut info: StakeInfo = env.storage().persistent()
            .get(&DataKey::Stake(artist.clone()))
            .ok_or(Error::NoStake)?;

        let accrued = Self::calculate_accrued(&env, &info);
        let total_rewards = info.pending_rewards.checked_add(accrued).ok_or(Error::Overflow)?;

        if total_rewards == 0 {
            return Ok(0);
        }

        info.pending_rewards = 0;
        info.since_ledger = env.ledger().sequence();
        env.storage().persistent().set(&DataKey::Stake(artist.clone()), &info);

        let token = Self::get_token(&env);
        let client = token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &artist, &total_rewards);

        env.events().publish((symbol_short!("claimed"), artist.clone()), total_rewards);
        Ok(total_rewards)
    }

    pub fn calculate_boost(env: Env, artist: Address) -> u32 {
        let slashed: bool = env.storage().persistent()
            .get(&DataKey::Slashed(artist.clone()))
            .unwrap_or(false);

        if slashed { return 0; }

        match env.storage().persistent().get::<DataKey, StakeInfo>(&DataKey::Stake(artist)) {
            None => 0,
            Some(info) => {
                if info.amount <= 0 { return 0; }
                let ratio = (info.amount / MIN_STAKE) as u64;
                let sqrt = Self::isqrt(ratio);
                ((sqrt as u32).saturating_mul(10)).min(MAX_BOOST)
            }
        }
    }

    pub fn slash(env: Env, artist: Address) -> Result<i128, Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialised)?;
        admin.require_auth();

        let mut info: StakeInfo = env.storage().persistent()
            .get(&DataKey::Stake(artist.clone()))
            .ok_or(Error::NoStake)?;

        let slash_amount = (info.amount * SLASH_RATE_BPS) / BPS_DENOM;

        let token = Self::get_token(&env);
        let client = token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &admin, &slash_amount);

        info.amount -= slash_amount;
        info.pending_rewards = 0;
        info.since_ledger = env.ledger().sequence();
        env.storage().persistent().set(&DataKey::Stake(artist.clone()), &info);
        env.storage().persistent().set(&DataKey::Slashed(artist.clone()), &true);

        let total: i128 = env.storage().instance().get(&DataKey::TotalStaked).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalStaked, &(total.saturating_sub(slash_amount)));

        env.events().publish((symbol_short!("slashed"), artist.clone()), slash_amount);
        Ok(slash_amount)
    }

    pub fn restore(env: Env, artist: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialised)?;
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Slashed(artist.clone()), &false);
        env.events().publish((symbol_short!("restored"), artist), ());
        Ok(())
    }

    pub fn get_stake(env: Env, artist: Address) -> Option<StakeInfo> {
        env.storage().persistent().get(&DataKey::Stake(artist))
    }

    pub fn get_unstake_request(env: Env, artist: Address) -> Option<UnstakeRequest> {
        env.storage().persistent().get(&DataKey::Unstake(artist))
    }

    pub fn total_staked(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalStaked).unwrap_or(0)
    }

    pub fn pending_rewards(env: Env, artist: Address) -> i128 {
        match env.storage().persistent().get::<DataKey, StakeInfo>(&DataKey::Stake(artist)) {
            None => 0,
            Some(i) => i.pending_rewards + Self::calculate_accrued(&env, &i),
        }
    }

    pub fn is_slashed(env: Env, artist: Address) -> bool {
        env.storage().persistent().get(&DataKey::Slashed(artist)).unwrap_or(false)
    }

    pub fn transfer_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialised)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        Ok(())
    }

    fn assert_initialised(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::NotInitialised);
        }
        Ok(())
    }

    fn assert_not_slashed(env: &Env, artist: &Address) -> Result<(), Error> {
        let slashed: bool = env.storage().persistent()
            .get(&DataKey::Slashed(artist.clone()))
            .unwrap_or(false);
        if slashed { return Err(Error::AccountSlashed); }
        Ok(())
    }

    fn get_token(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }

    fn get_or_default_stake(env: &Env, artist: &Address) -> StakeInfo {
        env.storage().persistent()
            .get(&DataKey::Stake(artist.clone()))
            .unwrap_or(StakeInfo {
                amount: 0,
                since_ledger: env.ledger().sequence(),
                pending_rewards: 0,
            })
    }

    fn calculate_accrued(env: &Env, info: &StakeInfo) -> i128 {
        if info.amount == 0 { return 0; }
        let elapsed = (env.ledger().sequence() as i128).saturating_sub(info.since_ledger as i128);
        (info.amount * REWARD_RATE_BPS * elapsed) / (BPS_DENOM * LEDGERS_PER_YEAR)
    }

    fn isqrt(n: u64) -> u64 {
        if n == 0 { return 0; }
        let mut x = n;
        let mut y = (x + 1) / 2;
        while y < x {
            x = y;
            y = (x + n / x) / 2;
        }
        x
    }
}