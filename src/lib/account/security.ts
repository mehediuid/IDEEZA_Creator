// Sign-in & security on the phone (mobile Figma "Account · 2026 update",
// AU-07, AU-40…45, AU-60…65): what each account keeps beside its sign-in
// methods (phone.ts) — when its password last changed, 2-step sign-in (a real
// RFC 6238 authenticator code, so any authenticator app works, plus 10 backup
// codes that each work once), the devices it is signed in on, and a scheduled
// deletion with its 30 days to restore. One browser key, by email, kept
// whoever is signed in (work-vault BROWSER_KEYS). Relative imports only, so
// node:test can load it.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { normalizeEmail } from "./auth";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ─────────────────────────── authenticator codes (RFC 6238) ───────────────────────────

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** Spaces, lower case and padding are ignored; null when a character isn't base32. */
export function base32Decode(text: string): Uint8Array | null {
  const clean = text.replace(/[\s=-]/g, "").toUpperCase();
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) return null;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** The setup key: 80 random bits as 16 base32 letters (what the authenticator app asks for). */
export function newTotpSecret(bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(10))): string {
  return base32Encode(bytes);
}

/** "JBSW Y3DP EHPK 3PXP": the key in fours, easier to type. */
export function keyInFours(secret: string): string {
  return secret.replace(/(.{4})(?=.)/g, "$1 ");
}

/** What an authenticator app opens to add the account. */
export function otpauthUrl(secret: string, email: string): string {
  return `otpauth://totp/IDEEZA:${encodeURIComponent(email)}?secret=${secret}&issuer=IDEEZA&digits=6&period=30`;
}

export const TOTP_STEP_S = 30;

/** The 6-digit code for `secret` at `time` (ms). */
export async function totpAt(secret: string, time: number): Promise<string> {
  const key = base32Decode(secret);
  if (!key || !key.length) return "";
  const counter = Math.floor(time / 1000 / TOTP_STEP_S);
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 255;
    c = Math.floor(c / 256);
  }
  const k = await crypto.subtle.importKey("raw", new Uint8Array(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", k, msg));
  const o = h[h.length - 1] & 15;
  const bin = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

/** Whether `typed` is the code now, or one step either side (a phone's clock drifts). */
export async function totpMatches(secret: string, typed: string, now: number): Promise<boolean> {
  if (!/^\d{6}$/.test(typed)) return false;
  for (const d of [0, -1, 1]) if ((await totpAt(secret, now + d * TOTP_STEP_S * 1000)) === typed) return true;
  return false;
}

/** Seconds until the code changes. */
export function totpSecondsLeft(now: number): number {
  return TOTP_STEP_S - (Math.floor(now / 1000) % TOTP_STEP_S);
}

// ─────────────────────────── backup codes ───────────────────────────

export const BACKUP_COUNT = 10;

export type BackupCode = { code: string; used: boolean };

/** Ten "4821-9375" codes, all different. */
export function newBackupCodes(random: () => number = Math.random): BackupCode[] {
  const out: string[] = [];
  // A random source that keeps repeating itself can't hang the screen.
  for (let tries = 0; out.length < BACKUP_COUNT && tries < 1000; tries++) {
    const digits = Array.from({ length: 8 }, () => Math.floor(random() * 10)).join("");
    const code = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    if (!out.includes(code)) out.push(code);
  }
  return out.map((code) => ({ code, used: false }));
}

const digitsOf = (s: string) => s.replace(/\D/g, "");

// ─────────────────────────── the record ───────────────────────────

export const SECURITY_KEY = "ideeza:m:security";
/** This browser's own device id (kept whoever is signed in). */
export const DEVICE_KEY = "ideeza:m:device";

/** Five wrong 2-step codes lock it for 5 minutes ("Try again in 4:59, or use a backup code"). */
export const TWO_STEP_TRIES = 5;
export const TWO_STEP_LOCK_MS = 5 * 60_000;
/** A deleted account can be restored for 30 days. */
export const DELETE_GRACE_MS = 30 * 24 * 60 * 60_000;

export type TwoStep = { secret: string; since: number; backup: BackupCode[] };

export type DeviceRecord = {
  id: string;
  name: string;
  os: string;
  app: string;
  where: string;
  signedInAt: number;
  lastActive: number;
  /** Added from the Shared kit (prototype only): the demo has no other phone. */
  demo: boolean;
};

export type Deletion = { at: number; until: number; reason: string };

export type AccountSecurity = {
  /** When the password last changed here; 0 when it never has. */
  passwordChangedAt: number;
  twoStep: TwoStep | null;
  /** Devices that chose "Don't ask again on this phone". */
  trusted: string[];
  /** The session (its start) that passed 2-step on this phone. */
  passedAt: number;
  tries: { wrong: number; lockedUntil: number };
  /** Other devices signed in to the account; this phone is read live. */
  devices: DeviceRecord[];
  deletion: Deletion | null;
};

const EMPTY: AccountSecurity = {
  passwordChangedAt: 0,
  twoStep: null,
  trusted: [],
  passedAt: 0,
  tries: { wrong: 0, lockedUntil: 0 },
  devices: [],
  deletion: null,
};

function normalizeTwoStep(raw: unknown): TwoStep | null {
  if (!isObj(raw)) return null;
  const secret = typeof raw.secret === "string" && /^[A-Z2-7]{16,64}$/.test(raw.secret) ? raw.secret : "";
  if (!secret) return null;
  const backup = Array.isArray(raw.backup)
    ? raw.backup
        .filter(isObj)
        .map((b) => ({ code: typeof b.code === "string" && /^\d{4}-\d{4}$/.test(b.code) ? b.code : "", used: b.used === true }))
        .filter((b) => b.code)
        .slice(0, BACKUP_COUNT)
    : [];
  return { secret, since: num(raw.since), backup };
}

function normalizeDevice(raw: unknown): DeviceRecord | null {
  if (!isObj(raw) || typeof raw.id !== "string" || !raw.id) return null;
  return {
    id: raw.id.slice(0, 40),
    name: str(raw.name, 60) || "Device",
    os: str(raw.os, 40),
    app: str(raw.app, 40),
    where: str(raw.where, 80),
    signedInAt: num(raw.signedInAt),
    lastActive: num(raw.lastActive),
    demo: raw.demo === true,
  };
}

export function normalizeAccountSecurity(raw: unknown): AccountSecurity {
  const r = isObj(raw) ? raw : {};
  const t = isObj(r.tries) ? r.tries : {};
  const d = isObj(r.deletion) ? r.deletion : null;
  return {
    passwordChangedAt: num(r.passwordChangedAt),
    twoStep: normalizeTwoStep(r.twoStep),
    trusted: Array.isArray(r.trusted) ? [...new Set(r.trusted.filter((x): x is string => typeof x === "string" && !!x))].slice(0, 20) : [],
    passedAt: num(r.passedAt),
    tries: { wrong: Math.min(TWO_STEP_TRIES, Math.floor(num(t.wrong))), lockedUntil: num(t.lockedUntil) },
    devices: Array.isArray(r.devices) ? r.devices.map(normalizeDevice).filter((x): x is DeviceRecord => !!x).slice(0, 20) : [],
    deletion: d && num(d.until) ? { at: num(d.at), until: num(d.until), reason: str(d.reason, 600) } : null,
  };
}

export function normalizeSecurity(raw: unknown): Record<string, AccountSecurity> {
  if (!isObj(raw)) return {};
  const out: Record<string, AccountSecurity> = {};
  for (const [email, v] of Object.entries(raw)) out[normalizeEmail(email)] = normalizeAccountSecurity(v);
  return out;
}

export function securityOf(all: Record<string, AccountSecurity>, email: string): AccountSecurity {
  return all[normalizeEmail(email)] ?? EMPTY;
}

export function readSecurity(): Record<string, AccountSecurity> {
  return normalizeSecurity(parseStored(readStoredKey(SECURITY_KEY)).value);
}

export function updateSecurity(email: string, change: (s: AccountSecurity) => AccountSecurity): WriteResult {
  const all = readSecurity();
  const e = normalizeEmail(email);
  return writeStoredKey(SECURITY_KEY, { ...all, [e]: change(securityOf(all, e)) });
}

/** The email changed: its record goes with it. */
export function moveSecurity(from: string, to: string): WriteResult {
  const all = readSecurity();
  const f = normalizeEmail(from);
  const t = normalizeEmail(to);
  if (!all[f] || f === t) return { ok: true };
  const rest = { ...all };
  delete rest[f];
  return writeStoredKey(SECURITY_KEY, { ...rest, [t]: all[f] });
}

export function dropSecurity(email: string): WriteResult {
  const all = readSecurity();
  const rest = { ...all };
  delete rest[normalizeEmail(email)];
  return writeStoredKey(SECURITY_KEY, rest);
}

export function useSecurity(email: string | null | undefined): { hydrated: boolean; security: AccountSecurity } {
  const k = useStoredKey(SECURITY_KEY);
  return React.useMemo(
    () => ({ hydrated: k.hydrated, security: email ? securityOf(normalizeSecurity(parseStored(k.raw).value), email) : EMPTY }),
    [k.hydrated, k.raw, email],
  );
}

// ─────────────────────────── 2-step sign-in ───────────────────────────

/** Whether this sign-in still owes its 2-step code: it is on, this phone isn't trusted, and this
 *  session hasn't passed it. */
export function needsTwoStep(s: AccountSecurity, sessionAt: number, deviceId: string): boolean {
  return !!s.twoStep && !s.trusted.includes(deviceId) && s.passedAt !== sessionAt;
}

export function twoStepLockedFor(s: AccountSecurity, now: number): number {
  return Math.max(0, s.tries.lockedUntil - now);
}

export type TwoStepCheck = "ok" | "wrong" | "locked";

function counted(s: AccountSecurity, now: number): { result: TwoStepCheck; security: AccountSecurity } {
  const wrong = s.tries.wrong + 1;
  if (wrong >= TWO_STEP_TRIES) return { result: "locked", security: { ...s, tries: { wrong: 0, lockedUntil: now + TWO_STEP_LOCK_MS } } };
  return { result: "wrong", security: { ...s, tries: { wrong, lockedUntil: 0 } } };
}

function passed(s: AccountSecurity, sessionAt: number, trust: string | null): AccountSecurity {
  return {
    ...s,
    passedAt: sessionAt,
    tries: { wrong: 0, lockedUntil: 0 },
    trusted: trust && !s.trusted.includes(trust) ? [...s.trusted, trust] : s.trusted,
  };
}

/** The authenticator's code at sign-in. `trust` is this phone's id when "Don't ask again" is ticked. */
export async function checkTwoStepCode(
  s: AccountSecurity,
  typed: string,
  now: number,
  sessionAt: number,
  trust: string | null,
): Promise<{ result: TwoStepCheck; security: AccountSecurity }> {
  if (!s.twoStep) return { result: "wrong", security: s };
  if (now < s.tries.lockedUntil) return { result: "locked", security: s };
  if (await totpMatches(s.twoStep.secret, typed, now)) return { result: "ok", security: passed(s, sessionAt, trust) };
  return counted(s, now);
}

/** A backup code instead: each works once. Not held by the lock, which only stops guessing app codes. */
export function redeemBackupCode(s: AccountSecurity, typed: string, sessionAt: number): { result: "ok" | "wrong"; security: AccountSecurity } {
  if (!s.twoStep) return { result: "wrong", security: s };
  const d = digitsOf(typed);
  const i = s.twoStep.backup.findIndex((b) => !b.used && digitsOf(b.code) === d);
  if (d.length !== 8 || i < 0) return { result: "wrong", security: s };
  const backup = s.twoStep.backup.map((b, j) => (j === i ? { ...b, used: true } : b));
  return { result: "ok", security: passed({ ...s, twoStep: { ...s.twoStep, backup } }, sessionAt, null) };
}

export function backupLeft(s: AccountSecurity): number {
  return s.twoStep ? s.twoStep.backup.filter((b) => !b.used).length : 0;
}

/** Turned on from Settings: this session has passed it already. */
export function twoStepOn(s: AccountSecurity, secret: string, backup: BackupCode[], now: number, sessionAt: number): AccountSecurity {
  return { ...s, twoStep: { secret, since: now, backup }, passedAt: sessionAt, tries: { wrong: 0, lockedUntil: 0 } };
}

export function twoStepOff(s: AccountSecurity): AccountSecurity {
  return { ...s, twoStep: null, trusted: [], tries: { wrong: 0, lockedUntil: 0 } };
}

// ─────────────────────────── devices ───────────────────────────

/** What a browser's user agent says about the device it runs on. */
export function deviceOf(ua: string, standalone: boolean): { name: string; os: string; app: string } {
  const os = /iPhone/.test(ua)
    ? "iOS"
    : /iPad/.test(ua)
      ? "iPadOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  const name = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : os === "Android" ? "Android phone" : os === "macOS" ? "Mac" : os === "Windows" ? "Windows PC" : os === "Linux" ? "Linux computer" : "This device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) || /CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return { name, os, app: standalone ? "IDEEZA app" : browser };
}

/** "Dhaka" from "Asia/Dhaka". */
export function cityOfZone(zone: string): string {
  const last = zone.split("/").pop() ?? "";
  return last.replace(/_/g, " ");
}

/** Removes every other device (Sign out of all other devices); `keep` is this phone. */
export function withoutOtherDevices(s: AccountSecurity, keep: string): AccountSecurity {
  return { ...s, devices: s.devices.filter((d) => d.id === keep) };
}

export function withoutDevice(s: AccountSecurity, id: string): AccountSecurity {
  return { ...s, devices: s.devices.filter((d) => d.id !== id) };
}

/** Prototype only: another phone signed in, so Your devices has something to sign out. */
export function withDemoDevice(s: AccountSecurity, now: number): AccountSecurity {
  if (s.devices.some((d) => d.demo)) return s;
  const demo: DeviceRecord = {
    id: `demo-${now.toString(36)}`,
    name: "Pixel 8",
    os: "Android",
    app: "IDEEZA app",
    where: "Chittagong, Bangladesh",
    signedInAt: now - 3 * 24 * 60 * 60_000,
    lastActive: now - 2 * 60 * 60_000,
    demo: true,
  };
  return { ...s, devices: [...s.devices, demo] };
}

/** This browser's device id without making one ("" before it is made). */
export function readDeviceId(): string {
  const raw = parseStored(readStoredKey(DEVICE_KEY)).value;
  return isObj(raw) && typeof raw.id === "string" ? raw.id : "";
}

/** This browser's device id, made once. */
export function thisDeviceId(random: () => number = Math.random): string {
  const raw = parseStored(readStoredKey(DEVICE_KEY)).value;
  if (isObj(raw) && typeof raw.id === "string" && raw.id) return raw.id;
  const id = `d-${Math.floor(random() * 36 ** 8).toString(36)}`;
  writeStoredKey(DEVICE_KEY, { id });
  return id;
}

// ─────────────────────────── deleting the account ───────────────────────────

export type DeletionState = "none" | "scheduled" | "due";

export function deletionStateOf(s: AccountSecurity, now: number): DeletionState {
  if (!s.deletion) return "none";
  return now < s.deletion.until ? "scheduled" : "due";
}

/** Restore is asked on a sign-in after Delete account (not in the session that asked for it), and
 *  once the 30 days are over the account goes for good. */
export function owesRestore(s: AccountSecurity, sessionAt: number, now: number): boolean {
  const state = deletionStateOf(s, now);
  return state === "due" || (state === "scheduled" && !!s.deletion && sessionAt > s.deletion.at);
}

/** What a signed-in session still owes before the app opens. */
export function owedOf(s: AccountSecurity, sessionAt: number, deviceId: string, now: number): "two-step" | "restore" | null {
  if (needsTwoStep(s, sessionAt, deviceId)) return "two-step";
  return owesRestore(s, sessionAt, now) ? "restore" : null;
}

export function scheduleDeletion(s: AccountSecurity, now: number, reason: string): AccountSecurity {
  return { ...s, deletion: { at: now, until: now + DELETE_GRACE_MS, reason: reason.trim().slice(0, 600) } };
}

export function cancelDeletion(s: AccountSecurity): AccountSecurity {
  return { ...s, deletion: null };
}

/** The reasons on step 1 (AU-60), in its order. */
export const LEAVE_REASONS = [
  { id: "unused", label: "I don’t use it any more" },
  { id: "other-account", label: "I have another account" },
  { id: "privacy", label: "Privacy worries" },
  { id: "phone", label: "It’s hard to use on a phone" },
  { id: "other", label: "Something else" },
] as const;
export const LEAVE_NOTE_MAX = 500;
