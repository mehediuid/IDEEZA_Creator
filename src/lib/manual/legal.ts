// LEGAL — the rail's Legal information block (P2-TABS-23), consolidated spec
// §3.5.9. Pure: the inline form's check and the stored shape's normalizer.
// `ManualProject.legal` is written through `updateProject` (T09); the block
// itself is `rail-legal.tsx` (T19).
//
// Value imports are relative, so `node --test` loads the compiled module.

import type { ProjectLegal } from "./p2-types";

const PATENT_MAX = 40;
const COPYRIGHT_MAX = 80;
const TRADEMARK_MAX = 80;
const ATTORNEY_MAX = 60;
const HTTPS_ERROR = "Please enter a valid URL starting with https://";

export type LegalInput = {
  patent: string;
  copyrightText: string;
  copyrightUrl: string;
  trademark: string;
  attorneyName: string;
  attorneyUrl: string;
};

export type LegalErrors = {
  patent: string | null;
  copyrightText: string | null;
  copyrightUrl: string | null;
  trademark: string | null;
  attorneyName: string | null;
  attorneyUrl: string | null;
  ok: boolean;
};

function lengthOf(s: string): number {
  return Array.from(s.trim()).length;
}

/** Empty is fine (both link fields are optional); anything else must be https, the same copy
 *  as P2-TABS-7's Attach URLs (ACT-58). */
function checkOptionalHttps(u: string): string | null {
  const v = u.trim();
  return v === "" || /^https:\/\//i.test(v) ? null : HTTPS_ERROR;
}

function checkMax(s: string, max: number): string | null {
  return lengthOf(s) > max ? `Keep it to ${max} characters.` : null;
}

/** The inline edit form's check (P2-TABS-23's table): Patent ≤40, Copyright ≤80 with an
 *  optional https link, Trademark ≤80, Attorney name ≤60 with an optional https link. */
export function checkLegal(input: LegalInput): LegalErrors {
  const patent = checkMax(input.patent, PATENT_MAX);
  const copyrightText = checkMax(input.copyrightText, COPYRIGHT_MAX);
  const copyrightUrl = checkOptionalHttps(input.copyrightUrl);
  const trademark = checkMax(input.trademark, TRADEMARK_MAX);
  const attorneyName = checkMax(input.attorneyName, ATTORNEY_MAX);
  const attorneyUrl = checkOptionalHttps(input.attorneyUrl);
  const ok = !patent && !copyrightText && !copyrightUrl && !trademark && !attorneyName && !attorneyUrl;
  return { patent, copyrightText, copyrightUrl, trademark, attorneyName, attorneyUrl, ok };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Drops a malformed or empty record; `updatedAt` must be a real number, and at least one of
 *  Patent, Copyright or Trademark must hold something — an all-empty save reads as "never set". */
export function normalizeLegal(raw: unknown): ProjectLegal | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const updatedAt = typeof r.updatedAt === "number" && Number.isFinite(r.updatedAt) ? r.updatedAt : null;
  if (updatedAt === null) return undefined;

  const out: ProjectLegal = { updatedAt };

  const patent = str(r.patent);
  if (patent) out.patent = patent;

  if (r.copyright && typeof r.copyright === "object") {
    const c = r.copyright as Record<string, unknown>;
    const text = str(c.text);
    if (text) {
      const url = str(c.url);
      out.copyright = url ? { text, url } : { text };
    }
  }

  if (r.trademark && typeof r.trademark === "object") {
    const t = r.trademark as Record<string, unknown>;
    const mark = str(t.mark);
    const attorney = str(t.attorney);
    const url = str(t.url);
    if (mark || attorney) {
      out.trademark = {
        ...(mark ? { mark } : null),
        ...(attorney ? { attorney } : null),
        ...(url ? { url } : null),
      };
    }
  }

  return out.patent || out.copyright || out.trademark ? out : undefined;
}
