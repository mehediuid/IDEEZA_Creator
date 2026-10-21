// Engineering's one surface for commerce (Build and Earn P1-1). lib/commerce,
// lib/market, lib/wallet and lib/brief/{wallet,gas} import lib/manual through
// this file only; the `no-restricted-imports` rule in eslint.config.mjs and
// tests/projects/commerce-boundary.test.mjs hold both directions. Adding an
// export here widens the boundary on purpose, so keep it to what commerce
// reads.
//
// Re-exports only. Each is a live binding, so the runtime cycles the modules
// behind it already document stay as safe as they were.

// The project record and the store's seams.
export type { ManualProject, ProductSource } from "./projects";
export { normalizeProjects, PROJECTS_KEY } from "./projects";
export type { ProjectRecordHooks } from "./record-hooks";
export { registerProjectRecordHooks } from "./record-hooks";
export { onProjectDeleted } from "./events";

// The guards commerce registers.
export type {
  ConfirmResult,
  DeleteGuard,
  GuardConfirmProps,
  GuardProject,
  LockedVerdict,
  Undo,
  WriteChange,
  WriteGuard,
  WriteVerdict,
} from "./guards";
export { NO_UNDO, registerDeleteGuard, registerWriteGuard } from "./guards";
export type { DeleteBlock } from "./permissions";
export { deleteBlockOf } from "./permissions";
export { deleteFactsOf } from "./project-read";

// Shared shapes and the derivations commerce composes over.
export type {
  Contributor,
  EditGate,
  Holding,
  OwnershipSplit,
  ProjectLegal,
  ProjectLock,
  Readiness,
} from "./p2-types";
export type { ProjectLogEntry } from "./project-read";
export { normalizeLegal } from "./legal";
export { ownershipOf } from "./ownership";
export { videosBlockerOf } from "./readiness";
export { benefitDurationText } from "./customers";
export { useJourneyMediaSweep } from "./journey-store";

// Formatting.
export type { MetaPart } from "./project-summary";
export { formatDate, formatDateTime, formatShortDate } from "./project-summary";
