"use client";

// EditorSave — the editors' Save project (the rail's last item, Product
// Preview's pill). A hand-made project is a Draft in My projects from the
// moment it is made, so Save doesn't move it anywhere: it makes sure the work
// is kept and says so where the maker is (owner, 2026-10-19 — Save used to
// jump to the project page, which felt abrupt).
//
// 1. The board's debounced write goes now (`flushDoc`). Code and 3D write on
//    every change already.
// 2. The project record is stamped (`updateProject`, so My projects lists it
//    first and "Saved 12:04" is true), and the store's write is awaited
//    (useStoreWrite: 250 ms, projectWriteRefused).
// 3. SavedDialog: View project, Keep editing, Back to Home — and Name it while
//    the product is "Not named yet". A refused write is SaveFailedDialog,
//    with Try again.
//
// Mounted by ProjectWorkspace around the open editor; useStepNav's "brief"
// step runs it. Outside an editor there is nothing to save, and the step is
// the project page.

import * as React from "react";
import { useStoreWrite } from "@/components/projects/details/use-store-write";
import { SaveFailedDialog, SavedDialog } from "@/components/projects/saved-dialog";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { usePcbActions } from "@/lib/pcb/store";
import { requestProductRename } from "./product-name-field";

type Phase = { kind: "saving"; since: number } | { kind: "saved"; at: number } | { kind: "failed" } | null;

const EditorSaveContext = React.createContext<(() => void) | null>(null);

/** Save project in the open editor; null outside one. */
export function useEditorSave(): (() => void) | null {
  return React.useContext(EditorSaveContext);
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
  const pcb = usePcbActions();
  const { updateProject } = useManualProjects();
  const [phase, setPhase] = React.useState<Phase>(null);
  const busy = React.useRef(false);
  const applied = phase?.kind === "saving" && project.updatedAt >= phase.since;
  const write = useStoreWrite(applied, () => setPhase({ kind: "saved", at: Date.now() }));
  if (phase?.kind === "saving" && write.failed) setPhase({ kind: "failed" });

  const save = () => {
    if (busy.current) return;
    busy.current = true;
    if (pcb.flushDoc() === false) {
      setPhase({ kind: "failed" });
      return;
    }
    const since = Date.now();
    write.start();
    setPhase({ kind: "saving", since });
    updateProject(project.id, {});
  };
  const latest = React.useRef(save);
  React.useEffect(() => {
    latest.current = save;
  });
  const run = React.useCallback(() => latest.current(), []);

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
