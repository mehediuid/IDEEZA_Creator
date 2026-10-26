// Usability testing (owner, 2026-10-26): the prototype is shared with testers to learn where people
// get stuck. There is no sign-in, so a tester is known by a personal link — `?tester=T07`, with an
// optional `&persona=maker` — and nothing is sent anywhere until they say yes once. A visitor who
// came without a link, the team's own browsers and anyone who says no are never tracked.
// `?tester=off` forgets the tester on that browser.
//
// The record lives in this browser only, like the rest of the app's data. `sent` holds the journey
// milestones already reported, so a reload never reports one twice.
//
// Pure: the host reads and writes the record.

import { JOURNEY, type JourneyId } from "./journey";

export const TESTER_KEY = "ideeza:tester";

export type Consent = "asked" | "yes" | "no";

export type TesterRecord = {
  code: string;
  persona: string | null;
  consent: Consent;
  /** When the code first arrived on this browser. */
  at: number;
  sent: JourneyId[];
};

export type TesterLink = { code: string; persona: string | null } | "off" | null;

/** A short plain word: letters, digits, `-` and `_`. Anything else in the link is ignored. */
const WORD = /^[A-Za-z0-9_-]{1,32}$/;

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
  if (r.consent !== "asked" && r.consent !== "yes" && r.consent !== "no") return null;
  if (typeof r.at !== "number") return null;
  const persona = typeof r.persona === "string" && WORD.test(r.persona) ? r.persona : null;
  const sent = Array.isArray(r.sent) ? JOURNEY.filter((id) => (r.sent as unknown[]).includes(id)) : [];
  return { code: r.code, persona, consent: r.consent, at: r.at, sent };
}

/** The record after a page load with `link`: a new code asks again, the same code keeps its answer. */
export function arrive(prev: TesterRecord | null, link: TesterLink, now: number): TesterRecord | null {
  if (link === "off") return null;
  if (!link) return prev;
  if (prev && prev.code === link.code) {
    return link.persona && link.persona !== prev.persona ? { ...prev, persona: link.persona } : prev;
  }
  return { code: link.code, persona: link.persona, consent: "asked", at: now, sent: [] };
}

/** The tester's answer. On a yes, `already` is the milestones reached before it: they are counted
 *  as sent, so the funnel only shows steps taken while the tester was being watched. */
export function withConsent(rec: TesterRecord, consent: "yes" | "no", now: number, already: readonly JourneyId[]): TesterRecord {
  return { ...rec, consent, at: now, sent: consent === "yes" ? JOURNEY.filter((id) => already.includes(id)) : [] };
}

export function withSent(rec: TesterRecord, ids: readonly JourneyId[]): TesterRecord {
  return { ...rec, sent: JOURNEY.filter((id) => rec.sent.includes(id) || ids.includes(id)) };
}

export const isAsking = (rec: TesterRecord | null): boolean => rec?.consent === "asked";
export const isTracking = (rec: TesterRecord | null): boolean => rec?.consent === "yes";

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
