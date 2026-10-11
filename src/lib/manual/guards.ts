// Write and delete guards (Build and Earn P1-1). Engineering asks before it
// changes or deletes a project; the layer above it answers. Engineering never
// imports that layer: commerce registers its guards here at the app root
// (components/commerce/commerce-root.tsx) — the 100 % sale's lock, the
// listing's pause and auction gate, and the delete gate — and every gate in
// engineering reads them through this registry.
//
// - A write meets the strongest verdict any guard gives: locked, then blocked,
//   then confirm, then free. The lock still wins over the listing gate
//   (`editGateOf`'s order, spec §3.5.9).
// - `confirm` is the guard's own step, run once the maker agrees (pause the
//   listing). Its undo puts back what it changed, for a write that is then
//   refused (the save step's storage-full path).
// - React reads the registry through `subscribeGuards` / `guardsSnapshot`
//   (useSyncExternalStore), so a sale in another tab moves every gate.
//
// Pure: no React and no storage; relative imports, so node:test loads it.

import type { ComponentType } from "react";
import type { EditGate } from "./p2-types";
import type { DeleteBlock } from "./permissions";
import type { ManualProject } from "./projects";

/** A write a guard is asked about: the changes buyers can see (P2-LISTING-13). */
export type WriteChange = "rename" | "description" | "cover" | "addProduct" | "editProduct" | "dropProduct";

/** What a guard needs of the project. A gate asked before the projects store hydrates passes
 *  `{ id, createdAt: 0, contributors: [] }`. */
export type GuardProject = Pick<ManualProject, "id" | "createdAt" | "contributors">;

/** A guard's answer: the edit gate's four kinds. */
export type WriteVerdict = EditGate;
export type LockedVerdict = Extract<WriteVerdict, { kind: "locked" }>;

/** Puts back what a confirmed step changed; false when that write was refused too. */
export type Undo = () => boolean;
export const NO_UNDO: Undo = () => true;

export type ConfirmResult = { ok: true; undo: Undo } | { ok: false; reason: string };

/** The dialog a `confirm` verdict opens. It renders nothing while `open` is false. */
export type GuardConfirmProps = {
  open: boolean;
  onCancel: () => void;
  /** Called once the maker agrees. */
  onConfirm: () => void;
  /** Why the guard's step didn't go through; the dialog stays open and says so. */
  error?: string | null;
};

export interface WriteGuard {
  readonly id: string;
  /** The verdict on a write of `change` to `project` at `now`, from the guard's records as they are now. */
  check(project: GuardProject, change: WriteChange, now: number): WriteVerdict;
  /** A guard that can make a project read-only for good (the 100 % sale) says so outside any
   *  write too: the choosers that leave a locked project out ask this. */
  lockOf?(project: GuardProject): LockedVerdict | null;
  /** A `confirm` verdict's step, run once the maker agrees. */
  confirm?(project: GuardProject, change: WriteChange, now: number): ConfirmResult;
  /** The dialog a `confirm` verdict opens. */
  readonly Confirm?: ComponentType<GuardConfirmProps>;
  /** useSyncExternalStore's pair over what the guard reads: a verdict changes only with the snapshot. */
  subscribe?(onChange: () => void): () => void;
  snapshot?(): unknown;
  /** The guard's records can't be read, so it can't tell whether a write is safe. */
  unreadable?(): boolean;
}

export interface DeleteGuard {
  readonly id: string;
  /** Why `project` can't be deleted at `now`, or null. */
  check(project: GuardProject, now: number): DeleteBlock | null;
}

// ─────────────────────────── the registry ───────────────────────────

const writeGuards = new Map<string, WriteGuard>();
const deleteGuards = new Map<string, DeleteGuard>();
const listeners = new Set<() => void>();
let version = 0;

function changed(): void {
  version += 1;
  for (const l of [...listeners]) l();
}

/** Registers `guard` under its id (a later one with the same id replaces it); returns the unregister. */
export function registerWriteGuard(guard: WriteGuard): () => void {
  writeGuards.set(guard.id, guard);
  changed();
  return () => {
    if (writeGuards.get(guard.id) !== guard) return;
    writeGuards.delete(guard.id);
    changed();
  };
}

export function registerDeleteGuard(guard: DeleteGuard): () => void {
  deleteGuards.set(guard.id, guard);
  return () => {
    if (deleteGuards.get(guard.id) === guard) deleteGuards.delete(guard.id);
  };
}

/** The write guards, in registration order. */
export function writeGuardsNow(): readonly WriteGuard[] {
  return [...writeGuards.values()];
}

export function deleteGuardsNow(): readonly DeleteGuard[] {
  return [...deleteGuards.values()];
}

// ─────────────────────────── the verdicts ───────────────────────────

const STRENGTH: Record<WriteVerdict["kind"], number> = { free: 0, confirm: 1, blocked: 2, locked: 3 };
const FREE: WriteVerdict = { kind: "free" };

/** The strongest verdict on a write, and the guard that gave it (null when every guard lets it through). */
export function decideWrite(
  project: GuardProject,
  change: WriteChange,
  now: number,
  guards: readonly WriteGuard[] = writeGuardsNow(),
): { verdict: WriteVerdict; guard: WriteGuard | null } {
  let verdict = FREE;
  let by: WriteGuard | null = null;
  for (const g of guards) {
    const v = g.check(project, change, now);
    if (STRENGTH[v.kind] > STRENGTH[verdict.kind]) {
      verdict = v;
      by = g;
    }
  }
  return { verdict, guard: by };
}

export function writeVerdictOf(
  project: GuardProject,
  change: WriteChange,
  now: number,
  guards: readonly WriteGuard[] = writeGuardsNow(),
): WriteVerdict {
  return decideWrite(project, change, now, guards).verdict;
}

/** The lock on `project`, from the first guard that holds one; null when none does. */
export function lockOf(project: GuardProject, guards: readonly WriteGuard[] = writeGuardsNow()): LockedVerdict | null {
  for (const g of guards) {
    const lock = g.lockOf?.(project) ?? null;
    if (lock) return lock;
  }
  return null;
}

/** True when any guard can't read its records. */
export function guardsUnreadable(guards: readonly WriteGuard[] = writeGuardsNow()): boolean {
  return guards.some((g) => g.unreadable?.() === true);
}

/** Why `project` can't be deleted, from the first delete guard that blocks it; null when none does. */
export function deleteBlockOfGuards(
  project: GuardProject,
  now: number,
  guards: readonly DeleteGuard[] = deleteGuardsNow(),
): DeleteBlock | null {
  for (const g of guards) {
    const block = g.check(project, now);
    if (block) return block;
  }
  return null;
}

// ─────────────────────────── for useSyncExternalStore ───────────────────────────

/** Subscribes to the registry and to every registered guard's records. */
export function subscribeGuards(onChange: () => void): () => void {
  let inner: (() => void)[] = [];
  const attach = () => {
    for (const off of inner) off();
    inner = writeGuardsNow().flatMap((g) => (g.subscribe ? [g.subscribe(onChange)] : []));
  };
  const onRegistry = () => {
    attach();
    onChange();
  };
  listeners.add(onRegistry);
  attach();
  return () => {
    listeners.delete(onRegistry);
    for (const off of inner) off();
  };
}

/** The registry's state as one value: the same object until a guard registers or a guard's
 *  snapshot changes. */
export type GuardsSnapshot = { readonly version: number; readonly parts: readonly unknown[] };

let memo: GuardsSnapshot | null = null;

export function guardsSnapshot(): GuardsSnapshot {
  const parts = writeGuardsNow().map((g) => g.snapshot?.());
  if (memo && memo.version === version && memo.parts.length === parts.length && parts.every((p, i) => p === memo!.parts[i])) {
    return memo;
  }
  memo = { version, parts };
  return memo;
}

/** The server's snapshot (and hydration's): nothing has been read yet. */
export const SERVER_GUARDS: GuardsSnapshot = { version: -1, parts: [] };
