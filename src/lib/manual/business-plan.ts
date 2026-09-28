// BUSINESS PLAN — the seven-section plan (P2-TABS-13…20), consolidated spec
// §3.5.9, area file tabs.md §C. Pure: types, the chip's state, version
// bookkeeping and the section reply parser. The runner, dialogs and page are
// T21's; the store is T11's.
//
// Value imports are relative, so `node --test` loads the compiled module.

export const PLAN_SECTIONS = ["identity", "brand", "market", "swot", "pricing", "problem", "landing"] as const;
export type SectionKind = (typeof PLAN_SECTIONS)[number];

export type PricingTier = { name: string; price: string; cadence: string; features: string[]; recommended?: true };

export type PlanSection = {
  id: string;
  kind: SectionKind | "custom";
  title: string;
  fields: Record<string, string | string[] | PricingTier[]>;
  origin: "ai" | "edited" | "added";
  state: "done" | "failed" | "pending";
};

export type PlanVersion = { n: number; prompt: string; createdAt: number; sections: PlanSection[] };

export type BusinessPlan = {
  v: 1;
  projectId: string;
  current: number;
  /** ≤ 5 */
  versions: PlanVersion[];
  run?: { version: number; next: number; startedAt: number; stoppedAt?: number };
};

export const BIZPLAN_KEY = (id: string) => `ideeza:project:bizplan:${id}`;
const MAX_VERSIONS = 5;

// ─────────────────────────── the chip (P2-TABS-13) ───────────────────────────

export type PlanChipState = "none" | "writing" | "interrupted" | "ready";

/**
 * None / Writing / Interrupted / Ready (P2-TABS-13). A stored `run` alone
 * can't say whether THIS tab is the one driving it — a reload leaves the
 * same `run` shape behind as a live one does — so the runner passes
 * `live: true` only while it is actually the process working through
 * `run.next` for this project. Every other reader (a fresh mount, another
 * tab) omits it and reads an unfinished run as Interrupted, which is the
 * safe default: "Continue writing" always offers a way forward.
 */
export function planChipState(p: BusinessPlan | null, opts: { live?: boolean } = {}): PlanChipState {
  if (!p) return "none";
  if (p.run) return opts.live ? "writing" : "interrupted";
  return p.versions.length > 0 ? "ready" : "none";
}

// ─────────────────────────── versions (P2-TABS-19) ───────────────────────────

/** Adds a finished version and drops the oldest past 5 (CNT-76); clears any `run` (it's done). */
export function addVersion(p: BusinessPlan, v: PlanVersion): BusinessPlan {
  const sorted = [...p.versions.filter((x) => x.n !== v.n), v].sort((a, b) => a.n - b.n);
  const versions = sorted.length > MAX_VERSIONS ? sorted.slice(sorted.length - MAX_VERSIONS) : sorted;
  return { v: 1, projectId: p.projectId, current: v.n, versions };
}

/** CNT-77: sections the maker edited or added stay; the rest (AI, untouched) are rewritten. */
export function regenerateImpact(p: BusinessPlan): { kept: number; rewritten: number } {
  const current = p.versions.find((v) => v.n === p.current);
  const sections = current?.sections ?? [];
  const kept = sections.filter((s) => s.origin === "edited" || s.origin === "added").length;
  return { kept, rewritten: sections.length - kept };
}

// ─────────────────────────── the section reply (P2-TABS-20) ───────────────────────────

/** The headings `/api/business-plan/section` must return for each section kind to count as
 *  usable — a defensible minimum, not a public contract: the route and this parser are the
 *  only readers. `parsePlanSection` rejects a reply missing any of them. */
const REQUIRED_HEADINGS: Record<SectionKind, readonly string[]> = {
  identity: ["tagline", "mission", "audience"],
  brand: ["voice", "values", "personality"],
  market: ["size", "trends", "competitors"],
  swot: ["strengths", "weaknesses", "opportunities", "threats"],
  pricing: ["tiers"],
  problem: ["problem", "solution"],
  landing: ["headline", "subheadline", "cta"],
};

/** A short line, alone, that isn't a bullet: "Strengths:", "## Strengths", "**Strengths**". */
function headingKey(line: string): string | null {
  const cleaned = line.replace(/^#{1,3}\s*/, "").replace(/\*\*/g, "").trim();
  if (!cleaned || cleaned.length > 44 || /^[-*•]/.test(cleaned)) return null;
  const m = /^([A-Za-z][A-Za-z /&]{0,42}?):?$/.exec(cleaned);
  return m ? m[1].trim().toLowerCase() : null;
}

/** Every heading block in the reply, keyed by its lower-cased label: the lines under it, with
 *  a leading bullet marker stripped. */
function blocksOf(text: string): Map<string, string[]> {
  const blocks = new Map<string, string[]>();
  let current: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const key = headingKey(line);
    if (key) {
      current = key;
      if (!blocks.has(current)) blocks.set(current, []);
      continue;
    }
    if (current) blocks.get(current)!.push(line.replace(/^[-*•]\s*/, "").trim());
  }
  return blocks;
}

function parsePricingTiers(lines: readonly string[]): PricingTier[] {
  return lines.map((line): PricingTier => {
    const [name = "", price = "", cadence = "", ...features] = line.split("|").map((s) => s.trim());
    return { name, price, cadence, features: features.filter(Boolean) };
  });
}

/** Validates the model's reply against the section's shape; `null` rejects it (a caller then
 *  shows "Couldn't write {Section}" — never fallback text, CNT-68). */
export function parsePlanSection(kind: SectionKind, text: string): PlanSection["fields"] | null {
  const blocks = blocksOf(text);
  for (const heading of REQUIRED_HEADINGS[kind]) {
    if (!(blocks.get(heading) ?? []).length) return null;
  }
  const fields: Record<string, string | string[] | PricingTier[]> = {};
  for (const [key, lines] of blocks) {
    fields[key] = kind === "pricing" && key === "tiers" ? parsePricingTiers(lines) : lines.length === 1 ? lines[0] : lines;
  }
  return fields;
}
