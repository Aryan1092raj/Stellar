#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, BytesN, Env, IntoVal, Symbol, Val,
    Vec as SVec,
};

const RECORD_TTL_THRESHOLD: u32 = 100_000;
const RECORD_TTL_EXTEND_TO: u32 = 5_000_000;

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
    pub ngo_wallet: Address,
    pub project_id: u32,
    pub donor_lat: i32,
    pub donor_lon: i32,
    pub recipient_lat: i32,
    pub recipient_lon: i32,
    pub native_token: Address,
    pub evidence_hash: BytesN<32>,
    pub has_evidence: bool,
    pub status: Status,
    pub timestamp: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct NGOInfo {
    pub id: u32,
    pub name: soroban_sdk::String,
    pub wallet: Address,
    pub verified: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Init,
    NextId,
    NgoVerification,
    Escrow,
    Donation(u32),
    NgoDonations(u32),
}

#[contract]
pub struct DonationRegistry;

#[contractimpl]
impl DonationRegistry {
    pub fn initialize(env: Env, ngo_verification: Address, escrow: Address) {
        if has_init(&env) {
            panic!("already-initialized");
        }
        env.storage().instance().set(&DataKey::Init, &true);
        env.storage().instance().set(&DataKey::NextId, &0u32);
        env.storage()
            .instance()
            .set(&DataKey::NgoVerification, &ngo_verification);
        env.storage().instance().set(&DataKey::Escrow, &escrow);
    }

    pub fn record_donation(
        env: Env,
        donor: Address,
        amount: i128,
        ngo_id: u32,
        project_id: u32,
        donor_lat: i32,
        donor_lon: i32,
        native_token: Address,
    ) -> u32 {
        require_init(&env);
        if amount <= 0 {
            panic!("invalid-amount");
        }
        donor.require_auth();

        let ngo = get_verified_ngo(&env, ngo_id);
        let escrow = get_escrow(&env);

        let token_client = token::Client::new(&env, &native_token);
        token_client.transfer(&donor, &escrow, &amount);

        let id = next_id(&env);
        let ts: u64 = env.ledger().timestamp();
        let donation = Donation {
            id,
            donor: donor.clone(),
            amount,
            ngo_id,
            ngo_wallet: ngo.wallet.clone(),
            project_id,
            donor_lat,
            donor_lon,
            recipient_lat: 0,
            recipient_lon: 0,
            native_token: native_token.clone(),
            evidence_hash: BytesN::from_array(&env, &[0; 32]),
            has_evidence: false,
            status: Status::Pending,
            timestamp: ts,
        };

        put_donation(&env, id, &donation);
        append_ngo_donation(&env, ngo_id, id);
        lock_escrow(
            &env,
            &escrow,
            id,
            &donor,
            &ngo.wallet,
            amount,
            &native_token,
        );

        env.events().publish(
            (Symbol::new(&env, "donation_recorded"),),
            (id, donor.clone(), ngo_id, amount),
        );
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
        let key = DataKey::NgoDonations(ngo_id);
        let ids = env
            .storage()
            .persistent()
            .get::<_, SVec<u32>>(&key)
            .unwrap_or_else(|| SVec::new(&env));
        if !ids.is_empty() {
            env.storage()
                .persistent()
                .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
        }
        ids.len()
    }

    pub fn get_ngo_donation_id(env: Env, ngo_id: u32, index: u32) -> u32 {
        require_init(&env);
        let key = DataKey::NgoDonations(ngo_id);
        let ids = env
            .storage()
            .persistent()
            .get::<_, SVec<u32>>(&key)
            .unwrap_or_else(|| SVec::new(&env));
        env.storage()
            .persistent()
            .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
        ids.get(index)
            .unwrap_or_else(|| panic!("index-out-of-bounds"))
    }

    pub fn verify_impact(
        env: Env,
        donation_id: u32,
        verifier: Address,
        evidence_hash: BytesN<32>,
    ) -> bool {
        require_init(&env);
        verifier.require_auth();

        let mut d = get_donation_internal(&env, donation_id);
        if d.ngo_wallet != verifier {
            panic!("not-assigned-ngo");
        }

        if matches!(d.status, Status::Completed | Status::Verified) {
            return true;
        }

        d.status = Status::Verified;
        d.evidence_hash = evidence_hash;
        d.has_evidence = true;
        put_donation(&env, donation_id, &d);

        release_escrow(&env, donation_id);

        d.status = Status::Completed;
        put_donation(&env, donation_id, &d);

        env.events().publish(
            (Symbol::new(&env, "impact_verified"),),
            (donation_id, verifier),
        );
        true
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

fn get_ngo_verification(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::NgoVerification)
        .unwrap_or_else(|| panic!("ngo-verification-not-configured"))
}

fn get_escrow(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Escrow)
        .unwrap_or_else(|| panic!("escrow-not-configured"))
}

fn get_verified_ngo(env: &Env, ngo_id: u32) -> NGOInfo {
    let ngo_verif = get_ngo_verification(env);
    let mut is_verified_args: SVec<Val> = SVec::new(env);
    is_verified_args.push_back(ngo_id.into_val(env));
    let verified: bool = env.invoke_contract(
        &ngo_verif,
        &Symbol::new(env, "is_verified"),
        is_verified_args,
    );
    if !verified {
        panic!("ngo-not-verified");
    }

    let mut get_args: SVec<Val> = SVec::new(env);
    get_args.push_back(ngo_id.into_val(env));
    let ngo: NGOInfo = env.invoke_contract(&ngo_verif, &Symbol::new(env, "get"), get_args);
    if !ngo.verified {
        panic!("ngo-not-verified");
    }
    ngo
}

fn put_donation(env: &Env, id: u32, d: &Donation) {
    let key = DataKey::Donation(id);
    env.storage().persistent().set(&key, d);
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
}

fn get_donation_internal(env: &Env, id: u32) -> Donation {
    let key = DataKey::Donation(id);
    let donation = env
        .storage()
        .persistent()
        .get::<_, Donation>(&key)
        .unwrap_or_else(|| panic!("not-found"));
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
    donation
}

fn append_ngo_donation(env: &Env, ngo_id: u32, id: u32) {
    let key = DataKey::NgoDonations(ngo_id);
    let mut ids = env
        .storage()
        .persistent()
        .get::<_, SVec<u32>>(&key)
        .unwrap_or_else(|| SVec::new(env));
    ids.push_back(id);
    env.storage().persistent().set(&key, &ids);
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
}

fn lock_escrow(
    env: &Env,
    escrow: &Address,
    donation_id: u32,
    donor: &Address,
    ngo: &Address,
    amount: i128,
    native_token: &Address,
) {
    let mut args: SVec<Val> = SVec::new(env);
    args.push_back(env.current_contract_address().into_val(env));
    args.push_back(donation_id.into_val(env));
    args.push_back(donor.clone().into_val(env));
    args.push_back(ngo.clone().into_val(env));
    args.push_back(amount.into_val(env));
    args.push_back(native_token.clone().into_val(env));
    let ok: bool = env.invoke_contract(escrow, &Symbol::new(env, "lock"), args);
    if !ok {
        panic!("escrow-lock-failed");
    }
}

fn release_escrow(env: &Env, donation_id: u32) {
    let escrow = get_escrow(env);
    let mut args: SVec<Val> = SVec::new(env);
    args.push_back(env.current_contract_address().into_val(env));
    args.push_back(donation_id.into_val(env));
    let ok: bool = env.invoke_contract(&escrow, &Symbol::new(env, "release"), args);
    if !ok {
        panic!("escrow-release-failed");
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[contract]
    struct MockNGOVerif;

    #[contractimpl]
    impl MockNGOVerif {
        pub fn set_wallet(env: Env, wallet: Address) {
            env.storage()
                .instance()
                .set(&Symbol::new(&env, "wallet"), &wallet);
        }

        pub fn is_verified(_env: Env, _ngo_id: u32) -> bool {
            true
        }

        pub fn get(env: Env, ngo_id: u32) -> NGOInfo {
            let wallet: Address = env
                .storage()
                .instance()
                .get(&Symbol::new(&env, "wallet"))
                .unwrap();
            NGOInfo {
                id: ngo_id,
                name: soroban_sdk::String::from_str(&env, "Test NGO"),
                wallet,
                verified: true,
            }
        }
    }

    #[contract]
    struct MockEscrow;

    #[contractimpl]
    impl MockEscrow {
        pub fn lock(
            _env: Env,
            _registry: Address,
            _donation_id: u32,
            _donor: Address,
            _ngo: Address,
            _amount: i128,
            _native_token: Address,
        ) -> bool {
            true
        }

        pub fn release(_env: Env, _registry: Address, _donation_id: u32) -> bool {
            true
        }
    }

    #[contract]
    struct MockToken;

    #[contractimpl]
    impl MockToken {
        pub fn transfer(_env: Env, from: Address, _to: Address, amount: i128) {
            from.require_auth();
            if amount <= 0 {
                panic!("invalid-amount");
            }
        }
    }

    fn setup(env: &Env) -> (DonationRegistryClient<'_>, Address, Address) {
        let contract_id = env.register_contract(None, DonationRegistry);
        let client = DonationRegistryClient::new(env, &contract_id);

        let ngo_verif = env.register_contract(None, MockNGOVerif);
        let ngo_client = MockNGOVerifClient::new(env, &ngo_verif);
        let ngo_wallet = Address::generate(env);
        ngo_client.set_wallet(&ngo_wallet);

        let escrow = env.register_contract(None, MockEscrow);
        let token = env.register_contract(None, MockToken);

        client.initialize(&ngo_verif, &escrow);
        (client, ngo_wallet, token)
    }

    #[test]
    fn test_record_and_get() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();
        let (client, ngo_wallet, token) = setup(&env);
        let donor = Address::generate(&env);

        let id = client.record_donation(&donor, &100i128, &1u32, &1u32, &1234i32, &5678i32, &token);
        let d = client.get_donation(&id);
        assert_eq!(d.id, id);
        assert_eq!(d.amount, 100);
        assert_eq!(d.ngo_wallet, ngo_wallet);
    }

    #[test]
    fn test_verify_impact() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();
        let (client, ngo_wallet, token) = setup(&env);
        let donor = Address::generate(&env);
        let id = client.record_donation(&donor, &100i128, &1u32, &1u32, &0i32, &0i32, &token);
        let evidence_hash = BytesN::from_array(&env, &[7; 32]);

        let ok = client.verify_impact(&id, &ngo_wallet, &evidence_hash);
        assert!(ok);
        let d = client.get_donation(&id);
        assert!(matches!(d.status, Status::Completed));
        assert!(d.has_evidence);
        assert_eq!(d.evidence_hash, evidence_hash);
    }
}
