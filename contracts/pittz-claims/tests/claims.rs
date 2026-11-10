use multiversx_sc_scenario::imports::*;
use pittz_claims::PittzClaims;
const OWNER: TestAddress = TestAddress::new("owner");
const ALICE: TestAddress = TestAddress::new("alice");
const BOB: TestAddress = TestAddress::new("bob");
const OUTSIDER: TestAddress = TestAddress::new("outsider");
const SC: TestSCAddress = TestSCAddress::new("pittz-claims");
const TOKEN: TestTokenIdentifier = TestTokenIdentifier::new("PITTZTEST-123456");
const WRONG: TestTokenIdentifier = TestTokenIdentifier::new("BONEZ-ff9a73");

fn setup() -> ScenarioWorld {
    let mut world = ScenarioWorld::new();
    world.register_contract("str:pittz-claims", pittz_claims::ContractBuilder);
    world
        .account(OWNER)
        .nonce(1)
        .esdt_balance(TOKEN, 1000u64)
        .esdt_balance(WRONG, 1000u64);
    world.account(ALICE).nonce(1);
    world.account(BOB).nonce(1);
    world.account(OUTSIDER).nonce(1);
    world
        .tx()
        .from(OWNER)
        .raw_deploy()
        .code(BytesValue::from("str:pittz-claims"))
        .new_address(SC)
        .whitebox(pittz_claims::contract_obj, |sc| {
            sc.init(TOKEN.to_token_id())
        });
    world
}
fn fund(world: &mut ScenarioWorld, cycle: u64) {
    world
        .tx()
        .from(OWNER)
        .to(SC)
        .payment(Payment::new(
            TOKEN,
            0,
            NonZeroBigUint::try_from(100u128).unwrap(),
        ))
        .whitebox(pittz_claims::contract_obj, |sc| {
            sc.create_cycle(cycle, 100, 200, ManagedByteArray::new_from_bytes(&[1; 32]));
        });
}
fn allocations(world: &mut ScenarioWorld, cycle: u64) {
    world
        .tx()
        .from(OWNER)
        .to(SC)
        .whitebox(pittz_claims::contract_obj, |sc| {
            let mut rows = MultiValueEncoded::new();
            rows.push((ALICE.to_managed_address(), BigUint::from(60u32)).into());
            rows.push((BOB.to_managed_address(), BigUint::from(40u32)).into());
            sc.add_allocations(cycle, rows);
            sc.seal_cycle(cycle);
        });
}
fn at(world: &mut ScenarioWorld, t: u64) {
    world
        .current_block()
        .block_timestamp_seconds(TimestampSeconds::new(t));
}
#[test]
fn claim_transfer_retry_and_deadline() {
    let mut w = setup();
    fund(&mut w, 1);
    allocations(&mut w, 1);
    at(&mut w, 99);
    w.tx()
        .from(ALICE)
        .to(SC)
        .with_result(ExpectError(4, "Claim window not open"))
        .whitebox(pittz_claims::contract_obj, |sc| sc.claim(1));
    at(&mut w, 100);
    w.tx()
        .from(ALICE)
        .to(SC)
        .whitebox(pittz_claims::contract_obj, |sc| sc.claim(1));
    w.check_account(ALICE).esdt_balance(TOKEN, 60u64);
    w.check_account(SC).esdt_balance(TOKEN, 40u64);
    w.tx()
        .from(ALICE)
        .to(SC)
        .with_result(ExpectError(4, "Already claimed"))
        .whitebox(pittz_claims::contract_obj, |sc| sc.claim(1));
    w.tx()
        .from(OUTSIDER)
        .to(SC)
        .with_result(ExpectError(4, "No eligible allocation"))
        .whitebox(pittz_claims::contract_obj, |sc| sc.claim(1));
    at(&mut w, 200);
    w.tx()
        .from(BOB)
        .to(SC)
        .with_result(ExpectError(4, "Claim window closed"))
        .whitebox(pittz_claims::contract_obj, |sc| sc.claim(1));
    w.tx()
        .from(OUTSIDER)
        .to(SC)
        .whitebox(pittz_claims::contract_obj, |sc| {
            sc.expire_cycle(1);
            assert_eq!(sc.expired(1).get(), BigUint::from(40u32));
            assert_eq!(
                sc.claimed_total(1).get() + sc.expired(1).get(),
                sc.budget(1).get()
            );
        });
    w.check_account(SC).esdt_balance(TOKEN, 40u64);
    w.tx()
        .from(OWNER)
        .to(SC)
        .with_result(ExpectError(4, "Cycle already expired"))
        .whitebox(pittz_claims::contract_obj, |sc| sc.expire_cycle(1));
}
#[test]
fn publication_is_owner_only_and_cannot_overallocate() {
    let mut w = setup();
    fund(&mut w, 1);
    w.tx()
        .from(ALICE)
        .to(SC)
        .raw_call("sealCycle")
        .argument(&1u64)
        .with_result(ExpectError(4, "Endpoint can only be called by owner"))
        .run();
    w.tx()
        .from(OWNER)
        .to(SC)
        .with_result(ExpectError(4, "Allocations must equal funded budget"))
        .whitebox(pittz_claims::contract_obj, |sc| sc.seal_cycle(1));
    w.tx()
        .from(OWNER)
        .to(SC)
        .with_result(ExpectError(4, "Cycle budget exceeded"))
        .whitebox(pittz_claims::contract_obj, |sc| {
            let mut rows = MultiValueEncoded::new();
            rows.push((ALICE.to_managed_address(), BigUint::from(60u32)).into());
            rows.push((BOB.to_managed_address(), BigUint::from(60u32)).into());
            sc.add_allocations(1, rows);
        });
    w.query().to(SC).whitebox(pittz_claims::contract_obj, |sc| {
        assert_eq!(
            sc.allocation(1, &ALICE.to_managed_address()).get(),
            BigUint::zero()
        );
        assert_eq!(sc.allocated(1).get(), BigUint::zero());
    });
    allocations(&mut w, 1);
    w.tx()
        .from(OWNER)
        .to(SC)
        .with_result(ExpectError(4, "Cycle sealed"))
        .whitebox(pittz_claims::contract_obj, |sc| {
            let mut rows = MultiValueEncoded::new();
            rows.push((OUTSIDER.to_managed_address(), BigUint::from(1u32)).into());
            sc.add_allocations(1, rows);
        });
}
#[test]
fn wrong_token_payment_reverts() {
    let mut w = setup();
    w.tx()
        .from(OWNER)
        .to(SC)
        .payment(Payment::new(
            WRONG,
            0,
            NonZeroBigUint::try_from(100u128).unwrap(),
        ))
        .with_result(ExpectError(4, "Wrong test token"))
        .whitebox(pittz_claims::contract_obj, |sc| {
            sc.create_cycle(1, 100, 200, ManagedByteArray::new_from_bytes(&[1; 32]));
        });
    w.check_account(OWNER).esdt_balance(WRONG, 1000u64);
    w.query().to(SC).whitebox(pittz_claims::contract_obj, |sc| {
        assert!(sc.budget(1).is_empty())
    });
}
#[test]
fn all_claimed_and_cycle_isolation() {
    let mut w = setup();
    fund(&mut w, 1);
    fund(&mut w, 2);
    allocations(&mut w, 1);
    allocations(&mut w, 2);
    at(&mut w, 199);
    for c in [1, 2] {
        for user in [ALICE, BOB] {
            w.tx()
                .from(user)
                .to(SC)
                .whitebox(pittz_claims::contract_obj, |sc| sc.claim(c));
        }
    }
    w.check_account(ALICE).esdt_balance(TOKEN, 120u64);
    w.check_account(BOB).esdt_balance(TOKEN, 80u64);
    w.check_account(SC).esdt_balance(TOKEN, 0u64);
    at(&mut w, 200);
    w.tx()
        .from(OUTSIDER)
        .to(SC)
        .whitebox(pittz_claims::contract_obj, |sc| {
            sc.expire_cycle(1);
            assert_eq!(sc.expired(1).get(), BigUint::zero());
        });
    w.tx()
        .from(OWNER)
        .to(SC)
        .with_result(ExpectError(4, "Cycle already expired"))
        .whitebox(pittz_claims::contract_obj, |sc| sc.expire_cycle(1));
}

#[test]
fn duplicate_cycle_duplicate_wallet_and_early_expiry_revert() {
    let mut w = setup();
    fund(&mut w, 1);
    w.tx()
        .from(OWNER)
        .to(SC)
        .payment(Payment::new(
            TOKEN,
            0,
            NonZeroBigUint::try_from(100u128).unwrap(),
        ))
        .with_result(ExpectError(4, "Cycle already exists"))
        .whitebox(pittz_claims::contract_obj, |sc| {
            sc.create_cycle(1, 100, 200, ManagedByteArray::new_from_bytes(&[2; 32]));
        });
    w.check_account(SC).esdt_balance(TOKEN, 100u64);
    w.tx()
        .from(OWNER)
        .to(SC)
        .with_result(ExpectError(4, "Duplicate allocation"))
        .whitebox(pittz_claims::contract_obj, |sc| {
            let mut rows = MultiValueEncoded::new();
            rows.push((ALICE.to_managed_address(), BigUint::from(10u32)).into());
            rows.push((ALICE.to_managed_address(), BigUint::from(10u32)).into());
            sc.add_allocations(1, rows);
        });
    w.query().to(SC).whitebox(pittz_claims::contract_obj, |sc| {
        assert_eq!(
            sc.allocation(1, &ALICE.to_managed_address()).get(),
            BigUint::zero()
        );
    });
    w.tx()
        .from(OUTSIDER)
        .to(SC)
        .with_result(ExpectError(4, "Claim window still open"))
        .whitebox(pittz_claims::contract_obj, |sc| sc.expire_cycle(1));
    // An incomplete publication expires too, preserving all test funds separately.
    at(&mut w, 200);
    w.tx()
        .from(OUTSIDER)
        .to(SC)
        .whitebox(pittz_claims::contract_obj, |sc| {
            sc.expire_cycle(1);
            assert_eq!(sc.expired(1).get(), BigUint::from(100u32));
        });
}

#[test]
fn mainnet_bonez_identifier_cannot_initialize_test_contract() {
    let mut w = ScenarioWorld::new();
    w.register_contract("str:pittz-claims", pittz_claims::ContractBuilder);
    w.account(OWNER).nonce(1);
    w.tx()
        .from(OWNER)
        .raw_deploy()
        .code(BytesValue::from("str:pittz-claims"))
        .new_address(SC)
        .with_result(ExpectError(4, "Test token only"))
        .whitebox(pittz_claims::contract_obj, |sc| {
            sc.init(WRONG.to_token_id())
        });
}

#[test]
fn rejects_contract_recipients_and_publication_after_opening() {
    let mut w = setup();
    fund(&mut w, 1);
    w.tx()
        .from(OWNER)
        .to(SC)
        .with_result(ExpectError(4, "Holder wallet required"))
        .whitebox(pittz_claims::contract_obj, |sc| {
            let mut rows = MultiValueEncoded::new();
            rows.push((SC.to_managed_address(), BigUint::from(100u32)).into());
            sc.add_allocations(1, rows);
        });
    at(&mut w, 100);
    w.tx()
        .from(OWNER)
        .to(SC)
        .with_result(ExpectError(4, "Publication window closed"))
        .whitebox(pittz_claims::contract_obj, |sc| {
            let mut rows = MultiValueEncoded::new();
            rows.push((ALICE.to_managed_address(), BigUint::from(100u32)).into());
            sc.add_allocations(1, rows);
        });
    w.tx()
        .from(ALICE)
        .to(SC)
        .with_result(ExpectError(4, "Cycle not sealed"))
        .whitebox(pittz_claims::contract_obj, |sc| sc.claim(1));
}
