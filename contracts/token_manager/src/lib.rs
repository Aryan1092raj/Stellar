#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[contract]
pub struct TokenManager;

#[contractimpl]
impl TokenManager {
    pub fn initialize(env: Env) {
        if env.storage().instance().get::<_, bool>(&Symbol::new(&env, "init")).unwrap_or(false) {
            panic!("already-initialized");
        }
        env.storage().instance().set(&Symbol::new(&env, "init"), &true);
    }

    pub fn deposit(_env: Env, from: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 { panic!("invalid-amount"); }
        // TODO: integrate with native XLM or token interface
    }

    pub fn withdraw(_env: Env, to: Address, amount: i128) {
        // TODO: implement
        let _ = (to, amount);
    }
}
