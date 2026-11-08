// The demo sign-in (owner 2026-11-04, Notion Part 1): accounts kept in this
// browser, passwords only as salted hashes and held to five rules, verifying
// signs you in, the one question asked only when the link didn't say, Sign
// in and Sign up each leading to the other, and the pre-paint gate.
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
const { PROFILE_KEY } = await import("../../.tmp-test/lib/people/fields.js");

const NOW = Date.UTC(2026, 10, 4, 12);
const PW = "Correct-Horse-9";
const INPUT = {
  firstName: " Rafiq ",
  lastName: "Ahmed",
  email: "Rafiq@Example.com ",
  password: PW,
  confirm: PW,
  day: "9",
  month: "3",
  year: "1994",
  consent: true,
};
const signedIn = () => !!auth.currentAccount(auth.readAccounts(), auth.readSession());

beforeEach(() => store.clear());

test("a full form has no problems; each missing or wrong field says why", () => {
  assert.deepEqual(auth.signUpProblems(INPUT, NOW), {});
  const p = auth.signUpProblems({ ...INPUT, firstName: " ", email: "nope", password: "short", confirm: "other", day: "", consent: false }, NOW);
  assert.deepEqual(Object.keys(p), ["firstName", "email", "password", "confirm", "birthday", "consent"]);
  assert.equal(auth.signUpProblems({ ...INPUT, confirm: "Correct-Horse-8" }, NOW).confirm, "The passwords don't match.");
});

test("the password rules: each one checked on its own, and what is missing said in one line", () => {
  assert.deepEqual(auth.PASSWORD_RULES.map((r) => r.id), ["length", "upper", "lower", "number", "symbol"]);
  const met = (p) => Object.fromEntries(auth.passwordChecks(p).map((c) => [c.id, c.met]));
  assert.deepEqual(met(""), { length: false, upper: false, lower: false, number: false, symbol: false });
  assert.deepEqual(met("abcdefgh"), { length: true, upper: false, lower: true, number: false, symbol: false });
  assert.deepEqual(met(PW), { length: true, upper: true, lower: true, number: true, symbol: true });
  assert.equal(auth.passwordProblem(PW), "");
  assert.equal(auth.passwordProblem("abcdefgh"), "Your password still needs an uppercase letter, a number and a symbol.");
  assert.equal(auth.passwordProblem("Abcdefg1"), "Your password still needs a symbol.");
  assert.equal(auth.passwordProblem("x".repeat(129) + "A1!"), "Use at most 128 characters.");
  assert.equal(auth.passwordProblem("Ab1! ab1!"), "");
});

test("the date of birth must be a real day, and not in the future", () => {
  assert.equal(auth.birthDateOf("9", "3", "1994", NOW), "1994-03-09");
  assert.equal(auth.birthDateOf("31", "2", "2000", NOW), "");
  assert.equal(auth.birthDateOf("29", "2", "2000", NOW), "2000-02-29");
  assert.equal(auth.birthDateOf("1", "1", "2030", NOW), "");
  assert.equal(auth.signUpProblems({ ...INPUT, day: "31", month: "2" }, NOW).birthday, "That date doesn't exist.");
});

test("signing up saves an unverified account waiting for its email: lower-case email, password only hashed", async () => {
  assert.equal(await auth.createAccount(INPUT, "", NOW), "ok");
  assert.ok(!store.get(auth.ACCOUNTS_KEY).includes(PW));
  const [a] = auth.readAccounts();
  assert.equal(a.email, "rafiq@example.com");
  assert.equal(a.firstName, "Rafiq");
  assert.equal(a.birthDate, "1994-03-09");
  assert.equal(a.consentAt, NOW);
  assert.equal(a.verifiedAt, null);
  assert.equal(a.passwordHash, await auth.hashPassword(PW, a.salt));
  assert.equal(JSON.parse(store.get(auth.VERIFY_KEY)).email, "rafiq@example.com");
  assert.equal(signedIn(), false);
});

test("an invalid form is refused and nothing is saved", async () => {
  assert.equal(await auth.createAccount({ ...INPUT, consent: false }, "", NOW), "invalid");
  assert.equal(await auth.createAccount({ ...INPUT, password: "abcdefgh", confirm: "abcdefgh" }, "", NOW), "invalid");
  assert.equal(store.has(auth.ACCOUNTS_KEY), false);
});

test("an email that already has an account is refused, so Sign up can point to Sign in", async () => {
  await auth.createAccount(INPUT, "", NOW);
  assert.equal(await auth.createAccount({ ...INPUT, email: "RAFIQ@example.com" }, "", NOW), "exists");
  assert.equal(auth.readAccounts().length, 1);
});

test("a second person can make their own account in the same browser", async () => {
  await auth.createAccount(INPUT, "", NOW);
  await auth.verifyEmail(NOW);
  await auth.signOut();
  assert.equal(await auth.createAccount({ ...INPUT, firstName: "Nila", email: "nila@example.com" }, "", NOW), "ok");
  await auth.verifyEmail(NOW);
  assert.equal(auth.readAccounts().length, 2);
  assert.equal(auth.currentAccount(auth.readAccounts(), auth.readSession()).email, "nila@example.com");
  await auth.signOut();
  assert.equal(await auth.signIn("rafiq@example.com", PW, NOW), "ok");
  assert.equal(auth.currentAccount(auth.readAccounts(), auth.readSession()).firstName, "Rafiq");
});

test("verifying signs you in, clears the wait, and fills the profile's empty name and country", async () => {
  await auth.createAccount(INPUT, "", NOW);
  assert.equal((await auth.verifyEmail(NOW + 1)).ok, true);
  const [a] = auth.readAccounts();
  assert.equal(a.verifiedAt, NOW + 1);
  assert.equal(signedIn(), true);
  assert.equal(JSON.parse(store.get(auth.VERIFY_KEY)), null);
  const profile = JSON.parse(store.get(PROFILE_KEY));
  assert.equal(profile.name, "Rafiq Ahmed");
  if (a.country) assert.ok(profile.location.length > 0);
});

test("verifying keeps a name the profile already has", async () => {
  store.set(PROFILE_KEY, JSON.stringify({ v: 2, name: "Maker R", location: "Dhaka" }));
  await auth.createAccount(INPUT, "", NOW);
  await auth.verifyEmail(NOW);
  const profile = JSON.parse(store.get(PROFILE_KEY));
  assert.equal(profile.name, "Maker R");
  assert.equal(profile.location, "Dhaka");
});

test("Wrong email?: the unverified account goes, a verified one is never touched", async () => {
  await auth.createAccount(INPUT, "", NOW);
  assert.equal(auth.discardUnverified().ok, true);
  assert.equal(auth.readAccounts().length, 0);
  await auth.createAccount(INPUT, "", NOW);
  await auth.verifyEmail(NOW);
  store.set(auth.VERIFY_KEY, JSON.stringify({ v: 1, email: "rafiq@example.com" }));
  auth.discardUnverified();
  assert.equal(auth.readAccounts().length, 1);
});

test("sign in: right pair in, unknown email and wrong password one answer, unverified sent back to its email", async () => {
  await auth.createAccount(INPUT, "", NOW);
  store.delete(auth.VERIFY_KEY);
  assert.equal(await auth.signIn("rafiq@example.com", PW, NOW), "unverified");
  assert.equal(JSON.parse(store.get(auth.VERIFY_KEY)).email, "rafiq@example.com");
  await auth.verifyEmail(NOW);
  await auth.signOut();
  assert.equal(signedIn(), false);
  assert.equal(await auth.signIn("rafiq@example.com", "Wrong-Horse-9", NOW), "wrong");
  assert.equal(await auth.signIn("someone@example.com", PW, NOW), "wrong");
  assert.equal(await auth.signIn("  RAFIQ@example.com", PW, NOW), "ok");
  assert.equal(signedIn(), true);
});

test("signing out keeps the accounts; a reset needs the rules, sets the password and signs you in", async () => {
  await auth.createAccount(INPUT, "", NOW);
  await auth.verifyEmail(NOW);
  await auth.signOut();
  assert.equal(auth.readAccounts().length, 1);
  assert.equal((await auth.resetPassword("rafiq@example.com", "short", NOW)).ok, false);
  assert.equal((await auth.resetPassword("nobody@example.com", "New-Horse-77", NOW)).ok, false);
  assert.equal((await auth.resetPassword("rafiq@example.com", "New-Horse-77", NOW)).ok, true);
  assert.equal(signedIn(), true);
  await auth.signOut();
  assert.equal(await auth.signIn("rafiq@example.com", PW, NOW), "wrong");
  assert.equal(await auth.signIn("rafiq@example.com", "New-Horse-77", NOW), "ok");
});

test("a link's utm_source answers the question, so it is never asked", async () => {
  await auth.createAccount(INPUT, " YouTube<script> ", NOW);
  const [a] = auth.readAccounts();
  assert.equal(a.source, "youtubescript");
  assert.equal(a.sourceVia, "link");
  assert.equal(auth.needsSourceQuestion(a), false);
  assert.equal(auth.showsSourceNudge(a), false);
});

test("the one question: asked once; Skip moves it to Home's nudge until answered or closed", async () => {
  await auth.createAccount(INPUT, "", NOW);
  await auth.verifyEmail(NOW);
  const me = () => auth.currentAccount(auth.readAccounts(), auth.readSession());
  assert.equal(auth.needsSourceQuestion(me()), true);
  auth.skipSource();
  assert.equal(auth.needsSourceQuestion(me()), false);
  assert.equal(auth.showsSourceNudge(me()), true);
  auth.answerSource("other", "  a  maker fair ");
  assert.deepEqual([me().source, me().sourceVia, me().sourceOther, me().sourceSkipped], ["other", "answer", "a maker fair", false]);
  assert.equal(auth.showsSourceNudge(me()), false);
  store.set(auth.ACCOUNTS_KEY, JSON.stringify([{ ...me(), source: "", sourceSkipped: true }]));
  auth.closeSourceNudge();
  assert.equal(auth.showsSourceNudge(me()), false);
});

test("Notion's chips, in its order", () => {
  assert.deepEqual(auth.SOURCES.map((s) => auth.SOURCE_WORDS[s]), ["YouTube", "Friend", "Google", "LinkedIn", "Event", "Other"]);
});

test("only Sign up, Sign in and the landing page are open without signing in; signed out goes to Sign in once an account exists", () => {
  for (const p of ["/sign-up", "/sign-up/check-email", "/sign-up/welcome", "/sign-in", "/landing", "/events", "/events/national-tour"]) assert.equal(auth.isOpenPath(p), true, p);
  for (const p of ["/", "/projects", "/sign-upx", "/landings", "/eventsx", "/settings/account", "/project/x/pcb"]) assert.equal(auth.isOpenPath(p), false, p);
  assert.equal(auth.signedOutHome([]), "/sign-up");
  assert.equal(auth.signedOutHome([{ email: "a@b.co" }]), "/sign-in");
});

test("next: only this app's own pages, never another site or the sign-in pages", () => {
  assert.equal(auth.safeNext("/projects?tab=draft"), "/projects?tab=draft");
  assert.equal(auth.safeNext("//evil.example"), "");
  assert.equal(auth.safeNext("/\\evil.example"), "");
  assert.equal(auth.safeNext("https://evil.example"), "");
  assert.equal(auth.safeNext("/sign-in?next=/x"), "");
  assert.equal(auth.safeNext(""), "");
});

test("the time zone gives the country, old browser names included", () => {
  assert.equal(auth.countryOfZone("Asia/Dhaka"), "BD");
  assert.equal(auth.countryOfZone("Asia/Calcutta"), "IN");
  assert.equal(auth.countryOfZone("Europe/Berlin"), "DE");
  assert.equal(auth.countryOfZone("Etc/UTC"), "");
  assert.equal(auth.countryOfZone(null), "");
});

test("junk in storage reads as no account and no session; duplicate emails keep the first", () => {
  for (const raw of [null, 4, "x", [], {}, { email: "a@b.co" }]) assert.equal(auth.normalizeAccount(raw), null);
  assert.deepEqual(auth.normalizeAccounts("x"), []);
  const one = { email: "a@b.co", passwordHash: "h", salt: "s", firstName: "One" };
  assert.equal(auth.normalizeAccounts([one, { ...one, firstName: "Two" }, 7]).length, 1);
  assert.equal(auth.normalizeSession({ email: "" }), null);
});

test("the front door: signed out, Home's address shows the landing page; any other page asks you in with where you were going", () => {
  assert.equal(auth.signedOutPath("/", "", []), "/landing");
  assert.equal(auth.signedOutPath("/", "?utm_source=yt&utm_medium=video", []), "/landing?utm_source=yt&utm_medium=video");
  assert.equal(auth.signedOutPath("/", "?prompt=a%20lamp", []), "/sign-up?next=%2F%3Fprompt%3Da%2520lamp");
  assert.equal(auth.signedOutPath("/marketplace", "", []), "/sign-up?next=%2Fmarketplace");
  assert.equal(auth.signedOutPath("/marketplace", "", [{ email: "a@b.co" }]), "/sign-in?next=%2Fmarketplace");
});

test("where they were going survives Sign up: kept with the waiting account, safe paths only", async () => {
  assert.equal(await auth.createAccount(INPUT, "", NOW, "/settings/plan"), "ok");
  assert.equal(auth.verifyNextOf(JSON.parse(store.get(auth.VERIFY_KEY))), "/settings/plan");
  store.clear();
  await auth.createAccount(INPUT, "", NOW, "//evil.example");
  assert.equal(auth.verifyNextOf(JSON.parse(store.get(auth.VERIFY_KEY))), "");
  store.delete(auth.VERIFY_KEY);
  assert.equal(await auth.signIn("rafiq@example.com", PW, NOW, "/marketplace"), "unverified");
  assert.equal(auth.verifyNextOf(JSON.parse(store.get(auth.VERIFY_KEY))), "/marketplace");
});

test("the pre-paint gate lets a signed-in visitor through and sends others on, as signedOutPath does", () => {
  const run = (path, search = "") => {
    let went = null;
    const html = { style: {} };
    const fn = new Function("location", "localStorage", "document", auth.AUTH_PREPAINT);
    fn({ pathname: path, search, replace: (u) => (went = u) }, globalThis.localStorage, { documentElement: html });
    return went;
  };
  for (const [path, search] of [["/", ""], ["/", "?utm_source=yt"], ["/", "?prompt=x"], ["/projects", "?tab=draft"], ["/marketplace", ""]]) {
    assert.equal(run(path, search), auth.signedOutPath(path, search, []), `${path}${search}, no account`);
  }
  assert.equal(run("/sign-up"), null);
  assert.equal(run("/landing"), null);
  assert.equal(run("/events/hardware-hackathon"), null);
  store.set(auth.ACCOUNTS_KEY, JSON.stringify([{ email: "a@b.co", verifiedAt: NOW }]));
  assert.equal(run("/projects", "?tab=draft"), "/sign-in?next=%2Fprojects%3Ftab%3Ddraft");
  assert.equal(run("/"), "/landing");
  store.set(auth.SESSION_KEY, JSON.stringify({ v: 1, email: "A@B.co", at: NOW }));
  assert.equal(run("/projects"), null);
  assert.equal(run("/"), null);
  store.set(auth.ACCOUNTS_KEY, JSON.stringify([{ email: "a@b.co", verifiedAt: null }]));
  assert.equal(run("/projects"), "/sign-in?next=%2Fprojects");
});
