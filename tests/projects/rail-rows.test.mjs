// C8 — the words the rail's Editor, Versions and Project log blocks print
// (spec §5.10: COR-52, COR-59/60/61, COR-78, COR-106/107). Compiled by A1's
// tests/projects/tsconfig.json:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  NOT_READ,
  VERSIONS_SHOWN,
  LOG_SHOWN,
  stepFactText,
  logLinesOf,
  productAtVersionHref,
  versionGroupsOf,
  versionCountOf,
  firstVersions,
} = await import("../../.tmp-test/lib/manual/rail-rows.js");

// ── Clock: local time, as A3's formatter reads it, so this passes in any timezone ──
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const SEP20_1005 = at(2026, 9, 20, 10, 5); // "Sep 20, 2026 · 10:05 AM"
const SEP22_902 = at(2026, 9, 22, 9, 2); // "Sep 22, 2026 · 9:02 AM"
const SEP22_2109 = at(2026, 9, 22, 21, 9); // "Sep 22, 2026 · 9:09 PM"
const SEP26_1000 = at(2026, 9, 26, 10, 0); // "Sep 26, 2026 · 10:00 AM"
const SEP26_1612 = at(2026, 9, 26, 16, 12); // "Sep 26, 2026 · 4:12 PM"
/** A MetaPart time, as C7a's timePart() builds it. */
const time = (ts, text) => ({ kind: "time", time: { text, dateTime: new Date(ts).toISOString(), title: text } });

// ── Fixtures: rows exactly as A2's versionsOf() and lineagesOf() return them ──
// The Car example of spec §3.3: version 2 of chat "Car" dropped Battery
// Charger, added Spare Battery Pack and changed Remote Controller.
const job = (id) => ({ id }); // the block only asks whether the build is in this browser
const v1 = {
  chatId: "chat_car", lineage: "Car", version: 1, current: false,
  buildId: "b_car_1", job: job("b_car_1"), savedAt: SEP22_902,
  pieces: { ready: 15, total: 15, retry: false },
  products: [
    { rowId: "p1", productId: "primary", name: "RC Car Controller" },
    { rowId: "p2", productId: "remote", name: "Remote Controller" },
    { rowId: "p3", productId: "charger", name: "Battery Charger" },
  ],
  diff: null,
};
const v2 = {
  chatId: "chat_car", lineage: "Car", version: 2, current: true,
  buildId: "b_car_2", job: job("b_car_2"), savedAt: SEP26_1612,
  pieces: { ready: 15, total: 15, retry: false },
  products: [
    { rowId: "p1", productId: "primary", name: "RC Car Controller" },
    { rowId: "p2", productId: "remote", name: "Remote Controller" },
    { rowId: "prd_spare001", productId: "spare", name: "Spare Battery Pack" },
  ],
  diff: { added: ["prd_spare001"], dropped: ["p3"], changed: ["p2"] },
};
const lineage = (chatId, chat) => ({ chatId, title: "Car", chat, refs: [], latest: null });
const LINEAGES = [lineage("chat_car", { id: "chat_car", title: "Car" })];

test("stepFactText: a derived fact or nothing — never a status word (COR-59, COR-60, COR-61)", () => {
  assert.equal(NOT_READ, "—");
  assert.equal(stepFactText(undefined), "—");
  assert.equal(stepFactText({ state: "not-opened" }), "Not opened");
  assert.equal(stepFactText({ state: "sample" }), "Sample circuit only");
  assert.equal(stepFactText({ state: "work", text: "42 objects · 12 on the board" }), "42 objects · 12 on the board");
  assert.equal(stepFactText({ state: "none" }), null);
});

test("logLinesOf: created, minted and showcased only, each over its date (COR-52)", () => {
  const lines = logLinesOf([
    { kind: "showcased", at: SEP26_1000 },
    { kind: "minted", at: SEP22_2109, intent: "sell", network: "baseSepolia" },
    { kind: "created", at: SEP20_1005 },
  ]);
  assert.deepEqual(lines, [
    { key: `showcased:${SEP26_1000}`, title: "Showcased", note: null, when: [time(SEP26_1000, "Sep 26, 2026 · 10:00 AM")] },
    {
      key: `minted:${SEP22_2109}`,
      title: "Minted · Listed · Base Sepolia (Testnet)",
      // "Listed" never stands alone before a marketplace exists (COM-19).
      note: "Goes on sale when the marketplace opens.",
      when: [time(SEP22_2109, "Sep 22, 2026 · 9:09 PM")],
    },
    { key: `created:${SEP20_1005}`, title: "Created by hand", note: null, when: [time(SEP20_1005, "Sep 20, 2026 · 10:05 AM")] },
  ]);
});

test("logLinesOf: each intent mints into its status word; only Listed carries a note", () => {
  const [give, save] = logLinesOf([
    { kind: "minted", at: 2, intent: "give", network: "mumbai" },
    { kind: "minted", at: 1, intent: "save", network: "baseSepolia" },
  ]);
  assert.equal(give.title, "Minted · Given · Mumbai Testnet (Polygon)");
  assert.equal(give.note, null);
  assert.equal(save.title, "Minted · Private · Base Sepolia (Testnet)");
  assert.equal(save.note, null);
  assert.deepEqual(logLinesOf([]), []);
});

test("logLinesOf: network: false leaves the chain out of a mint (PPL-7, Preview as buyer)", () => {
  const [minted, showcased] = logLinesOf(
    [
      { kind: "minted", at: 2, intent: "sell", network: "baseSepolia" },
      { kind: "showcased", at: 1 },
    ],
    { network: false },
  );
  assert.equal(minted.title, "Minted · Listed");
  // The Listed subline stays: "Listed" never stands alone (COR-76).
  assert.equal(minted.note, "Goes on sale when the marketplace opens.");
  assert.equal(showcased.title, "Showcased");
  // The default is the owner's line, chain included.
  assert.equal(logLinesOf([{ kind: "minted", at: 2, intent: "sell", network: "baseSepolia" }])[0].title, "Minted · Listed · Base Sepolia (Testnet)");
});

test("productAtVersionHref: a product's page at one version (COR-41)", () => {
  assert.equal(productAtVersionHref("proj_car", "p2", 2), "/projects/proj_car/products/p2?v=2");
  assert.equal(productAtVersionHref("a b", "p/1", 1), "/projects/a%20b/products/p%2F1?v=1");
});

test("versionGroupsOf: the Car example — one lineage, newest first, Added / Dropped / Changed (COR-107)", () => {
  const groups = versionGroupsOf([[v2, v1]], LINEAGES, "proj_car");
  assert.equal(groups.length, 1);
  const [g] = groups;
  assert.equal(g.key, "chat_car");
  assert.equal(g.heading, "Chat “Car”");
  assert.equal(g.chatHref, "/chat/chat_car");
  assert.deepEqual(g.rows.map((r) => r.title), ["Version 2 · current", "Version 1"]);
  const [r2, r1] = g.rows;
  assert.equal(r2.key, "b_car_2");
  assert.deepEqual(r2.saved, [{ kind: "text", text: "Saved " }, time(SEP26_1612, "Sep 26, 2026 · 4:12 PM")]);
  assert.deepEqual(r1.saved, [{ kind: "text", text: "Saved " }, time(SEP22_902, "Sep 22, 2026 · 9:02 AM")]);
  assert.equal(r2.pieces, "15 of 15 pieces ready");
  assert.equal(r2.buildHref, "/build/b_car_2");
  assert.equal(r2.gone, false);
  assert.deepEqual(r2.lines, [
    { label: "Added", items: [{ name: "Spare Battery Pack", href: "/projects/proj_car/products/prd_spare001?v=2" }] },
    // A dropped product isn't in version 2: its link opens version 1, the last that had it.
    { label: "Dropped", items: [{ name: "Battery Charger", href: "/projects/proj_car/products/p3?v=1" }] },
    { label: "Changed", items: [{ name: "Remote Controller", href: "/projects/proj_car/products/p2?v=2" }] },
  ]);
  // Version 1 lists its products.
  assert.deepEqual(r1.lines, [
    {
      label: "Products",
      items: [
        { name: "RC Car Controller", href: "/projects/proj_car/products/p1?v=1" },
        { name: "Remote Controller", href: "/projects/proj_car/products/p2?v=1" },
        { name: "Battery Charger", href: "/projects/proj_car/products/p3?v=1" },
      ],
    },
  ]);
});

test("versionGroupsOf: an empty diff line is left out; a name with no row is plain text", () => {
  const v3 = {
    ...v2, version: 3, buildId: "b_car_3", job: job("b_car_3"),
    products: [...v2.products, { rowId: null, productId: "buzzer", name: "Buzzer" }],
    diff: { added: ["Buzzer"], dropped: [], changed: [] },
  };
  const [g] = versionGroupsOf([[v3, { ...v2, current: false }, v1]], LINEAGES, "proj_car");
  assert.deepEqual(g.rows[0].lines, [{ label: "Added", items: [{ name: "Buzzer", href: null }] }]);
  assert.equal(g.rows[1].title, "Version 2");
});

test("versionGroupsOf: nothing to compare against lists the version's products (A2: diff null)", () => {
  // v2's build is here but v1's is gone, so versionsOf() gives v2 no diff.
  const gone1 = { ...v1, job: null, pieces: null, products: [] };
  const [g] = versionGroupsOf([[{ ...v2, diff: null }, gone1]], LINEAGES, "proj_car");
  assert.deepEqual(g.rows[0].lines.map((l) => l.label), ["Products"]);
  assert.equal(g.rows[0].lines[0].items.length, 3);
  assert.deepEqual(g.rows[1], {
    key: "b_car_1", title: "Version 1",
    saved: [{ kind: "text", text: "Saved " }, time(SEP22_902, "Sep 22, 2026 · 9:02 AM")],
    pieces: null, buildHref: null, gone: true, lines: [],
  });
});

test("versionGroupsOf: a chat not in this browser is a plain heading (COR-78)", () => {
  const old = {
    chatId: "chat_old", lineage: "Old car", version: 1, current: true,
    buildId: "b_gone", job: null, savedAt: null, pieces: null, products: [], diff: null,
  };
  const [g] = versionGroupsOf([[old]], [lineage("chat_old", null)], "proj_car");
  assert.equal(g.heading, "Chat “Old car” · not in this browser");
  assert.equal(g.chatHref, null);
  assert.deepEqual(g.rows[0], {
    key: "b_gone", title: "Version 1 · current", saved: null, pieces: null,
    buildHref: null, gone: true, lines: [],
  });
  const [orphan] = versionGroupsOf([[{ ...old, chatId: null, lineage: "Build" }]], [lineage(null, null)], "proj_car");
  assert.equal(orphan.heading, "Chat not in this browser");
  assert.equal(orphan.key, "no-chat:b_gone");
  assert.equal(orphan.chatHref, null);
});

test("versionGroupsOf: a build that needs a retry says so; empty lineages are skipped", () => {
  const retry = { ...v1, current: true, pieces: { ready: 12, total: 15, retry: true } };
  const groups = versionGroupsOf([[], [retry]], LINEAGES, "proj_car");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].rows[0].pieces, "Needs a retry");
  assert.deepEqual(versionGroupsOf([], [], "proj_car"), []);
});

test("firstVersions: five versions per project across lineages, then Show all (§5.1.10)", () => {
  assert.equal(VERSIONS_SHOWN, 5);
  assert.equal(LOG_SHOWN, 6);
  const run = (chatId, n) =>
    Array.from({ length: n }, (_, i) => ({
      ...v1, chatId, lineage: chatId, version: n - i, current: i === 0, buildId: `${chatId}_${n - i}`, diff: null,
    }));
  const groups = versionGroupsOf(
    [run("a", 4), run("b", 3)],
    [lineage("a", { id: "a" }), lineage("b", { id: "b" })],
    "proj_car",
  );
  assert.equal(versionCountOf(groups), 7);
  const shown = firstVersions(groups, VERSIONS_SHOWN);
  assert.deepEqual(shown.map((g) => g.rows.map((r) => r.key)), [["a_4", "a_3", "a_2", "a_1"], ["b_3"]]);
  assert.equal(versionCountOf(shown), 5);
  // Under the cap nothing is cut; a group past the cap is left out whole.
  assert.deepEqual(firstVersions(groups, 20), groups);
  assert.deepEqual(firstVersions(groups, 4).map((g) => g.key), ["a"]);
});
