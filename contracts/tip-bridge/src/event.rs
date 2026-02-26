use soroban_sdk::{Address, Bytes, Env, String, symbol_short};

pub fn bridge_initiated(
    env: &Env,
    bridge_id: &String,
    source_chain: &String,
    recipient: &Address,
    amount: i128,
    fee: i128,
) {
    env.events().publish(
        (symbol_short!("BRIDGE"), symbol_short!("INIT")),
        (bridge_id, source_chain, recipient, amount, fee),
    );
}

pub fn bridge_completed(
    env: &Env,
    bridge_id: &String,
    recipient: &Address,
    net_amount: i128,
) {
    env.events().publish(
        (symbol_short!("BRIDGE"), symbol_short!("DONE")),
        (bridge_id, recipient, net_amount),
    );
}

pub fn bridge_back_initiated(
    env: &Env,
    bridge_id: &String,
    destination_chain: &String,
    sender: &Address,
    amount: i128,
    fee: i128,
) {
    env.events().publish(
        (symbol_short!("BBACK"), symbol_short!("INIT")),
        (bridge_id, destination_chain, sender, amount, fee),
    );
}

pub fn fees_collected(env: &Env, collector: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("FEE"), symbol_short!("COLLECT")),
        (collector, amount),
    );
}