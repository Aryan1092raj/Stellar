#![no_std]

use soroban_sdk::{contract, contractimpl, token, Address, Env, Symbol};

#[contract]
pub struct TokenManager;

#[contractimpl]
impl TokenManager {
    pub fn initialize(env: Env) {
        if env
            .storage()
            .instance()
            .get::<_, bool>(&Symbol::new(&env, "init"))
            .unwrap_or(false)
        {
            panic!("already-initialized");
        }
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "init"), &true);
    }

    pub fn deposit(
        env: Env,
        from: Address,
        escrow_contract: Address,
        amount: i128,
        native_token: Address,
    ) -> bool {
        from.require_auth();
        if amount <= 0 {
            panic!("invalid-amount");
        }

        let token_client = token::Client::new(&env, &native_token);
        token_client.transfer(&from, &escrow_contract, &amount);
        true
    }

    pub fn withdraw(
        env: Env,
        caller: Address,
        to: Address,
        amount: i128,
        native_token: Address,
    ) -> bool {
        caller.require_auth();
        if amount <= 0 {
            panic!("invalid-amount");
        }

        let token_client = token::Client::new(&env, &native_token);
        token_client.transfer(&caller, &to, &amount);
        true
    }
}
