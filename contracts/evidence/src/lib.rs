#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env};

const RECORD_TTL_THRESHOLD: u32 = 100_000;
const RECORD_TTL_EXTEND_TO: u32 = 5_000_000;

/// Evidence record stored on-chain
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Evidence {
    pub project_id: u64,
    pub evidence_hash: BytesN<32>, // SHA-256 hash of IPFS CID
    pub timestamp: u64,
    pub issuer: Address,
}

/// Storage keys for evidence records
#[contracttype]
pub enum EvidenceKey {
    Evidence(u64, u64), // (project_id, evidence_index)
    EvidenceCount(u64), // Count per project
}

#[contract]
pub struct EvidenceContract;

#[contractimpl]
impl EvidenceContract {
    /// Submit evidence for a project
    ///
    /// # Arguments
    /// * `project_id` - The project this evidence belongs to
    /// * `cid_hash` - SHA-256 hash of the IPFS CID (32 bytes)
    /// * `issuer` - Address submitting the evidence (must be authenticated)
    ///
    /// # Returns
    /// * `u64` - Evidence index for this project
    pub fn submit_evidence(
        env: Env,
        project_id: u64,
        cid_hash: BytesN<32>,
        issuer: Address,
    ) -> u64 {
        // Require authentication from issuer
        issuer.require_auth();

        // Get current evidence count for this project
        let count_key = EvidenceKey::EvidenceCount(project_id);
        let evidence_index: u64 = env.storage().persistent().get(&count_key).unwrap_or(0);

        // Create evidence record
        let evidence = Evidence {
            project_id,
            evidence_hash: cid_hash,
            timestamp: env.ledger().timestamp(),
            issuer: issuer.clone(),
        };

        // Store evidence
        let evidence_key = EvidenceKey::Evidence(project_id, evidence_index);
        env.storage().persistent().set(&evidence_key, &evidence);
        env.storage().persistent().extend_ttl(
            &evidence_key,
            RECORD_TTL_THRESHOLD,
            RECORD_TTL_EXTEND_TO,
        );

        // Increment count
        env.storage()
            .persistent()
            .set(&count_key, &(evidence_index + 1));
        env.storage().persistent().extend_ttl(
            &count_key,
            RECORD_TTL_THRESHOLD,
            RECORD_TTL_EXTEND_TO,
        );

        evidence_index
    }

    /// Get evidence by project_id and evidence_index
    ///
    /// # Returns
    /// * `Option<Evidence>` - Evidence record if found
    pub fn get_evidence(env: Env, project_id: u64, evidence_index: u64) -> Option<Evidence> {
        let key = EvidenceKey::Evidence(project_id, evidence_index);
        let evidence = env.storage().persistent().get(&key);
        if evidence.is_some() {
            env.storage()
                .persistent()
                .extend_ttl(&key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
        }
        evidence
    }

    /// Verify evidence hash matches expected hash
    ///
    /// # Arguments
    /// * `project_id` - Project ID
    /// * `evidence_index` - Evidence index
    /// * `expected_hash` - Hash to verify against
    ///
    /// # Returns
    /// * `bool` - True if hash matches, false otherwise
    pub fn verify_evidence(
        env: Env,
        project_id: u64,
        evidence_index: u64,
        expected_hash: BytesN<32>,
    ) -> bool {
        match Self::get_evidence(env, project_id, evidence_index) {
            Some(evidence) => evidence.evidence_hash == expected_hash,
            None => false,
        }
    }

    /// Get total evidence count for a project
    pub fn get_evidence_count(env: Env, project_id: u64) -> u64 {
        let count_key = EvidenceKey::EvidenceCount(project_id);
        let count = env.storage().persistent().get(&count_key).unwrap_or(0);
        if count > 0 {
            env.storage().persistent().extend_ttl(
                &count_key,
                RECORD_TTL_THRESHOLD,
                RECORD_TTL_EXTEND_TO,
            );
        }
        count
    }

    /// Get all evidence for a project (limited to prevent gas overflow)
    pub fn get_project_evidence(
        env: Env,
        project_id: u64,
        limit: u64,
    ) -> soroban_sdk::Vec<Evidence> {
        let count = Self::get_evidence_count(env.clone(), project_id);
        let mut results = soroban_sdk::Vec::new(&env);

        let max_items = if limit > 0 && limit < count {
            limit
        } else {
            count
        };

        for i in 0..max_items {
            if let Some(evidence) = Self::get_evidence(env.clone(), project_id, i) {
                results.push_back(evidence);
            }
        }

        results
    }
}

mod test;
