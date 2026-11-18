// The phone's project page (mobile Figma "Project Details · 2026 update"): its four tabs, where
// a web address goes on the phone, the Bottom action bar's two states, the delete sheet's ways
// out, Review version's change lines and the Products tab's search and sort.
import { test } from "node:test";
import assert from "node:assert/strict";

const p = await import("../../.tmp-test/lib/manual/phone-project.js");

test("the tabs: Overview by default, an unknown or web-only tab reads as the Overview", () => {
  assert.deepEqual(p.PHONE_TABS.map((t) => t.label), ["Overview", "Products", "Media", "Activity"]);
  assert.equal(p.parsePhoneTab(null), "overview");
  assert.equal(p.parsePhoneTab("media"), "media");
  assert.equal(p.parsePhoneTab("contributors"), "overview");
  assert.equal(p.phoneProjectHref("p 1"), "/m/projects/p%201");
  assert.equal(p.phoneProjectHref("p1", "activity"), "/m/projects/p1?tab=activity");
});

test("a web address opens its phone screen, or nothing", () => {
  assert.equal(p.phoneHrefOf("/projects/p1/earn/sell?list=1"), "/m/projects/p1/earn/sell?list=1");
  assert.equal(p.phoneHrefOf("/projects/p1/earn/money#splits"), "/m/projects/p1/earn/money#splits");
  assert.equal(p.phoneHrefOf("/build/b9", "p1"), "/m/projects/p1/review?build=b9");
  assert.equal(p.phoneHrefOf("/build/b9"), null);
  assert.equal(p.phoneHrefOf("/chat/c3"), "/m/ai/chat/c3");
  assert.equal(p.phoneHrefOf("/innovations"), null);
});

test("the bar: Publish + Earn while Publish has options, else Earn alone with its fact", () => {
  assert.deepEqual(p.phoneBarOf({ publishOptions: ["save", "give", "sell"], earn: { sub: null }, reviewPending: false }), {
    kind: "pair",
    publishPrimary: true,
    earnFact: null,
  });
  assert.equal(p.phoneBarOf({ publishOptions: ["sell"], earn: { sub: "2 of 6 ready to sell" }, reviewPending: true }).publishPrimary, false);
  assert.deepEqual(p.phoneBarOf({ publishOptions: null, earn: { sub: "Listed" }, reviewPending: false }), { kind: "earn", fact: "Listed" });
  assert.equal(p.phoneBarOf({ publishOptions: null, earn: null, reviewPending: false }), null);
  assert.match(p.publishLineOf("draft"), /mints it to your name/);
  assert.match(p.publishLineOf("private"), /minted and private/);
});

test("a blocked delete points where to fix it, when the phone can open it", () => {
  assert.deepEqual(p.deleteFixOf({ id: "listed" }), { label: "Go to Earn › Sell", place: "sell" });
  assert.deepEqual(p.deleteFixOf({ id: "auction" }), { label: "Go to Earn › Sell", place: "sell" });
  assert.deepEqual(p.deleteFixOf({ id: "otherOwners" }), { label: "Open Splits", place: "splits" });
  assert.equal(p.deleteFixOf({ id: "sold" }), null);
  assert.equal(p.deleteFixOf({ id: "marketUnreadable" }), null);
});

test("Review version: new, changed, the same, then dropped", () => {
  const lines = p.changeLinesOf({
    version: 2,
    added: ["Watering Hub"],
    updated: ["Moisture Probe"],
    dropped: ["Soil Sensor Stake"],
    products: ["Moisture Probe", "Watering Hub", "Pump Controller"],
    pieces: { "Watering Hub": 8 },
  });
  assert.deepEqual(
    lines.map((l) => [l.name, l.line]),
    [
      ["Watering Hub", "New in version 2 · 8 pieces"],
      ["Moisture Probe", "Changed in version 2"],
      ["Pump Controller", "Same as version 1"],
      ["Soil Sensor Stake", "Not in version 2 · it stays in version 1"],
    ],
  );
});

test("the Products tab's search and sort", () => {
  const rows = [
    { name: "Pump Controller", description: "waters the pot" },
    { name: "moisture probe", description: "reads the soil" },
    { name: "Hub" },
  ];
  assert.deepEqual(p.filterProductRows(rows, "", "name").map((r) => r.name), ["Hub", "moisture probe", "Pump Controller"]);
  assert.deepEqual(p.filterProductRows(rows, "SOIL", "project").map((r) => r.name), ["moisture probe"]);
  assert.deepEqual(p.filterProductRows(rows, "", "project").map((r) => r.name), ["Pump Controller", "moisture probe", "Hub"]);
  assert.equal(p.PRODUCT_TOOLS_FROM, 6);
  assert.equal(p.readyOfLine(1, 3), "1 of 3 ready");
});

test("someone else's project: the Feed's sample ids open read-only, anything else is not found", () => {
  const post = p.sampleProjectOf("p1");
  assert.ok(post);
  assert.equal(post.source, "sample");
  assert.ok(post.products.length > 0);
  assert.equal(p.sampleProjectOf(post.slug)?.id, post.id);
  assert.equal(p.sampleProjectOf("proj_mine_404"), null);
  assert.deepEqual(p.VIEWER_TABS.map((t) => t.id), ["overview", "products", "media"]);
  assert.equal(p.parseViewerTab("marketplace"), "overview");
  assert.equal(p.parseViewerTab("activity"), "overview");
  assert.equal(p.parseViewerTab("media"), "media");
});

test("the web's Team, Network and Versions tabs open their phone screens", () => {
  assert.equal(p.phoneSubScreenOf("team"), "team");
  assert.equal(p.phoneSubScreenOf("contributors"), "team");
  assert.equal(p.phoneSubScreenOf("network"), "network");
  assert.equal(p.phoneSubScreenOf("versions"), "versions");
  assert.equal(p.phoneSubScreenOf("media"), null);
  assert.equal(p.phoneSubScreenOf(null), null);
});

test("the phone says Feed where the web says Innovations; roles in plain words", () => {
  assert.equal(p.phoneWords("Shared to Innovations"), "Shared to Feed");
  assert.equal(p.phoneWords("Show it on the Innovations page"), "Show it on Feed");
  assert.equal(p.phoneWords("Listed · Buy now"), "Listed · Buy now");
  assert.equal(p.PHONE_ROLE_LABEL.Master, "Leads");
  assert.equal(p.PHONE_ROLE_LABEL.Slave, "Follows");
  assert.equal(p.PHONE_ROLE_LABEL.Peer, "Works as an equal");
  for (const label of Object.values(p.PHONE_ROLE_LABEL)) assert.doesNotMatch(label, /master|slave/i);
});

test("the Products tab's sort from the address", () => {
  assert.equal(p.parseProductSort("name"), "name");
  assert.equal(p.parseProductSort("project"), "project");
  assert.equal(p.parseProductSort("zzz"), "project");
  assert.equal(p.parseProductSort(null), "project");
});
