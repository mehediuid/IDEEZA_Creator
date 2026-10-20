// Settings › Account: the private identity record is the legal name and nothing
// else (owner V2, 2026-10-20). The identity check and invoices read the same
// value. Gender, the permanent address and the five shipping addresses Phase 1
// kept are dropped when an old record is read.
import { test } from "node:test";
import assert from "node:assert/strict";

const { EMPTY_IDENTITY, LEGAL_NAME_MAX, normalizeIdentity, invoiceNameOf } = await import("../../.tmp-test/lib/account/identity.js");
const { COUNTRIES, countryCodeOf, countryNameOf, COUNTRY_CODES } = await import("../../.tmp-test/lib/account/countries.js");

test("nothing stored, or junk, reads as no legal name", () => {
  for (const raw of [null, undefined, "x", 4, [], {}]) assert.deepEqual(normalizeIdentity(raw), EMPTY_IDENTITY);
  assert.deepEqual(EMPTY_IDENTITY, { v: 2, legalName: "" });
});

test("the legal name is trimmed, its inner spaces collapsed, and clipped", () => {
  assert.equal(normalizeIdentity({ v: 2, legalName: "  Rafiq   Ahmed " }).legalName, "Rafiq Ahmed");
  assert.equal(normalizeIdentity({ v: 2, legalName: "x".repeat(200) }).legalName.length, LEGAL_NAME_MAX);
  assert.equal(normalizeIdentity({ v: 2, legalName: 7 }).legalName, "");
});

test("a Phase 1 record keeps its first and last name as the legal name, and drops everything else", () => {
  const old = {
    v: 1,
    firstName: " Rafiq ",
    lastName: "Ahmed",
    gender: "male",
    permanentAddress: { country: "BD", city: "Dhaka", address: "20/3, Sector 9" },
    shipping: [{ id: "a", name: "Home", country: "BD", city: "Dhaka", address: "20/3", isDefault: true }],
  };
  const id = normalizeIdentity(old);
  assert.deepEqual(id, { v: 2, legalName: "Rafiq Ahmed" });
  for (const k of ["firstName", "lastName", "gender", "permanentAddress", "shipping"]) assert.equal(k in id, false, k);
  assert.equal(normalizeIdentity({ firstName: "", lastName: "Ahmed" }).legalName, "Ahmed");
  assert.equal(normalizeIdentity({ legalName: "Rafiq A.", firstName: "Old", lastName: "Name" }).legalName, "Rafiq A.");
});

test("an invoice names the billing name, else the legal name, else the profile name", () => {
  assert.equal(invoiceNameOf({ billingName: "Acme Ltd", legalName: "Rafiq Ahmed", profileName: "Rafiq" }), "Acme Ltd");
  assert.equal(invoiceNameOf({ billingName: "", legalName: "Rafiq Ahmed", profileName: "Rafiq" }), "Rafiq Ahmed");
  assert.equal(invoiceNameOf({ billingName: "", legalName: "", profileName: "Rafiq" }), "Rafiq");
});

test("countries are worked out from Intl: current ISO codes with English names, no groupings", () => {
  assert.ok(COUNTRY_CODES.length > 200);
  for (const code of ["BD", "US", "DE", "GB", "IN"]) assert.ok(COUNTRY_CODES.includes(code), code);
  for (const code of ["EU", "UN", "EZ", "ZZ", "XA", "QO", "YU", "BU", "UK"]) assert.ok(!COUNTRY_CODES.includes(code), code);
  assert.equal(new Set(COUNTRIES.map((c) => c.name)).size, COUNTRIES.length);
  assert.equal(countryNameOf("BD"), "Bangladesh");
  assert.equal(countryNameOf("DE"), "Germany");
  assert.equal(countryNameOf(""), "");
  assert.equal(countryCodeOf(" bd "), "BD");
  assert.equal(countryCodeOf("EU"), null);
  const names = COUNTRIES.map((c) => c.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
});
