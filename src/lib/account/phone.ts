// The mobile prototype's own way in (mobile Figma "Account · 2026 update",
// AU-01…33). The accounts themselves are the web's (auth.ts) — one person, one
// account, on either — and this keeps only what the phone adds: the six-digit
// codes for verifying and resetting, the sign-in tries, how each account signs
// in on the phone (Google, Facebook, a password), and what this phone
// remembers (the tour to start, the link's campaign tag). The password rules are the web's, so a
// password made on the phone works on the web too. Relative imports only, so
// node:test can load it.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { PASSWORD_RULES, normalizeEmail, passwordProblem, sourceFromUtm, type PasswordRuleId } from "./auth";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** "4:59" — what a countdown shows (minutes, then two-digit seconds). */
export function clockOf(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─────────────────────────── the password (AU-10, AU-32) ───────────────────────────

/** The web's five rules (auth.ts), in the checklist's order: one account works on both. */
export const PHONE_PASSWORD_RULES = PASSWORD_RULES;

export type PhonePasswordRule = PasswordRuleId;

/** Each rule, in the checklist's order, and whether the password meets it. */
export function phonePasswordChecks(password: string): { id: PhonePasswordRule; label: string; met: boolean }[] {
  return PHONE_PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, met: r.test(password) }));
}

/** "" when the password meets every rule; otherwise what it still needs, in the web's sentence. */
export function phonePasswordProblem(password: string): string {
  return passwordProblem(password);
}

// ─────────────────────────── six-digit codes (AU-12, AU-31) ───────────────────────────

export const CODE_KEY = "ideeza:m:code";
export const CODE_LENGTH = 6;
/** A code works for 10 minutes. */
export const CODE_TTL_MS = 10 * 60_000;
/** "Resend in 0:30". */
export const RESEND_AFTER_MS = 30_000;
/** Five wrong codes lock the step for 10 minutes ("Too many tries · Try again in 10:00"). */
export const CODE_TRIES = 5;
export const CODE_LOCK_MS = 10 * 60_000;

export type CodePurpose = "verify" | "reset";

export type CodeRecord = {
  v: 1;
  purpose: CodePurpose;
  email: string;
  code: string;
  sentAt: number;
  tries: number;
  lockedUntil: number;
};

export function normalizeCode(raw: unknown): CodeRecord | null {
  if (!isObj(raw)) return null;
  const purpose = raw.purpose === "verify" || raw.purpose === "reset" ? raw.purpose : null;
  const code = typeof raw.code === "string" && /^\d{6}$/.test(raw.code) ? raw.code : "";
  const email = typeof raw.email === "string" ? normalizeEmail(raw.email) : "";
  if (!purpose || !code || !email) return null;
  return {
    v: 1,
    purpose,
    email,
    code,
    sentAt: num(raw.sentAt),
    tries: Math.min(CODE_TRIES, Math.floor(num(raw.tries))),
    lockedUntil: num(raw.lockedUntil),
  };
}

/** Six digits, never starting with 0 so it reads as six. */
export function newCode(random: () => number = Math.random): string {
  return String(100000 + Math.floor(random() * 900000));
}

export type CodeCheck = "ok" | "wrong" | "expired" | "locked";

/** Checks what was typed against the record; the record comes back with the try counted. */
export function checkCode(record: CodeRecord, typed: string, now: number): { result: CodeCheck; record: CodeRecord } {
  if (now < record.lockedUntil) return { result: "locked", record };
  if (now - record.sentAt > CODE_TTL_MS) return { result: "expired", record };
  if (typed === record.code) return { result: "ok", record: { ...record, tries: 0 } };
  const tries = record.tries + 1;
  if (tries >= CODE_TRIES) return { result: "locked", record: { ...record, tries: 0, lockedUntil: now + CODE_LOCK_MS } };
  return { result: "wrong", record: { ...record, tries } };
}

/** How long until another code can be sent: the lock, else 30 s after the last one. */
export function resendWait(record: CodeRecord, now: number): number {
  return Math.max(0, record.lockedUntil - now, record.sentAt + RESEND_AFTER_MS - now);
}

export function readCode(): CodeRecord | null {
  return normalizeCode(parseStored(readStoredKey(CODE_KEY)).value);
}

export function saveCode(record: CodeRecord | null): WriteResult {
  return writeStoredKey(CODE_KEY, record);
}

/** Sends a new code for this step (the demo's "email" is the inbox sheet), unless the step is locked. */
export function issueCode(purpose: CodePurpose, email: string, now: number, random: () => number = Math.random): CodeRecord | null {
  const e = normalizeEmail(email);
  const old = readCode();
  const lockedUntil = old && old.purpose === purpose && old.email === e && now < old.lockedUntil ? old.lockedUntil : 0;
  if (lockedUntil) return old;
  const record: CodeRecord = { v: 1, purpose, email: e, code: newCode(random), sentAt: now, tries: 0, lockedUntil: 0 };
  return saveCode(record).ok ? record : null;
}

export function useCode(): { hydrated: boolean; code: CodeRecord | null } {
  const k = useStoredKey(CODE_KEY);
  return React.useMemo(() => ({ hydrated: k.hydrated, code: normalizeCode(parseStored(k.raw).value) }), [k.hydrated, k.raw]);
}

// ─────────────────────────── sign-in tries (AU-05g) ───────────────────────────

export const TRIES_KEY = "ideeza:m:sign-in-tries";
/** Five wrong tries for an email lock its sign-in for 5 minutes. */
export const SIGN_IN_TRIES = 5;
export const SIGN_IN_LOCK_MS = 5 * 60_000;

export type SignInTries = Record<string, { wrong: number; lockedUntil: number }>;

export function normalizeTries(raw: unknown): SignInTries {
  if (!isObj(raw)) return {};
  const out: SignInTries = {};
  for (const [email, v] of Object.entries(raw)) {
    if (isObj(v)) out[normalizeEmail(email)] = { wrong: Math.floor(num(v.wrong)), lockedUntil: num(v.lockedUntil) };
  }
  return out;
}

export function signInLockedFor(tries: SignInTries, email: string, now: number): number {
  return Math.max(0, (tries[normalizeEmail(email)]?.lockedUntil ?? 0) - now);
}

export function afterWrongSignIn(tries: SignInTries, email: string, now: number): SignInTries {
  const e = normalizeEmail(email);
  const wrong = (tries[e]?.wrong ?? 0) + 1;
  return {
    ...tries,
    [e]: wrong >= SIGN_IN_TRIES ? { wrong: 0, lockedUntil: now + SIGN_IN_LOCK_MS } : { wrong, lockedUntil: 0 },
  };
}

export function afterRightSignIn(tries: SignInTries, email: string): SignInTries {
  const rest = { ...tries };
  delete rest[normalizeEmail(email)];
  return rest;
}

export function readTries(): SignInTries {
  return normalizeTries(parseStored(readStoredKey(TRIES_KEY)).value);
}

export function saveTries(tries: SignInTries): WriteResult {
  return writeStoredKey(TRIES_KEY, tries);
}

// ─────────────────────────── how each account signs in on the phone ───────────────────────────

/** The web's two providers; the phone has no Apple (owner 2026-11-09 and 11-12). */
export type Provider = "google" | "facebook";
export const PROVIDERS: readonly Provider[] = ["google", "facebook"];
export const PROVIDER_WORDS: Record<Provider, string> = { google: "Google", facebook: "Facebook" };

export const PHONE_ACCOUNTS_KEY = "ideeza:m:accounts";

export type PhoneAccount = {
  /** The providers linked to the account (AU-06). */
  providers: Provider[];
  /** Made through a provider: no password of its own yet (AU-41h adds one). */
  passwordless: boolean;
};

const NO_PHONE_ACCOUNT: PhoneAccount = { providers: [], passwordless: false };

export function normalizePhoneAccounts(raw: unknown): Record<string, PhoneAccount> {
  if (!isObj(raw)) return {};
  const out: Record<string, PhoneAccount> = {};
  for (const [email, v] of Object.entries(raw)) {
    if (!isObj(v)) continue;
    const providers = Array.isArray(v.providers) ? PROVIDERS.filter((p) => (v.providers as unknown[]).includes(p)) : [];
    out[normalizeEmail(email)] = { providers, passwordless: v.passwordless === true };
  }
  return out;
}

export function phoneAccountOf(all: Record<string, PhoneAccount>, email: string): PhoneAccount {
  return all[normalizeEmail(email)] ?? NO_PHONE_ACCOUNT;
}

export function readPhoneAccounts(): Record<string, PhoneAccount> {
  return normalizePhoneAccounts(parseStored(readStoredKey(PHONE_ACCOUNTS_KEY)).value);
}

export function updatePhoneAccount(email: string, patch: (a: PhoneAccount) => PhoneAccount): WriteResult {
  const all = readPhoneAccounts();
  const e = normalizeEmail(email);
  return writeStoredKey(PHONE_ACCOUNTS_KEY, { ...all, [e]: patch(phoneAccountOf(all, e)) });
}

/** Links a provider to the account (it can sign in with it from now on). */
export function linkProvider(email: string, provider: Provider, passwordless = false): WriteResult {
  return updatePhoneAccount(email, (a) => ({
    ...a,
    providers: a.providers.includes(provider) ? a.providers : [...a.providers, provider],
    passwordless: a.passwordless || passwordless,
  }));
}

/** Disconnects a provider (Sign-in & security). Refused while it is the account's only way in:
 *  no password and no other provider. */
export function unlinkProvider(email: string, provider: Provider): WriteResult {
  const a = phoneAccountOf(readPhoneAccounts(), email);
  if (isLastWayIn(a, provider)) return { ok: false };
  return updatePhoneAccount(email, (x) => ({ ...x, providers: x.providers.filter((p) => p !== provider) }));
}

/** The provider is the only way in: no password of its own and no other provider. */
export function isLastWayIn(a: PhoneAccount, provider: Provider): boolean {
  return a.passwordless && a.providers.length === 1 && a.providers[0] === provider;
}

/** The email changed: its sign-in methods go with it. */
export function movePhoneAccount(from: string, to: string): WriteResult {
  const all = readPhoneAccounts();
  const f = normalizeEmail(from);
  const t = normalizeEmail(to);
  if (!all[f] || f === t) return { ok: true };
  const rest = { ...all };
  delete rest[f];
  return writeStoredKey(PHONE_ACCOUNTS_KEY, { ...rest, [t]: all[f] });
}

export function usePhoneAccounts(): Record<string, PhoneAccount> {
  const k = useStoredKey(PHONE_ACCOUNTS_KEY);
  return React.useMemo(() => normalizePhoneAccounts(parseStored(k.raw).value), [k.raw]);
}

// ─────────────────────────── this phone ───────────────────────────

export const PHONE_KEY = "ideeza:m:phone";

export type PhoneState = {
  /** Chose Explore first: the app opens on the guest Feed, not Welcome, until a sign-out. */
  explored: boolean;
  /** Saw the onboarding, or skipped it: signed out, the app opens on Welcome from then on. */
  onboarded: boolean;
  /** Logged in without Remember me: the sign-in lasts while this tab does, and the next cold start signs out. */
  forgetSession: boolean;
  /** Look around first was chosen on the Welcome map: the tour starts on the next tab screen. */
  tourPending: boolean;
  /** The kit's pre-prompts (KIT-PM-01 camera, PM-02 photos, PM-03 microphone) come once, at
   *  first use; PM-04 notifications once, after the first build starts. */
  cameraAsked: boolean;
  photosAsked: boolean;
  micAsked: boolean;
  notifyAsked: boolean;
};

export function normalizePhone(raw: unknown): PhoneState {
  const r = isObj(raw) ? raw : {};
  return {
    explored: r.explored === true,
    onboarded: r.onboarded === true,
    forgetSession: r.forgetSession === true,
    tourPending: r.tourPending === true,
    cameraAsked: r.cameraAsked === true,
    photosAsked: r.photosAsked === true,
    micAsked: r.micAsked === true,
    notifyAsked: r.notifyAsked === true,
  };
}

export function readPhone(): PhoneState {
  return normalizePhone(parseStored(readStoredKey(PHONE_KEY)).value);
}

/** This tab's mark that the app is open: a sign-in without Remember me lives while it does. */
export const ALIVE_KEY = "ideeza:m:alive";

export function markAlive(): void {
  try {
    window.sessionStorage.setItem(ALIVE_KEY, "1");
  } catch {
    // Storage refused: the sign-in simply ends with this page.
  }
}

export function isAlive(): boolean {
  try {
    return window.sessionStorage.getItem(ALIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function updatePhone(patch: Partial<PhoneState>): WriteResult {
  return writeStoredKey(PHONE_KEY, { ...readPhone(), ...patch });
}

export function usePhone(): { hydrated: boolean; phone: PhoneState } {
  const k = useStoredKey(PHONE_KEY);
  return React.useMemo(() => ({ hydrated: k.hydrated, phone: normalizePhone(parseStored(k.raw).value) }), [k.hydrated, k.raw]);
}

/** After any sign-in on the phone: Remember me — `remember` false (Log In with
 *  the box unticked) makes this sign-in last only while the tab does; every
 *  other way in is remembered. */
export function afterPhoneSignIn(remember = true): void {
  updatePhone({ forgetSession: !remember });
  markAlive();
}

// ─────────────────────────── the link's campaign tag ───────────────────────────

/** A link's utm_source, kept for this tab from the first screen it opens until
 *  the account is made (the web keeps it on Sign up's own address). */
export const UTM_KEY = "ideeza:m:utm";

/** Keeps the address's utm_source, when it has one. */
export function keepUtm(search: string): void {
  const source = sourceFromUtm(new URLSearchParams(search).get("utm_source"));
  if (!source) return;
  try {
    window.sessionStorage.setItem(UTM_KEY, source);
  } catch {
    // Storage refused: the question is asked instead.
  }
}

export function readUtm(): string {
  try {
    return sourceFromUtm(window.sessionStorage.getItem(UTM_KEY));
  } catch {
    return "";
  }
}

// ─────────────────────────── a provider's answer, between its sheet and "Signing you in" ───────────────────────────

export const PROVIDER_KEY = "ideeza:m:provider";

export type ProviderAnswer = {
  provider: Provider;
  /** "" when the provider shared none (Facebook can, AU-04e). */
  email: string;
  first: string;
  last: string;
  /** Where they started, so Cancel and errors land back there. */
  from: string;
  /** Where they were going. */
  next: string;
};

export function normalizeProviderAnswer(raw: unknown): ProviderAnswer | null {
  if (!isObj(raw) || !PROVIDERS.includes(raw.provider as Provider)) return null;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    provider: raw.provider as Provider,
    email: normalizeEmail(s(raw.email)),
    first: s(raw.first).slice(0, 40),
    last: s(raw.last).slice(0, 40),
    from: mobileNext(s(raw.from), "/m/welcome", true),
    next: mobileNext(s(raw.next)),
  };
}

export function readProviderAnswer(): ProviderAnswer | null {
  return normalizeProviderAnswer(parseStored(readStoredKey(PROVIDER_KEY)).value);
}

export function saveProviderAnswer(a: ProviderAnswer | null): WriteResult {
  return writeStoredKey(PROVIDER_KEY, a);
}

// ─────────────────────────── where to go ───────────────────────────

/** The way-in screens: open to anyone signed out. */
export const ENTRY_PATH = /^\/m\/(onboarding|welcome|sign-in|sign-up|verify|reset|signing-in|add-email|link)(\/|$)/;
/** After sign-up, as on the web: the one question (when the link didn't say) and the Welcome map. */
export const SETUP_PATH = /^\/m\/(source|welcome-map)(\/|$)/;

/** A mobile path to go back to: only the prototype's own, never a way-in screen (unless `entryOk`). */
export function mobileNext(raw: string | null | undefined, fallback = "/m", entryOk = false): string {
  if (!raw || !/^\/m(\/|\?|#|$)/.test(raw) || raw.startsWith("//")) return fallback;
  if (!entryOk && ENTRY_PATH.test(raw.split(/[?#]/)[0])) return fallback;
  return raw;
}

/** A Log In without Remember me ended with its tab (AUTH-8): the next open lands on Welcome, as
 *  after any sign-out, now saying "Your session expired" and carrying, as `next`, the page that was
 *  opened — or, on a way-in screen, the page it was itself carrying on to — so Log In comes back
 *  to it. */
export function sessionExpiredHref(pathname: string, search: string): string {
  const opened = ENTRY_PATH.test(pathname) ? mobileNext(new URLSearchParams(search).get("next")) : mobileNext(pathname + search);
  return `/m/welcome?${new URLSearchParams({ expired: "1", ...(opened === "/m" ? {} : { next: opened }) })}`;
}
