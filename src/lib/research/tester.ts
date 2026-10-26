// Usability testing (owner, 2026-10-26): the app's own link is shared, and every browser that
// opens it is one tester, known by a short code it is given on its first visit (`B-7F3K2`).
// Recording is on from that first visit (owner: a small notice, on by default, no Turn off on it):
// the notice says what is seen and asks, optionally, what describes the tester. A personal link
// still names a tester — `?tester=T07&persona=maker`, for a moderated session — and `?tester=off`
// turns recording off on that browser for good (the team's own browsers).
//
// The record lives in this browser only, like the rest of the app's data. `sent` holds the journey
// milestones already reported, so a reload never reports one twice; `baseline` marks that what the
// browser had done before its first recorded visit has been counted as sent, not reported as new.
//
// Pure: the host reads and writes the record.

import { JOURNEY, type JourneyId } from "./journey";

export const TESTER_KEY = "ideeza:tester";

export type TesterRecord = {
  code: string;
  persona: string | null;
  /** On unless the tester turned it off. */
  consent: "yes" | "no";
  /** The notice has been answered: Got it or a persona (`?tester=off` too). */
  noticed: boolean;
  baseline: boolean;
  /** When this code arrived on this browser. */
  at: number;
  sent: JourneyId[];
};

/** The notice's optional question. */
export const PERSONAS = [
  { id: "maker", label: "Maker" },
  { id: "designer", label: "Designer" },
  { id: "engineer", label: "Engineer" },
  { id: "idea", label: "Just an idea" },
] as const;

export type TesterLink = { code: string; persona: string | null } | "off" | null;

/** A short plain word: letters, digits, `-` and `_`. Anything else in the link is ignored. */
const WORD = /^[A-Za-z0-9_-]{1,32}$/;

/** No 0/O, 1/I/L: a code someone may read out from a Report a problem or a call. */
const CODE_LETTERS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newCode(random: () => number): string {
  let out = "B-";
  for (let i = 0; i < 5; i++) out += CODE_LETTERS[Math.min(CODE_LETTERS.length - 1, Math.floor(random() * CODE_LETTERS.length))];
  return out;
}

export function readTesterLink(search: string): TesterLink {
  const params = new URLSearchParams(search);
  const code = params.get("tester")?.trim();
  if (!code) return null;
  if (code.toLowerCase() === "off") return "off";
  if (!WORD.test(code)) return null;
  const persona = params.get("persona")?.trim() ?? "";
  return { code, persona: WORD.test(persona) ? persona.toLowerCase() : null };
}

export function normalizeTester(raw: unknown): TesterRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Record<keyof TesterRecord, unknown>>;
  if (typeof r.code !== "string" || !WORD.test(r.code)) return null;
  // The first build asked first ("asked" / "yes" / "no"); asked now means on.
  if (r.consent !== "asked" && r.consent !== "yes" && r.consent !== "no") return null;
  if (typeof r.at !== "number") return null;
  const persona = typeof r.persona === "string" && WORD.test(r.persona) ? r.persona : null;
  const sent = Array.isArray(r.sent) ? JOURNEY.filter((id) => (r.sent as unknown[]).includes(id)) : [];
  return {
    code: r.code,
    persona,
    consent: r.consent === "no" ? "no" : "yes",
    noticed: r.noticed === true,
    baseline: r.baseline === true,
    at: r.at,
    sent,
  };
}

const fresh = (code: string, persona: string | null, now: number): TesterRecord => ({
  code,
  persona,
  consent: "yes",
  noticed: false,
  baseline: false,
  at: now,
  sent: [],
});

/** The record after a page load with `link`: a browser's first visit gets a code; a new link code
 *  starts again under that code; `?tester=off` turns it off and keeps it off. */
export function arrive(prev: TesterRecord | null, link: TesterLink, now: number, random: () => number): TesterRecord {
  if (link === "off") return turnedOff(prev ?? fresh(newCode(random), null, now));
  if (!link) return prev ?? fresh(newCode(random), null, now);
  if (prev && prev.code === link.code) {
    return link.persona && link.persona !== prev.persona ? { ...prev, persona: link.persona } : prev;
  }
  return fresh(link.code, link.persona, now);
}

export function turnedOff(rec: TesterRecord): TesterRecord {
  return rec.consent === "no" && rec.noticed ? rec : { ...rec, consent: "no", noticed: true };
}

export function withNoticed(rec: TesterRecord): TesterRecord {
  return rec.noticed ? rec : { ...rec, noticed: true };
}

/** A persona from the notice (one of PERSONAS; anything else is no answer). */
export function withPersona(rec: TesterRecord, persona: string): TesterRecord {
  const known = PERSONAS.some((p) => p.id === persona);
  return { ...rec, persona: known ? persona : rec.persona, noticed: true };
}

/** What the browser had already reached when it was first recorded: counted as sent, so the
 *  funnel only shows steps taken while it was being recorded. */
export function withBaseline(rec: TesterRecord, already: readonly JourneyId[]): TesterRecord {
  return { ...rec, baseline: true, sent: JOURNEY.filter((id) => rec.sent.includes(id) || already.includes(id)) };
}

export function withSent(rec: TesterRecord, ids: readonly JourneyId[]): TesterRecord {
  return { ...rec, sent: JOURNEY.filter((id) => rec.sent.includes(id) || ids.includes(id)) };
}

export const isTracking = (rec: TesterRecord | null): boolean => rec?.consent === "yes";
export const showsNotice = (rec: TesterRecord | null): boolean => !!rec && rec.consent === "yes" && !rec.noticed;

/** A developer's own machine or home network (owner: no need to run it locally). */
export function isLocalHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host === "::1" || host === "0.0.0.0") return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const ip = host.split(".").map(Number);
  if (ip.length !== 4 || ip.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = ip;
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}
