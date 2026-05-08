#[test_only]
module updown::account_tests;

use std::vector;
use sui::clock;
use sui::coin;
use sui::object;
use sui::test_scenario;
use sui::test_utils;
use updown::account::{Self, BettingAccount, OwnerCap};

// A fake quote-coin type used only inside the test module.
public struct DUSDC has drop {}

// ---------------------------------------------------------------------------
// Test vectors generated with PyNaCl from seed = 0x00..0x1f.
//
//   pk          = 03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8
//   msg_hash    = 0x20..0x3f (32 bytes)
//   sig(n=0)    = 5c23db4d... (sign of msg_hash || u64_le(0))
//   sig(n=1)    = be9ccafe...
//   sig(n=2)    = a18f5055...
//   bad_sig     = 85263bb6...
// ---------------------------------------------------------------------------

fun pk(): vector<u8> {
    x"03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8"
}

fun msg_hash(): vector<u8> {
    x"202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f"
}

fun sig_nonce_0(): vector<u8> {
    x"5c23db4d7b3712be1ea7be77d90c10f184ca3d8a5ad7b615f07a4841771bc782a57c7cee58f0067f8f4a72e536fd3cd9df393aa42eaa12db6e3875a22105240b"
}

fun sig_nonce_1(): vector<u8> {
    x"be9ccafe13378a7ddbe6bc1112b6370cd0f776f6e54fa9cdf1a11833866d848a0fd9142a966fa1e42d8408b351460f0ce28dfb1f99d0696a5dcb1c53e300c208"
}

fun sig_nonce_2(): vector<u8> {
    x"a18f50559fda13c6bb13d772574e61fd5521696ede0dd3ff3e62a7989e1f0890530f549be22b18b0d9b7aefe8c65f052ec5758c1053d303be0354cbfb9722400"
}

fun bad_sig(): vector<u8> {
    x"85263bb62f3285be547e8c2391a171712d77c7808c551aec17ba0a6375dd6c850e69aac66ea8981dc49feab2ee3698db25a8aded9cce759184ba8387d4e16902"
}

const USER: address = @0xA11CE;

// Build a fresh BettingAccount + OwnerCap inside a test scenario, returning
// the shared account's id so callers can `take_shared_by_id` it.
fun make_account(
    scenario: &mut test_scenario::Scenario,
    daily_cap_micros: u64,
    initial_micros: u64,
) {
    test_scenario::next_tx(scenario, USER);
    let ctx = test_scenario::ctx(scenario);
    let clk = clock::create_for_testing(ctx);

    let initial_coin = coin::mint_for_testing<DUSDC>(initial_micros, ctx);
    let predict_manager_id = object::id_from_address(@0xBEEF);

    account::new<DUSDC>(
        predict_manager_id,
        pk(),
        daily_cap_micros,
        initial_coin,
        &clk,
        ctx,
    );

    clock::destroy_for_testing(clk);
}

// ---------------------------------------------------------------------------
// 1. Create + deposit
// ---------------------------------------------------------------------------

#[test]
fun test_create_and_deposit() {
    let mut sc = test_scenario::begin(USER);
    make_account(&mut sc, /* cap */ 1_000_000_000, /* initial */ 500_000_000);

    test_scenario::next_tx(&mut sc, USER);
    let mut acct = test_scenario::take_shared<BettingAccount<DUSDC>>(&sc);
    assert!(account::balance_value(&acct) == 500_000_000, 100);
    assert!(account::daily_cap(&acct) == 1_000_000_000, 101);
    assert!(account::spent_today(&acct) == 0, 102);
    assert!(!account::is_revoked(&acct), 103);

    // Deposit another 250 dUSDC.
    let extra = coin::mint_for_testing<DUSDC>(250_000_000, test_scenario::ctx(&mut sc));
    account::deposit(&mut acct, extra);
    assert!(account::balance_value(&acct) == 750_000_000, 104);

    test_scenario::return_shared(acct);
    test_scenario::end(sc);
}

// ---------------------------------------------------------------------------
// 2. Revoke blocks place_bet
// ---------------------------------------------------------------------------

#[test]
#[expected_failure(abort_code = updown::account::E_REVOKED)]
fun test_revoke_blocks_place_bet() {
    let mut sc = test_scenario::begin(USER);
    make_account(&mut sc, 1_000_000_000, 500_000_000);

    // Revoke as the owner.
    test_scenario::next_tx(&mut sc, USER);
    let owner_cap = test_scenario::take_from_sender<OwnerCap>(&sc);
    let mut acct = test_scenario::take_shared<BettingAccount<DUSDC>>(&sc);
    account::revoke(&owner_cap, &mut acct);
    assert!(account::is_revoked(&acct), 200);

    // place_bet must abort with E_REVOKED.
    let ctx = test_scenario::ctx(&mut sc);
    let clk = clock::create_for_testing(ctx);
    let bet_coin = account::place_bet<DUSDC>(
        &mut acct,
        &clk,
        sig_nonce_0(),
        msg_hash(),
        1_000_000,
        ctx,
    );

    // Unreachable; shut up the typechecker.
    test_utils::destroy(bet_coin);
    clock::destroy_for_testing(clk);
    test_scenario::return_to_sender(&sc, owner_cap);
    test_scenario::return_shared(acct);
    test_scenario::end(sc);
}

// ---------------------------------------------------------------------------
// 3. Daily cap enforcement
// ---------------------------------------------------------------------------

#[test]
#[expected_failure(abort_code = updown::account::E_OVER_DAILY_CAP)]
fun test_daily_cap_enforced() {
    let mut sc = test_scenario::begin(USER);
    // Cap = 100 dUSDC, balance = 1_000 dUSDC (so balance never the binding constraint).
    make_account(&mut sc, 100_000_000, 1_000_000_000);

    test_scenario::next_tx(&mut sc, USER);
    let mut acct = test_scenario::take_shared<BettingAccount<DUSDC>>(&sc);
    let ctx = test_scenario::ctx(&mut sc);
    let clk = clock::create_for_testing(ctx);

    // 1 dUSDC bet (nonce 0).
    let bet0 = account::place_bet<DUSDC>(
        &mut acct, &clk, sig_nonce_0(), msg_hash(), 1_000_000, ctx,
    );
    test_utils::destroy(bet0);
    assert!(account::spent_today(&acct) == 1_000_000, 300);
    assert!(account::nonce(&acct) == 1, 301);

    // 50 dUSDC bet (nonce 1) — total 51, still under 100.
    let bet1 = account::place_bet<DUSDC>(
        &mut acct, &clk, sig_nonce_1(), msg_hash(), 50_000_000, ctx,
    );
    test_utils::destroy(bet1);
    assert!(account::spent_today(&acct) == 51_000_000, 302);

    // 60 dUSDC bet (nonce 2) — total would be 111, over cap. Abort expected.
    let bet2 = account::place_bet<DUSDC>(
        &mut acct, &clk, sig_nonce_2(), msg_hash(), 60_000_000, ctx,
    );
    test_utils::destroy(bet2);

    clock::destroy_for_testing(clk);
    test_scenario::return_shared(acct);
    test_scenario::end(sc);
}

// ---------------------------------------------------------------------------
// 4. Cap resets after 24h
// ---------------------------------------------------------------------------

#[test]
fun test_cap_resets_after_24h() {
    let mut sc = test_scenario::begin(USER);
    make_account(&mut sc, 100_000_000, 1_000_000_000);

    test_scenario::next_tx(&mut sc, USER);
    let mut acct = test_scenario::take_shared<BettingAccount<DUSDC>>(&sc);
    let ctx = test_scenario::ctx(&mut sc);
    let mut clk = clock::create_for_testing(ctx);

    // Spend 1 dUSDC at t=0.
    let bet0 = account::place_bet<DUSDC>(
        &mut acct, &clk, sig_nonce_0(), msg_hash(), 1_000_000, ctx,
    );
    test_utils::destroy(bet0);
    assert!(account::spent_today(&acct) == 1_000_000, 400);

    // Advance the clock 24h + 1ms.
    clock::increment_for_testing(&mut clk, 86_400_001);

    // Spend 50 dUSDC — would be 51 total against the original window, but
    // the window should have reset, so spent_today becomes 50.
    let bet1 = account::place_bet<DUSDC>(
        &mut acct, &clk, sig_nonce_1(), msg_hash(), 50_000_000, ctx,
    );
    test_utils::destroy(bet1);
    assert!(account::spent_today(&acct) == 50_000_000, 401);

    clock::destroy_for_testing(clk);
    test_scenario::return_shared(acct);
    test_scenario::end(sc);
}

// ---------------------------------------------------------------------------
// 5. Bad signature is rejected
// ---------------------------------------------------------------------------

#[test]
#[expected_failure(abort_code = updown::account::E_BAD_SIG)]
fun test_bad_sig_aborts() {
    let mut sc = test_scenario::begin(USER);
    make_account(&mut sc, 1_000_000_000, 500_000_000);

    test_scenario::next_tx(&mut sc, USER);
    let mut acct = test_scenario::take_shared<BettingAccount<DUSDC>>(&sc);
    let ctx = test_scenario::ctx(&mut sc);
    let clk = clock::create_for_testing(ctx);

    let bet = account::place_bet<DUSDC>(
        &mut acct, &clk, bad_sig(), msg_hash(), 1_000_000, ctx,
    );
    test_utils::destroy(bet);

    clock::destroy_for_testing(clk);
    test_scenario::return_shared(acct);
    test_scenario::end(sc);
}

// ---------------------------------------------------------------------------
// 6. Withdraw needs the OwnerCap (compile-time guarded; we just verify the
//    happy path with the cap works).
// ---------------------------------------------------------------------------

#[test]
fun test_withdraw_owner_only() {
    let mut sc = test_scenario::begin(USER);
    make_account(&mut sc, 1_000_000_000, 500_000_000);

    test_scenario::next_tx(&mut sc, USER);
    let owner_cap = test_scenario::take_from_sender<OwnerCap>(&sc);
    let mut acct = test_scenario::take_shared<BettingAccount<DUSDC>>(&sc);

    let ctx = test_scenario::ctx(&mut sc);
    account::withdraw<DUSDC>(&owner_cap, &mut acct, 100_000_000, USER, ctx);
    assert!(account::balance_value(&acct) == 400_000_000, 600);

    test_scenario::return_to_sender(&sc, owner_cap);
    test_scenario::return_shared(acct);

    // The withdrawn coin lands in USER's inventory.
    test_scenario::next_tx(&mut sc, USER);
    let withdrawn = test_scenario::take_from_sender<coin::Coin<DUSDC>>(&sc);
    assert!(coin::value(&withdrawn) == 100_000_000, 601);
    test_scenario::return_to_sender(&sc, withdrawn);

    test_scenario::end(sc);
}
