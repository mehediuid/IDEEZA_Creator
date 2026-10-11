// The ladder's license fix (Build and Earn P1-4): the license goes into the Brief draft's
// `state.license`, every other stored field is kept verbatim, and an unreadable draft is never
// overwritten.
import { test } from "node:test";
import assert from "node:assert/strict";

const { draftWithLicense, isLicense } = await import("../../.tmp-test/lib/commerce/license.js");
const { parseBriefDraft } = await import("../../.tmp-test/lib/brief/project-brief.js");

test("isLicense: the Brief's own list only", () => {
  assert.equal(isLicense("mit"), true);
  assert.equal(isLicense("gpl2"), true);
  assert.equal(isLicense("wtfpl"), false);
  assert.equal(isLicense(null), false);
});

test("no draft yet: a fresh draft at its first step, with the license and no intent", () => {
  const next = parseBriefDraft(draftWithLicense(null, "mit"));
  assert.equal(next.state.license, "mit");
  assert.equal(next.state.intent, null);
  assert.equal(next.state.mintedAt, null);
  assert.equal(next.step, "idea");
});

test("an existing draft keeps every other field verbatim, unknown ones included", () => {
  const stored = { state: { intent: "sell", mintedAt: 5, license: null, price: "0.1", future: { a: 1 } }, step: "success", extra: true };
  const out = JSON.parse(draftWithLicense(JSON.stringify(stored), "bsd3"));
  assert.deepEqual(out, { ...stored, state: { ...stored.state, license: "bsd3" } });
});

test("a license already chosen is replaced", () => {
  const out = JSON.parse(draftWithLicense(JSON.stringify({ state: { license: "mit" }, step: "form" }), "gpl2"));
  assert.equal(out.state.license, "gpl2");
});

test("an unreadable draft is never overwritten", () => {
  assert.equal(draftWithLicense("{nope", "mit"), null);
  assert.equal(draftWithLicense(JSON.stringify([1]), "mit"), null);
  assert.equal(draftWithLicense(JSON.stringify({ state: "x" }), "mit"), null);
});
