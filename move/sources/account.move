// Up/Down — per-user BettingAccount.
//
// A BettingAccount holds the user's quote-coin balance (typically dUSDC), an
// Ed25519 public key for the bot's per-user delegated signing key, and a
// daily spending cap. The bot can only call `place_bet` (the single entry
// it is authorised for) and only with a valid Ed25519 signature over a
// nonce-bound message hash. The user keeps an `OwnerCap` that lets them
// withdraw, revoke, change the cap, or rotate the delegated key at any time.
#[allow(lint(public_entry))]
module updown::account;

use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::ed25519;
use sui::event;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
const E_REVOKED: u64 = 0;
const E_OVER_DAILY_CAP: u64 = 1;
const E_BAD_SIG: u64 = 2;
const E_INSUFFICIENT_BALANCE: u64 = 3;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MS_PER_DAY: u64 = 86_400_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// The per-user betting account. Generic over `Q` (the quote coin type — e.g.
/// dUSDC). Shared object so the bot can mutate it via `place_bet`.
public struct BettingAccount<phantom Q> has key {
    id: UID,
    owner: address,
    /// Ed25519 raw public key (32 bytes) of the bot's per-user delegated key.
    delegated_pubkey: vector<u8>,
    /// The user's DeepBook PredictManager id; recorded so the bot can target
    /// the right market in the same PTB as `place_bet`.
    predict_manager_id: ID,
    balance: Balance<Q>,
    daily_cap_micros: u64,
    spent_today_micros: u64,
    day_anchor_ms: u64,
    nonce: u64,
    revoked: bool,
}

/// Capability held by the human user (zkLogin address). Required for any
/// administrative mutation: withdrawing funds, revoking, raising the cap,
/// rotating the delegated pubkey.
public struct OwnerCap has key, store {
    id: UID,
    account_id: ID,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

public struct AccountCreated has copy, drop {
    account_id: ID,
    owner: address,
    daily_cap_micros: u64,
}

public struct BetPlaced has copy, drop {
    account_id: ID,
    amount_micros: u64,
    market_key_hash: vector<u8>,
    ts_ms: u64,
}

public struct Revoked has copy, drop { account_id: ID }

public struct CapAdjusted has copy, drop {
    account_id: ID,
    new_cap_micros: u64,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Encode `n` as 8 little-endian bytes.
fun le_bytes_u64(n: u64): vector<u8> {
    let mut out = vector::empty<u8>();
    let mut i = 0;
    let mut v = n;
    while (i < 8) {
        vector::push_back(&mut out, (v & 0xff) as u8);
        v = v >> 8;
        i = i + 1;
    };
    out
}

/// Refresh the daily window if the clock has moved past it.
fun refresh_window<Q>(acct: &mut BettingAccount<Q>, now_ms: u64) {
    if (now_ms >= acct.day_anchor_ms + MS_PER_DAY) {
        // Snap the anchor to the start of the current day window relative to
        // the original anchor (keeps a stable rolling 24h boundary).
        let elapsed = now_ms - acct.day_anchor_ms;
        let windows = elapsed / MS_PER_DAY;
        acct.day_anchor_ms = acct.day_anchor_ms + windows * MS_PER_DAY;
        acct.spent_today_micros = 0;
    }
}

// ---------------------------------------------------------------------------
// Entry: create account
// ---------------------------------------------------------------------------

public entry fun new<Q>(
    predict_manager_id: ID,
    delegated_pubkey: vector<u8>,
    daily_cap_micros: u64,
    initial_deposit: Coin<Q>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let owner = tx_context::sender(ctx);
    let now_ms = clock::timestamp_ms(clock);

    let acct = BettingAccount<Q> {
        id: object::new(ctx),
        owner,
        delegated_pubkey,
        predict_manager_id,
        balance: coin::into_balance(initial_deposit),
        daily_cap_micros,
        spent_today_micros: 0,
        day_anchor_ms: now_ms,
        nonce: 0,
        revoked: false,
    };
    let account_id = object::id(&acct);

    let cap = OwnerCap { id: object::new(ctx), account_id };

    event::emit(AccountCreated { account_id, owner, daily_cap_micros });

    transfer::share_object(acct);
    transfer::public_transfer(cap, owner);
}

// ---------------------------------------------------------------------------
// Entry: place_bet — the single function the delegated key may invoke.
// Returns a Coin<Q> sized `amount_micros` that the bot's PTB will hand off
// to `predict::mint` (or similar) in the same transaction.
// ---------------------------------------------------------------------------

public fun place_bet<Q>(
    acct: &mut BettingAccount<Q>,
    clock: &Clock,
    delegated_sig: vector<u8>,
    msg_hash: vector<u8>,
    amount_micros: u64,
    ctx: &mut TxContext,
): Coin<Q> {
    assert!(!acct.revoked, E_REVOKED);

    let now_ms = clock::timestamp_ms(clock);
    refresh_window(acct, now_ms);

    assert!(
        acct.spent_today_micros + amount_micros <= acct.daily_cap_micros,
        E_OVER_DAILY_CAP,
    );
    assert!(balance::value(&acct.balance) >= amount_micros, E_INSUFFICIENT_BALANCE);

    // Reconstruct signed message: msg_hash || le_bytes(nonce)
    let mut signed_msg = vector::empty<u8>();
    vector::append(&mut signed_msg, msg_hash);
    vector::append(&mut signed_msg, le_bytes_u64(acct.nonce));

    let ok = ed25519::ed25519_verify(&delegated_sig, &acct.delegated_pubkey, &signed_msg);
    assert!(ok, E_BAD_SIG);

    acct.nonce = acct.nonce + 1;
    acct.spent_today_micros = acct.spent_today_micros + amount_micros;

    let bet_balance = balance::split(&mut acct.balance, amount_micros);
    let bet_coin = coin::from_balance(bet_balance, ctx);

    event::emit(BetPlaced {
        account_id: object::id(acct),
        amount_micros,
        market_key_hash: msg_hash,
        ts_ms: now_ms,
    });

    bet_coin
}

// ---------------------------------------------------------------------------
// Entry: deposit / withdraw / admin
// ---------------------------------------------------------------------------

public entry fun deposit<Q>(acct: &mut BettingAccount<Q>, c: Coin<Q>) {
    let bal = coin::into_balance(c);
    balance::join(&mut acct.balance, bal);
}

public entry fun withdraw<Q>(
    cap: &OwnerCap,
    acct: &mut BettingAccount<Q>,
    amount_micros: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    assert!(cap.account_id == object::id(acct), E_REVOKED);
    assert!(balance::value(&acct.balance) >= amount_micros, E_INSUFFICIENT_BALANCE);
    let bal = balance::split(&mut acct.balance, amount_micros);
    let coin_out = coin::from_balance(bal, ctx);
    transfer::public_transfer(coin_out, recipient);
}

public entry fun revoke<Q>(cap: &OwnerCap, acct: &mut BettingAccount<Q>) {
    assert!(cap.account_id == object::id(acct), E_REVOKED);
    acct.revoked = true;
    event::emit(Revoked { account_id: object::id(acct) });
}

public entry fun unrevoke<Q>(cap: &OwnerCap, acct: &mut BettingAccount<Q>) {
    assert!(cap.account_id == object::id(acct), E_REVOKED);
    acct.revoked = false;
}

public entry fun set_cap<Q>(
    cap: &OwnerCap,
    acct: &mut BettingAccount<Q>,
    new_cap_micros: u64,
) {
    assert!(cap.account_id == object::id(acct), E_REVOKED);
    acct.daily_cap_micros = new_cap_micros;
    event::emit(CapAdjusted {
        account_id: object::id(acct),
        new_cap_micros,
    });
}

public entry fun rotate_delegated_pubkey<Q>(
    cap: &OwnerCap,
    acct: &mut BettingAccount<Q>,
    new_pk: vector<u8>,
) {
    assert!(cap.account_id == object::id(acct), E_REVOKED);
    acct.delegated_pubkey = new_pk;
    // Bump the nonce to invalidate any in-flight signatures from the old key.
    acct.nonce = acct.nonce + 1;
}

// ---------------------------------------------------------------------------
// Read accessors (handy for tests and clients)
// ---------------------------------------------------------------------------

public fun balance_value<Q>(acct: &BettingAccount<Q>): u64 {
    balance::value(&acct.balance)
}

public fun spent_today<Q>(acct: &BettingAccount<Q>): u64 { acct.spent_today_micros }

public fun daily_cap<Q>(acct: &BettingAccount<Q>): u64 { acct.daily_cap_micros }

public fun nonce<Q>(acct: &BettingAccount<Q>): u64 { acct.nonce }

public fun is_revoked<Q>(acct: &BettingAccount<Q>): bool { acct.revoked }

public fun day_anchor_ms<Q>(acct: &BettingAccount<Q>): u64 { acct.day_anchor_ms }

public fun delegated_pubkey<Q>(acct: &BettingAccount<Q>): vector<u8> { acct.delegated_pubkey }

#[test_only]
public fun destroy_for_testing<Q>(acct: BettingAccount<Q>) {
    let BettingAccount {
        id,
        owner: _,
        delegated_pubkey: _,
        predict_manager_id: _,
        balance,
        daily_cap_micros: _,
        spent_today_micros: _,
        day_anchor_ms: _,
        nonce: _,
        revoked: _,
    } = acct;
    object::delete(id);
    balance::destroy_for_testing(balance);
}

#[test_only]
public fun destroy_owner_cap_for_testing(cap: OwnerCap) {
    let OwnerCap { id, account_id: _ } = cap;
    object::delete(id);
}
