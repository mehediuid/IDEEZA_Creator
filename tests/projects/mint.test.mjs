// Mint type, mint status and the ownership proof (Phase 2 spec §3.5.3, §3.9;
// MINT-4…12).
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  MINT_FEE_IDZ,
  commitCtaLabel,
  instantRecord,
  lazyRecord,
  mintChargeOf,
  mintPlanOf,
  mintPhrase,
  mintProofRows,
  mintTypeOptions,
  mintViewOf,
  nextTokenId,
  normalizeMintRecord,
  upgradeRecord,
} = await import("../../.tmp-test/lib/wallet/mint.js");
const { demoAddress } = await import("../../.tmp-test/lib/wallet/demo-wallet.js");
const { bumpMinted, readCollections } = await import("../../.tmp-test/lib/brief/wallet.js");

const NOW = Date.UTC(2026, 8, 28, 21, 9, 0);
const EARLIER_SAME_YEAR = Date.UTC(2026, 5, 1);

test("mintTypeOptions: notMinted gives two options, lazy first and the default", () => {
  const r = mintTypeOptions({ intent: "sell", current: "notMinted", network: "baseSepolia" });
  assert.equal(r.locked, false);
  assert.equal(r.value, "lazy");
  assert.deepEqual(r.options.map((o) => o.type), ["lazy", "instant"]);
});

test("mintTypeOptions: onChain locks the field", () => {
  const r = mintTypeOptions({ intent: "sell", current: "onChain", network: "baseSepolia", address: demoAddress("maker-1") });
  assert.equal(r.locked, true);
  assert.match(r.lockedText.note, /0x955d…ed95/);
});

test("mintTypeOptions: lazyMinted retitles both cards", () => {
  const r = mintTypeOptions({ intent: "sell", current: "lazyMinted", network: "baseSepolia" });
  assert.equal(r.options[0].title, "Keep lazy minted");
  assert.equal(r.options[1].title, "Mint on chain now");
});

test("mintChargeOf: lazy costs nothing, instant on Mumbai is 4 IDZ + 0.021 MATIC", () => {
  assert.equal(mintChargeOf("lazy", "mumbai"), null);
  const charge = mintChargeOf("instant", "mumbai");
  assert.equal(charge.network, "mumbai");
  assert.deepEqual(charge.lines, [
    { coin: "IDZ", amount: String(MINT_FEE_IDZ) },
    { coin: "MATIC", amount: "0.021" },
  ]);
});

test("upgradeRecord keeps the lazy record's signature and adds onChain, via \"upgrade\"", () => {
  const lazy = lazyRecord({ network: "baseSepolia", collection: "Test Collection", tokenId: 1, account: 1, address: demoAddress("maker-1"), at: NOW - 1000, signature: "0xold" });
  const charge = mintChargeOf("instant", "baseSepolia");
  const upgraded = upgradeRecord(lazy, { at: NOW, txHash: "0xup", charge });
  assert.equal(upgraded.signature, "0xold");
  assert.equal(upgraded.signedAt, lazy.signedAt);
  assert.deepEqual(upgraded.onChain, { at: NOW, txHash: "0xup", via: "upgrade", charge });
});

test("commitCtaLabel matches MINT-4/5/6's table", () => {
  const last = { last: true, fromPreview: false, innovations: false };
  assert.equal(commitCtaLabel("sell", "lazy", last), "Sign and list");
  assert.equal(commitCtaLabel("sell", "instant", last), "Pay and list");
  assert.equal(commitCtaLabel("give", "lazy", last), "Sign and give");
  assert.equal(commitCtaLabel("give", "lazy", { ...last, innovations: true }), "Sign and give · post to Innovations");
  assert.equal(commitCtaLabel("give", "instant", { ...last, innovations: true }), "Pay and give · post to Innovations");
  assert.equal(commitCtaLabel("save", "lazy", last), "Sign and save");
  assert.equal(commitCtaLabel("save", "instant", last), "Sign and save"); // Save is always lazy
  assert.equal(commitCtaLabel("sell", "lazy", { last: false, fromPreview: false, innovations: false }), "Continue to video ›");
});

function planCtx(overrides = {}) {
  return {
    projectName: "Car",
    intent: "sell",
    network: "baseSepolia",
    collection: "Test Collection",
    tokenId: 1,
    record: null,
    account: 1,
    address: demoAddress("maker-1"),
    at: NOW,
    ...overrides,
  };
}

test("mintPlanOf: notMinted + lazy asks for a signature and reserves the token", () => {
  const plan = mintPlanOf("notMinted", "lazy", planCtx());
  assert.equal(plan.request.kind, "signature");
  assert.equal(plan.request.identity, "maker");
  const record = plan.nextRecord({ identity: "maker-1", address: demoAddress("maker-1"), at: NOW, signature: "0xsig" });
  assert.equal(record.type, "lazy");
  assert.equal(record.tokenId, 1);
  assert.equal(record.signature, "0xsig");
});

test("mintPlanOf: legacy + instant asks for a transaction and mints on chain", () => {
  const plan = mintPlanOf("legacy", "instant", planCtx());
  assert.equal(plan.request.kind, "transaction");
  assert.deepEqual(plan.request.charge, mintChargeOf("instant", "baseSepolia"));
  const record = plan.nextRecord({ identity: "maker-1", address: demoAddress("maker-1"), at: NOW, txHash: "0xtx" });
  assert.equal(record.type, "instant");
  assert.equal(record.onChain.via, "instant");
  assert.equal(record.onChain.txHash, "0xtx");
});

test("mintPlanOf: lazyMinted + lazy resolves with the existing record and opens no dialog", () => {
  const existing = lazyRecord({ network: "baseSepolia", collection: "Test Collection", tokenId: 1, account: 1, address: demoAddress("maker-1"), at: NOW - 1000, signature: "0xold" });
  const plan = mintPlanOf("lazyMinted", "lazy", planCtx({ record: existing }));
  assert.equal(plan.request, null);
  assert.deepEqual(plan.nextRecord({ identity: "maker-1", address: demoAddress("maker-1"), at: NOW }), existing);
});

test("mintPlanOf: lazyMinted + instant upgrades, keeping the original signature", () => {
  const existing = lazyRecord({ network: "baseSepolia", collection: "Test Collection", tokenId: 1, account: 1, address: demoAddress("maker-1"), at: NOW - 1000, signature: "0xold" });
  const plan = mintPlanOf("lazyMinted", "instant", planCtx({ record: existing }));
  assert.equal(plan.request.kind, "transaction");
  assert.equal(plan.request.title, "Mint on chain now");
  const record = plan.nextRecord({ identity: "maker-1", address: demoAddress("maker-1"), at: NOW, txHash: "0xup" });
  assert.equal(record.signature, "0xold"); // kept
  assert.equal(record.onChain.via, "upgrade");
  assert.equal(record.onChain.txHash, "0xup");
});

test("mintPlanOf: onChain asks nothing — the field is locked", () => {
  const existing = instantRecord({ network: "baseSepolia", collection: "Test Collection", tokenId: 1, account: 1, address: demoAddress("maker-1"), at: NOW - 1000, txHash: "0xon", charge: mintChargeOf("instant", "baseSepolia") });
  const plan = mintPlanOf("onChain", "instant", planCtx({ record: existing }));
  assert.equal(plan.request, null);
  assert.deepEqual(plan.nextRecord({ identity: "maker-1", address: demoAddress("maker-1"), at: NOW }), existing);
});

test("mintViewOf: a lazy record plus a Main sale settles onChain, via \"sale\"", () => {
  const record = lazyRecord({ network: "baseSepolia", collection: "Test Collection", tokenId: 1, account: 1, address: demoAddress("maker-1"), at: NOW - 5000, signature: "0xsig" });
  const project = { id: "proj_1", mint: record, status: "completed" };
  const sales = [
    {
      id: "sale_1",
      listingId: "lst_1",
      projectId: "proj_1",
      at: NOW,
      buyerId: "buyer-mira",
      buyerAddress: demoAddress("buyer-mira"),
      sellerAddress: demoAddress("maker-1"),
      item: { nft: "main", sharePct: 100 },
      via: "buyNow",
      token: "ETH",
      price: "0.05",
      fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "ETH", amount: "0.00104" } },
      payout: "0.04875",
      royaltiesPct: 5,
      mint: "lazy",
      mintedAtSale: true,
      tokenId: 1,
      network: "baseSepolia",
      collection: "Test Collection",
      benefits: [],
      txHash: "0xsaletx",
      demo: true,
    },
  ];
  const view = mintViewOf(project, null, sales);
  assert.equal(view.status, "onChain");
  assert.equal(view.tokenId, 1);
  assert.deepEqual(view.settled, { at: NOW, txHash: "0xsaletx", via: "sale" });
});

test("mintViewOf: notMinted, legacy and lazyMinted", () => {
  assert.equal(mintViewOf({ id: "p", status: "draft" }, null, []).status, "notMinted");
  assert.equal(mintViewOf({ id: "p", status: "completed" }, null, []).status, "legacy");
  assert.equal(mintViewOf({ id: "p", status: "draft" }, { state: { mintedAt: 123 } }, []).status, "legacy");
  const rec = lazyRecord({ network: "baseSepolia", collection: "c", tokenId: 1, account: 1, address: demoAddress("maker-1"), at: NOW, signature: "s" });
  assert.equal(mintViewOf({ id: "p", status: "draft", mint: rec }, null, []).status, "lazyMinted");
});

test("nextTokenId: (minted ?? 0) + 1, by name", () => {
  assert.equal(nextTokenId([], "Test Collection"), 1);
  assert.equal(nextTokenId([{ name: "Other", minted: 5 }], "Test Collection"), 1);
  assert.equal(nextTokenId([{ name: "Test Collection", minted: 1 }], "Test Collection"), 2);
  assert.equal(nextTokenId([{ name: "test collection ", minted: 2 }], "Test Collection"), 3); // case/space-insensitive
});

test("bumpMinted + nextTokenId: a fresh 'Test Collection' gives #1, then #2 (P2-MINT-8)", () => {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
    },
  };
  try {
    assert.equal(nextTokenId(readCollections("baseSepolia"), "Test Collection"), 1);
    assert.equal(bumpMinted("baseSepolia", "Test Collection"), 1);
    assert.equal(nextTokenId(readCollections("baseSepolia"), "Test Collection"), 2);
    assert.equal(bumpMinted("baseSepolia", "Test Collection"), 2);
    // a brand-new collection name, not yet in the store, is added first (idempotently)
    assert.equal(bumpMinted("baseSepolia", "Fresh Co"), 1);
    assert.ok(readCollections("baseSepolia").some((c) => c.name === "Fresh Co" && c.minted === 1));
  } finally {
    delete globalThis.window;
  }
});

test("normalizeMintRecord drops a record whose tokenId is a string", () => {
  const raw = {
    v: 1,
    demo: true,
    type: "lazy",
    network: "baseSepolia",
    collection: "Test Collection",
    tokenId: "1",
    wallet: { account: 1, address: demoAddress("maker-1") },
    at: NOW,
  };
  assert.equal(normalizeMintRecord(raw), undefined);
});

test("normalizeMintRecord keeps a valid record, and onChain when present", () => {
  const raw = {
    v: 1,
    demo: true,
    type: "instant",
    network: "baseSepolia",
    collection: "Test Collection",
    tokenId: 1,
    wallet: { account: 1, address: demoAddress("maker-1") },
    at: NOW,
    onChain: { at: NOW, txHash: "0xabc", via: "instant" },
  };
  const record = normalizeMintRecord(raw);
  assert.equal(record.tokenId, 1);
  assert.equal(record.onChain.via, "instant");
});

test("mintPhrase: lazyMinted, onChain and legacy", () => {
  assert.equal(mintPhrase("lazyMinted", EARLIER_SAME_YEAR, NOW), "Lazy minted Jun 1");
  assert.equal(mintPhrase("onChain", EARLIER_SAME_YEAR, NOW), "Minted on chain Jun 1");
  assert.equal(mintPhrase("legacy", EARLIER_SAME_YEAR, NOW), "Minted Jun 1");
  assert.equal(mintPhrase("notMinted", null, NOW), null);
});

test("mintProofRows: a lazy record's owner rows carry the token and signature, no explorer link", () => {
  const record = lazyRecord({ network: "baseSepolia", collection: "Test Collection", tokenId: 1, account: 1, address: demoAddress("maker-1"), at: NOW, signature: "0x747a00000000000000000000000000000000000000000000000000000000000b32b" });
  const rows = mintProofRows(record, { owner: true }, "sell");
  const flat = rows.map((r) => `${r.label} ${r.value.map((v) => v.text).join(" ")} ${r.note ?? ""}`).join("\n");
  assert.match(flat, /Lazy minted/);
  assert.match(flat, /#1/);
  assert.match(flat, /Signature/);
  assert.match(flat, /Demo account 1/);
  assert.doesNotMatch(flat, /scan/);
});

test("mintProofRows: an onChain record's buyer rows have no owner facts", () => {
  const record = instantRecord({ network: "baseSepolia", collection: "Test Collection", tokenId: 1, account: 1, address: demoAddress("maker-1"), at: NOW, txHash: "0xba13000000000000000000000000000000000000000000000000000000000003bd", charge: mintChargeOf("instant", "baseSepolia") });
  const rows = mintProofRows(record, { owner: false });
  assert.deepEqual(rows.map((r) => r.key), ["mint", "token"]); // no wallet, no tx for a non-owner read
});
