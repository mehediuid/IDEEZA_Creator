// Moved to lib/manual/use-write-guard.tsx (Build and Earn P1-1): the gate
// now reads the guards commerce registers, not the market. This shim keeps
// the old import path compiling until its importers move; the pause dialog
// itself is components/projects/listing/edit-pause-dialog.tsx.
export {
  useWriteGuard as useProjectEditGate,
  type GuardOutcome,
  type WriteGuardHandle as ProjectEditGate,
} from "@/lib/manual/use-write-guard";
