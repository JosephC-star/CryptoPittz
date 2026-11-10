#![no_std]
use multiversx_sc::imports::*;

/// Devnet prototype. The publisher supplies independently reconciled allocations.
#[multiversx_sc::contract]
pub trait PittzClaims {
    #[init]
    fn init(&self, token: TokenId) {
        require!(token.is_valid_esdt_identifier(), "Invalid test token");
        require!(
            token.ticker() == ManagedBuffer::from(b"PITTZTEST"),
            "Test token only"
        );
        self.reward_token().set(token);
    }

    /// Fund exactly one immutable cycle using a fungible test-token payment.
    #[only_owner]
    #[payable("*")]
    #[endpoint(createCycle)]
    fn create_cycle(&self, cycle: u64, opens: u64, deadline: u64, manifest: ManagedByteArray<32>) {
        require!(self.budget(cycle).is_empty(), "Cycle already exists");
        require!(
            opens > self.now() && deadline > opens,
            "Invalid claim window"
        );
        let payment = self.call_value().single();
        require!(
            payment.token_identifier == self.reward_token().get(),
            "Wrong test token"
        );
        require!(payment.is_fungible(), "Fungible test token required");
        self.budget(cycle).set(payment.amount.as_big_uint());
        self.opens(cycle).set(opens);
        self.deadline(cycle).set(deadline);
        self.manifest(cycle).set(manifest);
    }

    /// Every wallet can be assigned only once. A failed batch reverts in full.
    #[only_owner]
    #[endpoint(addAllocations)]
    fn add_allocations(
        &self,
        cycle: u64,
        entries: MultiValueEncoded<MultiValue2<ManagedAddress, BigUint>>,
    ) {
        self.require_cycle(cycle);
        require!(!self.sealed(cycle).get(), "Cycle sealed");
        require!(
            self.now() < self.opens(cycle).get(),
            "Publication window closed"
        );
        require!(
            !entries.is_empty() && entries.len() <= 50,
            "Batch must contain 1 to 50 wallets"
        );
        let mut total = self.allocated(cycle).get();
        for entry in entries {
            let (wallet, amount) = entry.into_tuple();
            require!(
                !wallet.is_zero() && !self.blockchain().is_smart_contract(&wallet),
                "Holder wallet required"
            );
            require!(amount > 0u32, "Allocation must be positive");
            require!(
                self.allocation(cycle, &wallet).is_empty(),
                "Duplicate allocation"
            );
            total += &amount;
            require!(total <= self.budget(cycle).get(), "Cycle budget exceeded");
            self.allocation(cycle, &wallet).set(amount);
        }
        self.allocated(cycle).set(total);
    }

    #[only_owner]
    #[endpoint(sealCycle)]
    fn seal_cycle(&self, cycle: u64) {
        self.require_cycle(cycle);
        require!(!self.sealed(cycle).get(), "Cycle sealed");
        require!(
            self.now() < self.opens(cycle).get(),
            "Publication window closed"
        );
        require!(
            self.allocated(cycle).get() == self.budget(cycle).get(),
            "Allocations must equal funded budget"
        );
        self.sealed(cycle).set(true);
    }

    #[endpoint(claim)]
    fn claim(&self, cycle: u64) {
        self.require_cycle(cycle);
        require!(self.sealed(cycle).get(), "Cycle not sealed");
        let now = self.now();
        require!(now >= self.opens(cycle).get(), "Claim window not open");
        require!(now < self.deadline(cycle).get(), "Claim window closed");
        let caller = self.blockchain().get_caller();
        require!(!self.claimed(cycle, &caller).get(), "Already claimed");
        let amount = self.allocation(cycle, &caller).get();
        require!(amount > 0u32, "No eligible allocation");
        self.claimed(cycle, &caller).set(true);
        self.claimed_total(cycle).update(|total| *total += &amount);
        self.tx()
            .to(&caller)
            .payment(Payment::new(
                self.reward_token().get(),
                0,
                amount.into_non_zero().unwrap(),
            ))
            .transfer();
    }

    /// Expired test tokens stay reserved in this contract pending destination policy.
    #[endpoint(expireCycle)]
    fn expire_cycle(&self, cycle: u64) {
        self.require_cycle(cycle);
        require!(
            self.now() >= self.deadline(cycle).get(),
            "Claim window still open"
        );
        require!(!self.closed(cycle).get(), "Cycle already expired");
        let remaining = self.budget(cycle).get() - self.claimed_total(cycle).get();
        self.expired(cycle).set(remaining);
        self.closed(cycle).set(true);
    }

    fn now(&self) -> u64 {
        self.blockchain()
            .get_block_timestamp_seconds()
            .as_u64_seconds()
    }

    fn require_cycle(&self, cycle: u64) {
        require!(!self.budget(cycle).is_empty(), "Unknown cycle");
    }

    #[view(getRewardToken)]
    #[storage_mapper("rewardToken")]
    fn reward_token(&self) -> SingleValueMapper<TokenId>;
    #[view(getBudget)]
    #[storage_mapper("budget")]
    fn budget(&self, cycle: u64) -> SingleValueMapper<BigUint>;
    #[view(getOpens)]
    #[storage_mapper("opens")]
    fn opens(&self, cycle: u64) -> SingleValueMapper<u64>;
    #[view(getDeadline)]
    #[storage_mapper("deadline")]
    fn deadline(&self, cycle: u64) -> SingleValueMapper<u64>;
    #[view(getManifest)]
    #[storage_mapper("manifest")]
    fn manifest(&self, cycle: u64) -> SingleValueMapper<ManagedByteArray<32>>;
    #[view(getAllocated)]
    #[storage_mapper("allocated")]
    fn allocated(&self, cycle: u64) -> SingleValueMapper<BigUint>;
    #[view(isSealed)]
    #[storage_mapper("sealed")]
    fn sealed(&self, cycle: u64) -> SingleValueMapper<bool>;
    #[view(isClosed)]
    #[storage_mapper("closed")]
    fn closed(&self, cycle: u64) -> SingleValueMapper<bool>;
    #[view(getAllocation)]
    #[storage_mapper("allocation")]
    fn allocation(&self, cycle: u64, wallet: &ManagedAddress) -> SingleValueMapper<BigUint>;
    #[view(hasClaimed)]
    #[storage_mapper("claimed")]
    fn claimed(&self, cycle: u64, wallet: &ManagedAddress) -> SingleValueMapper<bool>;
    #[view(getClaimedTotal)]
    #[storage_mapper("claimedTotal")]
    fn claimed_total(&self, cycle: u64) -> SingleValueMapper<BigUint>;
    #[view(getExpired)]
    #[storage_mapper("expired")]
    fn expired(&self, cycle: u64) -> SingleValueMapper<BigUint>;
}
