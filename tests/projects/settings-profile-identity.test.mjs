// Settings › Profile and Personal Information: the private identity record
// (legal name, gender, permanent address, up to five shipping addresses with
// exactly one default). Never shown publicly.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  EMPTY_IDENTITY,
  SHIPPING_MAX,
  normalizeIdentity,
  addShipping,
  updateShipping,
  removeShipping,
  makeDefaultShipping,
  genderWordsOf,
} = await import("../../.tmp-test/lib/account/identity.js");
const { COUNTRIES, countryCodeOf, countryNameOf, COUNTRY_CODES } = await import("../../.tmp-test/lib/account/countries.js");

const addr = (o = {}) => ({ name: "Home", country: "BD", city: "Dhaka", address: "20/3, Sector 9, Uttara", ...o });

test("nothing stored, or junk, reads as the empty identity", () => {
  for (const raw of [null, undefined, "x", 4, [], {}]) assert.deepEqual(normalizeIdentity(raw), EMPTY_IDENTITY);
  assert.equal(EMPTY_IDENTITY.v, 1);
  assert.deepEqual(EMPTY_IDENTITY.shipping, []);
});

test("names and addresses are trimmed and clipped; an unknown country is dropped", () => {
  const id = normalizeIdentity({
    firstName: "  Rafiq  ",
    lastName: "x".repeat(90),
    permanentAddress: { country: "bd", city: " Dhaka ", address: " 20/3 " },
  });
  assert.equal(id.firstName, "Rafiq");
  assert.equal(id.lastName.length, 60);
  assert.deepEqual(id.permanentAddress, { country: "BD", city: "Dhaka", address: "20/3" });
  assert.equal(normalizeIdentity({ permanentAddress: { country: "ZZ" } }).permanentAddress.country, "");
});

test("gender keeps the three words, a custom text, or nothing", () => {
  assert.equal(normalizeIdentity({ gender: "female" }).gender, "female");
  assert.equal(normalizeIdentity({ gender: "unsaid" }).gender, "unsaid");
  assert.equal(normalizeIdentity({ gender: "  Male " }).gender, "male");
  assert.equal(normalizeIdentity({ gender: " Non-binary " }).gender, "Non-binary");
  assert.equal(normalizeIdentity({ gender: 3 }).gender, "");
  assert.equal(genderWordsOf("male"), "Male");
  assert.equal(genderWordsOf("unsaid"), "Prefer not to say");
  assert.equal(genderWordsOf("Non-binary"), "Non-binary");
  assert.equal(genderWordsOf(""), "");
});

test("shipping: at most five, exactly one default, the first kept when several claim it", () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, ...addr({ name: `A${i}` }), isDefault: i === 2 || i === 4 }));
  const id = normalizeIdentity({ shipping: many });
  assert.equal(id.shipping.length, SHIPPING_MAX);
  assert.deepEqual(id.shipping.filter((s) => s.isDefault).map((s) => s.id), ["s2"]);
  const none = normalizeIdentity({ shipping: [{ id: "a", ...addr() }, { id: "b", ...addr() }] });
  assert.deepEqual(none.shipping.map((s) => s.isDefault), [true, false]);
});

test("shipping: an entry without a street address is dropped; ids are unique", () => {
  const id = normalizeIdentity({
    shipping: [{ id: "a", ...addr({ address: "  " }) }, { id: "b", ...addr() }, { id: "b", ...addr({ name: "Office" }) }, "nope"],
  });
  assert.equal(id.shipping.length, 2);
  assert.equal(new Set(id.shipping.map((s) => s.id)).size, 2);
  assert.equal(id.shipping[0].isDefault, true);
});

test("addShipping: the first becomes the default, the sixth is refused", () => {
  let list = [];
  let r = addShipping(list, addr(), "a");
  assert.equal(r.refused, false);
  list = r.list;
  assert.equal(list[0].isDefault, true);
  for (const id of ["b", "c", "d", "e"]) list = addShipping(list, addr({ name: id }), id).list;
  assert.equal(list.length, SHIPPING_MAX);
  assert.deepEqual(list.filter((s) => s.isDefault).map((s) => s.id), ["a"]);
  r = addShipping(list, addr(), "f");
  assert.equal(r.refused, true);
  assert.equal(r.list, list);
});

test("removeShipping hands the default to the first left; makeDefault moves it", () => {
  let list = ["a", "b", "c"].reduce((l, id) => addShipping(l, addr({ name: id }), id).list, []);
  list = makeDefaultShipping(list, "c");
  assert.deepEqual(list.map((s) => s.isDefault), [false, false, true]);
  list = removeShipping(list, "c");
  assert.deepEqual(list.map((s) => [s.id, s.isDefault]), [["a", true], ["b", false]]);
  list = removeShipping(list, "a");
  assert.deepEqual(list.map((s) => [s.id, s.isDefault]), [["b", true]]);
  assert.deepEqual(removeShipping(list, "b"), []);
  assert.deepEqual(makeDefaultShipping(list, "nope"), list);
});

test("updateShipping edits one address and keeps the default where it was", () => {
  let list = ["a", "b"].reduce((l, id) => addShipping(l, addr({ name: id }), id).list, []);
  list = updateShipping(list, "b", { name: "Office", city: "Chattogram" });
  assert.equal(list[1].name, "Office");
  assert.equal(list[1].city, "Chattogram");
  assert.equal(list[0].isDefault, true);
  assert.equal(list[1].isDefault, false);
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
