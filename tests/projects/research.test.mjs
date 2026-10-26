// Usability testing (owner, 2026-10-26): the app's own link is shared, and every browser that
// opens it is a tester with a code of its own. Recording is on from the first visit (owner: a small
// notice, on by default); the notice offers Turn off and an optional "what describes you best".
// Pages, clicks and the journey's milestones go to PostHog and Clarity.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  readTesterLink,
  normalizeTester,
  newCode,
  arrive,
  withBaseline,
  withPersona,
  withNoticed,
  turnedOff,
  withSent,
  showsNotice,
  isTracking,
  isLocalHost,
  PERSONAS,
} = await import("../../.tmp-test/lib/research/tester.js");
const { JOURNEY, journeyFacts, newMilestones } = await import("../../.tmp-test/lib/research/journey.js");
const { tourEvents, journeyEvent, apiRouteOf, callProblem, apiEvent, SLOW_MS, isTourNoise } = await import(
  "../../.tmp-test/lib/research/events.js"
);

/** A fixed sequence standing in for Math.random. */
const rng = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test("a browser's code: B- and five letters or digits that can't be misread", () => {
  assert.equal(newCode(rng(0)), "B-22222");
  assert.equal(newCode(rng(0.999)), "B-ZZZZZ");
  const code = newCode(Math.random);
  assert.match(code, /^B-[2-9A-HJ-NP-Z]{5}$/);
});

test("the first visit makes a record that is on, with the notice still to show", () => {
  const rec = arrive(null, null, 10, rng(0));
  assert.deepEqual(rec, { code: "B-22222", persona: null, consent: "yes", noticed: false, baseline: false, at: 10, sent: [] });
  assert.equal(isTracking(rec), true);
  assert.equal(showsNotice(rec), true);
  assert.equal(arrive(rec, null, 20, rng(0.5)), rec, "later visits keep the same code");
});

test("a link still names a tester (a moderated session); the same code keeps its record", () => {
  assert.deepEqual(readTesterLink("?tester=T07"), { code: "T07", persona: null });
  assert.deepEqual(readTesterLink("?tester=T07&persona=Maker"), { code: "T07", persona: "maker" });
  assert.equal(readTesterLink(""), null);
  assert.equal(readTesterLink("?foo=1"), null);

  const browser = arrive(null, null, 1, rng(0));
  const named = arrive(browser, { code: "T07", persona: "maker" }, 2, rng(0));
  assert.deepEqual(named, { code: "T07", persona: "maker", consent: "yes", noticed: false, baseline: false, at: 2, sent: [] });
  assert.equal(arrive(named, { code: "T07", persona: null }, 3, rng(0)), named);
  assert.equal(arrive(named, { code: "T07", persona: "designer" }, 3, rng(0)).persona, "designer");
});

test("a code that isn't a short plain word is ignored, not stored", () => {
  assert.equal(readTesterLink("?tester="), null);
  assert.equal(readTesterLink("?tester=<script>"), null);
  assert.equal(readTesterLink(`?tester=${"x".repeat(33)}`), null);
  assert.deepEqual(readTesterLink("?tester=T07&persona=a b"), { code: "T07", persona: null });
});

test("nothing is tracked on a developer's own machine (owner: no need to run it locally)", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0", "app.localhost", "mac.local", "192.168.1.20", "10.0.0.5", "172.20.1.1"]) {
    assert.equal(isLocalHost(host), true, host);
  }
  for (const host of ["ideeza-creator.vercel.app", "ideeza.com", "172.32.0.1", "11.0.0.1"]) {
    assert.equal(isLocalHost(host), false, host);
  }
});

test("Turn off, or ?tester=off, keeps the browser off on later visits", () => {
  const rec = arrive(null, null, 1, rng(0));
  const off = turnedOff(rec);
  assert.equal(isTracking(off), false);
  assert.equal(showsNotice(off), false);
  assert.equal(arrive(off, null, 2, rng(0)), off);

  assert.equal(readTesterLink("?tester=off"), "off");
  assert.equal(readTesterLink("?tester=OFF"), "off");
  const viaLink = arrive(null, "off", 3, rng(0));
  assert.equal(isTracking(viaLink), false);
  assert.equal(arrive(viaLink, null, 4, rng(0)), viaLink);
  assert.equal(isTracking(arrive(rec, "off", 5, rng(0))), false);
});

test("Got it or a persona answers the notice; a persona is one of four words", () => {
  const rec = arrive(null, null, 1, rng(0));
  assert.equal(showsNotice(withNoticed(rec)), false);
  const maker = withPersona(rec, "maker");
  assert.equal(maker.persona, "maker");
  assert.equal(showsNotice(maker), false);
  assert.equal(isTracking(maker), true);
  assert.deepEqual(PERSONAS.map((p) => p.id), ["maker", "designer", "engineer", "idea"]);
  assert.equal(withPersona(rec, "pirate").persona, null);
});

test("the starting point: what this browser had already done isn't reported as new", () => {
  const rec = arrive(null, null, 1, rng(0));
  const based = withBaseline(rec, ["idea_sent", "project_saved"]);
  assert.equal(based.baseline, true);
  assert.deepEqual(based.sent, ["idea_sent", "project_saved"]);
});

test("a stored record is read back only when it is whole", () => {
  const rec = { code: "B-7F3K2", persona: null, consent: "yes", noticed: true, baseline: true, at: 5, sent: ["idea_sent", "nope"] };
  assert.deepEqual(normalizeTester(rec), { ...rec, sent: ["idea_sent"] });
  assert.equal(normalizeTester(null), null);
  assert.equal(normalizeTester({ code: "T07" }), null);
  assert.equal(normalizeTester({ ...rec, consent: "maybe" }), null);
  assert.equal(normalizeTester({ ...rec, code: "<b>" }), null);
  // The first build's records (consent asked / yes / no, no notice or starting point).
  const old = normalizeTester({ code: "CHECK01", persona: "internal", consent: "asked", at: 5, sent: [] });
  assert.equal(old.consent, "yes");
  assert.equal(old.noticed, false);
  assert.equal(old.baseline, false);
});

test("withSent adds milestones once", () => {
  const rec = withBaseline(arrive(null, null, 1, rng(0)), []);
  const next = withSent(rec, ["idea_sent", "concept_ready"]);
  assert.deepEqual(next.sent, ["idea_sent", "concept_ready"]);
  assert.deepEqual(withSent(next, ["idea_sent"]).sent, ["idea_sent", "concept_ready"]);
});

const chat = (...turns) => ({ turns });

test("journey facts come from any chat, build and project", () => {
  const none = journeyFacts({ chats: [], builds: [], projects: [] });
  assert.ok(JOURNEY.every((id) => none[id] === false));

  const f = journeyFacts({
    chats: [
      chat({ role: "user" }, { role: "setup", status: "asking" }),
      chat({ role: "user" }, { role: "setup", status: "answered" }, { role: "assistant", status: "ready" }),
    ],
    builds: [{}],
    projects: [{ editorOpened: { p1: {} }, mint: { at: 1 }, showcasedAt: 9 }],
  });
  assert.ok(JOURNEY.every((id) => f[id] === true));
});

test("a chat that asked no question counts as answered once it draws", () => {
  const f = journeyFacts({ chats: [chat({ role: "user" }, { role: "assistant", status: "pending" })], builds: [], projects: [] });
  assert.equal(f.question_answered, true);
  assert.equal(f.concept_ready, false);
});

test("a project with nothing opened, minted or shared is only saved", () => {
  const f = journeyFacts({ chats: [], builds: [], projects: [{ editorOpened: {}, showcasedAt: null }] });
  assert.equal(f.project_saved, true);
  assert.equal(f.editor_opened, false);
  assert.equal(f.minted, false);
  assert.equal(f.shared, false);
});

test("new milestones are the true ones not sent yet, in journey order", () => {
  const facts = journeyFacts({ chats: [chat({ role: "setup", status: "answered" })], builds: [{}], projects: [] });
  assert.deepEqual(newMilestones(facts, []), ["idea_sent", "question_answered", "build_started"]);
  assert.deepEqual(newMilestones(facts, ["idea_sent", "build_started"]), ["question_answered"]);
});

test("a milestone event names the step and its place on the path", () => {
  assert.deepEqual(journeyEvent("concept_ready"), {
    name: "journey_concept_ready",
    props: { step: 3, of: JOURNEY.length },
    clarity: "journey_concept_ready",
  });
});

const tour = (over = {}) => ({
  v: 1,
  welcome: "unseen",
  chapters: {},
  offers: true,
  offered: [],
  snoozed: [],
  pointed: false,
  arrival: false,
  guide: "off",
  ...over,
});

test("tour events: the Welcome's answer and the first-product guide's state", () => {
  const before = tour();
  const after = tour({ welcome: "started", guide: "open" });
  assert.deepEqual(tourEvents(before, after), [
    { name: "tour_welcome", props: { choice: "started" }, clarity: "tour_welcome_started" },
    { name: "tour_guide", props: { state: "open" }, clarity: "tour_guide_open" },
  ]);
  assert.deepEqual(tourEvents(null, tour({ welcome: "later" })).map((e) => e.clarity), ["tour_welcome_later"]);
});

test("tour events: nothing on the first read, nothing when nothing changed", () => {
  assert.deepEqual(tourEvents(undefined, tour({ welcome: "started" })), []);
  const same = tour({ welcome: "started", guide: "small" });
  assert.deepEqual(tourEvents(same, { ...same }), []);
  assert.deepEqual(tourEvents(null, tour()), []);
});

test("tour events: the overview chapters are not reported (owner: not needed there)", () => {
  const a = tour({ chapters: { tour: { state: "paused", step: 1 } } });
  const b = tour({ chapters: { tour: { state: "skipped", step: 4 }, start: { state: "done", step: 3 } } });
  assert.deepEqual(tourEvents(a, b), []);
});

test("while a tour plays, PostHog's pages, clicks and replay are dropped; errors and our events go", () => {
  for (const e of ["$pageview", "$pageleave", "$autocapture", "$rageclick", "$dead_click", "$$heatmap", "$snapshot"]) {
    assert.equal(isTourNoise(e), true, e);
  }
  for (const e of ["$exception", "$identify", "$set", "tour_welcome", "journey_idea_sent", "api_problem"]) {
    assert.equal(isTourNoise(e), false, e);
  }
});

test("only this app's /api calls are watched, ids folded", () => {
  const origin = "https://ideeza-creator.vercel.app";
  assert.equal(apiRouteOf("/api/ai-chat", origin), "/api/ai-chat");
  assert.equal(apiRouteOf(`${origin}/api/concept/generate?x=1`, origin), "/api/concept/generate");
  assert.equal(apiRouteOf("/api/build/b_1730000000/retry", origin), "/api/build/:id/retry");
  assert.equal(apiRouteOf("/api/concept/image/9f2c", origin), "/api/concept/image/:id");
  assert.equal(apiRouteOf("/ixp/e/", origin), null);
  assert.equal(apiRouteOf("https://text.pollinations.ai/openai", origin), null);
  assert.equal(apiRouteOf("/_next/static/chunk.js", origin), null);
});

test("a call is a problem when it fails or is slow", () => {
  assert.equal(callProblem(200, 300), null);
  assert.equal(callProblem(200, SLOW_MS), "slow");
  assert.equal(callProblem(429, 50), "failed");
  assert.equal(callProblem(null, 50), "failed");
  assert.deepEqual(apiEvent("/api/ai-chat", "slow", 18234.6, 200), {
    name: "api_problem",
    props: { route: "/api/ai-chat", problem: "slow", ms: 18235, status: 200 },
    clarity: "api_slow",
  });
  assert.equal(apiEvent("/api/ai-chat", "failed", 10, null).props.status, 0);
});
