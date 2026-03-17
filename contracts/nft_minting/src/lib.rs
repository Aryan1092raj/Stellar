#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[derive(Clone)]
#[contracttype]
pub struct NFT { pub id: u32, pub owner: Address, pub uri: soroban_sdk::String }

#[contract]
pub struct NFTMinting;

#[contractimpl]
impl NFTMinting {
    pub fn initialize(env: Env) {
        if env.storage().instance().get::<_, bool>(&Symbol::new(&env, "init")).unwrap_or(false) { panic!("already-init"); }
        env.storage().instance().set(&Symbol::new(&env, "init"), &true);
        env.storage().instance().set(&Symbol::new(&env, "next"), &0u32);
    }
    pub fn mint(env: Env, to: Address, uri: soroban_sdk::String) -> u32 {
        to.require_auth();
        let mut id = env.storage().instance().get::<_, u32>(&Symbol::new(&env, "next")).unwrap_or(0);
        id += 1;
        env.storage().instance().set(&Symbol::new(&env, "next"), &id);
        let nft = NFT { id, owner: to.clone(), uri };
        env.storage().instance().set(&(Symbol::new(&env, "nft"), id), &nft);
        env.events().publish((Symbol::new(&env, "nft_minted"),), (id, to.clone()));
        id
    }
    pub fn get(env: Env, id: u32) -> NFT {
        env.storage().instance().get::<_, NFT>(&(Symbol::new(&env, "nft"), id)).unwrap()
    }
    pub fn tokens_of(env: Env, owner: Address) -> u32 {
        let mut count = 0u32;
        let next = env.storage().instance().get::<_, u32>(&Symbol::new(&env, "next")).unwrap_or(0);
        for i in 1..=next {
            if let Some(nft) = env.storage().instance().get::<_, NFT>(&(Symbol::new(&env, "nft"), i)) {
                if nft.owner == owner { count += 1; }
            }
        }
        count
    }
}

#[cfg(test)]
mod test { use super::*; use soroban_sdk::testutils::Address as _; #[test] fn mint_and_get() { let env = Env::default(); let cid = env.register_contract(None, NFTMinting); let client = NFTMintingClient::new(&env, &cid); client.initialize(); let owner = Address::generate(&env); let id = client.mint(&owner, &soroban_sdk::String::from_str(&env, "ipfs://xyz")); let nft = client.get(&id); assert_eq!(nft.id, id); assert_eq!(client.tokens_of(&owner), 1); }}