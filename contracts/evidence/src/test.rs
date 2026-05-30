#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

#[test]
fn test_submit_and_verify_evidence() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EvidenceContract);
    let client = EvidenceContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let project_id = 1001;

    // Mock a SHA-256 hash (32 bytes)
    let mock_hash = BytesN::from_array(
        &env,
        &[
            0x6d, 0x79, 0x68, 0x61, 0x73, 0x68, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38,
            0x39, 0x30, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c,
            0x6d, 0x6e, 0x6f, 0x70,
        ],
    );

    env.mock_all_auths();

    // Submit evidence
    let evidence_index = client.submit_evidence(&project_id, &mock_hash, &issuer);
    assert_eq!(evidence_index, 0);

    // Get evidence
    let evidence = client.get_evidence(&project_id, &evidence_index).unwrap();
    assert_eq!(evidence.project_id, project_id);
    assert_eq!(evidence.evidence_hash, mock_hash);
    assert_eq!(evidence.issuer, issuer);

    // Verify evidence
    let is_valid = client.verify_evidence(&project_id, &evidence_index, &mock_hash);
    assert!(is_valid);

    // Verify with wrong hash fails
    let wrong_hash = BytesN::from_array(
        &env,
        &[
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
        ],
    );
    let is_invalid = client.verify_evidence(&project_id, &evidence_index, &wrong_hash);
    assert!(!is_invalid);

    // Check count
    let count = client.get_evidence_count(&project_id);
    assert_eq!(count, 1);
}

#[test]
fn test_multiple_evidence_submissions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EvidenceContract);
    let client = EvidenceContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let project_id = 2002;

    env.mock_all_auths();

    // Submit 3 pieces of evidence
    for i in 0..3 {
        let hash = BytesN::from_array(&env, &[i; 32]);
        let index = client.submit_evidence(&project_id, &hash, &issuer);
        assert_eq!(index, i as u64);
    }

    // Check count
    let count = client.get_evidence_count(&project_id);
    assert_eq!(count, 3);

    // Get all evidence
    let all_evidence = client.get_project_evidence(&project_id, &0);
    assert_eq!(all_evidence.len(), 3);
}
