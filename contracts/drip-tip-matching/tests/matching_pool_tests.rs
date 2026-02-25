use soroban_sdk::{testutils::Accounts, Env};
use drip_tip_matching::TipMatchingContract;

#[test]
fn test_matching_pool_lifecycle() {
    let env = Env::default();
    let sponsor = Accounts::generate(&env);
    let artist = Accounts::generate(&env);
    let tipper = Accounts::generate(&env);

    let pool_id = TipMatchingContract::create_matching_pool(
        env.clone(),
        sponsor.address.clone(),
        artist.address.clone(),
        1000,
        100,
        env.ledger().timestamp() + 1000,
    ).unwrap();

    let matched = TipMatchingContract::apply_match(env.clone(), pool_id.clone(), 100, tipper.address.clone()).unwrap();
    assert_eq!(matched, 100); // 1:1 match

    let pool = TipMatchingContract::get_pool_status(env.clone(), pool_id.clone()).unwrap();
    assert_eq!(pool.remaining_amount, 900);

    let refund = TipMatchingContract::cancel_pool(env.clone(), pool_id.clone(), sponsor.address.clone()).unwrap();
    assert_eq!(refund, 900);
}