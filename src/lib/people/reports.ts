// Reporting a profile (owner decision D8, spec 2026-10-14-creator-profile-design.md):
// works now, as Messages' report already does. A report is saved in this
// browser under `ideeza:people:reports`; nobody reviews it in this demo, and
// the receipt says so. A report never hides a profile or shows a public mark.
// Pure, relative imports only.

import type { PersonId } from "./ids";

export const REPORTS_KEY = "ideeza:people:reports";
export const NOTE_MAX = 500;

export type ProfileReportReason = "impersonation" | "copied" | "scam" | "spam" | "abuse" | "other";

export const REPORT_REASONS: readonly { id: ProfileReportReason; label: string }[] = [
  { id: "impersonation", label: "Pretending to be someone else" },
  { id: "copied", label: "Copied someone's work" },
  { id: "scam", label: "Scam, or asks to pay outside IDEEZA" },
  { id: "spam", label: "Spam" },
  { id: "abuse", label: "Hateful or abusive" },
  { id: "other", label: "Something else" },
];

export type ProfileReport = { id: string; by: PersonId; who: PersonId; reason: ProfileReportReason; note: string; at: number };

const REASON_IDS = new Set<string>(REPORT_REASONS.map((r) => r.id));

export function normalizeReports(raw: unknown): ProfileReport[] {
  if (!Array.isArray(raw)) return [];
  const out: ProfileReport[] = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null) continue;
    const x = r as Record<string, unknown>;
    if (typeof x.id !== "string" || typeof x.by !== "string" || typeof x.who !== "string") continue;
    if (typeof x.reason !== "string" || !REASON_IDS.has(x.reason) || typeof x.at !== "number") continue;
    out.push({
      id: x.id,
      by: x.by,
      who: x.who,
      reason: x.reason as ProfileReportReason,
      note: typeof x.note === "string" ? x.note.slice(0, NOTE_MAX) : "",
      at: x.at,
    });
  }
  return out;
}

export function withReport(list: readonly ProfileReport[], r: ProfileReport): ProfileReport[] {
  return [...list, { ...r, note: r.note.trim().slice(0, NOTE_MAX) }];
}
