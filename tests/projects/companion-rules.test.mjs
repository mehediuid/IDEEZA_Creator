// The companion rule table (src/lib/create/companions.ts) — the answer when
// the model is unreachable. The owner's own prompt names the remote beside
// the car, so it has to find the remote without the model.
import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyByRule } from "../../.tmp-test/lib/create/companions.js";

const names = (text) => classifyByRule(text).companions.map((c) => c.name);

test("a remote named beside a vehicle is its own product", () => {
  assert.deepEqual(names("I want a remote control and car"), ["Remote controller"]);
  assert.deepEqual(names("A remote-controlled boat for the lake"), ["Remote controller"]);
  assert.deepEqual(names("a robot I can drive with a remote"), ["Remote controller"]);
});

test("a phone or app remote stays inside the product", () => {
  assert.deepEqual(names("a car I control from a phone app remote"), []);
});

test("rc cars keep the drone family's answer; a vehicle alone is one product", () => {
  assert.deepEqual(names("an rc car"), ["Remote controller", "Battery charger"]);
  assert.deepEqual(names("a toy car that follows lines"), []);
  assert.equal(classifyByRule("a toy car that follows lines").isSystem, false);
});
