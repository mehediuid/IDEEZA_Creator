// The creator profile's people layer (spec 2026-10-14-creator-profile-design.md): one person id,
// the directory of known people and their handles, initials that never split a letter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ME, canonicalId, initialsOf, displayNameOf, directory, personByHandle, personById, profileHref } from "../../.tmp-test/lib/people/ids.js";

test("canonicalId maps Innovations ids onto the Messages scheme", () => {
  assert.equal(canonicalId("you", "innovations"), ME);
  assert.equal(canonicalId("c3", "innovations"), "feed:c3");
  assert.equal(canonicalId("k2", "innovations"), "feed:k2");
  assert.equal(canonicalId("buyer-mira", "messages"), "buyer-mira");
  assert.equal(canonicalId("me", "messages"), ME);
});

test("initialsOf prefers the English-letters name and never splits a Bengali letter", () => {
  assert.equal(initialsOf("নাঈম রহমান", "Naim Rahman"), "NR");
  assert.equal(initialsOf("নাঈম রহমান", null), "নার");
  assert.equal(initialsOf("Mira"), "M");
  assert.equal(initialsOf("Mira (demo creator)"), "M");
  assert.equal(initialsOf("  "), "?");
});

test("displayNameOf falls back to You", () => {
  assert.equal(displayNameOf("  Rafiq Ahmed "), "Rafiq Ahmed");
  assert.equal(displayNameOf("   "), "You");
});

test("directory lists you first, then every sample person with a unique handle", () => {
  const dir = directory({ name: "", latinName: "" });
  assert.equal(dir[0].id, ME);
  assert.equal(dir[0].handle, "me");
  assert.equal(dir[0].name, "You");
  assert.equal(dir[0].kind, "me");
  const handles = dir.map((p) => p.handle);
  assert.equal(new Set(handles).size, handles.length);
  const naim = personByHandle(dir, "naim-rahman");
  assert.equal(naim?.id, "feed:c1");
  assert.equal(naim?.kind, "feed");
  assert.equal(naim?.color, "var(--color-violet-600)");
  assert.equal(personByHandle(dir, "mira")?.id, "buyer-mira");
  assert.equal(personByHandle(dir, "mira")?.kind, "demo");
  assert.equal(personById(dir, "feed:k1")?.name, "Kai Moreno");
  assert.equal(personByHandle(dir, "nobody"), null);
  assert.equal(profileHref(naim), "/creators/naim-rahman");
});

test("your entry carries your names", () => {
  const me = directory({ name: "রফিক আহমেদ", latinName: "Rafiq Ahmed" })[0];
  assert.equal(me.name, "রফিক আহমেদ");
  assert.equal(me.latinName, "Rafiq Ahmed");
  assert.equal(me.initials, "RA");
  const plain = directory({ name: "Rafiq Ahmed", latinName: "Rafiq Ahmed" })[0];
  assert.equal(plain.latinName, null);
});

// ── profile fields ──
import { EMPTY_PROFILE, normalizeProfile, pinToggled, PINS_MAX } from "../../.tmp-test/lib/people/fields.js";

test("normalizeProfile clips, dedupes and repairs", () => {
  const f = normalizeProfile({ v: 1, name: "x".repeat(80), latinName: 3, headline: "  Lamps  ", pins: ["a", "a", 1, "b", "c", "d"], since: "x" });
  assert.equal(f.name.length, 60);
  assert.equal(f.latinName, "");
  assert.equal(f.headline, "Lamps");
  assert.deepEqual(f.pins, ["a", "b", "c"]);
  assert.equal(f.since, null);
  assert.deepEqual(normalizeProfile(null), EMPTY_PROFILE);
  assert.deepEqual(normalizeProfile([1, 2]), EMPTY_PROFILE);
  assert.equal(normalizeProfile({ since: 1700000000000 }).since, 1700000000000);
});

test("pinToggled adds, removes and refuses a fourth", () => {
  let f = { ...EMPTY_PROFILE, pins: ["a", "b"] };
  f = pinToggled(f, "c").fields;
  assert.deepEqual(f.pins, ["a", "b", "c"]);
  const r = pinToggled(f, "d");
  assert.equal(r.refused, true);
  assert.equal(r.fields.pins.length, PINS_MAX);
  const off = pinToggled(f, "b");
  assert.equal(off.refused, false);
  assert.deepEqual(off.fields.pins, ["a", "c"]);
});

// ── the Made list ──
import { madeOfMine, madeOfSample, ownerCounts } from "../../.tmp-test/lib/people/made.js";
import { SAMPLE_POSTS } from "../../.tmp-test/lib/innovations/sample-posts.js";
import { mineSlugOf } from "../../.tmp-test/lib/innovations/slug.js";

const J0 = { v: 1, activities: [] };
const jTesting = (id, at) => ({
  v: 1,
  activities: [{ v: 2, id: "a1", projectId: id, target: { kind: "project" }, type: "testing", description: "", urls: [], media: [], createdAt: at, updatedAt: at }],
});
const P = (o) => ({ cover: null, mainLive: false, copiesLive: false, journey: J0, listedAt: null, showcasedAt: null, createdAt: 1, ...o });

test("madeOfMine shows only shared or live-listed projects, never private ones", () => {
  const list = madeOfMine(
    [
      P({ id: "p1", name: "Smart Lamp", showcasedAt: 50, journey: jTesting("p1", 60) }),
      P({ id: "p2", name: "Pump Timer", mainLive: true, listedAt: 40 }),
      P({ id: "p3", name: "Secret Thing" }),
      P({ id: "p4", name: "Fan", copiesLive: true, listedAt: 10 }),
    ],
    [],
  );
  assert.deepEqual(list.map((m) => m.title), ["Smart Lamp", "Pump Timer", "Fan"]);
  assert.equal(list[0].href, `/innovations/${mineSlugOf({ id: "p1", name: "Smart Lamp" })}`);
  assert.equal(list[0].stage, "Testing");
  assert.equal(list[0].stageAt, 60);
  assert.equal(list[0].sale, null);
  assert.equal(list[1].href, "/marketplace/p2");
  assert.equal(list[1].sale, "whole");
  assert.equal(list[1].stage, "Planning");
  assert.equal(list[2].sale, "copies");
  assert.ok(!list.some((m) => m.title === "Secret Thing"));
});

test("a project shared and on sale opens its post and says For sale", () => {
  const [m] = madeOfMine([P({ id: "p1", name: "Lamp", showcasedAt: 5, mainLive: true, copiesLive: true, listedAt: 6 })], []);
  assert.ok(m.href.startsWith("/innovations/"));
  assert.equal(m.sale, "whole");
  assert.equal(m.changedAt, 6);
});

test("pins come first, in pin order; a pin that isn't public is ignored", () => {
  const list = madeOfMine(
    [P({ id: "p1", name: "A", showcasedAt: 90 }), P({ id: "p2", name: "B", showcasedAt: 10 }), P({ id: "p3", name: "C", showcasedAt: 50 })],
    ["p3", "p9", "p2"],
  );
  assert.deepEqual(list.map((m) => [m.title, m.pinned]), [["C", true], ["B", true], ["A", false]]);
});

test("ownerCounts names what others see and what stays private", () => {
  const made = madeOfMine([P({ id: "p1", name: "A", showcasedAt: 1 })], []);
  assert.deepEqual(ownerCounts([{ id: "p1" }, { id: "p2" }, { id: "p3" }], made), { shown: 1, hidden: 2 });
});

test("madeOfSample lists one creator's posts with their stage", () => {
  const list = madeOfSample(SAMPLE_POSTS, "c1");
  const theirs = SAMPLE_POSTS.filter((p) => p.creator.id === "c1");
  assert.equal(list.length, theirs.length);
  assert.ok(list.length > 0);
  assert.ok(list.every((m) => m.href.startsWith("/innovations/")));
  assert.ok(list.every((m) => typeof m.stage === "string" && m.stage.length > 0));
  assert.deepEqual(madeOfSample(SAMPLE_POSTS, "nobody"), []);
});

test("Made items carry what the Portfolio shows: stage id, products, summary, category", () => {
  const [mine] = madeOfMine([P({ id: "p1", name: "Lamp", showcasedAt: 5, journey: jTesting("p1", 6), products: 2, summary: "  A lamp. ", category: null })], []);
  assert.equal(mine.stageId, "testing");
  assert.equal(mine.products, 2);
  assert.equal(mine.summary, "A lamp.");
  assert.equal(mine.category, null);
  const [bare] = madeOfMine([P({ id: "p2", name: "Fan", showcasedAt: 5 })], []);
  assert.equal(bare.products, 0);
  assert.equal(bare.summary, "");
  const theirs = SAMPLE_POSTS.filter((p) => p.creator.id === "c1");
  const list = madeOfSample(SAMPLE_POSTS, "c1");
  for (const m of list) {
    const post = theirs.find((p) => p.id === m.key);
    assert.equal(m.products, post.products.length);
    assert.equal(m.category, post.category);
    assert.ok(m.summary.length > 0);
    assert.ok(typeof m.stageId === "string");
  }
});

test("madeOfSample dates Activity from now when given, as the post page does", () => {
  const now = Date.UTC(2026, 9, 14);
  const a = madeOfSample(SAMPLE_POSTS, "c1", now);
  const b = madeOfSample(SAMPLE_POSTS, "c1", now + 86_400_000);
  assert.equal(a.length, b.length);
  assert.ok(a.some((m, i) => m.stageAt !== b[i].stageAt || m.changedAt !== b[i].changedAt));
});

test("every sample creator with posts has profile words, and their zones are real", async () => {
  const { SAMPLE_PROFILES } = await import("../../.tmp-test/lib/people/sample-profiles.js");
  const { localTimeOf } = await import("../../.tmp-test/lib/people/portfolio.js");
  const creators = new Set(SAMPLE_POSTS.map((p) => p.creator.id));
  for (const id of creators) {
    const sp = SAMPLE_PROFILES[id];
    assert.ok(sp, `profile words for ${id}`);
    assert.ok(sp.headline.length <= 60, `${id} headline fits`);
    assert.ok(sp.bio.length <= 280, `${id} bio fits`);
    assert.ok(localTimeOf(sp.timeZone, 0), `${id} zone`);
  }
});

// ── listing facts ──
import { listingFactsOf } from "../../.tmp-test/lib/people/listing-facts.js";

const L = (o) => ({ id: "l1", projectId: "p1", slot: "main", status: "live", listedAt: 10, ...o });
const T = (o) => ({ id: "t1", projectId: "p1", productId: "project", kind: "virtual", use: "private", supply: { total: 5 }, createdAt: 1, lazy: true, listing: { listedAt: 20 }, ...o });

test("listingFactsOf reads only the newest Main listing and live copies", () => {
  assert.deepEqual(listingFactsOf("p1", [L()], [], []), { mainLive: true, copiesLive: false, listedAt: 10 });
  assert.equal(listingFactsOf("p1", [L({ status: "paused" })], [], []).mainLive, false);
  assert.equal(listingFactsOf("p1", [L({ id: "old", listedAt: 1 }), L({ id: "new", listedAt: 5, status: "removed" })], [], []).mainLive, false);
  assert.equal(listingFactsOf("p1", [L()], [{ listingId: "l1", item: { nft: "main" } }], []).mainLive, false);
  assert.deepEqual(listingFactsOf("p1", [], [], [T()]), { mainLive: false, copiesLive: true, listedAt: 20 });
  assert.equal(listingFactsOf("p1", [], [], [T({ listing: null })]).copiesLive, false);
  assert.equal(listingFactsOf("p2", [L()], [], [T()]).mainLive, false);
});

// ── the headline suggestion ──
import { headlinePrompt, cleanHeadline } from "../../.tmp-test/lib/people/headline.js";

test("headlinePrompt needs a shared project and clips its inputs", () => {
  assert.equal(headlinePrompt([]), null);
  assert.equal(headlinePrompt([{ title: "  ", story: "" }]), null);
  const p = headlinePrompt([{ title: "Smart Lamp", story: "x".repeat(900) }]);
  assert.ok(p.includes("Smart Lamp"));
  assert.ok(p.length < 700);
  const many = headlinePrompt(Array.from({ length: 9 }, (_, i) => ({ title: `Thing ${i}`, story: "" })));
  assert.ok(many.includes("Thing 5"));
  assert.ok(!many.includes("Thing 6"));
});

test("cleanHeadline returns one plain line of at most 60 characters", () => {
  assert.equal(cleanHeadline('"Headline: Desk lamps and plant sensors."'), "Desk lamps and plant sensors");
  assert.equal(cleanHeadline("**Builds solar soil sensors**\nfor farms"), "Builds solar soil sensors");
  assert.equal(cleanHeadline('{"a":1}'), null);
  assert.equal(cleanHeadline("   "), null);
  assert.equal(cleanHeadline("Rate limit reached, please try again later"), null);
  const long = cleanHeadline("Builds tiny solar powered soil moisture sensors and pump timers for small family farms in Bangladesh");
  assert.ok(long.length <= 60);
  assert.ok(!long.endsWith(" "));
  assert.ok("Builds tiny solar powered soil moisture sensors and pump timers".startsWith(long));
});

// ── ties ──
import { tiesOf } from "../../.tmp-test/lib/people/ties.js";

const CTX = (o = {}) => ({ projects: [{ id: "p1", name: "Smart Lamp" }, { id: "p2", name: "Desk Fan" }], sales: [], teams: [], ...o });
const COPY = (o) => ({ projectId: "p1", buyerId: "buyer-leo", at: 5, item: { nft: "physical", productId: "project", productName: "Smart Lamp" }, ...o });

test("tiesOf says how someone is connected to you, in verbs, from your side", () => {
  assert.equal(tiesOf("buyer-leo", CTX()), null);
  assert.equal(tiesOf("buyer-leo", CTX({ sales: [COPY()] })), "Owns a Physical copy of your Smart Lamp");
  assert.equal(
    tiesOf("buyer-leo", CTX({ sales: [COPY({ item: { nft: "virtual", productId: "b1", productName: "Lamp Base" } })] })),
    "Owns a Virtual copy of your Lamp Base",
  );
  assert.equal(tiesOf("buyer-leo", CTX({ sales: [COPY(), COPY({ at: 6 })] })), "Owns 2 copies from your Smart Lamp");
  assert.equal(tiesOf("buyer-mira", CTX({ sales: [{ projectId: "p2", buyerId: "buyer-mira", at: 9, item: { nft: "main", sharePct: 10 } }] })), "Holds 10% of your Desk Fan");
  assert.equal(tiesOf("ctb_1", CTX({ teams: [{ projectId: "p1", members: [{ id: "ctb_1", role: "Editor" }] }] })), "Editor on your Smart Lamp");
});

test("the most recent tie wins, and someone else's sales never show", () => {
  const ctx = CTX({ sales: [COPY({ at: 1 }), { projectId: "p2", buyerId: "buyer-leo", at: 9, item: { nft: "main", sharePct: 5 } }, COPY({ buyerId: "buyer-sam", at: 99 })] });
  assert.equal(tiesOf("buyer-leo", ctx), "Holds 5% of your Desk Fan");
  assert.equal(tiesOf("buyer-leo", CTX({ sales: [COPY({ projectId: "gone" })] })), null);
});

// ── profile reports ──
import { REPORT_REASONS, normalizeReports, withReport } from "../../.tmp-test/lib/people/reports.js";

test("profile reports keep only well-formed records and clip the note", () => {
  assert.equal(REPORT_REASONS[0].label, "Pretending to be someone else");
  assert.deepEqual(normalizeReports("x"), []);
  const list = normalizeReports([{ id: "r1", by: "me", who: "feed:c1", reason: "scam", note: "n".repeat(900), at: 1 }, { id: "r2", by: "me", who: "x", reason: "bogus", at: 2 }, null]);
  assert.equal(list.length, 1);
  assert.equal(list[0].note.length, 500);
  const next = withReport(list, { id: "r3", by: "me", who: "buyer-leo", reason: "spam", note: "  hi  ", at: 3 });
  assert.equal(next.length, 2);
  assert.equal(next[1].note, "hi");
});

import { profileHrefOf } from "../../.tmp-test/lib/people/ids.js";

test("profileHrefOf links you, sample people and demo creators, and nobody else", () => {
  assert.equal(profileHrefOf("me"), "/creators/me");
  assert.equal(profileHrefOf("you", "innovations"), "/creators/me");
  assert.equal(profileHrefOf("c1", "innovations"), "/creators/naim-rahman");
  assert.equal(profileHrefOf("feed:k1"), "/creators/kai-moreno");
  assert.equal(profileHrefOf("buyer-sam"), "/creators/sam");
  assert.equal(profileHrefOf("ctb_abc"), null);
});

test("a stale pin (unshared or deleted project) never holds one of the three places", () => {
  const f = { ...EMPTY_PROFILE, pins: ["gone", "a", "b"] };
  const r = pinToggled(f, "c", ["a", "b", "c"]);
  assert.equal(r.refused, false);
  assert.deepEqual(r.fields.pins, ["a", "b", "c"]);
});

// ── Portfolio (owner picked direction A, 2026-10-14) ──
import { BIO_MAX, OPEN_TO_WORDS, linkOf, normalizeProfile as normalizeProfile2 } from "../../.tmp-test/lib/people/fields.js";
import { builtWithOf, stageToneOf, inProduction, activityOf, localTimeOf } from "../../.tmp-test/lib/people/portfolio.js";

test("profile fields keep About, location, time zone, two links and Open to", () => {
  const f = normalizeProfile2({ bio: "b".repeat(400), location: "  Dhaka, Bangladesh ", timeZone: "Asia/Dhaka", links: ["naim.dev", "javascript:alert(1)", "https://github.com/naim", "x.org"], openTo: "both" });
  assert.equal(f.bio.length, BIO_MAX);
  assert.equal(f.location, "Dhaka, Bangladesh");
  assert.equal(f.timeZone, "Asia/Dhaka");
  assert.deepEqual(f.links, ["https://naim.dev", "https://github.com/naim"]);
  assert.equal(f.openTo, "both");
  assert.equal(normalizeProfile2({ openTo: "weird", timeZone: "Not/AZone" }).openTo, "");
  assert.equal(normalizeProfile2({ timeZone: "Not/AZone" }).timeZone, null);
  assert.equal(OPEN_TO_WORDS.both, "Open to collaboration and questions");
});

test("linkOf accepts web addresses only", () => {
  assert.equal(linkOf("naim.dev"), "https://naim.dev");
  assert.equal(linkOf("http://a.io/x"), "http://a.io/x");
  assert.equal(linkOf("ftp://a.io"), null);
  assert.equal(linkOf("not a link"), null);
  assert.equal(linkOf("localhost"), null);
});

test("builtWithOf names the chips and modules a creator uses most, never passives or hardware", () => {
  const list = builtWithOf([
    ["ESP32-C3-MINI-1 module", "BMI270 IMU", "100 nF capacitor, 0402", "USB-C receptacle, 16-pin", "Shell, 3D printed", "TP4056 charger"],
    ["ESP32-C3-MINI-1 module", "M3 × 8 screw", "AP2112K-3.3 regulator", "10 kΩ resistor, 0603"],
    ["MGM210P module (EFR32MG21)", "BMI270 IMU"],
  ]);
  assert.deepEqual(list.slice(0, 2), ["ESP32-C3-MINI-1", "BMI270"]);
  assert.ok(list.includes("TP4056"));
  assert.ok(list.includes("MGM210P"));
  assert.deepEqual(list, ["ESP32-C3-MINI-1", "BMI270", "TP4056", "AP2112K-3.3", "MGM210P"]);
  assert.equal(builtWithOf([["ESP32"], ["ESP32"], ["NRF52840"], ["STM32F103"], ["RP2040"]], 3).length, 3);
});

test("stage tones and production follow the Activity catalogue", () => {
  assert.equal(stageToneOf("planning"), "neutral");
  assert.equal(stageToneOf("testing"), "blue");
  assert.equal(stageToneOf("pilot-run"), "warning");
  assert.equal(stageToneOf("launched"), "success");
  assert.equal(inProduction("manufacturing"), true);
  assert.equal(inProduction("prototype"), false);
});

test("activityOf lists the newest stored entries of shared projects, never the default Planning", () => {
  const j = (id, rows) => ({ v: 1, activities: rows.map(([type, at, d], i) => ({ v: 2, id: `${id}${i}`, projectId: id, target: { kind: "project" }, type, description: d, urls: [], media: [], createdAt: at, updatedAt: at })) });
  const list = activityOf([
    { id: "p1", title: "Lamp", href: "/innovations/lamp", journey: j("p1", [["testing", 30, "Two weeks on the desk."], ["prototype", 10, "First unit."]]) },
    { id: "p2", title: "Fan", href: "/marketplace/p2", journey: j("p2", [["launched", 20, ""]]) },
    { id: "p3", title: "Nothing", href: "/x", journey: { v: 1, activities: [] } },
  ], 2);
  assert.deepEqual(list.map((a) => [a.type, a.project, a.at]), [["Testing", "Lamp", 30], ["Launched", "Fan", 20]]);
  assert.equal(list[0].text, "Two weeks on the desk.");
});

test("localTimeOf reads a time zone, and nothing for a bad one", () => {
  const t = localTimeOf("Asia/Dhaka", Date.UTC(2026, 9, 14, 15, 40));
  assert.equal(t, "9:40 pm");
  assert.equal(localTimeOf(null, 0), null);
  assert.equal(localTimeOf("Not/AZone", 0), null);
});

test("worksOnOf: categories by use, blanks dropped", async () => {
  const { worksOnOf } = await import("../../.tmp-test/lib/people/portfolio.js");
  assert.deepEqual(
    worksOnOf([{ category: "IoT" }, { category: "Power" }, { category: "IoT" }, { category: null }, { category: " " }]),
    ["IoT", "Power"],
  );
});

test("featuredOf: a pin leads; else the furthest along, newer on a tie", async () => {
  const { featuredOf } = await import("../../.tmp-test/lib/people/portfolio.js");
  const a = { key: "a", pinned: false, stageId: "prototype" };
  const b = { key: "b", pinned: false, stageId: "launched" };
  const c = { key: "c", pinned: false, stageId: "launched" };
  const d = { key: "d", pinned: true, stageId: "design" };
  assert.equal(featuredOf([]), null);
  let f = featuredOf([a, b, c]);
  assert.equal(f.featured.key, "b");
  assert.equal(f.pinned, false);
  assert.deepEqual(f.rest.map((m) => m.key), ["a", "c"]);
  f = featuredOf([d, a, b]);
  assert.equal(f.featured.key, "d");
  assert.equal(f.pinned, true);
  assert.deepEqual(f.rest.map((m) => m.key), ["a", "b"]);
  f = featuredOf([{ key: "x", pinned: false, stageId: null }, { key: "y", pinned: false, stageId: "others" }]);
  assert.equal(f.featured.key, "x");
});
