#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

const RECORD_TTL_THRESHOLD: u32 = 100_000;
const RECORD_TTL_EXTEND_TO: u32 = 5_000_000;

#[derive(Clone)]
#[contracttype]
pub struct NGO {
    pub id: u32,
    pub name: soroban_sdk::String,
    pub wallet: Address,
    pub verified: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Init,
    Admin,
    NextId,
    Ngo(u32),
}

#[contract]
pub struct NGOVerification;

#[contractimpl]
impl NGOVerification {
    pub fn initialize(env: Env, admin: Address) {
        if has_init(&env) {
            panic!("already-initialized");
        }
        env.storage().instance().set(&DataKey::Init, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextId, &0u32);
    }

    pub fn register(env: Env, caller: Address, name: soroban_sdk::String, wallet: Address) -> u32 {
        require_init(&env);
        caller.require_auth();
        let id = next_id(&env);
        let ngo = NGO {
            id,
            name,
            wallet: wallet.clone(),
            verified: false,
        };
        put_ngo(&env, id, &ngo);
        env.events()
            .publish((Symbol::new(&env, "ngo_registered"),), (id, wallet.clone()));
        id
    }

    pub fn set_verified(env: Env, admin: Address, ngo_id: u32, verified: bool) {
        require_init(&env);
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if stored_admin != admin {
            panic!("not-admin");
        }
        let mut ngo = get_ngo_internal(&env, ngo_id);
        ngo.verified = verified;
        put_ngo(&env, ngo_id, &ngo);
        env.events()
            .publish((Symbol::new(&env, "ngo_verified"),), (ngo_id, verified));
    }

    pub fn get(env: Env, ngo_id: u32) -> NGO {
        require_init(&env);
        get_ngo_internal(&env, ngo_id)
    }

    pub fn is_verified(env: Env, ngo_id: u32) -> bool {
        require_init(&env);
        let ngo = get_ngo_internal(&env, ngo_id);
        ngo.verified
    }
}

fn has_init(env: &Env) -> bool {
    env.storage()
        .instance()
        .get::<_, bool>(&DataKey::Init)
        .unwrap_or(false)
}
fn require_init(env: &Env) {
    if !has_init(env) {
        panic!("not-initialized");
    }
}
fn next_id(env: &Env) -> u32 {
    let mut id = env
        .storage()
        .instance()
        .get::<_, u32>(&DataKey::NextId)
        .unwrap_or(0);
    id += 1;
    env.storage().instance().set(&DataKey::NextId, &id);
    id
}

fn put_ngo(env: &Env, id: u32, ngo: &NGO) {
    let key = DataKey::Ngo(id);
    env.storage().persistent().set(&key, ngo);
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
}

fn get_ngo_internal(env: &Env, id: u32) -> NGO {
    let key = DataKey::Ngo(id);
    let ngo = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| panic!("ngo-not-found"));
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
    ngo
}
