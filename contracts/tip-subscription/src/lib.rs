#![no_std]

pub mod storage;
pub mod types;

use soroban_sdk::{
    contract, contractimpl, symbol_short, token, Address, Env, String,
};
use storage::{read_subscription, write_subscription};
use types::{Error, Subscription, SubscriptionFrequency, SubscriptionStatus};

// Time constants in seconds
const WEEK_IN_SECONDS: u64 = 604_800;
const MONTH_IN_SECONDS: u64 = 2_592_000;

#[contract]
pub struct TipSubscriptionContract;

#[contractimpl]
impl TipSubscriptionContract {
    /// Creates a new recurring tip subscription
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

        // Generate a simple ID using the ledger sequence and a counter (simplified for Soroban)
        // In a strict production environment, we'd use a robust counter mapped in storage.
        let mut id_bytes = [0u8; 8];
        let seq = env.ledger().sequence();
        id_bytes.copy_from_slice(&seq.to_be_bytes());
        let sub_id = String::from_bytes(&env, &id_bytes);

        // Calculate next payment timestamp
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

        // Save to storage
        write_subscription(&env, &sub_id, &subscription);

        // Emit creation event
        env.events()
            .publish((symbol_short!("sub_crt"), sub_id.clone()), subscriber);

        Ok(sub_id)
    }

    /// Processes an automatic payment if the timestamp is ripe
    pub fn process_payment(env: Env, subscription_id: String) -> Result<(), Error> {
        let mut sub = read_subscription(&env, &subscription_id).ok_or(Error::SubscriptionNotFound)?;

        if sub.status != SubscriptionStatus::Active {
            return Err(Error::InvalidStatus);
        }

        let current_time = env.ledger().timestamp();
        if current_time < sub.next_payment_timestamp {
            return Err(Error::PaymentTooEarly);
        }

        // Execute the token transfer using Soroban's standard token interface
        let token_client = token::Client::new(&env, &sub.token);
        token_client.transfer(
            &env.current_contract_address(), // Typically, subscriptions utilize allowances or escrow. For this implementation, we assume the contract is allowed to move funds on behalf of the subscriber.
            &sub.artist,
            &sub.amount,
        );
        // Note: For real-world use, the `subscriber` must have approved this contract as a spender via `token_client.approve()`.

        // Update the next payment timestamp
        let duration = match sub.frequency {
            SubscriptionFrequency::Weekly => WEEK_IN_SECONDS,
            SubscriptionFrequency::Monthly => MONTH_IN_SECONDS,
        };
        sub.next_payment_timestamp = current_time + duration;

        // Save updated state
        write_subscription(&env, &subscription_id, &sub);

        // Emit payment processed event
        env.events()
            .publish((symbol_short!("sub_paid"), subscription_id), sub.amount);

        Ok(())
    }

    /// Cancels an active subscription
    pub fn cancel_subscription(env: Env, subscription_id: String) -> Result<(), Error> {
        let mut sub = read_subscription(&env, &subscription_id).ok_or(Error::SubscriptionNotFound)?;
        sub.subscriber.require_auth();

        sub.status = SubscriptionStatus::Cancelled;
        write_subscription(&env, &subscription_id, &sub);

        env.events()
            .publish((symbol_short!("sub_canc"), subscription_id), sub.subscriber);

        Ok(())
    }

    /// Pauses an active subscription
    pub fn pause_subscription(env: Env, subscription_id: String) -> Result<(), Error> {
        let mut sub = read_subscription(&env, &subscription_id).ok_or(Error::SubscriptionNotFound)?;
        sub.subscriber.require_auth();

        if sub.status == SubscriptionStatus::Cancelled {
            return Err(Error::InvalidStatus);
        }

        sub.status = SubscriptionStatus::Paused;
        write_subscription(&env, &subscription_id, &sub);

        env.events()
            .publish((symbol_short!("sub_paus"), subscription_id), sub.subscriber);

        Ok(())
    }

    /// Resumes a paused subscription
    pub fn resume_subscription(env: Env, subscription_id: String) -> Result<(), Error> {
        let mut sub = read_subscription(&env, &subscription_id).ok_or(Error::SubscriptionNotFound)?;
        sub.subscriber.require_auth();

        if sub.status != SubscriptionStatus::Paused {
            return Err(Error::InvalidStatus);
        }

        sub.status = SubscriptionStatus::Active;
        write_subscription(&env, &subscription_id, &sub);

        env.events()
            .publish((symbol_short!("sub_resm"), subscription_id), sub.subscriber);

        Ok(())
    }
}