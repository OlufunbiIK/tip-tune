#![no_std]

pub mod events;
pub mod storage;
pub mod types;

use soroban_sdk::{
    contract, contractimpl, symbol_short, token, Address, Env, String,
};
use storage::{read_subscription, write_subscription};
use types::{Error, Subscription, SubscriptionFrequency, SubscriptionStatus};

const WEEK_IN_SECONDS: u64 = 604_800;
const MONTH_IN_SECONDS: u64 = 2_592_000;

#[contract]
pub struct TipSubscriptionContract;

#[contractimpl]
impl TipSubscriptionContract {
    pub fn create_subscription(
        env: Env,
        subscriber: Address,
        artist: Address,
        token: Address,
        amount: i128,
        frequency: SubscriptionFrequency,
    ) -> Result<String, Error> {
        subscriber.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let count_key = symbol_short!("sub_cnt");
        let count: u32 = env.storage().instance().get(&count_key).unwrap_or(0);
        let next_count = count + 1;
        env.storage().instance().set(&count_key, &next_count);

        let mut buffer = [0u8; 10];
        let mut num = next_count;
        let mut len = 0;
        while num > 0 {
            buffer[len] = b'0' + (num % 10) as u8;
            num /= 10;
            len += 1;
        }
        for i in 0..(len / 2) {
            buffer.swap(i, len - 1 - i);
        }
        let sub_id = String::from_bytes(&env, &buffer[..len]);

        let current_time = env.ledger().timestamp();
        let duration = match frequency {
            SubscriptionFrequency::Weekly => WEEK_IN_SECONDS,
            SubscriptionFrequency::Monthly => MONTH_IN_SECONDS,
        };
        let next_payment_timestamp = current_time + duration;

        let subscription = Subscription {
            id: sub_id.clone(),
            subscriber: subscriber.clone(),
            artist: artist.clone(),
            token: token.clone(),
            amount,
            frequency,
            status: SubscriptionStatus::Active,
            next_payment_timestamp,
        };

        write_subscription(&env, &sub_id, &subscription);

        events::subscription_created(&env, sub_id.clone(), subscriber);

        Ok(sub_id)
    }

    pub fn process_payment(env: Env, subscription_id: String) -> Result<(), Error> {
        let mut sub = read_subscription(&env, &subscription_id).ok_or(Error::SubscriptionNotFound)?;

        if sub.status != SubscriptionStatus::Active {
            return Err(Error::InvalidStatus);
        }

        let current_time = env.ledger().timestamp();
        if current_time < sub.next_payment_timestamp {
            return Err(Error::PaymentTooEarly);
        }

        let token_client = token::Client::new(&env, &sub.token);
        token_client.transfer(
            &sub.subscriber,
            &sub.artist,
            &sub.amount,
        );

        let duration = match sub.frequency {
            SubscriptionFrequency::Weekly => WEEK_IN_SECONDS,
            SubscriptionFrequency::Monthly => MONTH_IN_SECONDS,
        };
        sub.next_payment_timestamp = current_time + duration;

        write_subscription(&env, &subscription_id, &sub);

        events::payment_processed(&env, subscription_id, sub.amount);

        Ok(())
    }

    pub fn cancel_subscription(env: Env, subscription_id: String) -> Result<(), Error> {
        let mut sub = read_subscription(&env, &subscription_id).ok_or(Error::SubscriptionNotFound)?;
        sub.subscriber.require_auth();

        // FIX: Prevent double-cancel
        if sub.status == SubscriptionStatus::Cancelled {
            return Err(Error::InvalidStatus);
        }

        sub.status = SubscriptionStatus::Cancelled;
        write_subscription(&env, &subscription_id, &sub);

        events::subscription_cancelled(&env, subscription_id, sub.subscriber);

        Ok(())
    }

    pub fn pause_subscription(env: Env, subscription_id: String) -> Result<(), Error> {
        let mut sub = read_subscription(&env, &subscription_id).ok_or(Error::SubscriptionNotFound)?;
        sub.subscriber.require_auth();

        // FIX: Require Active status before pausing
        if sub.status != SubscriptionStatus::Active {
            return Err(Error::InvalidStatus);
        }

        sub.status = SubscriptionStatus::Paused;
        write_subscription(&env, &subscription_id, &sub);

        events::subscription_paused(&env, subscription_id, sub.subscriber);

        Ok(())
    }

    pub fn resume_subscription(env: Env, subscription_id: String) -> Result<(), Error> {
        let mut sub = read_subscription(&env, &subscription_id).ok_or(Error::SubscriptionNotFound)?;
        sub.subscriber.require_auth();

        if sub.status != SubscriptionStatus::Paused {
            return Err(Error::InvalidStatus);
        }

        sub.status = SubscriptionStatus::Active;
        write_subscription(&env, &subscription_id, &sub);

        events::subscription_resumed(&env, subscription_id, sub.subscriber);

        Ok(())
    }

    pub fn get_subscription(env: Env, subscription_id: String) -> Result<Subscription, Error> {
        read_subscription(&env, &subscription_id).ok_or(Error::SubscriptionNotFound)
    }
}

#[cfg(test)]
mod test;