// LEGAL — legal.ts (P2-TABS-23, Phase 2 spec §3.5.9; owner, 2026-10-13: rights are a list —
// as many patents, copyrights and trademarks as the maker has).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  checkRight,
  normalizeLegal,
  rightFromInput,
  rightsOf,
  RIGHTS_MAX,
  withoutRight,
  withRight,
} from "../../.tmp-test/lib/manual/legal.js";

const T = Date.UTC(2026, 8, 22, 9, 0);
const LATER = T + 60_000;

const input = (o = {}) => ({ kind: "patent", text: "", url: "", attorney: "", ...o });

// ─────────────────────────── checkRight ───────────────────────────

describe("checkRight", () => {
  it("the main field is required, in the kind's own words", () => {
    assert.equal(checkRight(input()).text, "Add the patent number.");
    assert.equal(checkRight(input({ kind: "copyright" })).text, "Add the copyright notice.");
    assert.equal(checkRight(input({ kind: "trademark" })).text, "Add the trademark.");
    assert.equal(checkRight(input()).ok, false);
  });

  it("caps each kind: Patent 40, Copyright and Trademark 80, a trademark's attorney 60", () => {
    assert.equal(checkRight(input({ text: "x".repeat(41) })).text, "Keep it to 40 characters.");
    assert.equal(checkRight(input({ text: "x".repeat(40) })).ok, true);
    assert.equal(checkRight(input({ kind: "copyright", text: "x".repeat(81) })).text, "Keep it to 80 characters.");
    assert.equal(checkRight(input({ kind: "trademark", text: "x".repeat(81) })).text, "Keep it to 80 characters.");
    assert.equal(checkRight(input({ kind: "trademark", text: "IDEEZA", attorney: "x".repeat(61) })).attorney, "Keep it to 60 characters.");
  });

  it("the link is optional, and https only", () => {
    assert.equal(checkRight(input({ text: "US1", url: "" })).ok, true);
    assert.equal(checkRight(input({ text: "US1", url: "https://patents.google.com" })).ok, true);
    assert.equal(checkRight(input({ text: "US1", url: "http://patents.google.com" })).url, "Please enter a valid URL starting with https://");
    assert.equal(checkRight(input({ kind: "copyright", text: "© 2026", url: "www.example.com" })).ok, false);
  });

  it("an attorney on a patent or a copyright is not asked for, so never checked", () => {
    assert.equal(checkRight(input({ text: "US1", attorney: "x".repeat(99) })).ok, true);
  });
});

// ─────────────────────────── normalizeLegal ───────────────────────────

describe("normalizeLegal", () => {
  it("drops a malformed record, one without a time, and one with no right in it", () => {
    assert.equal(normalizeLegal(null), undefined);
    assert.equal(normalizeLegal("garbage"), undefined);
    assert.equal(normalizeLegal({ rights: [{ id: "a", kind: "patent", text: "US1" }] }), undefined); // no updatedAt
    assert.equal(normalizeLegal({ updatedAt: T }), undefined);
    assert.equal(normalizeLegal({ updatedAt: T, rights: [] }), undefined);
  });

  it("keeps several rights of one kind, in order", () => {
    const raw = {
      updatedAt: T,
      rights: [
        { id: "a", kind: "patent", text: "US 11,234,567" },
        { id: "b", kind: "patent", text: "EP 3 456 789", url: "https://register.epo.org" },
        { id: "c", kind: "trademark", text: "IDEEZA", attorney: "Jane Doe" },
      ],
    };
    assert.deepEqual(normalizeLegal(raw), raw);
  });

  it("drops a right with an unknown kind or nothing in it, and an attorney anywhere but a trademark", () => {
    const out = normalizeLegal({
      updatedAt: T,
      rights: [
        { id: "a", kind: "design", text: "D1" },
        { id: "b", kind: "copyright", text: "  ", url: "https://copyright.gov" },
        { id: "c", kind: "patent", text: "US1", attorney: "Jane Doe" },
      ],
    });
    assert.deepEqual(out, { updatedAt: T, rights: [{ id: "c", kind: "patent", text: "US1" }] });
  });

  it("gives every right a unique id", () => {
    const out = normalizeLegal({
      updatedAt: T,
      rights: [
        { id: "x", kind: "patent", text: "US1" },
        { id: "x", kind: "patent", text: "US2" },
        { kind: "copyright", text: "© 2026" },
      ],
    });
    assert.deepEqual(
      out.rights.map((r) => r.id),
      ["x", "x-2", "right-3"],
    );
  });

  it(`stops at ${RIGHTS_MAX} rights`, () => {
    const rights = Array.from({ length: RIGHTS_MAX + 3 }, (_, i) => ({ id: `r${i}`, kind: "patent", text: `US${i}` }));
    assert.equal(normalizeLegal({ updatedAt: T, rights }).rights.length, RIGHTS_MAX);
  });

  it("reads a record from before the list as up to three rights — nothing the maker typed is lost", () => {
    const out = normalizeLegal({
      updatedAt: T,
      patent: "US1234567",
      copyright: { text: "© 2026 Nick Rough", url: "https://copyright.gov" },
      trademark: { mark: "IDEEZA", attorney: "Jane Doe", url: "https://law.example.com" },
    });
    assert.deepEqual(out, {
      updatedAt: T,
      rights: [
        { id: "patent", kind: "patent", text: "US1234567" },
        { id: "copyright", kind: "copyright", text: "© 2026 Nick Rough", url: "https://copyright.gov" },
        { id: "trademark", kind: "trademark", text: "IDEEZA", url: "https://law.example.com", attorney: "Jane Doe" },
      ],
    });
  });

  it("keeps an old trademark that held only an attorney, and drops an old blank copyright", () => {
    const out = normalizeLegal({ updatedAt: T, copyright: { text: "  ", url: "https://x.test" }, trademark: { attorney: "Jane Doe" } });
    assert.deepEqual(out, { updatedAt: T, rights: [{ id: "trademark", kind: "trademark", text: "", attorney: "Jane Doe" }] });
  });
});

// ─────────────────────────── the list edits ───────────────────────────

describe("withRight / withoutRight", () => {
  const first = { id: "a", kind: "patent", text: "US1" };

  it("adds at the end, and replaces in place by id", () => {
    const one = withRight(undefined, first, T);
    assert.deepEqual(one, { rights: [first], updatedAt: T });
    const two = withRight(one, { id: "b", kind: "copyright", text: "© 2026" }, LATER);
    assert.deepEqual(rightsOf(two).map((r) => r.id), ["a", "b"]);
    const changed = withRight(two, { id: "a", kind: "patent", text: "US2" }, LATER);
    assert.deepEqual(rightsOf(changed).map((r) => r.text), ["US2", "© 2026"]);
    assert.equal(changed.updatedAt, LATER);
  });

  it("removing the last right leaves no record", () => {
    const one = withRight(undefined, first, T);
    assert.equal(withoutRight(one, "a", LATER), undefined);
    const two = withRight(one, { id: "b", kind: "copyright", text: "© 2026" }, T);
    assert.deepEqual(rightsOf(withoutRight(two, "a", LATER)).map((r) => r.id), ["b"]);
  });

  it("the form's right is trimmed, with the attorney only on a trademark and empty parts left out", () => {
    assert.deepEqual(rightFromInput("a", input({ text: "  US1 ", url: " ", attorney: "Jane" })), { id: "a", kind: "patent", text: "US1" });
    assert.deepEqual(rightFromInput("b", input({ kind: "trademark", text: "IDEEZA", url: "https://x.test", attorney: " Jane " })), {
      id: "b",
      kind: "trademark",
      text: "IDEEZA",
      url: "https://x.test",
      attorney: "Jane",
    });
  });
});
