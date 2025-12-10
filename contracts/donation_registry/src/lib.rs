#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec as SVec, Val, IntoVal};

#[derive(Clone, Copy, PartialEq, Eq)]
#[contracttype]
pub enum Status {
    Pending,
    Verified,
    Completed,
}

#[derive(Clone)]
#[contracttype]
pub struct Donation {
    pub id: u32,
    pub donor: Address,
    pub amount: i128,
    pub ngo_id: u32,
    pub project_id: u32,
    pub donor_lat: i32,
    pub donor_lon: i32,
    pub recipient_lat: i32,
    pub recipient_lon: i32,
    pub status: Status,
    pub timestamp: u64,
}

#[contract]
pub struct DonationRegistry;

#[contractimpl]
impl DonationRegistry {
    pub fn initialize(env: Env, ngo_verification: Address, escrow: Address) {
        if has_init(&env) { panic!("already-initialized"); }
        env.storage().instance().set(&Symbol::new(&env, "init"), &true);
        env.storage().instance().set(&Symbol::new(&env, "next_id"), &0u32);
        env.storage().instance().set(&Symbol::new(&env, "ngo_verif"), &ngo_verification);
        env.storage().instance().set(&Symbol::new(&env, "escrow"), &escrow);
    }

    pub fn record_donation(
        env: Env,
        donor: Address,
        amount: i128,
        ngo_id: u32,
        project_id: u32,
        donor_lat: i32,
        donor_lon: i32,
    ) -> u32 {
        require_init(&env);
        if amount <= 0 { panic!("invalid-amount"); }
        donor.require_auth();
    let ngo_verif: Address = env.storage().instance().get(&Symbol::new(&env, "ngo_verif")).unwrap();
    // call is_verified(ngo_id) on NGOVerification contract
    let mut args: SVec<Val> = SVec::new(&env);
    args.push_back(ngo_id.into_val(&env));
    let verified: bool = env.invoke_contract::<bool>(&ngo_verif, &Symbol::new(&env, "is_verified"), args);
    if !verified { panic!("ngo-not-verified"); }
        let id = next_id(&env);
        let ts: u64 = env.ledger().timestamp();
        let donation = Donation {
            id,
            donor: donor.clone(),
            amount,
            ngo_id,
            project_id,
            donor_lat,
            donor_lon,
            recipient_lat: 0,
            recipient_lon: 0,
            status: Status::Pending,
            timestamp: ts,
        };
        put_donation(&env, id, &donation);
    append_ngo_donation(&env, ngo_id, id);
    // Emit event: ("donation_recorded", id, donor, ngo_id, amount)
    env.events().publish((Symbol::new(&env, "donation_recorded"),), (id, donor.clone(), ngo_id, amount));
        id
    }

    pub fn set_recipient_location(env: Env, donation_id: u32, lat: i32, lon: i32) {
        require_init(&env);
        let mut d = get_donation_internal(&env, donation_id);
        d.recipient_lat = lat;
        d.recipient_lon = lon;
        put_donation(&env, donation_id, &d);
    }

    pub fn get_donation(env: Env, id: u32) -> Donation {
        require_init(&env);
        get_donation_internal(&env, id)
    }

    pub fn get_ngo_donations_len(env: Env, ngo_id: u32) -> u32 {
        require_init(&env);
        env.storage().instance().get::<_, SVec<u32>>(&ngo_key(&env, ngo_id)).unwrap_or_else(|| SVec::new(&env)).len()
    }

    pub fn get_ngo_donation_id(env: Env, ngo_id: u32, index: u32) -> u32 {
        require_init(&env);
        let ids = env.storage().instance().get::<_, SVec<u32>>(&ngo_key(&env, ngo_id)).unwrap_or_else(|| SVec::new(&env));
        ids.get(index).unwrap_or_else(|| panic!("index-out-of-bounds"))
    }

    pub fn verify_impact(env: Env, donation_id: u32, verifier: Address) -> bool {
        require_init(&env);
        verifier.require_auth();
    // TODO: ACL: only NGO verifier or escrow contract allowed
        let mut d = get_donation_internal(&env, donation_id);
        if matches!(d.status, Status::Completed) { return true; }
        d.status = Status::Verified;
        put_donation(&env, donation_id, &d);
    env.events().publish((Symbol::new(&env, "impact_verified"),), (donation_id, verifier));
    // Trigger escrow release via cross-contract call
    let escrow: Address = env.storage().instance().get(&Symbol::new(&env, "escrow")).unwrap();
    let mut args: SVec<Val> = SVec::new(&env);
    args.push_back(donation_id.into_val(&env));
    let _ok: bool = env.invoke_contract::<bool>(&escrow, &Symbol::new(&env, "release"), args);
        true
    }
}

fn has_init(env: &Env) -> bool {
    env.storage().instance().get::<_, bool>(&Symbol::new(env, "init")).unwrap_or(false)
}

fn require_init(env: &Env) {
    if !has_init(env) { panic!("not-initialized"); }
}

fn next_id(env: &Env) -> u32 {
    let mut id = env.storage().instance().get::<_, u32>(&Symbol::new(env, "next_id")).unwrap_or(0);
    id += 1;
    env.storage().instance().set(&Symbol::new(env, "next_id"), &id);
    id
}

fn donation_key(env: &Env, id: u32) -> (Symbol, u32) { (Symbol::new(env, "don"), id) }
fn ngo_key(env: &Env, ngo_id: u32) -> (Symbol, u32) { (Symbol::new(env, "ngo"), ngo_id) }

fn put_donation(env: &Env, id: u32, d: &Donation) {
    env.storage().instance().set(&donation_key(env, id), d);
}

fn get_donation_internal(env: &Env, id: u32) -> Donation {
    env.storage().instance().get::<_, Donation>(&donation_key(env, id)).unwrap_or_else(|| panic!("not-found"))
}

fn append_ngo_donation(env: &Env, ngo_id: u32, id: u32) {
    let key = ngo_key(env, ngo_id);
    let mut ids = env
        .storage()
        .instance()
        .get::<_, SVec<u32>>(&key)
        .unwrap_or_else(|| SVec::new(env));
    ids.push_back(id);
    env.storage().instance().set(&key, &ids);
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _};

    #[contract]
    struct MockNGOVerif;

    #[contractimpl]
    impl MockNGOVerif {
        pub fn is_verified(_env: Env, _ngo_id: u32) -> bool { true }
    }

    #[test]
    fn test_record_and_get() {
        let env = Env::default();
    let contract_id = env.register_contract(None, DonationRegistry);
    let client = DonationRegistryClient::new(&env, &contract_id);
    let ngo_verif = env.register_contract(None, MockNGOVerif);
    let escrow_addr = Address::generate(&env);
    client.initialize(&ngo_verif, &escrow_addr);
        let donor = Address::generate(&env);
        let id = client.record_donation(&donor, &100i128, &1u32, &1u32, &1234i32, &5678i32);
        let d = client.get_donation(&id);
        assert_eq!(d.id, id);
        assert_eq!(d.amount, 100);
    }

    #[test]
    fn test_verify_impact() {
        let env = Env::default();
    let contract_id = env.register_contract(None, DonationRegistry);
    let client = DonationRegistryClient::new(&env, &contract_id);
    let ngo_verif = env.register_contract(None, MockNGOVerif);
    let escrow_addr = Address::generate(&env);
    client.initialize(&ngo_verif, &escrow_addr);
        let donor = Address::generate(&env);
        let id = client.record_donation(&donor, &100i128, &1u32, &1u32, &0i32, &0i32);
        let verifier = Address::generate(&env);
        // Mock authorization - in real test would use env.mock_all_auths()
        env.mock_all_auths();
        let ok = client.verify_impact(&id, &verifier);
        assert!(ok);
        let d = client.get_donation(&id);
        assert!(matches!(d.status, Status::Verified));
    }
}
