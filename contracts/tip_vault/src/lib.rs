#![no_std]
use soroban_sdk::{contractimpl, contracttype, Address, Env, Symbol};
mod error;
use error::TipVaultError;

#[contracttype]
#[derive(Clone)]
pub enum ReleaseFrequency {
    Instant,
    Weekly,
    Monthly,
}

#[contracttype]
#[derive(Clone)]
pub struct TipVault {
    pub vault_id: String,
    pub artist: Address,
    pub locked_amount: i128,
    pub release_frequency: ReleaseFrequency,
    pub next_release: u64,
    pub total_released: i128,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct VaultRelease {
    pub vault_id: String,
    pub amount: i128,
    pub released_at: u64,
    pub tx_hash: String,
}

pub struct TipVaultContract;

#[contractimpl]
impl TipVaultContract {
    pub fn create_vault(env: Env, artist: Address, frequency: ReleaseFrequency) -> String {
        let vault_id = env.invoker().to_string() + "-" + &env.ledger().sequence().to_string();
        let vault = TipVault {
            vault_id: vault_id.clone(),
            artist: artist.clone(),
            locked_amount: 0,
            release_frequency: frequency,
            next_release: env.ledger().timestamp(),
            total_released: 0,
            is_active: true,
        };
        env.storage().set(&vault_id, &vault);
        vault_id
    }

    pub fn deposit_to_vault(env: Env, vault_id: String, amount: i128) -> Result<(), TipVaultError> {
        let mut vault: TipVault = env.storage().get(&vault_id).ok_or(TipVaultError::VaultNotFound)?;
        vault.locked_amount += amount;
        env.storage().set(&vault_id, &vault);
        env.events().publish((Symbol::short("deposit"), vault_id.clone()), amount);
        Ok(())
    }

    pub fn release_batch(env: Env, vault_id: String) -> Result<i128, TipVaultError> {
        let mut vault: TipVault = env.storage().get(&vault_id).ok_or(TipVaultError::VaultNotFound)?;
        if !vault.is_active {
            return Err(TipVaultError::VaultNotFound);
        }

        let now = env.ledger().timestamp();
        if now < vault.next_release {
            return Err(TipVaultError::ReleaseTooEarly);
        }

        let amount_to_release = vault.locked_amount;
        vault.locked_amount = 0;
        vault.total_released += amount_to_release;

        // Update next_release based on frequency
        let next_release = match vault.release_frequency {
            ReleaseFrequency::Instant => now,
            ReleaseFrequency::Weekly => now + 7 * 24 * 60 * 60,
            ReleaseFrequency::Monthly => now + 30 * 24 * 60 * 60,
        };
        vault.next_release = next_release;

        env.storage().set(&vault_id, &vault);
        env.events().publish((Symbol::short("release"), vault_id.clone()), amount_to_release);

        Ok(amount_to_release)
    }

    pub fn get_vault_balance(env: Env, vault_id: String) -> i128 {
        let vault: TipVault = env.storage().get(&vault_id).unwrap();
        vault.locked_amount
    }

    pub fn change_frequency(
        env: Env,
        artist: Address,
        vault_id: String,
        new_frequency: ReleaseFrequency,
    ) -> Result<(), TipVaultError> {
        let mut vault: TipVault = env.storage().get(&vault_id).ok_or(TipVaultError::VaultNotFound)?;
        if vault.artist != artist {
            return Err(TipVaultError::NotVaultOwner);
        }
        vault.release_frequency = new_frequency;
        env.storage().set(&vault_id, &vault);
        Ok(())
    }
}