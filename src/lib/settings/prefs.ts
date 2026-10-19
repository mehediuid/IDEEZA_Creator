// Settings — the one record for preferences that have no other home
// (spec docs/superpowers/specs/2026-10-19-settings-design.md §3.2). Data that
// already lives somewhere keeps living there: who can message you
// (`ideeza:messages`), profile fields (`ideeza:profile`), the payment token
// (`ideeza:account:payment`), the theme (`ideeza-theme`), the PCB editor's
// settings (`ideeza:pcb:appSettings`).
//
// Reading never throws: a missing, broken or older record falls back field by
// field to DEFAULT_SETTINGS, so one bad value never resets the rest.

import { dateChoiceFrom } from "./regions";

export const SETTINGS_KEY = "ideeza:settings";
/** Fired on window after a write, so every reader in this tab re-renders. */
export const SETTINGS_EVENT = "ideeza:settings-change";

export const NOTICE_KINDS = [
  "marketplace",
  "product",
  "coin",
  "comments",
  "message",
  "following",
  "teams",
  "blog",
  "policy",
  "other",
] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export const CHANNELS = ["web", "email", "mobile"] as const;
export type Channel = (typeof CHANNELS)[number];

/** Anyone · People you work with · Only me (or "No one new"). */
export const REACHES = ["everyone", "work", "nobody"] as const;
export type Reach = (typeof REACHES)[number];

/** Settings › Language & region › Date and time format: "auto" (your
 *  region), "iso", or a region code ("BD"); see regions.ts. */
export type DateLocale = "auto" | "iso" | (string & {});

export const VOICE_LANGS = [
  "auto",
  "en-US",
  "en-GB",
  "bn-BD",
  "hi-IN",
  "ar-SA",
  "th-TH",
  "es-ES",
  "pt-BR",
  "tr-TR",
  "ur-PK",
  "ja-JP",
  "de-DE",
  "fr-FR",
  "id-ID",
  "sw-KE",
] as const;
export type VoiceLang = (typeof VOICE_LANGS)[number];

export const CREDIT_PACKS = ["starter", "pro", "power"] as const;
export type CreditPack = (typeof CREDIT_PACKS)[number];

export interface SettingsV1 {
  v: 1;
  notifications: {
    channels: Record<NoticeKind, Record<Channel, boolean>>;
    /** Right away, or once a day (the bell grouped by day, one summary pop-up). A weekly summary
     *  from an older record reads as once a day. */
    digest: "instant" | "daily";
    /** Pop-ups paused: nothing pops up, whatever the digest; the bell still lists and counts. */
    popupsPaused: boolean;
    /** `urgentBreaksThrough` is "Let sales through": a sale (the one urgent notice) still counts and pops up. */
    quietHours: { on: boolean; from: string; to: string; urgentBreaksThrough: boolean };
    /** In USD; null = every bid and offer. */
    bidThreshold: number | null;
    mutedProjects: string[];
  };
  language: { dateLocale: DateLocale; voice: VoiceLang };
  appearance: {
    textSize: "default" | "large";
    contrast: "default" | "high";
    motion: "system" | "reduce";
    keepNotices: boolean;
    singleKeyShortcuts: boolean;
    dataSaver: boolean;
  };
  ai: { volunteerPool: boolean; editorAssist: boolean };
  audience: {
    locked: boolean;
    addToTeam: Reach;
    seeFollowing: Reach;
    allowLinkSave: boolean;
    follow: Reach;
    teamConversation: Reach;
    showLocalTime: boolean;
    comment: Reach;
    /** Epoch ms quiet mode ends at; null = off. */
    quietUntil: number | null;
  };
  blocking: { hiddenWords: string[] };
  privacy: {
    searchEngines: boolean;
    /** Keep the searches you run in AI & your data › Search history (off by default, V12). */
    keepSearchHistory: boolean;
  };
  credits: {
    lowAt: number;
    expiryReminderDays: number;
    monthlyCap: number | null;
    /** In USD; null = never ask. */
    confirmAbove: number | null;
    autoTopUp: { on: boolean; pack: CreditPack };
  };
}

export type SettingsSection = Exclude<keyof SettingsV1, "v">;

/** The Figma limit on hidden words. */
export const HIDDEN_WORDS_MAX = 500;

function channelDefaults(): Record<NoticeKind, Record<Channel, boolean>> {
  const out = {} as Record<NoticeKind, Record<Channel, boolean>>;
  for (const k of NOTICE_KINDS) out[k] = { web: true, email: false, mobile: false };
  return out;
}

export const DEFAULT_SETTINGS: SettingsV1 = Object.freeze({
  v: 1,
  notifications: {
    channels: channelDefaults(),
    digest: "instant",
    popupsPaused: false,
    quietHours: { on: false, from: "22:00", to: "07:00", urgentBreaksThrough: false },
    bidThreshold: null,
    mutedProjects: [],
  },
  language: { dateLocale: "auto", voice: "auto" },
  appearance: {
    textSize: "default",
    contrast: "default",
    motion: "system",
    keepNotices: false,
    singleKeyShortcuts: true,
    dataSaver: false,
  },
  ai: { volunteerPool: true, editorAssist: true },
  audience: {
    locked: false,
    addToTeam: "everyone",
    seeFollowing: "nobody",
    allowLinkSave: true,
    follow: "everyone",
    teamConversation: "work",
    showLocalTime: false,
    comment: "everyone",
    quietUntil: null,
  },
  blocking: { hiddenWords: [] },
  privacy: { searchEngines: false, keepSearchHistory: false },
  credits: {
    // "Running low" at or under 8: two product builds (4 each), so the
    // warning comes while there's still room to finish what you started (V11).
    lowAt: 8,
    expiryReminderDays: 14,
    monthlyCap: null,
    confirmAbove: null,
    autoTopUp: { on: false, pack: "starter" },
  },
}) as SettingsV1;

// ─────────────────────────────── normalizing ──────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d;
const count = (v: unknown, d: number, max = 1_000_000) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : d;
const countOrNull = (v: unknown, d: number | null) =>
  v === null ? null : typeof v === "number" && Number.isFinite(v) && v > 0 ? v : d;
const clock = (v: unknown, d: string) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
const ids = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0))] : [];

/** Lower-cased, trimmed, unique, at most HIDDEN_WORDS_MAX. */
export function cleanWords(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const w of v) {
    if (typeof w !== "string") continue;
    const t = w.trim().toLowerCase().slice(0, 60);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= HIDDEN_WORDS_MAX) break;
  }
  return out;
}

/** Any stored value → a complete SettingsV1. */
export function normalizeSettings(raw: unknown): SettingsV1 {
  const r = isObj(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;

  const n = isObj(r.notifications) ? r.notifications : {};
  const ch = isObj(n.channels) ? n.channels : {};
  const channels = channelDefaults();
  for (const k of NOTICE_KINDS) {
    const row = isObj(ch[k]) ? (ch[k] as Obj) : {};
    for (const c of CHANNELS) channels[k][c] = bool(row[c], d.notifications.channels[k][c]);
  }
  const q = isObj(n.quietHours) ? n.quietHours : {};

  const l = isObj(r.language) ? r.language : {};
  const a = isObj(r.appearance) ? r.appearance : {};
  const ai = isObj(r.ai) ? r.ai : {};
  const au = isObj(r.audience) ? r.audience : {};
  const b = isObj(r.blocking) ? r.blocking : {};
  const p = isObj(r.privacy) ? r.privacy : {};
  const c = isObj(r.credits) ? r.credits : {};
  const t = isObj(c.autoTopUp) ? c.autoTopUp : {};
  const quietUntil = au.quietUntil;

  return {
    v: 1,
    notifications: {
      channels,
      digest: n.digest === "weekly" ? "daily" : oneOf(n.digest, ["instant", "daily"] as const, d.notifications.digest),
      popupsPaused: bool(n.popupsPaused, d.notifications.popupsPaused),
      quietHours: {
        on: bool(q.on, d.notifications.quietHours.on),
        from: clock(q.from, d.notifications.quietHours.from),
        to: clock(q.to, d.notifications.quietHours.to),
        urgentBreaksThrough: bool(q.urgentBreaksThrough, d.notifications.quietHours.urgentBreaksThrough),
      },
      bidThreshold: countOrNull(n.bidThreshold, d.notifications.bidThreshold),
      mutedProjects: ids(n.mutedProjects),
    },
    language: {
      dateLocale: dateChoiceFrom(l.dateLocale),
      voice: oneOf(l.voice, VOICE_LANGS, d.language.voice),
    },
    appearance: {
      textSize: oneOf(a.textSize, ["default", "large"] as const, d.appearance.textSize),
      contrast: oneOf(a.contrast, ["default", "high"] as const, d.appearance.contrast),
      motion: oneOf(a.motion, ["system", "reduce"] as const, d.appearance.motion),
      keepNotices: bool(a.keepNotices, d.appearance.keepNotices),
      singleKeyShortcuts: bool(a.singleKeyShortcuts, d.appearance.singleKeyShortcuts),
      dataSaver: bool(a.dataSaver, d.appearance.dataSaver),
    },
    ai: {
      volunteerPool: bool(ai.volunteerPool, d.ai.volunteerPool),
      editorAssist: bool(ai.editorAssist, d.ai.editorAssist),
    },
    audience: {
      locked: bool(au.locked, d.audience.locked),
      addToTeam: oneOf(au.addToTeam, REACHES, d.audience.addToTeam),
      seeFollowing: oneOf(au.seeFollowing, REACHES, d.audience.seeFollowing),
      allowLinkSave: bool(au.allowLinkSave, d.audience.allowLinkSave),
      follow: oneOf(au.follow, REACHES, d.audience.follow),
      teamConversation: oneOf(au.teamConversation, REACHES, d.audience.teamConversation),
      showLocalTime: bool(au.showLocalTime, d.audience.showLocalTime),
      comment: oneOf(au.comment, REACHES, d.audience.comment),
      quietUntil: typeof quietUntil === "number" && Number.isFinite(quietUntil) && quietUntil > 0 ? quietUntil : null,
    },
    blocking: { hiddenWords: cleanWords(b.hiddenWords) },
    privacy: {
      searchEngines: bool(p.searchEngines, d.privacy.searchEngines),
      keepSearchHistory: bool(p.keepSearchHistory, d.privacy.keepSearchHistory),
    },
    credits: {
      lowAt: count(c.lowAt, d.credits.lowAt, 100_000),
      expiryReminderDays: count(c.expiryReminderDays, d.credits.expiryReminderDays, 365),
      monthlyCap: countOrNull(c.monthlyCap, d.credits.monthlyCap),
      confirmAbove: countOrNull(c.confirmAbove, d.credits.confirmAbove),
      autoTopUp: {
        on: bool(t.on, d.credits.autoTopUp.on),
        pack: oneOf(t.pack, CREDIT_PACKS, d.credits.autoTopUp.pack),
      },
    },
  };
}

/** `section` of `s` with `patch` laid over it, normalized again. */
export function patchSettings<K extends SettingsSection>(
  s: SettingsV1,
  section: K,
  patch: Partial<SettingsV1[K]>,
): SettingsV1 {
  return normalizeSettings({ ...s, [section]: { ...(s[section] as object), ...(patch as object) } });
}

/** Quiet mode is on at `now`. */
export function quietModeOn(s: SettingsV1, now: number): boolean {
  return s.audience.quietUntil !== null && s.audience.quietUntil > now;
}

/** "HH:MM" → minutes after midnight. */
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Whether a local wall-clock time (minutes after midnight) falls inside the
 *  quiet hours. A window that crosses midnight (22:00–07:00) wraps. */
export function inQuietHours(s: SettingsV1, minutesNow: number): boolean {
  const q = s.notifications.quietHours;
  if (!q.on) return false;
  const from = minutesOf(q.from);
  const to = minutesOf(q.to);
  if (from === to) return false;
  return from < to ? minutesNow >= from && minutesNow < to : minutesNow >= from || minutesNow < to;
}

// ──────────────────────────────── browser ─────────────────────────────────

let cache: { raw: string | null; value: SettingsV1 } | null = null;

/** The stored settings (defaults when none, or when storage is blocked). */
export function readSettings(): SettingsV1 {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SETTINGS_KEY);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (cache && cache.raw === raw) return cache.value;
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const value = normalizeSettings(parsed);
  cache = { raw, value };
  return value;
}

/** Lays `patch` over one section and saves; false when the browser refused. */
export function updateSettings<K extends SettingsSection>(section: K, patch: Partial<SettingsV1[K]>): boolean {
  const next = patchSettings(readSettings(), section, patch);
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(SETTINGS_EVENT));
  return true;
}

/** For useSyncExternalStore: this tab's writes and other tabs' storage events. */
export function subscribeSettings(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) onChange();
  };
  window.addEventListener(SETTINGS_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
