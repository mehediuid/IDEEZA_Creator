// Sign-in & security on the phone (mobile Figma AU-07, AU-40…45, AU-60…65):
// authenticator codes (RFC 6238), backup codes, the 2-step lock, devices,
// a scheduled deletion, and the additive auth and phone helpers it uses
// (change password, change email, remove an account, disconnect a provider).
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

const sec = await import("../../.tmp-test/lib/account/security.js");
const auth = await import("../../.tmp-test/lib/account/auth.js");
const phone = await import("../../.tmp-test/lib/account/phone.js");

const NOW = Date.UTC(2026, 10, 5, 9);

beforeEach(() => store.clear());

test("base32 round-trips and the setup key reads in fours", () => {
  const bytes = new Uint8Array([72, 101, 108, 108, 111, 33, 222, 173, 190, 239]);
  const key = sec.base32Encode(bytes);
  assert.equal(key.length, 16);
  assert.deepEqual([...sec.base32Decode(key.toLowerCase())], [...bytes]);
  assert.equal(sec.keyInFours("JBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP");
  assert.equal(sec.base32Decode("JBSW 1"), null);
  assert.match(sec.newTotpSecret(), /^[A-Z2-7]{16}$/);
});

test("authenticator codes follow RFC 6238 (SHA-1, 30 s, 6 digits)", async () => {
  // RFC 6238 appendix B: the key "12345678901234567890"; 8-digit 94287082 at 59 s → 287082.
  const secret = sec.base32Encode(new TextEncoder().encode("12345678901234567890"));
  assert.equal(await sec.totpAt(secret, 59_000), "287082");
  assert.equal(await sec.totpAt(secret, 1_111_111_109_000), "081804");
  assert.equal(await sec.totpMatches(secret, "287082", 59_000 + 30_000), true, "one step late still works");
  assert.equal(await sec.totpMatches(secret, "287082", 59_000 + 95_000), false);
  assert.equal(await sec.totpMatches(secret, "28708", 59_000), false);
  assert.equal(sec.totpSecondsLeft(59_000), 1);
});

test("ten different backup codes, each works once", () => {
  let seed = 7;
  const codes = sec.newBackupCodes(() => (seed = (seed * 48271) % 2147483647) / 2147483647);
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes.map((c) => c.code)).size, 10);
  for (const c of codes) assert.match(c.code, /^\d{4}-\d{4}$/);
  const on = sec.twoStepOn(sec.normalizeAccountSecurity({}), "JBSWY3DPEHPK3PXP", codes, NOW, 111);
  const first = sec.redeemBackupCode(on, codes[3].code.replace("-", " "), 222);
  assert.equal(first.result, "ok");
  assert.equal(first.security.passedAt, 222);
  assert.equal(sec.backupLeft(first.security), 9);
  assert.equal(sec.redeemBackupCode(first.security, codes[3].code, 333).result, "wrong");
  assert.equal(sec.redeemBackupCode(first.security, "1234", 333).result, "wrong");
});

test("2-step is owed once per session, unless this phone is trusted", async () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const on = sec.twoStepOn(sec.normalizeAccountSecurity({}), secret, sec.newBackupCodes(), NOW, 100);
  assert.equal(sec.needsTwoStep(on, 100, "d-1"), false, "turning it on passes this session");
  assert.equal(sec.needsTwoStep(on, 200, "d-1"), true, "a new sign-in owes the code");
  const code = await sec.totpAt(secret, NOW);
  const ok = await sec.checkTwoStepCode(on, code, NOW, 200, "d-1");
  assert.equal(ok.result, "ok");
  assert.equal(sec.needsTwoStep(ok.security, 200, "d-1"), false);
  assert.equal(sec.needsTwoStep(ok.security, 300, "d-1"), false, "Don't ask again on this phone");
  assert.equal(sec.needsTwoStep(ok.security, 300, "d-2"), true, "another phone still asks");
  assert.equal(sec.needsTwoStep(sec.twoStepOff(ok.security), 300, "d-2"), false);
});

test("five wrong 2-step codes lock it for 5 minutes", async () => {
  let s = sec.twoStepOn(sec.normalizeAccountSecurity({}), "JBSWY3DPEHPK3PXP", sec.newBackupCodes(), NOW, 1);
  const wrong = (await sec.totpAt("JBSWY3DPEHPK3PXP", NOW)) === "000000" ? "111111" : "000000";
  for (let n = 1; n <= 4; n++) {
    const r = await sec.checkTwoStepCode(s, wrong, NOW, 2, null);
    assert.equal(r.result, "wrong");
    s = r.security;
  }
  const fifth = await sec.checkTwoStepCode(s, wrong, NOW, 2, null);
  assert.equal(fifth.result, "locked");
  assert.equal(sec.twoStepLockedFor(fifth.security, NOW), 5 * 60_000);
  const right = await sec.totpAt("JBSWY3DPEHPK3PXP", NOW + 1000);
  assert.equal((await sec.checkTwoStepCode(fifth.security, right, NOW + 1000, 2, null)).result, "locked");
  assert.equal(sec.redeemBackupCode(fifth.security, fifth.security.twoStep.backup[0].code, 2).result, "ok", "a backup code still works");
});

test("the record is read field by field and kept by email", () => {
  const bad = sec.normalizeSecurity({ "Rafi@Mail.com": { twoStep: { secret: "nope" }, devices: [{ id: "" }, { id: "x", name: "Pixel" }], deletion: { until: 0 } } });
  const r = sec.securityOf(bad, "rafi@mail.com");
  assert.equal(r.twoStep, null);
  assert.equal(r.devices.length, 1);
  assert.equal(r.deletion, null);
  assert.ok(sec.updateSecurity("rafi@mail.com", (s) => ({ ...s, passwordChangedAt: NOW })).ok);
  assert.ok(sec.moveSecurity("rafi@mail.com", "rafi.ahmed@mail.com").ok);
  assert.equal(sec.securityOf(sec.readSecurity(), "rafi.ahmed@mail.com").passwordChangedAt, NOW);
  assert.equal(sec.securityOf(sec.readSecurity(), "rafi@mail.com").passwordChangedAt, 0);
});

test("devices: what the browser says, signing out the others, the demo phone", () => {
  assert.deepEqual(sec.deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17.0 Mobile Safari/604.1", true), { name: "iPhone", os: "iOS", app: "IDEEZA app" });
  assert.deepEqual(sec.deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36", false), { name: "Mac", os: "macOS", app: "Chrome" });
  assert.equal(sec.cityOfZone("America/New_York"), "New York");
  const withDemo = sec.withDemoDevice(sec.normalizeAccountSecurity({}), NOW);
  assert.equal(withDemo.devices.length, 1);
  assert.equal(sec.withDemoDevice(withDemo, NOW).devices.length, 1, "one demo phone at most");
  assert.equal(sec.withoutOtherDevices(withDemo, "me").devices.length, 0);
  const id = sec.thisDeviceId(() => 0.5);
  assert.equal(sec.thisDeviceId(() => 0.1), id, "made once");
});

test("a deletion waits 30 days, then is due; restoring cancels it", () => {
  const s = sec.scheduleDeletion(sec.normalizeAccountSecurity({}), NOW, "  Privacy worries ");
  assert.equal(s.deletion.until - NOW, 30 * 24 * 60 * 60_000);
  assert.equal(s.deletion.reason, "Privacy worries");
  assert.equal(sec.deletionStateOf(s, NOW + 1000), "scheduled");
  assert.equal(sec.deletionStateOf(s, s.deletion.until), "due");
  assert.equal(sec.deletionStateOf(sec.cancelDeletion(s), NOW), "none");
  assert.equal(sec.owesRestore(s, NOW - 5, NOW + 1000), false, "not in the session that asked for it");
  assert.equal(sec.owesRestore(s, NOW + 500, NOW + 1000), true, "on the next sign-in");
  assert.equal(sec.owesRestore(s, NOW - 5, s.deletion.until + 1), true, "once due, whatever the session");
  assert.equal(sec.owedOf(s, NOW + 500, "d", NOW + 1000), "restore");
  const both = sec.twoStepOn(s, "JBSWY3DPEHPK3PXP", sec.newBackupCodes(), NOW, 1);
  assert.equal(sec.owedOf(both, NOW + 500, "d", NOW + 1000), "two-step", "the code comes first");
  assert.equal(sec.owedOf(sec.normalizeAccountSecurity({}), NOW, "d", NOW), null);
});

const signUp = async (email, password = "Old-Horse-77") => {
  await auth.createAccount(
    { firstName: "Rafi", lastName: "Karim", email, password, confirm: password, day: "1", month: "2", year: "1995", consent: true },
    "",
    NOW,
  );
  await auth.verifyEmail(NOW);
};

test("a new password replaces the old one without touching the session", async () => {
  await signUp("rafi@mail.com");
  const before = auth.readSession();
  assert.equal((await auth.setAccountPassword("rafi@mail.com", "short", phone.phonePasswordProblem)).ok, false);
  assert.ok((await auth.setAccountPassword("rafi@mail.com", "New-horse-7!", phone.phonePasswordProblem)).ok);
  assert.equal(await auth.isCurrentPassword("rafi@mail.com", "New-horse-7!"), true);
  assert.equal(await auth.isCurrentPassword("rafi@mail.com", "Old-Horse-77"), false);
  assert.deepEqual(auth.readSession(), before);
});

test("changing the email moves the account and the session; a taken email is refused", async () => {
  await signUp("other@mail.com");
  await signUp("rafi@mail.com");
  assert.equal(auth.changeAccountEmail("other@mail.com"), "exists");
  assert.equal(auth.changeAccountEmail("not an email"), "invalid");
  assert.equal(auth.changeAccountEmail("Rafi.Ahmed@mail.com"), "ok");
  assert.equal(auth.readSession().email, "rafi.ahmed@mail.com");
  assert.equal(auth.currentAccount(auth.readAccounts(), auth.readSession())?.email, "rafi.ahmed@mail.com");
  assert.equal(await auth.isCurrentPassword("rafi.ahmed@mail.com", "Old-Horse-77"), true);
});

test("removing an account drops it, its parked work and its session", async () => {
  await signUp("rafi@mail.com");
  store.set("ideeza:parked:rafi%40mail.com:ideeza:settings", "{}");
  store.set("ideeza:settings", "{}");
  store.set("ideeza:parked:other%40mail.com:ideeza:settings", "{}");
  assert.ok(auth.removeAccount("rafi@mail.com").ok);
  assert.equal(auth.accountOf(auth.readAccounts(), "rafi@mail.com"), null);
  assert.equal(auth.readSession(), null);
  assert.equal(store.has("ideeza:parked:rafi%40mail.com:ideeza:settings"), false);
  assert.equal(store.has("ideeza:settings"), false, "the work they had out goes too");
  assert.equal(store.has("ideeza:parked:other%40mail.com:ideeza:settings"), true);
});

test("a provider can't be disconnected while it is the only way in", () => {
  phone.linkProvider("rafi@mail.com", "facebook", true);
  const a = phone.phoneAccountOf(phone.readPhoneAccounts(), "rafi@mail.com");
  assert.equal(phone.isLastWayIn(a, "facebook"), true);
  assert.equal(phone.unlinkProvider("rafi@mail.com", "facebook").ok, false);
  phone.linkProvider("rafi@mail.com", "google");
  assert.ok(phone.unlinkProvider("rafi@mail.com", "facebook").ok);
  assert.deepEqual(phone.phoneAccountOf(phone.readPhoneAccounts(), "rafi@mail.com").providers, ["google"]);
  assert.ok(phone.movePhoneAccount("rafi@mail.com", "rafi.ahmed@mail.com").ok);
  assert.deepEqual(phone.phoneAccountOf(phone.readPhoneAccounts(), "rafi.ahmed@mail.com").providers, ["google"]);
});
