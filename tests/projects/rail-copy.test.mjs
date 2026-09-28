// C7a — the rail's Outcome and Details words, and Showcase's (spec §5.10, §5.12:
// COM-4…16, COM-12, COM-55, COM-56, COR-55, X41). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_MINT_FOOTNOTE,
  MINTED_FOOTNOTE,
  SALE_IN_MARKETPLACE,
  detailsRows,
  formatAmount,
  outcomeView,
} from "../../.tmp-test/lib/manual/rail-copy.js";
import { ownershipOf } from "../../.tmp-test/lib/manual/ownership.js";
import { demoAddress } from "../../.tmp-test/lib/wallet/demo-wallet.js";
import {
  SUCCESS_SHOWCASE,
  plainText,
  showcaseAnnouncement,
  showcaseRow,
} from "../../.tmp-test/lib/manual/showcase-copy.js";
import { BUILD_GONE_TIP } from "../../.tmp-test/lib/manual/project-summary.js";
import { BRIEF_FORM_LABEL, LICENSES } from "../../.tmp-test/lib/brief/types.js";

// Local time, so A3's formatter round-trips in any timezone.
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const MINTED = at(2026, 9, 22, 21, 9); // "Sep 22, 2026 · 9:09 PM"
const SHOWN = at(2026, 9, 26, 10, 0); // "Sep 26, 2026"
const SOLD = at(2026, 9, 28, 12, 0); // "Sep 28, 2026"
const MIT = LICENSES.find((l) => l.value === "mit");

const NONE = { outcome: "none", intent: null, mint: "notMinted", record: null };
const minted = (outcome, intent, extra = {}) => ({
  outcome,
  intent,
  mint: "legacy",
  record: null,
  mintedAt: MINTED,
  network: { id: "baseSepolia", label: "Base Sepolia (Testnet)" },
  collection: " Garden Sensors ",
  ...extra,
});
const ADDRESS = demoAddress("maker-1"); // "0x955d…ed95"
const SIG = `0x747a${"0".repeat(122)}b32b`;
const TX = `0xba13${"1".repeat(56)}03bd`;
const lazyRecord = {
  v: 1, demo: true, type: "lazy", network: "baseSepolia", collection: "Garden Sensors", tokenId: 1,
  wallet: { account: 1, address: ADDRESS }, at: MINTED, signedAt: MINTED, signature: SIG,
};
const onChainRecord = {
  ...lazyRecord, type: "instant", signedAt: undefined, signature: undefined,
  onChain: { at: MINTED, txHash: TX, via: "instant" },
};
const withRecord = (record, intent = "sell", extra = {}) =>
  minted(intent === "give" ? "given" : intent === "sell" ? "listed" : "private", intent, {
    mint: record.onChain || extra.settled ? "onChain" : "lazyMinted",
    record,
    collection: record.collection,
    ...extra,
  });
const DRAFT = { status: "draft", showcase: null };
const rowsOf = (v) => v.minted.rows.map((r) => [r.label, plainText(r.value), r.note ?? null]);

test("No outcome yet: no draft, then an opened draft with no intent (COM-4)", () => {
  const v = outcomeView(NONE, DRAFT);
  assert.equal(v.subline, "Nothing decided yet. The Brief is where you keep it, give it away or sell it.");
  assert.equal(v.minted, null);
  assert.equal(v.clipLine, null);
  assert.equal(v.meta, "Draft");
  assert.equal(outcomeView({ ...NONE, step: "idea" }, DRAFT).subline, "The Brief is open — no outcome chosen yet.");
  assert.deepEqual([v.mint, v.demo], ["notMinted", false]);
});

test("Brief in progress names the choice and the Brief's own step name, and no terms (COM-5)", () => {
  const give = outcomeView({ ...NONE, outcome: "briefing", intent: "give", step: "preview" }, DRAFT);
  assert.equal(
    give.subline,
    "You chose to give it away. The Brief is at the “Preview” step — nothing is minted until you finish it.",
  );
  assert.equal(give.minted, null);
  const sell = outcomeView({ ...NONE, outcome: "briefing", intent: "sell", step: "form" }, DRAFT);
  assert.equal(
    sell.subline,
    `You chose to sell it. The Brief is at the “${BRIEF_FORM_LABEL.sell}” step — nothing is minted until you finish it.`,
  );
  assert.equal(sell.clipLine, null);
  assert.equal(
    outcomeView({ ...NONE, outcome: "briefing", intent: "save", step: "idea" }, DRAFT).subline,
    "You chose to keep it private. The Brief is at the “Idea” step — nothing is minted until you finish it.",
  );
});

test("Private, not showcased: Mint first, network, collection, the Showcase row, the footnote (COM-6…8, COM-11, COM-12, COM-14; P2-MINT-10 legacy)", () => {
  const v = outcomeView(minted("private", "save"), { status: "private", showcase: null });
  assert.equal(v.subline, "Minted and kept. Only you can see it.");
  assert.deepEqual(rowsOf(v), [
    ["Mint", "Minted · Sep 22, 2026 · 9:09 PM", null],
    ["Network", "Base Sepolia (Testnet)", null],
    ["Collection", "Garden Sensors", null],
  ]);
  assert.deepEqual(v.minted.rows.map((r) => r.key), ["mint", "network", "collection"]);
  assert.deepEqual([v.mint, v.demo], ["legacy", false]);
  const first = v.minted.rows[0].value[1];
  assert.equal(first.kind, "time");
  assert.equal(first.time.dateTime, new Date(MINTED).toISOString());
  assert.equal(plainText(v.minted.showcase.value), "Not showcased");
  assert.equal(
    v.minted.showcase.note,
    "Showcasing lists it under Showcase in My projects. Nothing is posted until Innovations opens.",
  );
  assert.equal(v.minted.showcase.action, "Showcase project");
  assert.equal(v.minted.footnote, MINTED_FOOTNOTE);
  assert.equal(MINTED_FOOTNOTE, "Recorded in this browser only — nothing is written to a blockchain yet.");
  assert.equal(v.meta, "Private");
});

test("Private, showcased: its own subline, 'Showcased since', Stop showcasing (COM-11, COM-12, COM-55)", () => {
  const v = outcomeView(minted("private", "save"), { status: "private", showcase: { at: SHOWN } });
  assert.equal(v.subline, "Minted and kept by you — not given away or for sale.");
  assert.equal(plainText(v.minted.showcase.value), "Showcased since Sep 26, 2026");
  assert.equal(v.minted.showcase.value.at(-1).kind, "time");
  assert.equal(v.minted.showcase.note, "Nothing is posted — the Innovations feed isn't open yet.");
  assert.equal(v.minted.showcase.action, "Stop showcasing");
  assert.equal(v.meta, "Private · Showcased");
});

test("Given: the license with its one-liner; nobody 'can claim it' (COM-10)", () => {
  const license = { id: "mit", label: MIT.label, info: MIT.info };
  const v = outcomeView(minted("given", "give", { license }), { status: "given", showcase: null });
  assert.equal(v.subline, "Minted under MIT License. This can't be undone.");
  assert.deepEqual(rowsOf(v).at(-1), ["License", "MIT License", "Permissive; keep the notice, no warranty."]);
  assert.equal(v.meta, "Given");
  assert.equal(
    outcomeView(minted("given", "give"), { status: "given", showcase: null }).subline,
    "Minted to give away. This can't be undone.",
  );
});

test("A sell mint has no Price or Royalties row — they are the Marketplace block's (P2-LISTING-23)", () => {
  const v = outcomeView(minted("listed", "sell"), { status: "private", showcase: { at: SHOWN } });
  assert.equal(v.subline, "Minted and kept by you — not given away or for sale.");
  assert.ok(!v.minted.rows.some((r) => ["price", "royalties"].includes(r.key)));
  assert.equal(v.meta, "Private · Showcased");
  // With a listing of any status, the subline points at the block.
  for (const kind of ["live", "paused", "ended", "sold"]) {
    const w = outcomeView(minted("listed", "sell"), { status: "listed", showcase: null, listing: { kind } });
    assert.equal(w.subline, SALE_IN_MARKETPLACE, kind);
  }
  assert.equal(SALE_IN_MARKETPLACE, "Minted. Its sale is in the Marketplace block.");
  const save = outcomeView(minted("private", "save"), { status: "private", showcase: null, listing: { kind: "ended" } });
  assert.equal(save.subline, SALE_IN_MARKETPLACE);
});

test("P2-MINT-10 · lazy: Mint · Network · Collection · Token · Signature · Payout wallet, with the demo footnote", () => {
  const v = outcomeView(withRecord(lazyRecord, "sell"), { status: "listed", showcase: null });
  assert.deepEqual(rowsOf(v), [
    ["Mint", "Lazy minted · Sep 22, 2026 · 9:09 PM", "Signed with Demo account 1. The token is minted on chain at its first sale."],
    ["Network", "Base Sepolia (Testnet)", null],
    ["Collection", "Garden Sensors", null],
    ["Token", "#1", "Reserved — it exists on chain after its first sale."],
    ["Signature", "0x747a…b32b", null],
    ["Payout wallet", "Demo account 1 · 0x955d…ed95", null],
  ]);
  assert.deepEqual(v.minted.rows.find((r) => r.key === "signature").copy, { label: "Copy signature", value: SIG });
  assert.deepEqual(v.minted.rows.find((r) => r.key === "wallet").copy, { label: "Copy address", value: ADDRESS });
  assert.deepEqual([v.mint, v.demo, v.minted.footnote], ["lazyMinted", true, DEMO_MINT_FOOTNOTE]);
  assert.equal(
    DEMO_MINT_FOOTNOTE,
    "Testnet demo — the token, signature and transaction were made in this browser. Nothing is on a real blockchain, so there's no explorer page for them.",
  );
  const save = outcomeView(withRecord(lazyRecord, "save"), { status: "private", showcase: null });
  assert.equal(save.minted.rows[0].note, "Signed. Nothing is on chain until you list it.");
});

test("P2-MINT-10 · on chain: Transaction with the full hash to copy, Paid, and the locked payout wallet", () => {
  const v = outcomeView(withRecord(onChainRecord, "sell"), { status: "private", showcase: null });
  assert.deepEqual(rowsOf(v), [
    ["Mint", "Minted on chain · Sep 22, 2026", "Paid 4 IDZ + 0.00104 ETH."],
    ["Network", "Base Sepolia (Testnet)", null],
    ["Collection", "Garden Sensors", null],
    ["Token", "#1", null],
    ["Transaction", "0xba13…03bd", null],
    ["Payout wallet", "Demo account 1 · 0x955d…ed95", "Locked — the token is on chain at this wallet."],
  ]);
  const tx = v.minted.rows.find((r) => r.key === "tx");
  assert.deepEqual(tx.copy, { label: "Copy transaction hash", value: TX });
  assert.equal(tx.copy.value.length, 66);
  assert.equal(v.mint, "onChain");
});

test("P2-MINT-10 · a lazy mint its first sale settled reads on chain, with the sale's transaction (C12)", () => {
  const settled = { at: SOLD, txHash: TX, via: "sale" };
  const v = outcomeView(withRecord(lazyRecord, "sell", { settled }), { status: "sold", showcase: null });
  assert.deepEqual(rowsOf(v), [
    ["Mint", "Minted on chain · Sep 28, 2026", "At its first sale — the buyer's purchase paid the network fee."],
    ["Network", "Base Sepolia (Testnet)", null],
    ["Collection", "Garden Sensors", null],
    ["Token", "#1", null],
    ["Transaction", "0xba13…03bd", null],
    ["Payout wallet", "Demo account 1 · 0x955d…ed95", "Locked — the token is on chain at this wallet."],
  ]);
  assert.equal(v.minted.rows.find((r) => r.key === "tx").copy.value, TX);
  assert.ok(!v.minted.rows.some((r) => r.key === "signature"));
});

test("Unreadable record: its own line, no terms, still the Showcase row and the footnote (COM-14, COM-15, X41)", () => {
  const v = outcomeView(
    { outcome: "mintedUnreadable", intent: null, mint: "legacy", record: null },
    { status: "minted", showcase: null },
  );
  assert.equal(v.subline, "The brief record can't be read in this browser, so its terms aren't shown.");
  assert.deepEqual(v.minted.rows, []);
  assert.equal(v.minted.showcase.action, "Showcase project");
  assert.equal(v.minted.footnote, MINTED_FOOTNOTE);
  assert.equal(v.meta, "Minted");
});

test("A Draft never has a Showcase row (X41)", () => {
  for (const c of [NONE, { ...NONE, step: "idea" }, { ...NONE, outcome: "briefing", intent: "sell", step: "form" }]) {
    assert.equal(outcomeView(c, DRAFT).minted, null);
  }
});

test("The preview clip line is retired (P2-VIDEO-15)", () => {
  for (const [o, i] of [["private", "save"], ["given", "give"], ["listed", "sell"]]) {
    assert.equal(outcomeView(minted(o, i), { status: o === "listed" ? "private" : o, showcase: null }).clipLine, null);
  }
});

test("P2-VIDEO-15 · the Showcase row's notes follow the gate", () => {
  const product = (productId, name, state) => ({ productId, name, thumb: null, video: { state } });
  const gate = (products) => {
    const ready = products.filter((p) => p.video.state === "ready").length;
    const ok = ready === products.length;
    return {
      purpose: "showcase", ok,
      rules: [{ id: "videos", ok, fixedIn: "gate", reason: ok ? null : "x" }],
      products,
      counts: { total: products.length, ready, rendering: 0, missing: products.length - ready },
      blocker: ok ? null : "x", gateBlocker: ok ? null : "x",
    };
  };
  const s = (showcase) => ({ id: "proj_car", status: "private", showcase });
  const blocked = gate([product("p1", "Car", "ready"), product("p2", "Remote", "none")]);
  assert.equal(
    outcomeView(minted("private", "save"), s(null), blocked).minted.showcase.note,
    "Showcasing needs an AI video for every product — 1 of 2 have one.",
  );
  const on = outcomeView(minted("private", "save"), s({ at: SHOWN }), blocked).minted.showcase;
  assert.equal(on.note, "Showcased — Remote has no video yet.");
  assert.deepEqual(on.noteLink, { text: "Remote", href: "/projects/proj_car/products/p2" });
  assert.equal(on.action, "Stop showcasing");
  const two = gate([product("p1", "Car", "none"), product("p2", "Remote", "failed")]);
  assert.equal(outcomeView(minted("private", "save"), s({ at: SHOWN }), two).minted.showcase.note, "Showcased — 2 products have no video yet.");
  const ready = gate([product("p1", "Car", "ready")]);
  assert.equal(
    outcomeView(minted("private", "save"), s(null), ready).minted.showcase.note,
    "Showcasing lists it under Showcase in My projects. Nothing is posted until Innovations opens.",
  );
  assert.equal(outcomeView(minted("private", "save"), s({ at: SHOWN }), ready).minted.showcase.note, "Nothing is posted — the Innovations feed isn't open yet.");
});

test("Money: the token on every amount, trimmed, grouped, at most 6 decimals (COM-16)", () => {
  assert.equal(formatAmount("0.050000", "ETH"), "0.05 ETH");
  assert.equal(formatAmount(" 1234.5 ", "USDC"), "1,234.5 USDC");
  assert.equal(formatAmount("0.1234567", "ETH"), "0.123457 ETH");
  assert.equal(formatAmount("007", "MATIC"), "7 MATIC");
  assert.equal(formatAmount(".5", "WETH"), "0.5 WETH");
  for (const bad of ["", "0", "0.000", "-1", "1e3", "abc", "1,000", undefined]) {
    assert.equal(formatAmount(bad, "ETH"), null, `"${bad}" is not an amount`);
  }
});

test("No line claims a post, a live listing or a claimable drop (COM-12, COM-21, COM-56)", () => {
  const lines = [
    ...[null, { at: SHOWN }].flatMap((s) => {
      const r = showcaseRow(s);
      return [plainText(r.value), r.note, r.action];
    }),
    ...Object.values(SUCCESS_SHOWCASE),
    ...[
      ["private", "save"],
      ["given", "give"],
      ["listed", "sell"],
    ].map(([o, i]) => outcomeView(minted(o, i), { status: o, showcase: { at: SHOWN } }).subline),
  ];
  for (const line of lines) {
    assert.doesNotMatch(line, /\bon Innovations\b|\bis up\b|\blive\b|can claim|\/innovations\//i, line);
  }
});

test("The success step's Showcase words and the announcements (COM-55, COM-56)", () => {
  assert.deepEqual(
    { ...SUCCESS_SHOWCASE },
    {
      action: "Showcase this project",
      line: "It goes under Showcase in My projects now. Nothing is posted until Innovations opens.",
      done: "Showcased — it's on your Showcase tab.",
      undo: "Undo",
    },
  );
  assert.equal(showcaseAnnouncement(true, " Car "), "Showcased Car");
  assert.equal(showcaseAnnouncement(false, "Car"), "Stopped showcasing Car");
  assert.equal(showcaseAnnouncement(true, "  "), "Showcased this project");
});

test("Details: Source in A3's words, Created only when it isn't the meta line's date, Stored for the owner (COR-55, PPL-7)", () => {
  const created = at(2026, 9, 22, 9, 2);
  const saved = at(2026, 9, 26, 16, 12);
  const built = detailsRows({ source: { kind: "build", builds: 2 }, when: { label: "Saved", at: saved }, createdAt: created, ownerFacts: true });
  assert.deepEqual(built.map((r) => [r.label, plainText(r.value), r.note ?? null]), [
    ["Source", "AI build", null],
    ["Created", "Sep 22, 2026", null],
    ["Stored", "In this browser", null],
  ]);
  assert.equal(built[1].value[0].kind, "time");

  const sameDay = detailsRows({
    source: { kind: "build", builds: 1 },
    when: { label: "Saved", at: at(2026, 9, 22, 18, 0) },
    createdAt: created,
    ownerFacts: true,
  });
  assert.deepEqual(sameDay.map((r) => r.key), ["source", "stored"]);

  const hand = detailsRows({ source: { kind: "hand" }, when: { label: "Created", at: created }, createdAt: created, ownerFacts: true });
  assert.deepEqual(hand.map((r) => [r.label, plainText(r.value)]), [["Source", "By hand"], ["Stored", "In this browser"]]);

  const gone = detailsRows({ source: { kind: "build-gone" }, when: { label: "Created", at: created }, createdAt: created, ownerFacts: true });
  assert.deepEqual([plainText(gone[0].value), gone[0].note], ["AI build · not in this browser", BUILD_GONE_TIP]);

  const buyer = detailsRows({ source: { kind: "build-gone" }, when: { label: "Saved", at: saved }, createdAt: created, ownerFacts: false });
  assert.deepEqual(buyer.map((r) => [r.key, r.note ?? null]), [["source", null], ["created", null]], "no Stored row and no owner tip for a buyer");
  assert.ok(![...built, ...hand, ...gone].some((r) => r.label === "Built in"), "Built in lives in the Versions block (COR-55, O9)");
});

test("P2-CONTRIB-9 · Details starts with Ownership while someone else holds a share; a contributor preview sees its role", () => {
  const created = at(2026, 9, 22, 9, 2);
  const base = { source: { kind: "hand" }, when: { label: "Created", at: created }, createdAt: created, ownerFacts: true };
  const solo = ownershipOf({ createdAt: created, contributors: [], sales: [], listedPercent: 0 });
  assert.deepEqual(detailsRows({ ...base, ownership: solo, viewer: { kind: "local-owner" } }).map((r) => r.key), ["source", "stored"]);
  const ana = { id: "ctb_ana", name: "Ana Silva", role: "coOwner", share: 30, addedAt: created };
  const split = ownershipOf({ createdAt: created, contributors: [ana], sales: [], listedPercent: 0 });
  const rows = detailsRows({ ...base, ownership: split, viewer: { kind: "local-owner" } });
  assert.deepEqual([rows[0].key, rows[0].label, plainText(rows[0].value), rows[0].note], ["ownership", "Ownership", "You · 70%", "Ana Silva 30%"]);
  assert.deepEqual(rows[0].link, { label: "See contributors", tab: "contributors" });
  const member = { kind: "contributor-preview", contributorId: "ctb_ana", name: "Ana Silva", role: "coOwner", share: 30 };
  const own = detailsRows({ ...base, ownerFacts: false, ownership: split, viewer: member })[0];
  assert.deepEqual([own.label, plainText(own.value)], ["Your role", "Co-owner · 30%"]);
  const buyer = detailsRows({ ...base, ownerFacts: false, ownership: split, viewer: { kind: "owner-preview" } });
  assert.ok(!buyer.some((r) => r.key === "ownership"));
  // Without the ownership input the rows are v1's.
  assert.equal(detailsRows(base)[0].key, "source");
});
