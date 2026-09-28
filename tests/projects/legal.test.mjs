// LEGAL — legal.ts (P2-TABS-23, Phase 2 spec §3.5.9).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { checkLegal, normalizeLegal } from "../../.tmp-test/lib/manual/legal.js";

const T = Date.UTC(2026, 8, 22, 9, 0);

const emptyInput = { patent: "", copyrightText: "", copyrightUrl: "", trademark: "", attorneyName: "", attorneyUrl: "" };

// ─────────────────────────── checkLegal (P2-TABS-23's table) ───────────────────────────

describe("checkLegal", () => {
  it("an all-empty form is ok — every field is optional", () => {
    const errors = checkLegal(emptyInput);
    assert.equal(errors.ok, true);
  });

  it("Patent over 40 characters", () => {
    const errors = checkLegal({ ...emptyInput, patent: "x".repeat(41) });
    assert.equal(errors.patent, "Keep it to 40 characters.");
    assert.equal(errors.ok, false);
  });

  it("Copyright text over 80 characters", () => {
    const errors = checkLegal({ ...emptyInput, copyrightText: "x".repeat(81) });
    assert.equal(errors.copyrightText, "Keep it to 80 characters.");
  });

  it("Trademark over 80 characters", () => {
    const errors = checkLegal({ ...emptyInput, trademark: "x".repeat(81) });
    assert.equal(errors.trademark, "Keep it to 80 characters.");
  });

  it("Attorney name over 60 characters", () => {
    const errors = checkLegal({ ...emptyInput, attorneyName: "x".repeat(61) });
    assert.equal(errors.attorneyName, "Keep it to 60 characters.");
  });

  it("returns the https copy for a non-https Copyright link", () => {
    const errors = checkLegal({ ...emptyInput, copyrightText: "© 2026", copyrightUrl: "http://copyright.gov" });
    assert.equal(errors.copyrightUrl, "Please enter a valid URL starting with https://");
    assert.equal(errors.ok, false);
  });

  it("returns the https copy for a non-https Attorney link", () => {
    const errors = checkLegal({ ...emptyInput, attorneyName: "Jane Doe", attorneyUrl: "www.example.com" });
    assert.equal(errors.attorneyUrl, "Please enter a valid URL starting with https://");
  });

  it("an https link on either field is fine", () => {
    const errors = checkLegal({
      ...emptyInput,
      copyrightText: "© 2026 Nick Rough",
      copyrightUrl: "https://copyright.gov",
      attorneyName: "Jane Doe",
      attorneyUrl: "https://example.com",
    });
    assert.equal(errors.ok, true);
  });
});

// ─────────────────────────── normalizeLegal ───────────────────────────

describe("normalizeLegal", () => {
  it("drops a wholly malformed record", () => {
    assert.equal(normalizeLegal(null), undefined);
    assert.equal(normalizeLegal("garbage"), undefined);
    assert.equal(normalizeLegal({}), undefined); // no updatedAt
  });

  it("drops an all-empty record even with a valid updatedAt", () => {
    assert.equal(normalizeLegal({ updatedAt: T }), undefined);
  });

  it("keeps a valid patent-only record", () => {
    assert.deepEqual(normalizeLegal({ updatedAt: T, patent: "US1234567" }), { updatedAt: T, patent: "US1234567" });
  });

  it("keeps copyright text with its optional link", () => {
    const out = normalizeLegal({ updatedAt: T, copyright: { text: "© 2026 Nick Rough", url: "https://copyright.gov" } });
    assert.deepEqual(out, { updatedAt: T, copyright: { text: "© 2026 Nick Rough", url: "https://copyright.gov" } });
  });

  it("drops a copyright block whose text is blank, even with a url", () => {
    const out = normalizeLegal({ updatedAt: T, copyright: { text: "  ", url: "https://copyright.gov" } });
    assert.equal(out, undefined);
  });

  it("keeps a trademark with just a mark, or just an attorney", () => {
    assert.deepEqual(normalizeLegal({ updatedAt: T, trademark: { mark: "IDEEZA" } }), {
      updatedAt: T,
      trademark: { mark: "IDEEZA" },
    });
    assert.deepEqual(normalizeLegal({ updatedAt: T, trademark: { attorney: "Jane Doe" } }), {
      updatedAt: T,
      trademark: { attorney: "Jane Doe" },
    });
  });

  it("keeps every field together", () => {
    const raw = {
      updatedAt: T,
      patent: "US1234567",
      copyright: { text: "© 2026", url: "https://copyright.gov" },
      trademark: { mark: "IDEEZA", attorney: "Jane Doe", url: "https://law.example.com" },
    };
    assert.deepEqual(normalizeLegal(raw), raw);
  });
});
