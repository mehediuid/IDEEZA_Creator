// C7a — the rail's Outcome and Details words, and Showcase's (spec §5.10, §5.12:
// COM-4…16, COM-12, COM-55, COM-56, COR-55, X41). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MINTED_FOOTNOTE,
  detailsRows,
  formatAmount,
  outcomeView,
} from "../../.tmp-test/lib/manual/rail-copy.js";
import {
  SUCCESS_SHOWCASE,
  plainText,
  showcaseAnnouncement,
  showcaseRow,
} from "../../.tmp-test/lib/manual/showcase-copy.js";
import { BUILD_GONE_TIP, LISTED_SUBLINE } from "../../.tmp-test/lib/manual/project-summary.js";
import { BRIEF_FORM_LABEL, LICENSES } from "../../.tmp-test/lib/brief/types.js";

// Local time, so A3's formatter round-trips in any timezone.
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const MINTED = at(2026, 9, 22, 21, 9); // "Sep 22, 2026 · 9:09 PM"
const SHOWN = at(2026, 9, 26, 10, 0); // "Sep 26, 2026"
const ENDS = at(2026, 10, 3, 14, 30); // "Oct 3, 2026 · 2:30 PM"
const MIT = LICENSES.find((l) => l.value === "mit");

const NONE = { outcome: "none", intent: null, mint: "notMinted", clip: { state: "none" } };
const minted = (outcome, intent, extra = {}) => ({
  outcome,
  intent,
  mint: "minted",
  mintedAt: MINTED,
  network: { id: "baseSepolia", label: "Base Sepolia (Testnet)" },
  collection: " Garden Sensors ",
  clip: { state: "none" },
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
});

test("Brief in progress names the choice and the Brief's own step name, and no terms (COM-5)", () => {
  const give = outcomeView({ ...NONE, outcome: "briefing", intent: "give", step: "preview" }, DRAFT);
  assert.equal(
    give.subline,
    "You chose to give it away. The Brief is at the “Preview” step — nothing is minted until you finish it.",
  );
  assert.equal(give.minted, null);
  const sell = outcomeView(
    { ...NONE, outcome: "briefing", intent: "sell", step: "form", clip: { state: "rendering", progress: 40, eta: "about 3 min" } },
    DRAFT,
  );
  assert.equal(
    sell.subline,
    `You chose to sell it. The Brief is at the “${BRIEF_FORM_LABEL.sell}” step — nothing is minted until you finish it.`,
  );
  assert.equal(sell.clipLine, null, "the clip line is a minted-state modifier (§4.1 rows 6–8)");
  assert.equal(
    outcomeView({ ...NONE, outcome: "briefing", intent: "save", step: "idea" }, DRAFT).subline,
    "You chose to keep it private. The Brief is at the “Idea” step — nothing is minted until you finish it.",
  );
});

test("Private, not showcased: Minted first, network, collection, the Showcase row, the footnote (COM-6…8, COM-11, COM-12, COM-14)", () => {
  const v = outcomeView(minted("private", "save"), { status: "private", showcase: null });
  assert.equal(v.subline, "Minted and kept. Only you can see it.");
  assert.deepEqual(rowsOf(v), [
    ["Minted", "Sep 22, 2026 · 9:09 PM", null],
    ["Network", "Base Sepolia (Testnet)", null],
    ["Collection", "Garden Sensors", null],
  ]);
  const first = v.minted.rows[0].value[0];
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

test("Listed, buy now: price in its token, royalties, A3's Listed words (COM-9, COM-16, COM-19)", () => {
  const v = outcomeView(
    minted("listed", "sell", { sale: { kind: "buyNow", token: "ETH", price: "0.050" }, royaltiesPct: 10 }),
    { status: "listed", showcase: { at: SHOWN } },
  );
  assert.equal(v.subline, "Minted. It goes on sale when the marketplace opens.");
  assert.ok(v.subline.includes(LISTED_SUBLINE.toLowerCase()), "the Listed words are A3's LISTED_SUBLINE");
  assert.deepEqual(rowsOf(v).slice(3), [
    ["Price", "0.05 ETH · Buy now", null],
    ["Royalties", "10 % on resales", null],
  ]);
  assert.equal(v.meta, "Listed · Showcased");
});

test("Listed, auction: from, buy now, the end in <time>, and a passed end sold nothing (COM-9)", () => {
  const sale = { kind: "auction", token: "ETH", minBid: "0.02", buyNow: "0.10", endsAt: ENDS, ended: true };
  const v = outcomeView(minted("listed", "sell", { sale, royaltiesPct: 7.5 }), { status: "listed", showcase: null });
  assert.deepEqual(rowsOf(v).slice(3), [
    [
      "Price",
      "Auction · from 0.02 ETH · buy now 0.1 ETH · ends Oct 3, 2026 · 2:30 PM",
      "This end date passed before the marketplace opened — nothing was sold.",
    ],
    ["Royalties", "7.5 % on resales", null],
  ]);
  assert.equal(v.minted.rows.find((r) => r.key === "price").value.at(-1).kind, "time");
  const open = outcomeView(
    minted("listed", "sell", { sale: { ...sale, buyNow: "", ended: false } }),
    { status: "listed", showcase: null },
  );
  assert.deepEqual(rowsOf(open).slice(3), [["Price", "Auction · from 0.02 ETH · ends Oct 3, 2026 · 2:30 PM", null]]);
});

test("A price that isn't an amount leaves its row out, never '0 ETH' (COM-16)", () => {
  const v = outcomeView(
    minted("listed", "sell", { sale: { kind: "buyNow", token: "ETH", price: "" } }),
    { status: "listed", showcase: null },
  );
  assert.equal(v.minted.rows.some((r) => r.key === "price"), false);
});

test("Unreadable record: its own line, no terms, still the Showcase row and the footnote (COM-14, COM-15, X41)", () => {
  const v = outcomeView(
    { outcome: "mintedUnreadable", intent: null, mint: "minted", clip: { state: "none" } },
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

test("Preview clip, minted states only (COM-13)", () => {
  const rendering = outcomeView(
    minted("private", "save", { clip: { state: "rendering", progress: 42.4, eta: "about 3 min" } }),
    { status: "private", showcase: null },
  );
  assert.equal(rendering.clipLine, "The preview clip is still rendering — 42 %, about 3 min left.");
  const failed = outcomeView(minted("given", "give", { clip: { state: "failed" } }), { status: "given", showcase: null });
  assert.equal(failed.clipLine, "The preview clip failed — regenerate it from the Brief.");
  const ready = outcomeView(minted("listed", "sell", { clip: { state: "ready" } }), { status: "listed", showcase: null });
  assert.equal(ready.clipLine, null);
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
