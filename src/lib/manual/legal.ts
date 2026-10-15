// LEGAL — the project's rights (P2-TABS-23, consolidated spec §3.5.9; owner,
// 2026-10-13: "rights are multiple — the maker sets as many as they have").
// Pure: the form's check, the stored shape's normalizer and the list edits.
// `ManualProject.legal` is written through `setLegal` (projects.tsx); the
// block itself is `rail-legal.tsx`, shown in Earn › Money › Rights and, read
// only, on a buyer's page.
//
// A right is one Patent, Copyright or Trademark, as the maker states it: its
// number or words, an optional https link and, for a trademark, an optional
// attorney. A record from before the list held one of each
// (`patent`, `copyright`, `trademark`) is read as up to three rights.
//
// Value imports are relative, so `node --test` loads the compiled module.

import type { LegalRight, LegalRightKind, ProjectLegal } from "./p2-types";

export type { LegalRight, LegalRightKind } from "./p2-types";

/** The kinds, in the order the form offers them. */
export const RIGHT_KINDS: readonly LegalRightKind[] = ["patent", "copyright", "trademark"];

export const RIGHT_LABEL: Record<LegalRightKind, string> = {
  patent: "Patent",
  copyright: "Copyright",
  trademark: "Trademark",
};

/** What the main field asks for, per kind — its label, an example and its cap. */
export const RIGHT_FIELD: Record<LegalRightKind, { label: string; example: string; max: number }> = {
  patent: { label: "Patent number", example: "e.g. US 11,234,567", max: 40 },
  copyright: { label: "Copyright notice", example: "e.g. © 2026 Your Name", max: 80 },
  trademark: { label: "Trademark", example: "e.g. IDEEZA", max: 80 },
};

/** The most rights one project holds. */
export const RIGHTS_MAX = 20;
const ATTORNEY_MAX = 60;
const HTTPS_ERROR = "Please enter a valid URL starting with https://";

export type RightInput = { kind: LegalRightKind; text: string; url: string; attorney: string };

export type RightErrors = { text: string | null; url: string | null; attorney: string | null; ok: boolean };

function lengthOf(s: string): number {
  return Array.from(s.trim()).length;
}

/** Empty is fine (the link is optional); anything else must be https, the same copy as
 *  P2-TABS-7's Attach URLs (ACT-58). */
function checkOptionalHttps(u: string): string | null {
  const v = u.trim();
  return v === "" || /^https:\/\//i.test(v) ? null : HTTPS_ERROR;
}

/** One right's check: its main field is required and capped (Patent 40, Copyright and Trademark
 *  80), the link is an optional https one, and a trademark's attorney is capped at 60. */
export function checkRight(input: RightInput): RightErrors {
  const field = RIGHT_FIELD[input.kind];
  const n = lengthOf(input.text);
  const text =
    n === 0 ? `Add the ${field.label.toLowerCase()}.` : n > field.max ? `Keep it to ${field.max} characters.` : null;
  const url = checkOptionalHttps(input.url);
  const attorney =
    input.kind === "trademark" && lengthOf(input.attorney) > ATTORNEY_MAX ? `Keep it to ${ATTORNEY_MAX} characters.` : null;
  return { text, url, attorney, ok: !text && !url && !attorney };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isKind(v: unknown): v is LegalRightKind {
  return v === "patent" || v === "copyright" || v === "trademark";
}

/** One stored right, or null when it holds nothing to show. A trademark may hold only an
 *  attorney — a record from before the list allowed that. */
function rightIn(raw: unknown, fallbackId: string): LegalRight | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isKind(r.kind)) return null;
  const text = str(r.text);
  const attorney = r.kind === "trademark" ? str(r.attorney) : "";
  if (!text && !attorney) return null;
  const url = str(r.url);
  return {
    id: str(r.id) || fallbackId,
    kind: r.kind,
    text,
    ...(url ? { url } : null),
    ...(attorney ? { attorney } : null),
  };
}

/** A record from before the list: one Patent, one Copyright and one Trademark at most. */
function legacyRights(r: Record<string, unknown>): unknown[] {
  const out: unknown[] = [];
  if (str(r.patent)) out.push({ id: "patent", kind: "patent", text: r.patent });
  if (r.copyright && typeof r.copyright === "object") {
    const c = r.copyright as Record<string, unknown>;
    out.push({ id: "copyright", kind: "copyright", text: c.text, url: c.url });
  }
  if (r.trademark && typeof r.trademark === "object") {
    const t = r.trademark as Record<string, unknown>;
    out.push({ id: "trademark", kind: "trademark", text: t.mark, attorney: t.attorney, url: t.url });
  }
  return out;
}

/** Drops a malformed or empty record; `updatedAt` must be a real number and at least one right
 *  must hold something — an all-empty save reads as "never set". Ids are made unique, and the
 *  list stops at RIGHTS_MAX. */
export function normalizeLegal(raw: unknown): ProjectLegal | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const updatedAt = typeof r.updatedAt === "number" && Number.isFinite(r.updatedAt) ? r.updatedAt : null;
  if (updatedAt === null) return undefined;

  const source = Array.isArray(r.rights) ? r.rights : legacyRights(r);
  const seen = new Set<string>();
  const rights: LegalRight[] = [];
  source.forEach((item, i) => {
    if (rights.length >= RIGHTS_MAX) return;
    const right = rightIn(item, `right-${i + 1}`);
    if (!right) return;
    let id = right.id;
    for (let n = 2; seen.has(id); n++) id = `${right.id}-${n}`;
    seen.add(id);
    rights.push({ ...right, id });
  });
  return rights.length > 0 ? { rights, updatedAt } : undefined;
}

/** The rights a record holds, oldest first; none for no record. */
export function rightsOf(legal: ProjectLegal | undefined): LegalRight[] {
  return legal?.rights ?? [];
}

/** The right as the form saves it: trimmed, the attorney only on a trademark, empty parts left out. */
export function rightFromInput(id: string, input: RightInput): LegalRight {
  const url = input.url.trim();
  const attorney = input.kind === "trademark" ? input.attorney.trim() : "";
  return {
    id,
    kind: input.kind,
    text: input.text.trim(),
    ...(url ? { url } : null),
    ...(attorney ? { attorney } : null),
  };
}

/** The record with `right` added at the end, or put in place of the one with its id. */
export function withRight(legal: ProjectLegal | undefined, right: LegalRight, now: number): ProjectLegal {
  const rights = rightsOf(legal);
  const at = rights.findIndex((x) => x.id === right.id);
  const next = at < 0 ? [...rights, right] : rights.map((x, i) => (i === at ? right : x));
  return { rights: next, updatedAt: now };
}

/** The record without the right `id`; undefined once nothing is left. */
export function withoutRight(legal: ProjectLegal | undefined, id: string, now: number): ProjectLegal | undefined {
  const rights = rightsOf(legal).filter((x) => x.id !== id);
  return rights.length > 0 ? { rights, updatedAt: now } : undefined;
}
