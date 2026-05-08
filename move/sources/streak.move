// Up/Down — StreakNft.
//
// The bot holds a single `MintCap` (transferred to the deployer at publish
// time). When a user crosses 3 / 7 / 30 wins-in-a-row, the bot calls
// `mint_for` to mint a `StreakNft` to the user's wallet. The metadata image
// is a Walrus blob URL chosen by the bot.
#[allow(lint(public_entry))]
module updown::streak;

use std::string::{Self, String};
use sui::clock::{Self, Clock};
use sui::display;
use sui::event;
use sui::package;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
const E_BAD_TIER: u64 = 0;

// ---------------------------------------------------------------------------
// One-time witness (for `package::claim` / display registration)
// ---------------------------------------------------------------------------
public struct STREAK has drop {}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

public struct MintCap has key, store { id: UID }

public struct StreakNft has key, store {
    id: UID,
    tier: u8,           // 0 = Bronze, 1 = Silver, 2 = Gold
    wins: u64,
    minted_at_ms: u64,
    for_account: ID,
    name: String,
    description: String,
    image_url: String,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

public struct StreakMinted has copy, drop {
    recipient: address,
    tier: u8,
    wins: u64,
    account_id: ID,
}

// ---------------------------------------------------------------------------
// init: register the Display object and hand out the MintCap.
// ---------------------------------------------------------------------------

fun init(otw: STREAK, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);

    let keys = vector[
        string::utf8(b"name"),
        string::utf8(b"description"),
        string::utf8(b"image_url"),
        string::utf8(b"link"),
        string::utf8(b"creator"),
    ];
    let values = vector[
        string::utf8(b"{name}"),
        string::utf8(b"{description}"),
        string::utf8(b"{image_url}"),
        string::utf8(b"https://updown.bet/streak/{id}"),
        string::utf8(b"Up/Down"),
    ];

    let mut disp = display::new_with_fields<StreakNft>(&publisher, keys, values, ctx);
    display::update_version(&mut disp);

    let deployer = tx_context::sender(ctx);
    transfer::public_transfer(disp, deployer);
    transfer::public_transfer(publisher, deployer);

    let cap = MintCap { id: object::new(ctx) };
    transfer::public_transfer(cap, deployer);
}

// ---------------------------------------------------------------------------
// mint_for: bot-only mint of a StreakNft for the given user.
// ---------------------------------------------------------------------------

public entry fun mint_for(
    _: &MintCap,
    recipient: address,
    tier: u8,
    wins: u64,
    for_account: ID,
    image_url: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(tier <= 2, E_BAD_TIER);

    let name = if (tier == 0) {
        string::utf8(b"Up/Down Bronze Streak")
    } else if (tier == 1) {
        string::utf8(b"Up/Down Silver Streak")
    } else {
        string::utf8(b"Up/Down Gold Streak")
    };

    let mut description = string::utf8(b"Won ");
    string::append(&mut description, u64_to_string(wins));
    string::append(&mut description, string::utf8(b" Up/Down predictions in a row on Sui via DeepBook Predict."));

    let nft = StreakNft {
        id: object::new(ctx),
        tier,
        wins,
        minted_at_ms: clock::timestamp_ms(clock),
        for_account,
        name,
        description,
        image_url,
    };

    event::emit(StreakMinted { recipient, tier, wins, account_id: for_account });

    transfer::public_transfer(nft, recipient);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Render a u64 as its decimal ASCII string.
fun u64_to_string(mut n: u64): String {
    if (n == 0) { return string::utf8(b"0") };
    let mut digits = vector<u8>[];
    while (n > 0) {
        let d = (n % 10) as u8;
        std::vector::push_back(&mut digits, 48 + d);
        n = n / 10;
    };
    // Reverse in place.
    let len = std::vector::length(&digits);
    let mut out = vector<u8>[];
    let mut i = len;
    while (i > 0) {
        i = i - 1;
        std::vector::push_back(&mut out, *std::vector::borrow(&digits, i));
    };
    string::utf8(out)
}

// ---------------------------------------------------------------------------
// Read accessors
// ---------------------------------------------------------------------------

public fun tier(n: &StreakNft): u8 { n.tier }
public fun wins(n: &StreakNft): u64 { n.wins }
public fun for_account(n: &StreakNft): ID { n.for_account }
public fun name(n: &StreakNft): String { n.name }
public fun description(n: &StreakNft): String { n.description }
public fun image_url(n: &StreakNft): String { n.image_url }

#[test_only]
public fun mint_cap_for_testing(ctx: &mut TxContext): MintCap {
    MintCap { id: object::new(ctx) }
}

#[test_only]
public fun destroy_mint_cap_for_testing(cap: MintCap) {
    let MintCap { id } = cap;
    object::delete(id);
}
