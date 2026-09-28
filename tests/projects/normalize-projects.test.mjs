// Task A1 — what normalizeProjects keeps and drops (COR-87 product identity, COR-86 build refs,
// COR-91 lastOpened, COR-105 showcasedAt, LST-34 cover), and how a write keeps product ids.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_FLOW_STATE,
  keepProductIds,
  newProductId,
  normalizeProjects,
} from "../../.tmp-test/lib/manual/projects.js";

const T = 1_758_000_000_000;

/** A project exactly as the store wrote one before this task. */
function legacy(over = {}) {
  return {
    id: "proj_a",
    slug: "rc-car",
    name: "RC Car",
    productName: "RC Car",
    description: "A car you drive from your phone.",
    status: "draft",
    createdAt: T,
    updatedAt: T,
    flowState: { ...EMPTY_FLOW_STATE },
    ...over,
  };
}

test("legacy product rows get p1…pn from their position; other fields are unchanged", () => {
  const [p] = normalizeProjects([
    legacy({
      buildId: "b1",
      products: [{ name: "RC Car", description: "Drives." }, { name: "Remote" }],
    }),
  ]);
  assert.deepEqual(p.products, [
    { id: "p1", name: "RC Car", description: "Drives." },
    { id: "p2", name: "Remote", description: "" },
  ]);
  assert.equal(p.buildId, "b1");
  assert.equal(p.status, "draft");
});

test("ids are given once: the next load keeps them and hands back the same object", () => {
  const once = normalizeProjects([legacy({ products: [{ name: "RC Car", description: "" }] })]);
  const reloaded = normalizeProjects(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(reloaded, once);
  assert.equal(normalizeProjects(once)[0], once[0]);
});

test("a row keeps its id, its source and its updatedAt", () => {
  const rows = [
    {
      id: "prd_abc12345",
      name: "RC Car",
      description: "Drives.",
      source: { buildId: "b2", productId: "primary" },
      updatedAt: T + 5,
    },
    {
      id: "prd_def67890",
      name: "Remote",
      description: "Steers.",
      source: { buildId: "b2", productId: "c_remote" },
    },
  ];
  const [p] = normalizeProjects([legacy({ products: rows })]);
  assert.deepEqual(p.products, rows);
});

test("a missing, empty or repeated id takes the first free p<n> from its position", () => {
  const [a, b] = normalizeProjects([
    legacy({
      id: "a",
      slug: "a",
      products: [
        { id: "p2", name: "A", description: "" },
        { name: "B", description: "" }, // p2 is held → p3
        { id: "p2", name: "C", description: "" }, // repeats p2 → p3 is taken → p4
        { id: "", name: "D", description: "" }, // empty → p4 is taken → p5
      ],
    }),
    legacy({
      id: "b",
      slug: "b",
      products: [
        { name: "A", description: "" }, // p1 is a later row's stored id → p2
        { id: "p1", name: "B", description: "" },
      ],
    }),
  ]);
  assert.deepEqual(
    a.products.map((x) => x.id),
    ["p2", "p3", "p4", "p5"],
  );
  assert.deepEqual(
    b.products.map((x) => x.id),
    ["p2", "p1"],
  );
});

test("a malformed source or updatedAt is dropped and the row stays", () => {
  const [p] = normalizeProjects([
    legacy({
      products: [
        { id: "p1", name: "A", description: "", source: { buildId: "b1" }, updatedAt: "yesterday" },
        { id: "p2", name: "B", description: "", source: { buildId: 7, productId: "primary" }, updatedAt: T },
      ],
    }),
  ]);
  assert.deepEqual(p.products, [
    { id: "p1", name: "A", description: "" },
    { id: "p2", name: "B", description: "", updatedAt: T },
  ]);
});

test("a row without a string name is dropped, and an empty list is no list", () => {
  const [a, b] = normalizeProjects([
    legacy({
      id: "a",
      slug: "a",
      products: [null, { description: "no name" }, { name: "Kept", description: "" }],
    }),
    legacy({ id: "b", slug: "b", products: [] }),
  ]);
  assert.deepEqual(a.products, [{ id: "p1", name: "Kept", description: "" }]);
  assert.equal("products" in b, false);
});

test("builds: valid refs are kept, the rest dropped, and a build's first ref wins", () => {
  const good = [
    { buildId: "b1", chatId: "c1", version: 1, savedAt: T },
    { buildId: "b0", chatId: null, version: 1, savedAt: null },
  ];
  const [p] = normalizeProjects([
    legacy({
      builds: [
        ...good,
        { buildId: "b1", chatId: "c1", version: 2, savedAt: T + 1 }, // b1 again
        { buildId: "b2", chatId: "c1", version: 0, savedAt: T }, // version < 1
        { buildId: "b3", chatId: "c1", version: 1.5, savedAt: T }, // not an integer
        { buildId: "b4", chatId: "c1", version: "2", savedAt: T }, // not a number
        { buildId: "b5", version: 1, savedAt: T }, // no chatId
        { buildId: "b6", chatId: "c1", version: 1, savedAt: "today" }, // savedAt not a number
        { buildId: "", chatId: "c1", version: 1, savedAt: T }, // empty buildId
        { chatId: "c1", version: 1, savedAt: T }, // no buildId
        "b7",
      ],
    }),
  ]);
  assert.deepEqual(p.builds, good);
});

test("builds: a clean list is kept as the same array; an empty one is no list", () => {
  const builds = [{ buildId: "b1", chatId: "c1", version: 1, savedAt: T }];
  const [a, b] = normalizeProjects([
    legacy({ id: "a", slug: "a", builds }),
    legacy({ id: "b", slug: "b", builds: [] }),
  ]);
  assert.equal(a.builds, builds);
  assert.equal("builds" in b, false);
});

test("lastOpened is kept only with a known step and a finite time", () => {
  const [a, b, c] = normalizeProjects([
    legacy({ id: "a", slug: "a", lastOpened: { step: "wiring", at: T } }),
    legacy({ id: "b", slug: "b", lastOpened: { step: "cad", at: T } }),
    legacy({ id: "c", slug: "c", lastOpened: { step: "pcb", at: "now" } }),
  ]);
  assert.deepEqual(a.lastOpened, { step: "wiring", at: T });
  assert.equal("lastOpened" in b, false);
  assert.equal("lastOpened" in c, false);
});

test("showcasedAt: a time or null is kept; absent stays absent, never null", () => {
  const [on, off, never, junk] = normalizeProjects([
    legacy({ id: "a", slug: "a", showcasedAt: T }),
    legacy({ id: "b", slug: "b", showcasedAt: null }),
    legacy({ id: "c", slug: "c" }),
    legacy({ id: "d", slug: "d", showcasedAt: "yes" }),
  ]);
  assert.equal(on.showcasedAt, T);
  assert.equal(off.showcasedAt, null);
  // Absent = never recorded. The one-time backfill from an older mint reads that; null would block it.
  assert.equal("showcasedAt" in never, false);
  assert.equal("showcasedAt" in junk, false);
});

test("cover: a product source or null is kept; anything else reads as never chosen", () => {
  const [chosen, stopped, never, half, junk] = normalizeProjects([
    legacy({ id: "a", slug: "a", cover: { buildId: "b1", productId: "primary" } }),
    legacy({ id: "b", slug: "b", cover: null }),
    legacy({ id: "c", slug: "c" }),
    legacy({ id: "d", slug: "d", cover: { buildId: "b1" } }),
    legacy({ id: "e", slug: "e", cover: "https://img.example/cover.png" }),
  ]);
  assert.deepEqual(chosen.cover, { buildId: "b1", productId: "primary" });
  assert.equal(stopped.cover, null);
  assert.equal("cover" in never, false);
  assert.equal("cover" in half, false);
  assert.equal("cover" in junk, false);
});

test("a project already in this shape comes back as the same object", () => {
  const p = legacy({
    buildId: "b1",
    products: [
      {
        id: "prd_abc12345",
        name: "RC Car",
        description: "Drives.",
        source: { buildId: "b1", productId: "primary" },
        updatedAt: T,
      },
    ],
    builds: [{ buildId: "b1", chatId: "c1", version: 1, savedAt: T }],
    lastOpened: { step: "pcb", at: T },
    showcasedAt: null,
    cover: { buildId: "b1", productId: "primary" },
  });
  assert.equal(normalizeProjects([p])[0], p);
});

test("slugs, productName and flow steps are still backfilled", () => {
  // Saved before the assembly step existed.
  const oldFlow = { pcb: true, code: false, three: false, wiring: false, preview: false, brief: false };
  const [a, b] = normalizeProjects([
    legacy({ id: "a", slug: "", productName: undefined, flowState: oldFlow }),
    legacy({ id: "b", slug: "rc-car" }),
  ]);
  assert.equal(a.slug, "rc-car");
  assert.equal(b.slug, "rc-car-2");
  assert.equal(a.productName, "");
  assert.deepEqual(a.flowState, { ...EMPTY_FLOW_STATE, pcb: true });
});

test("a flowState that isn't an object, or a name that isn't a string, reads as empty instead of throwing", () => {
  const list = [
    legacy({ id: "a", slug: "", name: 42, flowState: "pcb" }),
    legacy({ id: "b", flowState: 7 }),
    legacy({ id: "c", slug: "", name: undefined, flowState: ["pcb"] }),
    legacy({ id: "d", name: null }),
  ];
  const [a, b, c, d] = normalizeProjects(list);
  assert.deepEqual([a.name, a.slug, a.flowState], ["", "project", EMPTY_FLOW_STATE]);
  assert.deepEqual([b.name, b.slug, b.flowState], ["RC Car", "rc-car", EMPTY_FLOW_STATE]);
  assert.deepEqual([c.name, c.slug, c.flowState], ["", "project-2", EMPTY_FLOW_STATE]);
  assert.deepEqual([d.name, d.slug, d.flowState], ["", "rc-car-2", EMPTY_FLOW_STATE]);
  // Once normalized, the next load hands back the same objects.
  const again = normalizeProjects([a, b, c, d]);
  again.forEach((p, i) => assert.equal(p, [a, b, c, d][i]));
});

test("storage that isn't a list of projects reads as no projects", () => {
  assert.deepEqual(normalizeProjects(null), []);
  assert.deepEqual(normalizeProjects({ id: "x" }), []);
  assert.deepEqual(normalizeProjects([null, 7, "proj"]), []);
});

const held = [
  {
    id: "p1",
    name: "RC Car",
    description: "Drives.",
    source: { buildId: "b1", productId: "primary" },
    updatedAt: T,
  },
  { id: "p2", name: "Remote", description: "Steers." },
];

test("keepProductIds: a same-length write keeps each row's id and source by position", () => {
  const out = keepProductIds(
    [
      { name: "RC Car Pro", description: "Drives faster." },
      { name: "Remote", description: "Steers." },
    ],
    held,
  );
  assert.deepEqual(out, [
    {
      id: "p1",
      name: "RC Car Pro",
      description: "Drives faster.",
      source: { buildId: "b1", productId: "primary" },
      updatedAt: T,
    },
    { id: "p2", name: "Remote", description: "Steers." },
  ]);
});

test("keepProductIds: a longer or shorter write matches by name; a new row gets a new id", () => {
  const out = keepProductIds(
    [
      { name: "remote ", description: "Steers." },
      { name: "Charger", description: "Charges." },
      { name: "RC Car", description: "Drives." },
    ],
    held,
  );
  assert.equal(out[0].id, "p2");
  assert.match(out[1].id, /^prd_[0-9a-z]{8}$/);
  assert.equal(out[2].id, "p1");
  assert.deepEqual(out[2].source, held[0].source);
});

test("keepProductIds: a row's own id wins, and no held id goes to two rows", () => {
  const out = keepProductIds(
    [
      { id: "p2", name: "Remote", description: "" },
      { name: "Remote", description: "" },
    ],
    held,
  );
  assert.equal(out[0].id, "p2");
  assert.match(out[1].id, /^prd_[0-9a-z]{8}$/);
});

test("newProductId: prd_ and 8 base-36 characters, never the same twice in 1,000", () => {
  const ids = new Set(Array.from({ length: 1000 }, () => newProductId()));
  assert.equal(ids.size, 1000);
  for (const id of ids) assert.match(id, /^prd_[0-9a-z]{8}$/);
});

// ── T09: the Phase 2 fields (spec §3.3.5), each through its own normalizer ──

const MINT = {
  v: 1,
  demo: true,
  type: "lazy",
  network: "baseSepolia",
  collection: "Test Collection",
  tokenId: 1,
  wallet: { account: 1, address: "0x955d2f5d7d1e3a6b0c4f8e2a9b1c3d5e7f90ed95" },
  at: T,
  signedAt: T,
  signature: "0xabc",
};
const ANA = { id: "ctb_ana00001", name: "Ana Silva", role: "coOwner", share: 30, addedAt: T };
const LEE = { id: "ctb_lee00001", name: "Lee Park", role: "viewer", share: 0, addedAt: T, updatedAt: T + 1 };
const LEGAL = { patent: "US 1,234,567", copyright: { text: "© 2026 Ada", url: "https://ada.test" }, updatedAt: T };

test("a project holding every Phase 2 field, all valid, comes back as the same object", () => {
  const p = legacy({
    lastOpened: { step: "code", at: T, productId: "p1" },
    editorOpened: { p1: { step: "code", at: T } },
    mint: MINT,
    contributors: [ANA, LEE],
    ownerConfirmedAt: T,
    legal: LEGAL,
    descriptionHint: { dismissedAt: T, productCount: 3 },
  });
  assert.equal(normalizeProjects([p])[0], p);
  // A stored record in another key order is still the same record.
  const reordered = legacy({ mint: { tokenId: 1, ...MINT, wallet: { address: MINT.wallet.address, account: 1 } } });
  assert.equal(normalizeProjects([reordered])[0], reordered);
});

test("mint: kept through normalizeMintRecord; one whose tokenId is a string is dropped", () => {
  const [kept, bad, junk] = normalizeProjects([
    legacy({ id: "a", slug: "a", mint: MINT }),
    legacy({ id: "b", slug: "b", mint: { ...MINT, tokenId: "1" } }),
    legacy({ id: "c", slug: "c", mint: "minted" }),
  ]);
  assert.deepEqual(kept.mint, MINT);
  assert.equal("mint" in bad, false);
  assert.equal("mint" in junk, false);
  // The rest of the project is untouched.
  assert.equal(bad.name, "RC Car");
});

test("contributors: kept through contributorsIn; a share on a viewer is forced to 0; [] stays []", () => {
  const [a, b, c, d] = normalizeProjects([
    legacy({ id: "a", slug: "a", contributors: [ANA, { ...LEE, share: 25 }] }),
    legacy({ id: "b", slug: "b", contributors: [] }),
    legacy({ id: "c", slug: "c", contributors: [{ name: "No id" }, { ...ANA, share: 12.5 }] }),
    legacy({ id: "d", slug: "d", contributors: "Ana" }),
  ]);
  assert.deepEqual(a.contributors, [ANA, LEE]);
  // Everyone removed is not the same as nobody ever added.
  assert.deepEqual(b.contributors, []);
  assert.equal("contributors" in c, false);
  assert.equal("contributors" in d, false);
});

test("editorOpened: an entry with a bad step, a bad time or a bad key is dropped; none left = none", () => {
  const [a, b] = normalizeProjects([
    legacy({
      id: "a",
      slug: "a",
      editorOpened: {
        p1: { step: "wiring", at: T },
        p2: { step: "brief", at: T }, // the Brief is no editor step
        p3: { step: "cad", at: T },
        p4: { step: "pcb", at: "now" },
        "p:5": { step: "pcb", at: T },
        p6: "pcb",
        p7: { step: "code", at: T, extra: 1 },
      },
    }),
    legacy({ id: "b", slug: "b", editorOpened: { p1: { step: "brief", at: T } } }),
  ]);
  assert.deepEqual(a.editorOpened, { p1: { step: "wiring", at: T }, p7: { step: "code", at: T } });
  assert.equal("editorOpened" in b, false);
});

test("lastOpened: a productId that is a row id is kept; a bad one is dropped and the record stays", () => {
  const [a, b] = normalizeProjects([
    legacy({ id: "a", slug: "a", lastOpened: { step: "code", at: T, productId: "prd_b" } }),
    legacy({ id: "b", slug: "b", lastOpened: { step: "code", at: T, productId: 7 } }),
  ]);
  assert.deepEqual(a.lastOpened, { step: "code", at: T, productId: "prd_b" });
  assert.deepEqual(b.lastOpened, { step: "code", at: T });
});

test("ownerConfirmedAt, legal and descriptionHint are kept when they parse, dropped when not", () => {
  const [ok, bad, empty] = normalizeProjects([
    legacy({ id: "a", slug: "a", ownerConfirmedAt: T, legal: LEGAL, descriptionHint: { dismissedAt: T, productCount: 0 } }),
    legacy({
      id: "b",
      slug: "b",
      ownerConfirmedAt: "yes",
      legal: { patent: "US 1", updatedAt: "today" },
      descriptionHint: { dismissedAt: T, productCount: 2.5 },
    }),
    legacy({ id: "c", slug: "c", legal: { patent: "  ", updatedAt: T }, descriptionHint: { productCount: 3 } }),
  ]);
  assert.equal(ok.ownerConfirmedAt, T);
  assert.deepEqual(ok.legal, LEGAL);
  assert.deepEqual(ok.descriptionHint, { dismissedAt: T, productCount: 0 });
  for (const p of [bad, empty]) {
    assert.equal("ownerConfirmedAt" in p, false);
    assert.equal("legal" in p, false); // all-empty reads as never set
    assert.equal("descriptionHint" in p, false);
  }
});

test("a normalized Phase 2 record is stable: the next load hands back the same object", () => {
  const once = normalizeProjects([
    legacy({
      contributors: [{ ...LEE, share: 25 }],
      editorOpened: { p1: { step: "pcb", at: T }, p2: { step: "brief", at: T } },
      mint: { ...MINT, tokenId: "1" },
    }),
  ]);
  assert.equal(normalizeProjects(once)[0], once[0]);
  assert.deepEqual(normalizeProjects(JSON.parse(JSON.stringify(once))), once);
});
