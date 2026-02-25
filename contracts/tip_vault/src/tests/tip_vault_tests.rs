#![cfg(test)]
use soroban_sdk::{testutils::Env as _, Env, Address};
use tip_vault::{TipVaultContract, ReleaseFrequency};

#[test]
fn test_vault_deposit_and_release() {
    let env = Env::default();
    let artist = Address::random(&env);
    
    // Create vault weekly
    let vault_id = TipVaultContract::create_vault(env.clone(), artist.clone(), ReleaseFrequency::Weekly);

    // Deposit
    TipVaultContract::deposit_to_vault(env.clone(), vault_id.clone(), 1000).unwrap();
    assert_eq!(TipVaultContract::get_vault_balance(env.clone(), vault_id.clone()), 1000);

    // Release before time should fail
    let res = TipVaultContract::release_batch(env.clone(), vault_id.clone());
    assert!(res.is_err());

    // Simulate time passage
    let mut vault: tip_vault::TipVault = env.storage().get(&vault_id).unwrap();
    vault.next_release = env.ledger().timestamp() - 1;
    env.storage().set(&vault_id, &vault);

    // Release batch succeeds
    let released = TipVaultContract::release_batch(env.clone(), vault_id.clone()).unwrap();
    assert_eq!(released, 1000);
    assert_eq!(TipVaultContract::get_vault_balance(env.clone(), vault_id.clone()), 0);
}