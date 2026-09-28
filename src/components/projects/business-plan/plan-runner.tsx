"use client";

// PlanRunner — the client runner P2-TABS-15 asks for: mounted once at the app
// layout (like VideoJobsProvider), so a run keeps going whichever page the
// maker is on, or none at all, and survives the Generate/Writing dialogs
// closing. It calls the section API (P2-TABS-20) one section at a time and
// saves each as it lands, straight into the business-plan store (T11) — so
// every reader of `useBusinessPlan` (the chip, the Writing dialog, the plan
// page) already sees live progress without this file handing them anything
// of its own. `<PlanRunner/>` itself only renders what nothing else can:
// the Ready dialog when the maker is on the project page as a run ends
// (P2-TABS-16), and the "Business plan ready · Open" toast otherwise.
//
// What lives at module scope, not in the component, because callers (the
// chip, the dialogs) are not necessarily its descendants — `<PlanRunner/>`
// is mounted as a bare sibling in layout.tsx, the same shape as
// GlobalRenderIndicator:
//   - `runs`: which projects THIS TAB is actively driving right now. A
//     stored `run` alone can't say that (errata #26) — a reload leaves the
//     same shape behind as a live run does — so `useIsPlanLive` is this
//     tab's own bookkeeping, never persisted.
//   - the completion broadcast the Ready dialog/toast subscribes to.

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog, ModalFrame, buttonVariants } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { onProjectDeleted } from "@/lib/manual/events";
import { useManualProjects } from "@/lib/manual/projects";
import {
  PLAN_SECTIONS,
  addVersion,
  type BusinessPlan,
  type PlanSection,
  type PlanVersion,
  type PricingTier,
  type SectionKind,
} from "@/lib/manual/business-plan";
import { readBusinessPlan, writeBusinessPlan } from "@/lib/manual/business-plan-store";
import { PlanSectionView, SECTION_TITLE, sectionContextText } from "./plan-section";

const SECTION_API = "/api/business-plan/section";

// ─────────────────────────── this tab's live runs ───────────────────────────

type RunReason = "stop" | "deleted" | undefined;
type RunEntry = { controller: AbortController; reason: RunReason };
const runs = new Map<string, RunEntry>();
const liveListeners = new Set<() => void>();
function notifyLive() {
  for (const l of liveListeners) l();
}

/** Is THIS tab the one driving project `id`'s run right now? Feeds
 *  `planChipState(plan, { live })` (errata #26). */
export function useIsPlanLive(projectId: string | null | undefined): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      liveListeners.add(cb);
      return () => liveListeners.delete(cb);
    },
    () => (projectId ? runs.has(projectId) : false),
    () => false,
  );
}

type Completion = { projectId: string; kind: "stopped" } | { projectId: string; kind: "done"; version: PlanVersion };
const completionListeners = new Set<(c: Completion) => void>();
function emitCompletion(c: Completion) {
  for (const l of completionListeners) l(c);
}
function onPlanCompletion(cb: (c: Completion) => void): () => void {
  completionListeners.add(cb);
  return () => completionListeners.delete(cb);
}

if (typeof window !== "undefined") {
  // One project's whole run is abandoned the moment it's deleted — the sweep
  // (project-storage.ts) already clears the key, so this just stops the loop
  // from writing a zombie one back (errata #33's spirit, applied here).
  onProjectDeleted((id) => {
    const r = runs.get(id);
    if (r) {
      r.reason = "deleted";
      r.controller.abort();
    }
  });
}

// ─────────────────────────── the fixed sections vs. custom ones ───────────────────────────

/** The 7 fixed kinds' positions in `sections`, in array order — custom
 *  ("+ Add section", P2-TABS-18) sections are additive and never part of the
 *  "k of 7" count or the automated run. */
function canonicalIndexes(sections: readonly PlanSection[]): number[] {
  const out: number[] = [];
  sections.forEach((s, i) => {
    if (s.kind !== "custom") out.push(i);
  });
  return out;
}

/** Which section `plan.run.next` names, for the Writing dialog's "Writing
 *  {Section} — {k} of 7". */
export function sectionAtOrdinal(sections: readonly PlanSection[], ordinal: number): PlanSection | null {
  const idxs = canonicalIndexes(sections);
  const idx = idxs[ordinal - 1];
  return idx === undefined ? null : sections[idx];
}

// ─────────────────────────── the section API call ───────────────────────────

type Fields = Record<string, string | string[] | PricingTier[]>;

export async function fetchPlanSection(args: {
  prompt: string;
  section: SectionKind | { title: string; brief: string };
  context: string;
  instruction?: string;
  signal?: AbortSignal;
}): Promise<Fields | null> {
  try {
    const res = await fetch(SECTION_API, {
      method: "POST",
      signal: args.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: args.prompt,
        section: args.section,
        context: args.context,
        ...(args.instruction ? { instruction: args.instruction } : null),
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { fields?: unknown };
    return body.fields && typeof body.fields === "object" ? (body.fields as Fields) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────── the store writes ───────────────────────────

/** Upserts the in-progress version (all its stub/kept sections) and opens
 *  `run` at the first pending one. Not `addVersion`: that clears `run`
 *  because it assumes a *finished* version (business-plan.ts's own comment). */
function seedVersion(projectId: string, seed: { version: number; prompt: string; sections: PlanSection[]; startedAt: number }): void {
  const plan = readBusinessPlan(projectId) ?? { v: 1 as const, projectId, current: 0, versions: [] };
  const versions = [...plan.versions.filter((v) => v.n !== seed.version), { n: seed.version, prompt: seed.prompt, createdAt: seed.startedAt, sections: seed.sections }].sort(
    (a, b) => a.n - b.n,
  );
  const next: BusinessPlan = { v: 1, projectId, current: seed.version, versions, run: { version: seed.version, next: 1, startedAt: seed.startedAt } };
  writeBusinessPlan(projectId, next);
}

/** Re-reads before writing, so a concurrent retry (of a different section)
 *  can't be clobbered by a stale in-memory copy — the only guard localStorage
 *  needs against this file's own two call sites racing each other. */
function mergeSection(projectId: string, version: number, index: number, patch: Partial<PlanSection>, next?: number): void {
  const plan = readBusinessPlan(projectId);
  if (!plan) return;
  const vi = plan.versions.findIndex((v) => v.n === version);
  if (vi < 0 || !plan.versions[vi].sections[index]) return;
  const sections = plan.versions[vi].sections.slice();
  sections[index] = { ...sections[index], ...patch };
  const versions = plan.versions.slice();
  versions[vi] = { ...versions[vi], sections };
  const run = next !== undefined ? { version, next, startedAt: plan.run?.startedAt ?? Date.now() } : plan.run;
  writeBusinessPlan(projectId, { v: 1, projectId, current: version, versions, ...(run ? { run } : null) });
}

/** Ends the run: keeps every section that was actually attempted (done or
 *  failed — CNT-67 "Cancel keeps what's written"), drops any never touched,
 *  and folds the result into a real version with `addVersion` (which trims
 *  to 5 and clears `run`). Nothing is saved if nothing was written. */
function finalizeRun(projectId: string, version: number, stopped: boolean): void {
  const plan = readBusinessPlan(projectId);
  if (!plan) return;
  const vi = plan.versions.findIndex((v) => v.n === version);
  const built = vi >= 0 ? plan.versions[vi] : null;
  const kept = (built?.sections ?? []).filter((s) => s.state !== "pending");
  if (!kept.length) {
    const versions = plan.versions.filter((v) => v.n !== version);
    const current = versions.length ? Math.max(...versions.map((v) => v.n)) : 0;
    writeBusinessPlan(projectId, { v: 1, projectId, current, versions });
    if (stopped) emitCompletion({ projectId, kind: "stopped" });
    return;
  }
  const finished: PlanVersion = { n: version, prompt: built!.prompt, createdAt: built!.createdAt, sections: kept };
  const bare: BusinessPlan = { v: 1, projectId, current: plan.current, versions: plan.versions };
  writeBusinessPlan(projectId, addVersion(bare, finished));
  if (stopped) emitCompletion({ projectId, kind: "stopped" });
  else emitCompletion({ projectId, kind: "done", version: finished });
}

// ─────────────────────────── the loop ───────────────────────────

async function driveRun(projectId: string, seed: { version: number; prompt: string; sections: PlanSection[]; startedAt: number }): Promise<void> {
  const entry: RunEntry = { controller: new AbortController(), reason: undefined };
  runs.set(projectId, entry);
  notifyLive();

  seedVersion(projectId, seed);
  const working = seed.sections.slice();
  const canon = canonicalIndexes(working);
  const pendingIdxs = working.reduce<number[]>((acc, s, i) => (s.state === "pending" ? [...acc, i] : acc), []);

  for (const idx of pendingIdxs) {
    if (entry.controller.signal.aborted) break;
    const sec = working[idx];
    if (sec.kind === "custom") continue; // never queued automatically; carried through as-is
    const ordinal = canon.indexOf(idx) + 1;
    mergeSection(projectId, seed.version, idx, { state: "pending" }, ordinal);
    const context = sectionContextText(working.filter((s, j) => j < idx));
    const fields = await fetchPlanSection({ prompt: seed.prompt, section: sec.kind, context, signal: entry.controller.signal });
    if (entry.controller.signal.aborted) break;
    const patch: Partial<PlanSection> = fields ? { fields, state: "done" } : { state: "failed" };
    working[idx] = { ...working[idx], ...patch };
    mergeSection(projectId, seed.version, idx, patch);
  }

  const reason = entry.reason;
  runs.delete(projectId);
  notifyLive();
  if (reason === "deleted") return; // the sweep already owns this key
  finalizeRun(projectId, seed.version, reason === "stop");
}

function freshSections(startedAt: number): PlanSection[] {
  return PLAN_SECTIONS.map((kind, i) => ({
    id: `bps_${startedAt.toString(36)}_${i}`,
    kind,
    title: SECTION_TITLE[kind],
    fields: {},
    origin: "ai" as const,
    state: "pending" as const,
  }));
}

/** P2-TABS-14's "Generate plan". */
export function startPlanRun(projectId: string, prompt: string): void {
  if (runs.has(projectId)) return;
  const plan = readBusinessPlan(projectId);
  const version = (plan?.versions.reduce((m, v) => Math.max(m, v.n), 0) ?? 0) + 1;
  const startedAt = Date.now();
  void driveRun(projectId, { version, prompt, sections: freshSections(startedAt), startedAt });
}

/** The chip's "Continue writing ({n} left)" (errata #26's Interrupted state). */
export function resumePlanRun(projectId: string): void {
  if (runs.has(projectId)) return;
  const plan = readBusinessPlan(projectId);
  if (!plan?.run) return;
  const version = plan.versions.find((v) => v.n === plan.run!.version);
  if (!version) return;
  void driveRun(projectId, { version: version.n, prompt: version.prompt, sections: version.sections, startedAt: version.createdAt });
}

/** P2-TABS-19's Regenerate: sections the maker edited or added stay exactly
 *  as they are; every AI-origin one (untouched since it was written) is
 *  queued again, in its own place in the array. Same prompt as the version
 *  it's rewriting — Regenerate doesn't ask for a new one. */
export function regeneratePlanRun(projectId: string): void {
  if (runs.has(projectId)) return;
  const plan = readBusinessPlan(projectId);
  const current = plan?.versions.find((v) => v.n === plan.current);
  if (!plan || !current) return;
  const nextN = plan.versions.reduce((m, v) => Math.max(m, v.n), 0) + 1;
  const startedAt = Date.now();
  const sections = current.sections.map((s) => (s.origin === "ai" ? { ...s, fields: {}, state: "pending" as const } : s));
  void driveRun(projectId, { version: nextN, prompt: current.prompt, sections, startedAt });
}

/** "Stop writing" — keeps whatever finished, drops the rest (CNT-67). */
export function stopPlanRun(projectId: string): void {
  const r = runs.get(projectId);
  if (r) {
    r.reason = "stop";
    r.controller.abort();
  }
}

/** CNT-68's "Try again", for one section — during a run (the section that
 *  just failed while later ones keep going) or long after one ended. Reads
 *  fresh and writes back through the same re-read-first path the loop uses,
 *  so it can't collide with a run still advancing other sections. */
export function retryPlanSection(projectId: string, sectionId: string): void {
  const plan = readBusinessPlan(projectId);
  if (!plan) return;
  const targetN = plan.run?.version ?? plan.current;
  const version = plan.versions.find((v) => v.n === targetN);
  const idx = version?.sections.findIndex((s) => s.id === sectionId) ?? -1;
  const sec = version && idx >= 0 ? version.sections[idx] : null;
  if (!version || !sec || sec.state !== "failed") return;
  const kind = sec.kind;
  if (kind === "custom") return;
  mergeSection(projectId, version.n, idx, { state: "pending" });
  void (async () => {
    const context = sectionContextText(version.sections.filter((s, j) => j < idx));
    const fields = await fetchPlanSection({ prompt: version.prompt, section: kind, context });
    mergeSection(projectId, version.n, idx, fields ? { fields, state: "done" } : { state: "failed" });
  })();
}

/** Discard (the Ready dialog, P2-TABS-16) and Delete business plan
 *  (the full page, CNT-78): both read as "back to none". */
export function clearBusinessPlan(projectId: string): void {
  writeBusinessPlan(projectId, { v: 1, projectId, current: 0, versions: [] });
}

/** The versions list's "Restore" (P2-TABS-19): only the `current` pointer
 *  moves — the version itself, and everything else, is untouched. */
export function restorePlanVersion(projectId: string, n: number): void {
  const plan = readBusinessPlan(projectId);
  if (!plan || !plan.versions.some((v) => v.n === n)) return;
  writeBusinessPlan(projectId, { ...plan, current: n });
}

// ─────────────────────────── the Ready dialog / toast ───────────────────────────

function ReadyDialog({ projectId, version, onClose }: { projectId: string; version: PlanVersion; onClose: () => void }) {
  const [confirming, setConfirming] = React.useState(false);
  const done = version.sections.filter((s) => s.state === "done");
  const preview = done.filter((s) => s.kind === "identity" || s.kind === "market").slice(0, 2);
  return (
    <>
      <ModalFrame
        open
        onClose={onClose}
        title="Your business plan is ready"
        covered={confirming}
        description={`${done.length} sections · saved to this project`}
        footer={
          <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
            <Button type="button" hierarchy="ghost" onClick={() => setConfirming(true)}>
              Discard
            </Button>
            <Link href={`/projects/${projectId}/business-plan`} onClick={onClose} className={cn(buttonVariants({ hierarchy: "primary" }))}>
              Open full plan
            </Link>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {preview.map((s) => (
            <PlanSectionView key={s.id} section={s} />
          ))}
        </div>
      </ModalFrame>
      <ConfirmDialog
        open={confirming}
        title="Discard this business plan?"
        confirmLabel="Discard"
        onConfirm={() => {
          clearBusinessPlan(projectId);
          setConfirming(false);
          onClose();
        }}
        onCancel={() => setConfirming(false)}
      >
        This deletes every section IDEEZA just wrote. This can&apos;t be undone.
      </ConfirmDialog>
    </>
  );
}

export function PlanRunner() {
  const pathname = usePathname();
  const pathRef = React.useRef(pathname);
  React.useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  const { projects } = useManualProjects();
  const projectsRef = React.useRef(projects);
  React.useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const [ready, setReady] = React.useState<{ projectId: string; version: PlanVersion } | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(
    () =>
      onPlanCompletion((c) => {
        if (c.kind !== "done") return;
        const proj = projectsRef.current.find((p) => p.id === c.projectId);
        const here = [`/projects/${c.projectId}`, proj ? `/projects/${proj.slug}` : null].filter(Boolean).some((p) => pathRef.current === p);
        if (here) setReady({ projectId: c.projectId, version: c.version });
        else setToast(c.projectId);
      }),
    [],
  );

  React.useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 10_000);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <>
      {ready && <ReadyDialog projectId={ready.projectId} version={ready.version} onClose={() => setReady(null)} />}
      {toast &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-16 right-16 z-toast flex items-center gap-6 rounded-xl border border-solid border-border bg-bg-surface px-6 py-4 shadow-3"
          >
            <span className="text-sm text-text-primary">Business plan ready</span>
            <Link href={`/projects/${toast}/business-plan`} className="text-sm font-semibold text-text-brand" onClick={() => setToast(null)}>
              Open
            </Link>
            <button type="button" aria-label="Dismiss" onClick={() => setToast(null)} className="text-text-tertiary">
              <Icon icon={Cancel01Icon} size={14} />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
