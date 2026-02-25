use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum LotteryError {
    PoolAlreadyExists,
    PoolNotFound,
    LotteryNotOpen,
    LotteryNotDrawingTime,
    NotWinner,
    AlreadyClaimed,
}