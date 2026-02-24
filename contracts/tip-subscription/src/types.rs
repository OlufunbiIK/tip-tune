use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubscriptionFrequency {
    Weekly,
    Monthly,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscription {
    pub id: String,
    pub subscriber: Address,
    pub artist: Address,
    pub amount: i128,
    pub frequency: SubscriptionFrequency,
    pub status: SubscriptionStatus,
    pub next_payment_timestamp: u64,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotAuthorized = 1,
    SubscriptionNotFound = 2,
    InvalidStatus = 3,
    PaymentTooEarly = 4,
    InvalidAmount = 5,
}