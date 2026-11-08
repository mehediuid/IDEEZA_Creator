// The demo sign-in (owner, 2026-11-04): Notion Part 1's sign-up flow, with
// nothing behind it but this browser, like the rest of the app. The accounts
// made here in `ideeza:accounts`, who is signed in in `ideeza:session`, the
// account waiting for its email to be verified in `ideeza:verify` — all
// through the shared key store so every reader agrees without a reload.
// Passwords are kept only as salted PBKDF2 hashes. Each account has its own
// work (work-vault.ts): signing out parks it under the account, signing in
// brings it back, and a new account starts from nothing.
//
// Sign up → the "email" (a Demo card in the app) → verifying signs you in →
// one question (where you heard of IDEEZA) unless the link already said →
// Home. Your country is saved to your profile from the browser's time zone.
// Relative imports only, so node:test can load it.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { readProfileFields, saveProfile } from "../people/profile-store";
import { countryCodeOf, countryNameOf } from "./countries";
import { enterWork, parkWork } from "./work-vault";
import { ZONE_COUNTRIES } from "./zone-countries";

export const ACCOUNTS_KEY = "ideeza:accounts";
export const SESSION_KEY = "ideeza:session";
export const VERIFY_KEY = "ideeza:verify";

export const NAME_PART_MAX = 40;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const OTHER_MAX = 60;

/** Notion Part 1's chips, in its order. */
export const SOURCES = ["youtube", "friend", "google", "linkedin", "event", "other"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_WORDS: Record<Source, string> = {
  youtube: "YouTube",
  friend: "Friend",
  google: "Google",
  linkedin: "LinkedIn",
  event: "Event",
  other: "Other",
};

export type Account = {
  v: 1;
  firstName: string;
  lastName: string;
  /** Lower case, so signing in ignores how it was typed. */
  email: string;
  passwordHash: string;
  salt: string;
  /** "YYYY-MM-DD". */
  birthDate: string;
  /** When the Terms and Privacy box was ticked. */
  consentAt: number;
  createdAt: number;
  verifiedAt: number | null;
  /** Where they heard of IDEEZA: the link's utm_source, or their answer; "" when unknown. */
  source: string;
  sourceVia: "" | "link" | "answer";
  /** What they typed under Other. */
  sourceOther: string;
  /** They skipped the question, so Home asks again until they answer or close it. */
  sourceSkipped: boolean;
  nudgeClosed: boolean;
  /** ISO code, from the browser's time zone; "" when it couldn't tell. */
  country: string;
};

export type Session = { v: 1; email: string; at: number };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const time = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  return e.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** The account stored here, or null when there is none or it can't be read. */
export function normalizeAccount(raw: unknown): Account | null {
  if (!isObj(raw)) return null;
  const email = typeof raw.email === "string" ? normalizeEmail(raw.email) : "";
  const passwordHash = typeof raw.passwordHash === "string" ? raw.passwordHash : "";
  const salt = typeof raw.salt === "string" ? raw.salt : "";
  if (!isEmail(email) || !passwordHash || !salt) return null;
  const via = raw.sourceVia === "link" || raw.sourceVia === "answer" ? raw.sourceVia : "";
  const source = str(raw.source, 40);
  return {
    v: 1,
    firstName: str(raw.firstName, NAME_PART_MAX),
    lastName: str(raw.lastName, NAME_PART_MAX),
    email,
    passwordHash,
    salt,
    birthDate: typeof raw.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.birthDate) ? raw.birthDate : "",
    consentAt: time(raw.consentAt) ?? 0,
    createdAt: time(raw.createdAt) ?? 0,
    verifiedAt: time(raw.verifiedAt),
    source,
    sourceVia: source ? via : "",
    sourceOther: str(raw.sourceOther, OTHER_MAX),
    sourceSkipped: !source && raw.sourceSkipped === true,
    nudgeClosed: raw.nudgeClosed === true,
    country: countryCodeOf(raw.country) ?? "",
  };
}

export function normalizeSession(raw: unknown): Session | null {
  if (!isObj(raw) || typeof raw.email !== "string" || !raw.email) return null;
  return { v: 1, email: normalizeEmail(raw.email), at: time(raw.at) ?? 0 };
}

/** Every readable account, one per email (the first kept). */
export function normalizeAccounts(raw: unknown): Account[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Account[] = [];
  for (const item of raw) {
    const a = normalizeAccount(item);
    if (a && !seen.has(a.email)) {
      seen.add(a.email);
      out.push(a);
    }
  }
  return out;
}

/** The account waiting for its email to be verified, by its email. */
export function normalizeVerify(raw: unknown): string {
  return isObj(raw) && typeof raw.email === "string" ? normalizeEmail(raw.email) : "";
}

/** Where the waiting account goes once verified (the page it set out for). */
export function verifyNextOf(raw: unknown): string {
  return isObj(raw) && typeof raw.next === "string" ? safeNext(raw.next) : "";
}

export function accountOf(accounts: Account[], email: string): Account | null {
  const e = normalizeEmail(email);
  return accounts.find((a) => a.email === e) ?? null;
}

/** Who is signed in: the session's account, its email verified. */
export function currentAccount(accounts: Account[], session: Session | null): Account | null {
  const a = session ? accountOf(accounts, session.email) : null;
  return a && a.verifiedAt !== null ? a : null;
}

/** Where a signed-out visitor goes: Sign in once this browser has an account, else Sign up. */
export function signedOutHome(accounts: Account[]): "/sign-in" | "/sign-up" {
  return accounts.length ? "/sign-in" : "/sign-up";
}

/** The front door (owner 2026-11-04: one domain): a signed-out visitor to
 *  Home's own address, with nothing but a campaign tag, sees the landing page;
 *  any other page asks them to sign in (or up), carrying where they were going. */
export function signedOutPath(pathname: string, search: string, accounts: Account[]): string {
  const query = new URLSearchParams(search);
  const onlyTags = [...query.keys()].every((k) => k.startsWith("utm_"));
  if (pathname === "/" && onlyTags) return `/landing${search}`;
  return `${signedOutHome(accounts)}?next=${encodeURIComponent(pathname + search)}`;
}

/** A path to return to after signing in: this app's own, never Sign in or Sign up again. */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "";
  return isOpenPath(raw.split(/[?#]/)[0]) ? "" : raw;
}

/** The pages anyone can open: Sign up, Sign in and the public website — the
 *  landing page (/landing) and the Events pages (/events, /events/<slug>).
 *  Every other page needs you signed in. */
export function isOpenPath(pathname: string): boolean {
  return /^\/(sign-up|sign-in|landing|events)(\/|$)/.test(pathname);
}

/** The one question is asked once, right after verifying, when the link didn't say. */
export function needsSourceQuestion(account: Account): boolean {
  return !account.source && !account.sourceSkipped;
}

/** Home's profile card: they skipped the question and haven't answered or closed it. */
export function showsSourceNudge(account: Account): boolean {
  return !account.source && account.sourceSkipped && !account.nudgeClosed;
}

/** A link's utm_source, kept as a short lower-case word; "" when there is none. */
export function sourceFromUtm(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
}

/** The country a time zone is in, as an ISO code; "" when unknown. */
export function countryOfZone(zone: string | null | undefined): string {
  return (zone && ZONE_COUNTRIES[zone]) || "";
}

function deviceCountry(): string {
  try {
    const byZone = countryOfZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (byZone) return byZone;
    const region = new Intl.Locale(navigator.language).maximize().region;
    return countryCodeOf(region) ?? "";
  } catch {
    return "";
  }
}

// ─────────────────────────── the sign-up form ───────────────────────────

export type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirm: string;
  day: string;
  month: string;
  year: string;
  consent: boolean;
};

export type SignUpField = "firstName" | "lastName" | "email" | "password" | "confirm" | "birthday" | "consent";

/** "YYYY-MM-DD" when day, month and year make a real date before `now`; "" otherwise. */
export function birthDateOf(day: string, month: string, year: string, now: number): string {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || y < 1900) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "";
  if (date.getTime() > now) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** The rules a new password has to meet, in the order the checker lists them. */
export const PASSWORD_RULES = [
  { id: "length", label: `At least ${PASSWORD_MIN} characters`, need: `at least ${PASSWORD_MIN} characters`, test: (p: string) => p.length >= PASSWORD_MIN },
  { id: "upper", label: "An uppercase letter (A–Z)", need: "an uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter (a–z)", need: "a lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "A number (0–9)", need: "a number", test: (p: string) => /\d/.test(p) },
  { id: "symbol", label: "A symbol, like ! @ # $", need: "a symbol", test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
] as const;

export type PasswordRuleId = (typeof PASSWORD_RULES)[number]["id"];

/** Each rule and whether the password meets it. */
export function passwordChecks(password: string): { id: PasswordRuleId; label: string; met: boolean }[] {
  return PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, met: r.test(password) }));
}

/** What the password still needs, as one sentence; "" when it meets every rule. */
export function passwordProblem(password: string): string {
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  const missing = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.need);
  if (!missing.length) return "";
  const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  return `Your password still needs ${list}.`;
}

/** What is wrong with each field, in the form's order; empty when it can be sent. */
export function signUpProblems(input: SignUpInput, now: number): Partial<Record<SignUpField, string>> {
  const out: Partial<Record<SignUpField, string>> = {};
  if (!str(input.firstName, NAME_PART_MAX)) out.firstName = "Enter your first name.";
  if (!str(input.lastName, NAME_PART_MAX)) out.lastName = "Enter your last name.";
  if (!input.email.trim()) out.email = "Enter your email.";
  else if (!isEmail(input.email)) out.email = "Enter an email like name@example.com.";
  const pw = passwordProblem(input.password);
  if (pw) out.password = pw;
  if (!input.confirm) out.confirm = "Type the password again.";
  else if (input.confirm !== input.password) out.confirm = "The passwords don't match.";
  if (!input.day || !input.month || !input.year) out.birthday = "Choose your day, month and year of birth.";
  else if (!birthDateOf(input.day, input.month, input.year, now)) out.birthday = "That date doesn't exist.";
  if (!input.consent) out.consent = "Agree to the Privacy policy and Terms to continue.";
  return out;
}

// ─────────────────────────── the password ───────────────────────────

const ITERATIONS = 100_000;

const hex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function fromHex(s: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(s.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function newSalt(): string {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

/** PBKDF2-SHA-256 of the password with the salt, as hex. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations: ITERATIONS },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

// ─────────────────────────── the store ───────────────────────────

const isArr = (v: unknown) => Array.isArray(v);

export function readAccounts(): Account[] {
  return normalizeAccounts(parseStored(readStoredKey(ACCOUNTS_KEY)).value);
}

export function readSession(): Session | null {
  return normalizeSession(parseStored(readStoredKey(SESSION_KEY)).value);
}

function readVerify(): string {
  return normalizeVerify(parseStored(readStoredKey(VERIFY_KEY)).value);
}

function writeAccounts(accounts: Account[]): WriteResult {
  if (storedUnreadable(ACCOUNTS_KEY, isArr)) return { ok: false };
  return writeStoredKey(ACCOUNTS_KEY, accounts);
}

/** Saves `next` over the account with the same email. */
function saveAccount(next: Account): WriteResult {
  const all = readAccounts();
  return writeAccounts(all.some((a) => a.email === next.email) ? all.map((a) => (a.email === next.email ? next : a)) : [...all, next]);
}

function startSession(email: string, now: number): WriteResult {
  return writeStoredKey(SESSION_KEY, { v: 1, email, at: now } satisfies Session);
}

/** The signed-in account, read now. */
function readCurrent(): Account | null {
  return currentAccount(readAccounts(), readSession());
}

/** `email` comes in: whoever is signed in parks their work, and `email`'s comes back. Loose work
 *  from before accounts kept their own stays with it, unless it is new while others exist: then
 *  it was the newest other account's. */
async function comeIn(email: string, isNew: boolean): Promise<void> {
  const current = readSession()?.email ?? "";
  if (current === email) return;
  if (current) await parkWork(current);
  const others = readAccounts()
    .filter((a) => a.email !== email && a.verifiedAt !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
  await enterWork(email, isNew && others.length ? others[0].email : email);
}

export type CreateResult = "ok" | "exists" | "invalid" | "refused";

/** Saves a new, unverified account and marks it as the one waiting for its
 *  email; nobody is signed in until it is verified. An email already here is
 *  refused, so Sign up can point to Sign in. */
export async function createAccount(input: SignUpInput, utmSource: string, now: number, next = ""): Promise<CreateResult> {
  const birthDate = birthDateOf(input.day, input.month, input.year, now);
  if (Object.keys(signUpProblems(input, now)).length || !birthDate) return "invalid";
  const email = normalizeEmail(input.email);
  if (accountOf(readAccounts(), email)) return "exists";
  const salt = newSalt();
  const source = sourceFromUtm(utmSource);
  const saved = saveAccount({
    v: 1,
    firstName: str(input.firstName, NAME_PART_MAX),
    lastName: str(input.lastName, NAME_PART_MAX),
    email,
    passwordHash: await hashPassword(input.password, salt),
    salt,
    birthDate,
    consentAt: now,
    createdAt: now,
    verifiedAt: null,
    source,
    sourceVia: source ? "link" : "",
    sourceOther: "",
    sourceSkipped: false,
    nudgeClosed: false,
    country: "",
  });
  if (!saved.ok) return "refused";
  return writeStoredKey(VERIFY_KEY, { v: 1, email, next: safeNext(next) }).ok ? "ok" : "refused";
}

/** The verify link: marks the waiting account verified, signs it in (a new
 *  account with nothing yet), and fills your profile's name and country where
 *  they are still empty. Reload the page after it. */
export async function verifyEmail(now: number): Promise<WriteResult> {
  const account = accountOf(readAccounts(), readVerify());
  if (!account) return { ok: false };
  const country = account.country || deviceCountry();
  const saved = saveAccount({ ...account, verifiedAt: account.verifiedAt ?? now, country });
  if (!saved.ok) return saved;
  await comeIn(account.email, account.verifiedAt === null);
  const profile = readProfileFields();
  const patch: { name?: string; location?: string } = {};
  if (!profile.name) patch.name = `${account.firstName} ${account.lastName}`.trim();
  if (!profile.location && country) patch.location = countryNameOf(country);
  if (patch.name || patch.location) saveProfile(patch);
  writeStoredKey(VERIFY_KEY, null);
  return startSession(account.email, now);
}

/** "Wrong email?": the waiting, never-verified account is dropped, so Sign up
 *  can start again; a verified one is never touched. */
export function discardUnverified(): WriteResult {
  const email = readVerify();
  const all = readAccounts();
  const target = accountOf(all, email);
  if (target && target.verifiedAt === null) {
    const saved = writeAccounts(all.filter((a) => a.email !== email));
    if (!saved.ok) return saved;
  }
  return writeStoredKey(VERIFY_KEY, null);
}

export type SignInResult = "ok" | "wrong" | "unverified" | "refused";

/** One answer for an unknown email and a wrong password alike. An account
 *  whose email isn't verified yet becomes the one waiting, and goes back to
 *  Check your email. */
/** Signs in with the account's own work. Reload the page after "ok". */
export async function signIn(email: string, password: string, now: number, next = ""): Promise<SignInResult> {
  const account = accountOf(readAccounts(), email);
  if (!account) return "wrong";
  if ((await hashPassword(password, account.salt)) !== account.passwordHash) return "wrong";
  if (account.verifiedAt === null) return writeStoredKey(VERIFY_KEY, { v: 1, email: account.email, next: safeNext(next) }).ok ? "unverified" : "refused";
  await comeIn(account.email, false);
  return startSession(account.email, now).ok ? "ok" : "refused";
}

/** Parks the account's work and signs it out. Reload the page after it. */
export async function signOut(): Promise<WriteResult> {
  const email = readSession()?.email;
  if (email) await parkWork(email);
  return writeStoredKey(SESSION_KEY, null);
}

/** The reset link: a new password for that email's account, and you're signed
 *  in. Opening the link proves the email, so it counts as verified. */
export async function resetPassword(email: string, password: string, now: number): Promise<WriteResult> {
  const account = accountOf(readAccounts(), email);
  if (!account || passwordProblem(password)) return { ok: false };
  const salt = newSalt();
  const saved = saveAccount({ ...account, salt, passwordHash: await hashPassword(password, salt), verifiedAt: account.verifiedAt ?? now });
  if (!saved.ok) return saved;
  await comeIn(account.email, account.verifiedAt === null);
  return startSession(account.email, now);
}

export function answerSource(source: Source, other: string): WriteResult {
  const account = readCurrent();
  if (!account) return { ok: false };
  return saveAccount({
    ...account,
    source,
    sourceVia: "answer",
    sourceOther: source === "other" ? str(other, OTHER_MAX) : "",
    sourceSkipped: false,
  });
}

export function skipSource(): WriteResult {
  const account = readCurrent();
  if (!account) return { ok: false };
  return saveAccount({ ...account, sourceSkipped: true });
}

export function closeSourceNudge(): WriteResult {
  const account = readCurrent();
  if (!account) return { ok: false };
  return saveAccount({ ...account, nudgeClosed: true });
}

/** The accounts, who is signed in, and the account waiting for its email, live.
 *  `hydrated` is false until the browser's copy is read. */
export function useAuth(): {
  hydrated: boolean;
  accounts: Account[];
  account: Account | null;
  waiting: Account | null;
  /** The page the waiting account set out for, to go on to once verified. */
  waitingNext: string;
  signedIn: boolean;
} {
  const a = useStoredKey(ACCOUNTS_KEY);
  const s = useStoredKey(SESSION_KEY);
  const v = useStoredKey(VERIFY_KEY);
  return React.useMemo(() => {
    const accounts = normalizeAccounts(parseStored(a.raw).value);
    const account = currentAccount(accounts, normalizeSession(parseStored(s.raw).value));
    const verify = parseStored(v.raw).value;
    const w = accountOf(accounts, normalizeVerify(verify));
    return {
      hydrated: a.hydrated && s.hydrated && v.hydrated,
      accounts,
      account,
      waiting: w && w.verifiedAt === null ? w : null,
      waitingNext: verifyNextOf(verify),
      signedIn: !!account,
    };
  }, [a.hydrated, a.raw, s.hydrated, s.raw, v.hydrated, v.raw]);
}

/** Runs in <head> before the first paint, so no page flashes before the
 *  gate: the same rule as `currentAccount` and `signedOutPath`. A signed-out
 *  visitor to Home's own address (nothing but utm_ tags) sees the landing page;
 *  to any other page but the open ones (`isOpenPath`), Sign in, or Sign up when
 *  this browser has no account, carrying the page they opened (`next`). */
export const AUTH_PREPAINT = `(function(){try{var p=location.pathname;if(/^\\/(sign-up|sign-in|landing|events)(\\/|$)/.test(p))return;var a=JSON.parse(localStorage.getItem("${ACCOUNTS_KEY}")||"[]"),s=JSON.parse(localStorage.getItem("${SESSION_KEY}")||"null");if(!Array.isArray(a))a=[];var e=s&&typeof s.email==="string"?s.email.trim().toLowerCase():"";for(var i=0;i<a.length;i++)if(a[i]&&e&&a[i].email===e&&a[i].verifiedAt)return;document.documentElement.style.visibility="hidden";var q=location.search,t=!q||q.slice(1).split("&").every(function(k){return k.indexOf("utm_")===0});location.replace(p==="/"&&t?"/landing"+q:(a.length?"/sign-in":"/sign-up")+"?next="+encodeURIComponent(p+q));}catch(x){}})();`;
