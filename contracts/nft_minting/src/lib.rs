#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec as SVec};

const RECORD_TTL_THRESHOLD: u32 = 100_000;
const RECORD_TTL_EXTEND_TO: u32 = 5_000_000;

#[derive(Clone)]
#[contracttype]
pub struct NFT {
    pub id: u32,
    pub owner: Address,
    pub uri: soroban_sdk::String,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Init,
    Next,
    Nft(u32),
    OwnerTokens(Address),
}

#[contract]
pub struct NFTMinting;

#[contractimpl]
impl NFTMinting {
    pub fn initialize(env: Env) {
        if env
            .storage()
            .instance()
            .get::<_, bool>(&DataKey::Init)
            .unwrap_or(false)
        {
            panic!("already-init");
        }
        env.storage().instance().set(&DataKey::Init, &true);
        env.storage().instance().set(&DataKey::Next, &0u32);
    }
    pub fn mint(env: Env, to: Address, uri: soroban_sdk::String) -> u32 {
        to.require_auth();
        let mut id = env
            .storage()
            .instance()
            .get::<_, u32>(&DataKey::Next)
            .unwrap_or(0);
        id += 1;
        env.storage().instance().set(&DataKey::Next, &id);
        let nft = NFT {
            id,
            owner: to.clone(),
            uri,
        };
        put_nft(&env, id, &nft);
        append_owner_token(&env, &to, id);
        env.events()
            .publish((Symbol::new(&env, "nft_minted"),), (id, to.clone()));
        id
    }
    pub fn get(env: Env, id: u32) -> NFT {
        get_nft_internal(&env, id)
    }
    pub fn tokens_of(env: Env, owner: Address) -> u32 {
        get_owner_tokens(&env, &owner).len()
    }

    pub fn owner_token_at(env: Env, owner: Address, index: u32) -> u32 {
        get_owner_tokens(&env, &owner)
            .get(index)
            .unwrap_or_else(|| panic!("index-out-of-bounds"))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    #[test]
    fn mint_and_get() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, NFTMinting);
        let client = NFTMintingClient::new(&env, &cid);
        client.initialize();
        let owner = Address::generate(&env);
        let id = client.mint(&owner, &soroban_sdk::String::from_str(&env, "ipfs://xyz"));
        let nft = client.get(&id);
        assert_eq!(nft.id, id);
        assert_eq!(client.tokens_of(&owner), 1);
        assert_eq!(client.owner_token_at(&owner, &0), id);
    }
}

fn put_nft(env: &Env, id: u32, nft: &NFT) {
    let key = DataKey::Nft(id);
    env.storage().persistent().set(&key, nft);
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
}

fn get_nft_internal(env: &Env, id: u32) -> NFT {
    let key = DataKey::Nft(id);
    let nft = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| panic!("nft-not-found"));
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
    nft
}

fn append_owner_token(env: &Env, owner: &Address, token_id: u32) {
    let key = DataKey::OwnerTokens(owner.clone());
    let mut tokens = get_owner_tokens(env, owner);
    tokens.push_back(token_id);
    env.storage().persistent().set(&key, &tokens);
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
}

fn get_owner_tokens(env: &Env, owner: &Address) -> SVec<u32> {
    let key = DataKey::OwnerTokens(owner.clone());
    let tokens = env
        .storage()
        .persistent()
        .get::<_, SVec<u32>>(&key)
        .unwrap_or_else(|| SVec::new(env));
    if !tokens.is_empty() {
        env.storage()
            .persistent()
            .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
    }
    tokens
}
