// C7c — the Brief's success step (COM-21, COM-56, COR-105). The copy helpers are pure (compiled by
// A1's tsconfig); the wiring checks read the component sources.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { liveSubline, pendingCardLine, pendingSubline } from "../../.tmp-test/lib/brief/success-copy.js";

const read = (name) => readFileSync(new URL(`../../src/components/brief/${name}`, import.meta.url), "utf8");
const CLAIMS = /Innovations|claim it|is up\b/i;

test("no success line claims a post or a claimable drop, for any intent (COM-21)", () => {
  for (const intent of ["sell", "give", "save"]) {
    for (const hasClip of [true, false]) assert.doesNotMatch(liveSubline(intent, hasClip), CLAIMS);
    assert.doesNotMatch(pendingSubline(intent), CLAIMS);
    assert.doesNotMatch(pendingCardLine(intent, "720p"), CLAIMS);
  }
  assert.equal(liveSubline("give", true), "Your video is final and the drop is open.");
  assert.equal(liveSubline("save", false), "Stored in your library. Pick it up any time.");
  assert.equal(pendingCardLine("save", "480p"), "It is replaced by your 480p 10s video as soon as that finishes.");
});

test("the step keeps none of the old claims (COM-21)", () => {
  const src = read("step-4-success.tsx");
  for (const claim of [
    "Your post is up on Innovations",
    "post it to Innovations",
    "The Innovations post goes up",
    "Your Innovations post goes up",
    "Your community can claim it",
  ]) {
    assert.ok(!src.includes(claim), `still says "${claim}"`);
  }
});

test("Showcase comes from the shared copy, asks can(), and writes the project's flag (COM-56, PPL-1, COR-105)", () => {
  const src = read("step-4-success.tsx");
  assert.match(src, /SUCCESS_SHOWCASE\.action/);
  assert.match(src, /SUCCESS_SHOWCASE\.done/);
  assert.match(src, /can\(\{ kind: "local-owner" \}, "project\.showcase"/);
  assert.match(src, /setShowcase\(project\.id, next\)/);
  assert.doesNotMatch(src, /shareToNewsfeed/, "Showcase is read from showcasedAt, never from the Brief's tick");
});

test("the Brief hands the success step the project it minted", () => {
  assert.match(read("brief-app.tsx"), /projectId=\{scopeProjectId\}/);
});

test("the mint showcases at the mint time itself: one clock read for mintedAt and showcasedAt (COR-105)", () => {
  const src = read("brief-app.tsx");
  const commit = src.slice(src.indexOf("const commit = () => {"), src.indexOf("const goNext = () => {"));
  assert.ok(commit.length > 0, "commit() not found");
  assert.equal(commit.match(/Date\.now\(\)/g)?.length, 1, "commit() reads the clock once");
  assert.match(commit, /const at = Date\.now\(\);/);
  assert.match(commit, /setShowcase\(scopeProjectId, true, at\)/);
  assert.match(commit, /mintedAt: at\b/);
  // The store writes the time it is handed; a press with none is stamped now.
  const store = readFileSync(new URL("../../src/lib/manual/projects.tsx", import.meta.url), "utf8");
  assert.match(store, /\(id: string, on: boolean, at\?: number\) =>\s*updateProject\(id, \{ showcasedAt: on \? \(at \?\? Date\.now\(\)\) : null \}\)/);
});
