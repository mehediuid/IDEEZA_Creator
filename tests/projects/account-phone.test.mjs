// The mobile prototype's way in (mobile Figma "Account · 2026 update"): the
// web's five password rules on the phone, six-digit codes with their resend wait, tries
// and lock, the sign-in lock, the phone's Create account (the web's fields),
// a provider's sign-in, the link's campaign tag, and where the phone goes
// next.
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
globalThis.dispatchEvent = () => true;
globalThis.Event = class {};

const auth = await import("../../.tmp-test/lib/account/auth.js");
const phone = await import("../../.tmp-test/lib/account/phone.js");

const NOW = Date.UTC(2026, 10, 5, 9);
const signedInAs = () => auth.currentAccount(auth.readAccounts(), auth.readSession())?.email ?? null;
/** The web's Sign up, as the phone fills it in. */
const signUp = (over = {}) => ({
  firstName: "Rafi",
  lastName: "Ahmed",
  email: "rafi@mail.com",
  password: "Abcdefg1!",
  confirm: "Abcdefg1!",
  day: "4",
  month: "3",
  year: "1998",
  consent: true,
  ...over,
});

beforeEach(() => store.clear());

test("the phone holds a password to the web's five rules, ticking one by one", () => {
  const met = (p) => phone.phonePasswordChecks(p).filter((c) => c.met).map((c) => c.id);
  assert.deepEqual(phone.PHONE_PASSWORD_RULES.map((r) => r.label), auth.PASSWORD_RULES.map((r) => r.label));
  assert.equal(phone.PHONE_PASSWORD_RULES.length, 5);
  assert.deepEqual(met(""), []);
  assert.deepEqual(met("abc1"), ["lower", "number"]);
  assert.deepEqual(met("Abcdefg1!"), ["length", "upper", "lower", "number", "symbol"]);
  assert.equal(phone.phonePasswordProblem("Abcdefg1!"), "");
  // The web refuses a password with no uppercase letter; so does the phone now.
  assert.equal(phone.phonePasswordProblem("abcdefg1!"), auth.passwordProblem("abcdefg1!"));
  assert.notEqual(phone.phonePasswordProblem("abcdefg1!"), "");
  assert.equal(phone.phonePasswordProblem("Aa1!" + "x".repeat(130)), "Use at most 128 characters.");
});

test("a code: wrong tries count, the fifth locks for 10 minutes, and it expires after 10", () => {
  const rec = { v: 1, purpose: "verify", email: "a@b.co", code: "482193", sentAt: NOW, tries: 0, lockedUntil: 0 };
  assert.equal(phone.checkCode(rec, "482193", NOW + 1000).result, "ok");
  let r = rec;
  for (let i = 1; i <= 4; i += 1) {
    const out = phone.checkCode(r, "111111", NOW);
    assert.equal(out.result, "wrong");
    r = out.record;
  }
  const locked = phone.checkCode(r, "111111", NOW);
  assert.equal(locked.result, "locked");
  assert.equal(locked.record.lockedUntil, NOW + phone.CODE_LOCK_MS);
  assert.equal(phone.checkCode(locked.record, "482193", NOW + 60_000).result, "locked");
  assert.equal(phone.checkCode(rec, "482193", NOW + phone.CODE_TTL_MS + 1).result, "expired");
});

test("resend waits 30 s after a code, or out the lock", () => {
  const rec = { v: 1, purpose: "reset", email: "a@b.co", code: "482193", sentAt: NOW, tries: 0, lockedUntil: 0 };
  assert.equal(phone.resendWait(rec, NOW + 10_000), 20_000);
  assert.equal(phone.resendWait(rec, NOW + 31_000), 0);
  assert.equal(phone.resendWait({ ...rec, lockedUntil: NOW + 600_000 }, NOW + 31_000), 569_000);
  assert.equal(phone.clockOf(569_000), "9:29");
  assert.equal(phone.clockOf(30_000), "0:30");
});

test("issuing a code keeps a lock on the same step; another email gets its own", () => {
  const first = phone.issueCode("verify", "A@B.co", NOW, () => 0.5);
  assert.equal(first.code, "550000");
  assert.equal(phone.readCode().email, "a@b.co");
  phone.saveCode({ ...first, lockedUntil: NOW + 1000 });
  assert.equal(phone.issueCode("verify", "a@b.co", NOW, () => 0.1).code, "550000");
  assert.equal(phone.issueCode("verify", "c@d.co", NOW, () => 0.1).code, "190000");
});

test("five wrong sign-ins lock that email for 5 minutes; a right one clears it", () => {
  let t = {};
  for (let i = 0; i < 4; i += 1) t = phone.afterWrongSignIn(t, "A@b.co", NOW);
  assert.equal(phone.signInLockedFor(t, "a@b.co", NOW), 0);
  t = phone.afterWrongSignIn(t, "a@b.co", NOW);
  assert.equal(phone.signInLockedFor(t, "a@b.co", NOW + 1000), phone.SIGN_IN_LOCK_MS - 1000);
  assert.deepEqual(phone.afterRightSignIn(t, "a@b.co"), {});
});

test("the phone's Create account is the web's: name, email, password and birthday, waiting for the code", async () => {
  assert.equal(await auth.createAccount(signUp({ password: "abcdefgh", confirm: "abcdefgh" }), "", NOW), "invalid");
  assert.equal(await auth.createAccount(signUp({ firstName: "" }), "", NOW), "invalid");
  assert.equal(await auth.createAccount(signUp({ day: "31", month: "2" }), "", NOW), "invalid", "no 31 February");
  assert.equal(await auth.createAccount(signUp({ consent: false }), "", NOW), "invalid");
  assert.equal(await auth.createAccount(signUp({ email: "Rafi@Mail.com" }), "", NOW, "/m/ai"), "ok");
  assert.equal(await auth.createAccount(signUp({ email: "RAFI@mail.com" }), "", NOW), "exists");
  const a = auth.accountOf(auth.readAccounts(), "rafi@mail.com");
  assert.equal(a.verifiedAt, null);
  assert.equal(a.firstName, "Rafi");
  assert.equal(a.birthDate, "1998-03-04");
  assert.equal(signedInAs(), null);
  assert.equal(await auth.signIn("rafi@mail.com", "Abcdefg1!", NOW), "unverified");
  assert.equal((await auth.verifyEmail(NOW)).ok, true);
  assert.equal(signedInAs(), "rafi@mail.com");
  assert.equal(await auth.isCurrentPassword("rafi@mail.com", "Abcdefg1!"), true);
  assert.equal(await auth.isCurrentPassword("rafi@mail.com", "Abcdefg2!"), false);
  assert.equal((await auth.resetPassword("rafi@mail.com", "Newpass1!", NOW, phone.phonePasswordProblem)).ok, true);
  assert.equal(await auth.signIn("rafi@mail.com", "Newpass1!", NOW), "ok");
});

test("a provider signs in to its email's account, or makes a verified one", async () => {
  assert.equal(await auth.providerSignIn("maya@gmail.com", { first: "Maya", last: "Karim" }, NOW), "new");
  const a = auth.accountOf(auth.readAccounts(), "maya@gmail.com");
  assert.equal(a.verifiedAt, NOW);
  assert.equal(a.firstName, "Maya");
  assert.equal(signedInAs(), "maya@gmail.com");
  assert.equal(phone.linkProvider("maya@gmail.com", "google", true).ok, true);
  assert.deepEqual(phone.phoneAccountOf(phone.readPhoneAccounts(), "MAYA@gmail.com"), { providers: ["google"], passwordless: true });
  await auth.signOut();
  assert.equal(await auth.providerSignIn("maya@gmail.com", { first: "", last: "" }, NOW + 1), "in");
  assert.equal(signedInAs(), "maya@gmail.com");
  assert.equal(await auth.providerSignIn("not-an-email", { first: "", last: "" }, NOW), "refused");
});

test("AUTH-2: a provider's new account fills the profile's name, then asks Sign up's date of birth and Terms", async () => {
  assert.equal(await auth.providerSignIn("maya@gmail.com", { first: "Maya", last: "Karim" }, NOW), "new");
  let a = auth.accountOf(auth.readAccounts(), "maya@gmail.com");
  assert.equal(a.birthDate, "");
  assert.equal(a.consentAt, 0, "nobody ticked the Terms box yet");
  assert.equal(auth.needsAccountDetails(a), true);
  const profile = JSON.parse(store.get("ideeza:profile"));
  assert.equal(profile.name, "Maya Karim", "the name is saved to the profile, as verifying does");
  if (a.country) assert.ok(profile.location.length > 0);

  // Sign up's own rules and words.
  const details = { firstName: "Maya", lastName: "Karim", day: "", month: "", year: "", consent: false };
  assert.deepEqual(auth.accountDetailsProblems(details, NOW), {
    birthday: "Choose your day, month and year of birth.",
    consent: "Agree to the Privacy policy and Terms to continue.",
  });
  const full = signUp({ firstName: "", day: "31", month: "2", year: "2000", consent: false });
  const fromSignUp = auth.signUpProblems(full, NOW);
  assert.deepEqual(auth.accountDetailsProblems(full, NOW), { firstName: fromSignUp.firstName, birthday: fromSignUp.birthday, consent: fromSignUp.consent });
  assert.equal(auth.completeAccountDetails(details, NOW + 5), "invalid");

  assert.equal(auth.completeAccountDetails({ ...details, day: "9", month: "3", year: "1994", consent: true }, NOW + 5), "ok");
  a = auth.accountOf(auth.readAccounts(), "maya@gmail.com");
  assert.equal(a.birthDate, "1994-03-09");
  assert.equal(a.consentAt, NOW + 5);
  assert.equal(auth.needsAccountDetails(a), false);
});

test("AUTH-2: a provider that shared no name: the details give it, and the profile takes it", async () => {
  assert.equal(await auth.providerSignIn("sora@gmail.com", { first: "", last: "" }, NOW), "new");
  assert.equal(JSON.parse(store.get("ideeza:profile") ?? "{}").name ?? "", "");
  const a = auth.accountOf(auth.readAccounts(), "sora@gmail.com");
  assert.equal(auth.needsAccountDetails(a), true);
  const input = { firstName: "Sora", lastName: "Ito", day: "1", month: "12", year: "2001", consent: true };
  assert.equal(auth.completeAccountDetails(input, NOW + 1), "ok");
  const done = auth.accountOf(auth.readAccounts(), "sora@gmail.com");
  assert.equal(done.firstName, "Sora");
  assert.equal(done.lastName, "Ito");
  assert.equal(JSON.parse(store.get("ideeza:profile")).name, "Sora Ito");
  // An account Sign up made never needs them.
  assert.equal(await auth.createAccount(signUp(), "", NOW), "ok");
  assert.equal(auth.needsAccountDetails(auth.accountOf(auth.readAccounts(), "rafi@mail.com")), false);
});

test("AUTH-2: an older account that never gave a date of birth isn't stopped for one", () => {
  assert.equal(auth.needsAccountDetails({ firstName: "Ana", lastName: "Lee", birthDate: "", consentAt: 5 }), false);
  assert.equal(auth.needsAccountDetails({ firstName: "Ana", lastName: "Lee", birthDate: "2000-01-01", consentAt: 0 }), true);
});

test("a link's utm_source is kept with the account made from it, so the question isn't asked", async () => {
  assert.equal(await auth.createAccount(signUp(), "YouTube Ads!", NOW), "ok");
  const byEmail = auth.accountOf(auth.readAccounts(), "rafi@mail.com");
  assert.equal(byEmail.source, "youtubeads");
  assert.equal(byEmail.sourceVia, "link");
  assert.equal(auth.needsSourceQuestion(byEmail), false);
  assert.equal(await auth.providerSignIn("maya@gmail.com", { first: "Maya", last: "" }, NOW, "newsletter"), "new");
  assert.equal(auth.accountOf(auth.readAccounts(), "maya@gmail.com").source, "newsletter");
  // No tag: the account is asked once, and a Skip is remembered.
  assert.equal(await auth.providerSignIn("sora@gmail.com", { first: "Sora", last: "" }, NOW + 1), "new");
  assert.equal(auth.needsSourceQuestion(auth.accountOf(auth.readAccounts(), "sora@gmail.com")), true);
  assert.equal(auth.skipSource().ok, true);
  assert.equal(auth.needsSourceQuestion(auth.accountOf(auth.readAccounts(), "sora@gmail.com")), false);

  const session = new Map();
  globalThis.sessionStorage = { getItem: (k) => session.get(k) ?? null, setItem: (k, v) => session.set(k, String(v)) };
  assert.equal(phone.readUtm(), "");
  phone.keepUtm("?next=%2Fm&utm_source=LinkedIn");
  assert.equal(phone.readUtm(), "linkedin");
  phone.keepUtm("?next=%2Fm");
  assert.equal(phone.readUtm(), "linkedin", "a later screen without the tag keeps it");
  delete globalThis.sessionStorage;
});

test("this phone remembers the tour it owes and Remember me", () => {
  assert.equal(phone.normalizePhone({}).tourPending, false);
  phone.updatePhone({ tourPending: true });
  assert.equal(phone.readPhone().tourPending, true);
  phone.afterPhoneSignIn(false);
  assert.equal(phone.readPhone().forgetSession, true);
  phone.afterPhoneSignIn();
  assert.equal(phone.readPhone().forgetSession, false);
});

test("where the phone goes next: its own pages only, never back to a way-in screen", () => {
  assert.equal(phone.mobileNext("/m/profile"), "/m/profile");
  assert.equal(phone.mobileNext("/m?tab=x"), "/m?tab=x");
  assert.equal(phone.mobileNext("/projects"), "/m");
  assert.equal(phone.mobileNext("//evil.com"), "/m");
  assert.equal(phone.mobileNext("/m/sign-in?next=/m"), "/m");
  assert.equal(phone.mobileNext("/m/welcome", "/m/welcome", true), "/m/welcome");
  assert.equal(phone.mobileNext("/mobile"), "/m");
});

test("the phone's way-in keys stay with the browser when accounts swap their work", async () => {
  const vault = await import("../../.tmp-test/lib/account/work-vault.js");
  for (const k of [phone.PHONE_KEY, phone.PHONE_ACCOUNTS_KEY, phone.CODE_KEY, phone.TRIES_KEY, phone.PROVIDER_KEY]) {
    assert.equal(vault.isWorkKey(k), false, k);
  }
  assert.equal(vault.isWorkKey("ideeza:manual:projects"), true);
});
