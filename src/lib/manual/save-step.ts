// SAVE — the name/details step before Save (owner decision 5, Phase 2 spec
// §3.5.9, area file save.md). Pure: no React, no storage and no clock of its
// own — every caller passes `now`. `saveRecord`/`saveBuild` are NOT here:
// they write `ManualProject` records and live in projects.tsx (T09), next to
// `attach()`. This module is everything ELSE the save step and the review
// footer need: which mode a build gets, its defaults, its cover choices, the
// version diff, the footer and banner copy, and — new in Phase 2 —
// `saveBlockOf`, the lock and auction copy for join and version modes
// (decision 12, P2-SAVE-5/6 as changed, spec §3.8.5).
//
// Value imports are relative, like the rest of src/lib/manual/**: tsc leaves
// `@/*` as it is in its output, and `node --test` loads the compiled module
// without a bundler.

import { productsOf, type BuildJob, type ChatSession } from "../create/history";
import { nextVersionOf } from "../create/save-footer";
import { checkDescription, checkProjectName, type DescriptionCheck, type NameCheck } from "./project-header";
import { buildsOf, lineageProjectOf, lineagesOf, productRowsOf } from "./project-read";
import {
  attach,
  PROJECT_DESC_COUNTER_FROM,
  PROJECT_DESC_MAX,
  PROJECT_NAME_MAX,
  type ManualProject,
} from "./projects";
import type { EditGate } from "./p2-types";
import type { ProjectStatus } from "./project-summary";

// ─────────────────────────── the mode (P2-SAVE-2) ───────────────────────────

/** Which save this build gets. `saved`: no step; the footer shows P2-SAVE-10. */
export type SaveMode =
  | { kind: "saved"; project: ManualProject }
  | { kind: "version"; project: ManualProject; version: number; chatTitle: string }
  | { kind: "join"; project: ManualProject } // setup's projectChoiceId, live; single product only
  | { kind: "new"; choiceGone: boolean; canJoin: boolean }; // canJoin: single product, no lineage, ≥1 project

function isSingleProduct(job: BuildJob): boolean {
  return (job.companions?.length ?? 0) === 0;
}

/**
 * The live project that already holds this build — `job.projectId`, else a
 * project whose `builds[]` or `buildId` names it (a save whose builds-store
 * write failed, P2-SAVE-15).
 */
export function holderOf(job: BuildJob, projects: ManualProject[]): ManualProject | null {
  if (job.projectId) {
    const byId = projects.find((p) => p.id === job.projectId);
    if (byId) return byId;
  }
  return projects.find((p) => p.buildId === job.id || (p.builds ?? []).some((r) => r.buildId === job.id)) ?? null;
}

/**
 * `saveTargetOf()` behind `holderOf()`, turned into a mode. The version is
 * `nextVersionOf(job, buildsOf(sibling, all))` — the footer's own arithmetic,
 * so the dialog's title can't disagree with what Save actually writes.
 */
export function saveModeOf(
  job: BuildJob,
  lineage: BuildJob[],
  projects: ManualProject[],
  all: BuildJob[],
  chats: ChatSession[],
): SaveMode {
  const holder = holderOf(job, projects);
  if (holder) return { kind: "saved", project: holder };

  const sibling = lineageProjectOf(job, lineage, projects);
  if (sibling) {
    const refs = buildsOf(sibling, all);
    const version = nextVersionOf(job, refs);
    const chatTitle = lineagesOf(refs, chats).find((l) => l.chatId === job.chatId)?.title ?? job.title;
    return { kind: "version", project: sibling, version, chatTitle };
  }

  const single = isSingleProduct(job);
  const choiceId = job.projectChoiceId;
  const chosen = choiceId ? projects.find((p) => p.id === choiceId) : undefined;
  if (single && chosen) return { kind: "join", project: chosen };

  const choiceGone = Boolean(choiceId) && !chosen;
  const canJoin = single && projects.length > 0;
  return { kind: "new", choiceGone, canJoin };
}

// ─────────────────────────── defaults and cover (P2-SAVE-4, P2-SAVE-7) ───────────────────────────

/** Characters as a person counts them: an emoji is one, not two UTF-16 units (CNT-2). */
function clip(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length > max ? chars.slice(0, max).join("") : s;
}

/** "A, B and C" — the join sentence's own list (P2-SAVE-4), and the lock line's (edit-gate.ts has its own copy). */
function joinNames(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export type SaveDefaults = { name: string; description: string; coverProductId: "primary" };

/** P2-SAVE-4: only facts the build holds. `summary` is never used — it's a parts line. */
export function saveDefaultsOf(job: BuildJob): SaveDefaults {
  const name = clip(job.projectChoiceName?.trim() || job.title.trim(), PROJECT_NAME_MAX);
  const products = productsOf(job);
  const primarySentence = (job.description || job.conceptPrompt).trim();
  const description =
    products.length <= 1
      ? primarySentence
      : `${primarySentence} Comes with ${joinNames(products.slice(1).map((p) => p.name))}.`;
  return { name, description: clip(description, PROJECT_DESC_MAX), coverProductId: "primary" };
}

export type CoverChoice = { productId: string; name: string; imageUrl: string };

/** P2-SAVE-7: the primary first, then each companion with an image, the same URL shown once. */
export function coverChoicesOf(job: BuildJob): CoverChoice[] {
  const seen = new Set<string>();
  const out: CoverChoice[] = [];
  for (const p of productsOf(job)) {
    const url = p.conceptImageUrl;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ productId: p.id, name: p.id === "primary" ? job.title : p.name, imageUrl: url });
  }
  return out;
}

// ─────────────────────────── the draft and its check ───────────────────────────

/** What the maker typed; kept per build in memory by save-step.tsx (T16). */
export type SaveDraft = {
  mode: "new" | "join";
  name: string;
  description: string;
  coverProductId: string; // "primary" or a companion id
  joinId: string | null; // the join target after Change
};

export type SaveCheck = { ok: boolean; name: NameCheck; description: DescriptionCheck };

/** Wraps project-header.ts, so the save step and the rename can never disagree (P2-SAVE-15). */
export function checkSaveDraft(d: SaveDraft, otherNames: readonly string[]): SaveCheck {
  const name = checkProjectName(d.name, otherNames, PROJECT_NAME_MAX);
  const description = checkDescription(d.description, PROJECT_DESC_MAX, PROJECT_DESC_COUNTER_FROM);
  return { ok: name.error === null && description.error === null, name, description };
}

// ─────────────────────────── version mode's diff (P2-SAVE-6) ───────────────────────────

export type VersionChanges = { added: string[]; updated: string[]; dropped: string[] };

/**
 * `versionsOf()` on `attach(project, job, lineage, now)`: the diff the Versions
 * block will show, as names — new / updated (name or description changed) /
 * dropped (stays listed, COR-108) / neither (identical, so the caller can show
 * "Same products as version {n−1}."). `attach()` never removes a row — a
 * "dropped" one is still in `products`, just not repointed to this build — so
 * the diff reads each row's `source.buildId`, not the array's membership.
 * Only rows this chat's earlier version already held are considered: a row
 * from another lineage, or a hand-made one, is left alone by `attach()` and
 * is no part of this diff.
 */
export function versionChangesOf(
  project: ManualProject,
  job: BuildJob,
  lineage: BuildJob[],
  all: BuildJob[],
  chats: ChatSession[],
  now: number,
): VersionChanges {
  void all;
  void chats;
  const priorIdsInLineage = new Set(
    (project.builds ?? []).filter((r) => r.chatId === job.chatId).map((r) => r.buildId),
  );
  const before = productRowsOf(project);
  const beforeById = new Map(before.map((r) => [r.id, r]));
  const after = attach(project, job, lineage, now);
  const rowsAfter = productRowsOf(after);

  const added: string[] = [];
  const updated: string[] = [];
  const dropped: string[] = [];
  for (const row of rowsAfter) {
    const prior = beforeById.get(row.id);
    if (!prior) {
      added.push(row.name);
      continue;
    }
    const wasInLineage = prior.source ? priorIdsInLineage.has(prior.source.buildId) : false;
    if (!wasInLineage) continue;
    const movedToThisVersion = row.source?.buildId === job.id;
    if (!movedToThisVersion) {
      dropped.push(row.name);
      continue;
    }
    if (prior.name !== row.name || prior.description !== row.description) updated.push(row.name);
  }

  return { added, updated, dropped };
}

// ─────────────────────────── copy (P2-SAVE-1, 5, 6, 9, 10) ───────────────────────────

/** P2-SAVE-5/6: the neutral mint line in join and version modes. Not Draft → shown. */
export function mintNoticeOf(status: ProjectStatus, project: string, what: "product" | "version"): string | null {
  return status === "draft" ? null : `${project} is already minted. This ${what} won't be part of that mint.`;
}

const PIECE_WORDS: Record<number, string> = { 5: "five" };

function piecesPhrase(pieces: number): string {
  return `All ${PIECE_WORDS[pieces] ?? String(pieces)} pieces are ready.`;
}

function modeSentence(mode: SaveMode): string {
  switch (mode.kind) {
    case "new":
      return mode.choiceGone
        ? "The project you picked at the start isn't in this browser any more — save it as a new project."
        : "Save it to name the project and put it in My projects.";
    case "join":
      return `Save it to add it to ${mode.project.name}.`;
    case "version":
      return `Save it as version ${mode.version} of ${mode.project.name}.`;
    case "saved":
      return "";
  }
}

/** P2-SAVE-1: the review footer's status line, before Save. */
export function footerLineOf(mode: SaveMode, pieces: number): string {
  const sentence = modeSentence(mode);
  return sentence ? `${piecesPhrase(pieces)} ${sentence}` : piecesPhrase(pieces);
}

/** P2-SAVE-10: "Saved to {name} as version {n}." — the review's saved status line, plain text. */
export function savedLineOf(project: ManualProject, version: number | null): string {
  return version === null ? `Saved to ${project.name}.` : `Saved to ${project.name} as version ${version}.`;
}

/** P2-SAVE-9: the project page's one-shot arrival banner, by mode. */
export function arrivalOf(
  mode: "new" | "join" | "version",
  f: { name: string; product: string; version: number },
): { title: string; body?: string } {
  switch (mode) {
    case "new":
      return { title: "Saved to My projects", body: `${f.name} is ready for its next step.` };
    case "join":
      return { title: `${f.product} was added to ${f.name}.` };
    case "version":
      return { title: `Saved as version ${f.version}.` };
  }
}

// ─────────────────────────── the lock and the auction gate (decision 12, P2-SAVE-5/6 as changed) ───────────────────────────

export type SaveBlock = { kind: "locked" | "blocked"; reason: string };

/**
 * The lock and auction copy for join and version modes (spec §3.5.9). `gate`
 * is `editGateOf({ listing, lock }, "addProduct")` (edit-gate.ts), read for
 * the target project. Null when nothing blocks the save (new/saved modes
 * never block here — a locked project is never offered as a join target,
 * P2-SAVE-5 as changed).
 */
export function saveBlockOf(mode: SaveMode, gate: EditGate): SaveBlock | null {
  if (mode.kind !== "join" && mode.kind !== "version") return null;
  if (gate.kind === "locked") {
    if (mode.kind === "version") {
      return {
        kind: "locked",
        reason: `${mode.project.name} was sold in full, so it can't take a new version. Save this build as a new project.`,
      };
    }
    return { kind: "locked", reason: `${mode.project.name} was sold in full, so it can't be changed.` };
  }
  if (gate.kind === "blocked") return { kind: "blocked", reason: gate.reason };
  return null;
}
