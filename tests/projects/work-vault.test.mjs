// Each account's own work (owner 2026-11-04): signing out parks it, a new
// account starts from nothing, and signing back in brings it all back. Work
// from before accounts kept their own stays with its likely owner; keys left
// behind while nobody was signed in are dropped.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};
const tab = new Map([["ideeza:scroll:/", "120"]]);
globalThis.sessionStorage = {
  getItem: (k) => (tab.has(k) ? tab.get(k) : null),
  setItem: (k, v) => tab.set(k, String(v)),
  removeItem: (k) => tab.delete(k),
  key: (i) => [...tab.keys()][i] ?? null,
  get length() {
    return tab.size;
  },
};
globalThis.dispatchEvent = () => true;
globalThis.Event = class {};

const auth = await import("../../.tmp-test/lib/account/auth.js");
const vault = await import("../../.tmp-test/lib/account/work-vault.js");
const { PROFILE_KEY } = await import("../../.tmp-test/lib/people/fields.js");
const { OFFER_KEY } = await import("../../.tmp-test/lib/account/welcome-offer.js");

const NOW = Date.UTC(2026, 10, 4, 12);
const PW = "Correct-Horse-9";
const PROJECTS = "ideeza:manual:projects";
const CREDITS = "ideeza:create:credits";
const person = (first, email) => ({ firstName: first, lastName: "Test", email, password: PW, confirm: PW, day: "9", month: "3", year: "1994", consent: true });

async function join(first, email, at = NOW) {
  assert.equal(await auth.createAccount(person(first, email), "", at), "ok");
  assert.equal((await auth.verifyEmail(at)).ok, true);
}
const profileName = () => JSON.parse(store.get(PROFILE_KEY) ?? "{}").name;

beforeEach(() => {
  store.clear();
  tab.clear();
  tab.set("ideeza:scroll:/", "120");
});

test("the browser keeps the accounts, the session, the offer, the tester and the theme; everything else under ideeza: is the account's", () => {
  for (const k of [auth.ACCOUNTS_KEY, auth.SESSION_KEY, auth.VERIFY_KEY, OFFER_KEY, "ideeza:tester", vault.PARKING_FLAG]) assert.equal(vault.isWorkKey(k), false, k);
  assert.equal(vault.isWorkKey("ideeza-theme"), false);
  assert.equal(vault.isWorkKey(`${vault.parkedPrefix("a@b.co")}${PROJECTS}`), false);
  for (const k of [PROJECTS, CREDITS, PROFILE_KEY, "ideeza:tour", "ideeza:account:plan", "ideeza:wallet:demo", "ideeza:migrations"]) assert.equal(vault.isWorkKey(k), true, k);
});

test("sign out, make a new account: it starts from nothing; sign back in: all your work is there", async () => {
  await join("Asha", "asha@example.com");
  store.set(PROJECTS, '["smart lamp"]');
  store.set(CREDITS, "120");
  store.set("ideeza:tour", '{"welcome":"declined"}');
  await auth.signOut();
  assert.equal(store.get(PROJECTS), undefined);
  assert.equal(store.get(CREDITS), undefined);
  assert.equal(store.get(PROFILE_KEY), undefined);
  assert.equal(tab.size, 0, "the tab's drafts and scroll places go too");
  assert.equal(store.get(`${vault.parkedPrefix("asha@example.com")}${PROJECTS}`), '["smart lamp"]');
  assert.equal(auth.readAccounts().length, 1, "the accounts stay");

  await join("Bilal", "bilal@example.com", NOW + 1);
  assert.equal(store.get(PROJECTS), undefined, "no projects");
  assert.equal(store.get(CREDITS), undefined, "credits start from the seed");
  assert.equal(store.get("ideeza:tour"), undefined, "the Welcome and the tour again");
  assert.equal(profileName(), "Bilal Test", "its own name, not the last account's");
  store.set(PROJECTS, '["drone"]');

  await auth.signOut();
  assert.equal(await auth.signIn("asha@example.com", PW, NOW + 2), "ok");
  assert.equal(store.get(PROJECTS), '["smart lamp"]');
  assert.equal(store.get(CREDITS), "120");
  assert.equal(profileName(), "Asha Test");
  assert.equal(store.get(`${vault.parkedPrefix("bilal@example.com")}${PROJECTS}`), '["drone"]', "Bilal's waits for Bilal");
  assert.equal(store.get(`${vault.parkedPrefix("asha@example.com")}${PROJECTS}`), undefined, "nothing left parked for the one signed in");
});

test("keys written while nobody was signed in are dropped when an account comes in", async () => {
  await join("Asha", "asha@example.com");
  await auth.signOut();
  store.set(PROJECTS, '["stray"]');
  store.set("ideeza:migrations", "9");
  await join("Bilal", "bilal@example.com", NOW + 1);
  assert.equal(store.get(PROJECTS), undefined);
  assert.equal(store.get("ideeza:migrations"), undefined);
});

test("work from before accounts kept their own: the first account in keeps it", async () => {
  store.set(PROJECTS, '["old work"]');
  await join("Asha", "asha@example.com");
  assert.equal(store.get(PROJECTS), '["old work"]');
  assert.equal(store.get(vault.PARKING_FLAG), "1");
});

test("work from before, with accounts signed out: an existing account signing in keeps it; a new one starts fresh and it goes to the newest other", async () => {
  await auth.createAccount(person("Asha", "asha@example.com"), "", NOW);
  await auth.verifyEmail(NOW);
  // As the old sign-out left it: the session gone, the work loose, nothing parked yet.
  store.delete(auth.SESSION_KEY);
  store.delete(vault.PARKING_FLAG);
  store.set(PROJECTS, '["asha work"]');
  await join("Bilal", "bilal@example.com", NOW + 1);
  assert.equal(store.get(PROJECTS), undefined, "the new account starts fresh");
  assert.equal(store.get(`${vault.parkedPrefix("asha@example.com")}${PROJECTS}`), '["asha work"]');
  await auth.signOut();
  assert.equal(await auth.signIn("asha@example.com", PW, NOW + 2), "ok");
  assert.equal(store.get(PROJECTS), '["asha work"]');
});

test("a reset password signs in with that account's own work", async () => {
  await join("Asha", "asha@example.com");
  store.set(PROJECTS, '["smart lamp"]');
  await auth.signOut();
  await join("Bilal", "bilal@example.com", NOW + 1);
  await auth.signOut();
  assert.equal((await auth.resetPassword("asha@example.com", "New-Horse-77", NOW + 2)).ok, true);
  assert.equal(store.get(PROJECTS), '["smart lamp"]');
  assert.equal(profileName(), "Asha Test");
});
