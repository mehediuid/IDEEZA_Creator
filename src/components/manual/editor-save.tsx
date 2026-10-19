"use client";

// EditorSave — saving in the manual editors (owner, 2026-10-19). There is no
// Save step: every editor saves as it goes, and the project is a Draft in My
// projects from the moment it is made. The top bar's status
// (EditorSaveStatus) says whether the work is kept. What's left here:
//
// - Ctrl+S (⌘S) anywhere in the editor writes everything now (`saveNow`):
//   every pending write, and any refused one again. The status says "Saved"
//   for a moment; no dialog, and never the browser's own Save page.
// - Finish, at the end of the flow (useStepNav's "brief" step — Product
//   Preview's pill), does the same, stamps the project record
//   (`updateProject`, so My projects lists it first and "Saved 12:04" is
//   true), awaits the store's write (useStoreWrite: 250 ms,
//   projectWriteRefused), then shows SavedDialog: View project, Keep editing,
//   Back to Home — and Name it while the product is "Not named yet". A refused
//   write is SaveFailedDialog, with Try again.
//
// Mounted by ProjectWorkspace around the open editor. ProjectWorkspace also
// starts the save status afresh for each product, before its editors mount.

import * as React from "react";
import { useStoreWrite } from "@/components/projects/details/use-store-write";
import { SaveFailedDialog, SavedDialog } from "@/components/projects/saved-dialog";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { saveNow } from "@/lib/manual/save-status";
import { requestProductRename } from "./product-name-field";

type Phase = { kind: "saving"; since: number } | { kind: "saved"; at: number } | { kind: "failed" } | null;

const EditorSaveContext = React.createContext<(() => void) | null>(null);

/** Finish in the open editor; null outside one. */
export function useEditorSave(): (() => void) | null {
  return React.useContext(EditorSaveContext);
}

/** Ctrl+S or ⌘S, with or without Shift (Save All), never with Alt. */
function isSaveKey(e: KeyboardEvent): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s";
}

export function EditorSave({
  project,
  unnamed,
  children,
}: {
  project: ManualProject;
  /** The product the editor holds is still "Not named yet". */
  unnamed: boolean;
  children: React.ReactNode;
}) {
  const { updateProject } = useManualProjects();
  const [phase, setPhase] = React.useState<Phase>(null);
  const busy = React.useRef(false);
  const applied = phase?.kind === "saving" && project.updatedAt >= phase.since;
  const write = useStoreWrite(applied, () => setPhase({ kind: "saved", at: Date.now() }));
  if (phase?.kind === "saving" && write.failed) setPhase({ kind: "failed" });

  const finish = () => {
    if (busy.current) return;
    busy.current = true;
    if (!saveNow()) {
      setPhase({ kind: "failed" });
      return;
    }
    const since = Date.now();
    write.start();
    setPhase({ kind: "saving", since });
    updateProject(project.id, {});
  };
  const latest = React.useRef(finish);
  React.useEffect(() => {
    latest.current = finish;
  });
  const run = React.useCallback(() => latest.current(), []);

  // Ctrl+S: capture phase, so no editor's own key handler or the browser's Save page gets it.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isSaveKey(e)) return;
      e.preventDefault();
      e.stopPropagation();
      saveNow();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const close = () => {
    busy.current = false;
    setPhase(null);
  };

  return (
    <EditorSaveContext.Provider value={run}>
      {children}
      {phase?.kind === "saved" && (
        <SavedDialog
          project={project}
          kind="editor"
          savedAt={phase.at}
          stayLabel="Keep editing"
          onStay={close}
          onName={
            unnamed
              ? () => {
                  close();
                  // After the dialog has handed focus back, the name field opens and takes it.
                  window.requestAnimationFrame(() => requestProductRename());
                }
              : undefined
          }
        />
      )}
      {phase?.kind === "failed" && (
        <SaveFailedDialog
          onStay={close}
          onRetry={() => {
            close();
            run();
          }}
        />
      )}
    </EditorSaveContext.Provider>
  );
}
