// Earn › Business plan and Earn › Money on the phone (mobile Figma "Project
// Details · 2026 update" 16–16o, 17–17j): the small choices the phone makes
// over the web's own logic. The plan's store, runner and words stay the
// web's (business-plan.ts, plan-runner.tsx, plan-section.tsx); the money's
// stay contributors.ts, customers.ts, legal.ts and account/payout.ts (the
// per-coin sum stays in the Sales screen: engineering doesn't import wallet).
//
// Pure. Value imports are relative, so node:test loads the compiled module.

import { PLAN_SECTIONS, planChipState, type BusinessPlan, type PlanSection, type PlanVersion, type SectionKind } from "./business-plan";
import { formatDate } from "./project-summary";

const TOTAL = PLAN_SECTIONS.length;

// ─────────────────────────── the business plan ───────────────────────────

/** The web's four states (`planChipState`), and 16i: a plan whose only
 *  version has no section written (every one failed) reads as "the plan
 *  couldn't be written" instead of seven "Couldn't write …" lines. With an
 *  earlier version to go back to, it stays "ready": each failed section
 *  offers Try again, and the versions sheet the way back. */
export type PhonePlanState = "none" | "writing" | "interrupted" | "failed" | "ready";

export function currentVersionOf(plan: BusinessPlan | null): PlanVersion | null {
  return plan?.versions.find((v) => v.n === plan.current) ?? null;
}

export function phonePlanState(plan: BusinessPlan | null, live: boolean): PhonePlanState {
  const chip = planChipState(plan, { live });
  if (chip !== "ready") return chip;
  const current = currentVersionOf(plan);
  if (!current) return "none";
  const done = current.sections.some((s) => s.state === "done");
  const failed = current.sections.some((s) => s.state === "failed");
  return !done && failed && plan!.versions.length === 1 ? "failed" : "ready";
}

/** The Generate sheet's prefill (P2-TABS-14, the web's `promptSeed`): the project description, then its product names. */
export function planPromptSeed(description: string, productNames: readonly string[]): string {
  const desc = description.trim();
  const names = productNames.filter(Boolean);
  if (!names.length) return desc;
  return desc ? `${desc}\n\nProducts: ${names.join(", ")}.` : `Products: ${names.join(", ")}.`;
}

/** "1 section", "3 sections". */
export function sectionsWord(n: number): string {
  return `${n} section${n === 1 ? "" : "s"}`;
}

/** The plan's seven kinds the version has no section of (a stopped run drops the ones it never reached). */
export function missingKindsOf(version: PlanVersion): SectionKind[] {
  const have = new Set(version.sections.map((s) => s.kind));
  return PLAN_SECTIONS.filter((k) => !have.has(k));
}

/** Sections written (done) in the version. */
export function writtenCountOf(version: PlanVersion): number {
  return version.sections.filter((s) => s.state === "done").length;
}

/** What's left to write: the version's pending sections plus the kinds it has none of. */
export function sectionsLeftOf(version: PlanVersion): number {
  return version.sections.filter((s) => s.state === "pending" && s.kind !== "custom").length + missingKindsOf(version).length;
}

/** The version's sections with every missing kind added back as a pending AI section, each in its
 *  own place in the plan's order (the maker's own sections stay where they are). */
export function withMissingSections(version: PlanVersion, startedAt: number, titleOf: (kind: SectionKind) => string): PlanSection[] {
  const missing = missingKindsOf(version);
  if (!missing.length) return version.sections;
  const fresh = (kind: SectionKind): PlanSection => ({
    id: `bps_${startedAt.toString(36)}_m${PLAN_SECTIONS.indexOf(kind)}`,
    kind,
    title: titleOf(kind),
    fields: {},
    origin: "ai",
    state: "pending",
  });
  const out: PlanSection[] = [];
  let i = 0;
  for (const s of version.sections) {
    const at = s.kind === "custom" ? -1 : PLAN_SECTIONS.indexOf(s.kind);
    while (at >= 0 && i < missing.length && PLAN_SECTIONS.indexOf(missing[i]) < at) out.push(fresh(missing[i++]));
    out.push(s);
  }
  while (i < missing.length) out.push(fresh(missing[i++]));
  return out;
}

/** The plan's kinds with no written section in the version (missing, failed or still pending). */
export function unwrittenCountOf(version: PlanVersion): number {
  const written = new Set(version.sections.filter((s) => s.state === "done").map((s) => s.kind));
  return PLAN_SECTIONS.filter((k) => !written.has(k)).length;
}

/** The plan set to write version `n`'s missing sections: the kinds it lacks added back, a failed
 *  AI section asked again, and a run on that version — so the runner's Continue writing
 *  (`resumePlanRun`) writes only those and keeps every written one. Null when all seven are written. */
export function completionPlanOf(plan: BusinessPlan, n: number, now: number, titleOf: (kind: SectionKind) => string): BusinessPlan | null {
  const version = plan.versions.find((v) => v.n === n);
  if (!version || unwrittenCountOf(version) === 0) return null;
  const sections = withMissingSections(version, now, titleOf).map((s) =>
    s.state === "failed" && s.kind !== "custom" && s.origin === "ai" ? { ...s, fields: {}, state: "pending" as const } : s,
  );
  const versions = plan.versions.map((v) => (v.n === n ? { ...v, sections } : v));
  return { v: 1, projectId: plan.projectId, current: n, versions, run: { version: n, next: 1, startedAt: plan.run?.startedAt ?? now } };
}

/** The run row's line while it writes (16g) and once it stopped (16h), in the web's words. Given the
 *  run's version, "left" counts what that version still lacks, not the run's position. */
export function runLineOf(run: NonNullable<BusinessPlan["run"]>, live: boolean, version?: PlanVersion | null): string {
  if (live) return `Writing business plan · ${run.next} of ${TOTAL}`;
  const left = version ? sectionsLeftOf(version) : TOTAL + 1 - run.next;
  return `Writing stopped with ${left} of ${TOTAL} sections left.`;
}

/** The run's progress, 0–100: the sections before the one being written. */
export function runProgressOf(run: NonNullable<BusinessPlan["run"]>): number {
  return ((run.next - 1) / TOTAL) * 100;
}

/** "Smart Plant Watering Kit · Version 1 · Generated Oct 28, 2026 · 7 sections". */
export function planMetaLine(projectName: string, version: PlanVersion): string {
  return `${projectName} · Version ${version.n} · Generated ${formatDate(version.createdAt)} · ${sectionsWord(writtenCountOf(version))}`;
}

/** The plan without version `n` and without a run: what Start over (16h) and
 *  Try again (16i) clear before a fresh run, so a half-written or failed
 *  version never stays behind. `current` falls back to the newest left. */
export function withoutVersion(plan: BusinessPlan, n: number): BusinessPlan {
  const versions = plan.versions.filter((v) => v.n !== n);
  const current = versions.some((v) => v.n === plan.current) ? plan.current : versions.length ? Math.max(...versions.map((v) => v.n)) : 0;
  return { v: 1, projectId: plan.projectId, current, versions };
}

/** The Ready sheet's preview (16f, the web's Ready dialog): Identity and Market research, once written. */
export function readyPreviewOf(version: PlanVersion): PlanSection[] {
  return version.sections.filter((s) => s.state === "done" && (s.kind === "identity" || s.kind === "market")).slice(0, 2);
}

/** "7 sections · saved to this project". */
export function readyLineOf(version: PlanVersion): string {
  return `${sectionsWord(writtenCountOf(version))} · saved to this project`;
}

/** The Ready sheet's title: ready with all seven, else how far it got (16f). */
export function readyTitleOf(version: PlanVersion): string {
  const n = writtenCountOf(version);
  return n >= TOTAL ? "Your business plan is ready" : `Your plan is partly written (${n} of ${TOTAL})`;
}

/** Why ⋯'s Edit and Regenerate are left out of the menu, or null when both are there. */
export function planMenuNote(midRun: boolean): string | null {
  return midRun ? "Edit and Regenerate are available once the plan has finished writing." : null;
}

/** Sections the phone edits one at a time (16k): the written ones. */
export function editableSections(version: PlanVersion): PlanSection[] {
  return version.sections.filter((s) => s.state === "done");
}

/** "{n} of 5 versions kept — the oldest is removed when a 6th is made." (the web's versions footer). */
export function versionsKeptLine(count: number): string {
  return `${count} of 5 versions kept — the oldest is removed when a 6th is made.`;
}

// ─────────────────────────── money ───────────────────────────

/** A sale row's second line: "Main NFT · 10% share", or the edition's name. */
export function saleItemLine(text: { item: string; share: string | null }): string {
  return text.share ? `${text.item} · ${text.share} share` : text.item;
}

/** A sale row's date side: "Oct 28, 2026 · 2 benefits", or "· —" with none. */
export function saleWhenLine(at: number, benefits: string | null): string {
  return `${formatDate(at)} · ${benefits ?? "—"}`;
}

/** `?sale=<id>` read once: the sale it names, when this project has it. */
export function saleFromQuery<T extends { saleId: string }>(rows: readonly T[], raw: string | null): T | null {
  if (!raw) return null;
  return rows.find((r) => r.saleId === raw) ?? null;
}
