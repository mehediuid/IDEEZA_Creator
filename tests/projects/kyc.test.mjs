// The demo identity check (Build and Earn P1-4): `ideeza:commerce:kyc` holds
// `{ status: "verified", at, demo: true }` and nothing the form collected; reset removes it.
import { test } from "node:test";
import assert from "node:assert/strict";

const { KYC_KEY, normalizeKyc, parseKyc, kycStatusOf, verifiedKyc, kycFormProblems, readKyc, writeKyc, resetKyc, KYC_NAME_MAX } =
  await import("../../.tmp-test/lib/commerce/kyc.js");

/** localStorage over a Map; `refuse` makes every write throw. */
function withStorage(fn, { refuse = false, seed = {} } = {}) {
  const map = new Map(Object.entries(seed));
  const prev = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => {
        if (refuse) throw new Error("QuotaExceeded");
        map.set(k, String(v));
      },
      removeItem: (k) => {
        if (refuse) throw new Error("SecurityError");
        map.delete(k);
      },
    },
  };
  try {
    return fn(map);
  } finally {
    globalThis.window = prev;
  }
}

test("the key is ideeza:commerce:kyc", () => {
  assert.equal(KYC_KEY, "ideeza:commerce:kyc");
});

test("verifiedKyc: the outcome only, always labelled demo", () => {
  assert.deepEqual(verifiedKyc(123), { status: "verified", at: 123, demo: true });
});

test("normalizeKyc: only an exact demo verification reads as verified", () => {
  assert.deepEqual(normalizeKyc({ status: "verified", at: 5, demo: true }), { status: "verified", at: 5, demo: true });
  assert.equal(normalizeKyc({ status: "verified", at: 5 }), null, "not labelled demo");
  assert.equal(normalizeKyc({ status: "verified", at: 5, demo: "yes" }), null);
  assert.equal(normalizeKyc({ status: "pending", at: 5, demo: true }), null);
  assert.equal(normalizeKyc({ status: "verified", at: -1, demo: true }), null);
  assert.equal(normalizeKyc({ status: "verified", at: "5", demo: true }), null);
  assert.equal(normalizeKyc(null), null);
  assert.equal(normalizeKyc([]), null);
});

test("normalizeKyc drops anything extra, such as a name someone wrote in by hand", () => {
  assert.deepEqual(normalizeKyc({ status: "verified", at: 5, demo: true, name: "Ada", country: "UK" }), {
    status: "verified",
    at: 5,
    demo: true,
  });
});

test("parseKyc: missing or corrupt JSON is not verified", () => {
  assert.equal(parseKyc(null), null);
  assert.equal(parseKyc(""), null);
  assert.equal(parseKyc("{nope"), null);
  assert.deepEqual(parseKyc(JSON.stringify(verifiedKyc(9))), verifiedKyc(9));
});

test("kycStatusOf", () => {
  assert.equal(kycStatusOf(null), "none");
  assert.equal(kycStatusOf(verifiedKyc(1)), "verified");
});

test("kycFormProblems: both fields must hold something; blanks are trimmed", () => {
  assert.deepEqual(kycFormProblems({ name: "Ada", country: "Bangladesh" }), {});
  assert.deepEqual(kycFormProblems({ name: "  ", country: "" }), { name: "Enter your full legal name.", country: "Choose your country of residence." });
  assert.equal(kycFormProblems({ name: "x".repeat(KYC_NAME_MAX + 1), country: "UK" }).name?.startsWith("Keep the name"), true);
});

test("write then read round-trips; the stored JSON carries no form data", () => {
  withStorage((map) => {
    assert.equal(readKyc(), null);
    assert.equal(writeKyc(verifiedKyc(42)), true);
    assert.deepEqual(readKyc(), verifiedKyc(42));
    assert.deepEqual(Object.keys(JSON.parse(map.get(KYC_KEY))).sort(), ["at", "demo", "status"]);
  });
});

test("reset removes the key: the next read is not verified", () => {
  withStorage(
    (map) => {
      assert.deepEqual(readKyc(), verifiedKyc(7));
      assert.equal(resetKyc(), true);
      assert.equal(map.has(KYC_KEY), false);
      assert.equal(readKyc(), null);
    },
    { seed: { [KYC_KEY]: JSON.stringify(verifiedKyc(7)) } },
  );
});

test("a refused write or reset says false and leaves the prior state", () => {
  withStorage(
    () => {
      assert.equal(writeKyc(verifiedKyc(1)), false);
      assert.equal(resetKyc(), false);
      assert.deepEqual(readKyc(), verifiedKyc(7));
    },
    { refuse: true, seed: { [KYC_KEY]: JSON.stringify(verifiedKyc(7)) } },
  );
});

test("outside a browser: reads null, writes refuse", () => {
  const prev = globalThis.window;
  delete globalThis.window;
  try {
    assert.equal(readKyc(), null);
    assert.equal(writeKyc(verifiedKyc(1)), false);
    assert.equal(resetKyc(), false);
  } finally {
    globalThis.window = prev;
  }
});
