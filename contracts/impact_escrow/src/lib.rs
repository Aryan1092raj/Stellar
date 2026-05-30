#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

const ESCROW_TTL_THRESHOLD: u32 = 100_000;
const ESCROW_TTL_EXTEND_TO: u32 = 5_000_000;

#[derive(Clone)]
#[contracttype]
pub struct EscrowRecord {
    pub donation_id: u32,
    pub donor: Address,
    pub ngo: Address,
    pub amount: i128,
    pub native_token: Address,
    pub released: bool,
    pub refunded: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Init,
    Admin,
    Registry,
    Escrow(u32),
}

#[contract]
pub struct ImpactEscrow;

#[contractimpl]
impl ImpactEscrow {
    pub fn initialize(env: Env, admin: Address) {
        if has_init(&env) {
            panic!("already-initialized");
        }

        admin.require_auth();
        env.storage().instance().set(&DataKey::Init, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn set_registry(env: Env, admin: Address, registry: Address) {
        require_init(&env);
        require_admin(&env, &admin);
        env.storage().instance().set(&DataKey::Registry, &registry);
    }

    pub fn lock(
        env: Env,
        registry: Address,
        donation_id: u32,
        donor: Address,
        ngo: Address,
        amount: i128,
        native_token: Address,
    ) -> bool {
        require_init(&env);
        require_registry(&env, &registry);
        if amount <= 0 {
            panic!("invalid-amount");
        }

        let key = DataKey::Escrow(donation_id);
        if env.storage().persistent().has(&key) {
            panic!("already-locked");
        }

        let record = EscrowRecord {
            donation_id,
            donor,
            ngo,
            amount,
            native_token,
            released: false,
            refunded: false,
        };

        env.storage().persistent().set(&key, &record);
        env.storage()
            .persistent()
            .extend_ttl(&key, ESCROW_TTL_THRESHOLD, ESCROW_TTL_EXTEND_TO);

        env.events()
            .publish((Symbol::new(&env, "escrow_locked"),), (donation_id, amount));
        true
    }

    pub fn release(env: Env, registry: Address, donation_id: u32) -> bool {
        require_init(&env);
        require_registry(&env, &registry);
        release_record(env, donation_id, false)
    }

    pub fn release_by_admin(env: Env, admin: Address, donation_id: u32) -> bool {
        require_init(&env);
        require_admin(&env, &admin);
        release_record(env, donation_id, false)
    }

    pub fn refund(env: Env, admin: Address, donation_id: u32) -> bool {
        require_init(&env);
        require_admin(&env, &admin);
        release_record(env, donation_id, true)
    }

    pub fn get_escrow(env: Env, donation_id: u32) -> Option<EscrowRecord> {
        let key = DataKey::Escrow(donation_id);
        let record = env.storage().persistent().get(&key);
        if record.is_some() {
            env.storage()
                .persistent()
                .extend_ttl(&key, ESCROW_TTL_THRESHOLD, ESCROW_TTL_EXTEND_TO);
        }
        record
    }
}

fn release_record(env: Env, donation_id: u32, refund: bool) -> bool {
    let key = DataKey::Escrow(donation_id);
    let mut record: EscrowRecord = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| panic!("escrow-not-found"));

    if record.released || record.refunded {
        panic!("escrow-closed");
    }

    let recipient = if refund {
        record.donor.clone()
    } else {
        record.ngo.clone()
    };

    let token_client = token::Client::new(&env, &record.native_token);
    token_client.transfer(&env.current_contract_address(), &recipient, &record.amount);

    if refund {
        record.refunded = true;
        env.events().publish(
            (Symbol::new(&env, "escrow_refunded"),),
            (donation_id, recipient),
        );
    } else {
        record.released = true;
        env.events().publish(
            (Symbol::new(&env, "escrow_released"),),
            (donation_id, recipient),
        );
    }

    env.storage().persistent().set(&key, &record);
    env.storage()
        .persistent()
        .extend_ttl(&key, ESCROW_TTL_THRESHOLD, ESCROW_TTL_EXTEND_TO);
    true
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

fn require_admin(env: &Env, admin: &Address) {
    admin.require_auth();
    let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    if &stored_admin != admin {
        panic!("not-admin");
    }
}

fn require_registry(env: &Env, registry: &Address) {
    registry.require_auth();
    let stored_registry: Address = env
        .storage()
        .instance()
        .get(&DataKey::Registry)
        .unwrap_or_else(|| panic!("registry-not-configured"));
    if &stored_registry != registry {
        panic!("not-registry");
    }
}
