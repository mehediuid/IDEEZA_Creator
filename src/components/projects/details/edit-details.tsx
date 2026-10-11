"use client";

// Edit name and description — the project page's one editor for both (owner,
// 2026-10-11: the pencil beside the h1 and the separate "Edit description"
// line read as two half-tools). It opens from the header's ⋯ menu, from "Add a
// description" on a project without one, and from the description coachmark
// with "Update with AI" already running.
//
// - Name: trimmed, 1–80 characters (CNT-2), its count beside the label; a
//   name another project already has is a note, not an error.
// - Description: up to 1,000 characters with a counter from 800 (CNT-5);
//   "Update with AI" sits beside its label once two or more products have a
//   description (P2-SAVE-8). A description saved after a run dismisses the
//   coachmark (P2-TABS-22).
// - Save writes both in one store write and goes through the edit gate
//   (P2-LISTING-13 as changed): a live Buy-now listing asks to pause first —
//   that confirm opens over this dialog, which hands it the keyboard — and an
//   auction or the lock refuses, said under the fields.
// - Closing with changes asks "Discard changes?" in the footer first.
// - The slug never changes: the editor lives at /project/<slug> (CNT-3).

import * as React from "react";
import { Button, ModalFrame, TextInput, Textarea } from "@/components/ideeza";
import {
  PROJECT_DESC_COUNTER_FROM,
  PROJECT_DESC_MAX,
  PROJECT_NAME_MAX,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
import { DESCRIPTION_SAVED, WRITE_FAILED, checkDescription, checkProjectName, renamedMessage } from "@/lib/manual/project-header";
import { productRowsOf } from "@/lib/manual/project-read";
import { cn } from "@/lib/utils";
import { useDescriptionAiAssist } from "../description-ai-assist";
import { useProjectEditGate } from "../use-edit-gate";
import { publishDescriptionEditorOpen, registerDescriptionEditor } from "./description-editor";
import { useStoreWrite } from "./use-store-write";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const LABEL = "text-sm font-semibold text-text-primary";
const QUIET = "text-sm tabular-nums text-text-secondary";

/** Characters as a person counts them (an emoji is one). */
const lengthOf = (s: string) => Array.from(s.trim()).length;

export type EditDetails = {
  /** Opens the dialog — with "Update with AI" running when `ai`. */
  open: (opts?: { ai?: boolean }) => void;
  /** The dialog itself; render it once. */
  dialog: React.ReactNode;
};

export function useEditDetails({
  project,
  canEdit,
  announce,
  fallbackFocus,
}: {
  project: ManualProject;
  /** `can(viewer, "project.rename")` and `"project.editDescription"` — false in a preview (PPL-6). */
  canEdit: boolean;
  announce: (message: string) => void;
  /** Where focus goes when the control that opened the dialog is gone (the coachmark hides while it is open). */
  fallbackFocus: () => HTMLElement | null;
}): EditDetails {
  const [state, setState] = React.useState<{ ai: boolean; key: number } | null>(null);
  const open = React.useCallback((opts?: { ai?: boolean }) => setState((s) => ({ ai: opts?.ai === true, key: (s?.key ?? 0) + 1 })), []);
  const isOpen = state !== null && canEdit;

  // The coachmark's way in, and whether it should hide (description-editor.tsx's registry).
  React.useEffect(() => {
    if (!canEdit) return;
    return registerDescriptionEditor(project.id, {
      open: (o) => open(o),
      focus: () => fallbackFocus()?.focus(),
    });
  }, [canEdit, project.id, open, fallbackFocus]);
  React.useEffect(() => {
    publishDescriptionEditorOpen(project.id, isOpen);
    return () => publishDescriptionEditorOpen(project.id, false);
  }, [project.id, isOpen]);

  const close = React.useCallback(() => {
    setState(null);
    // The dialog hands focus back to its opener; when that went with the dialog (the coachmark), the fallback takes it.
    requestAnimationFrame(() => {
      const at = document.activeElement;
      if (!at || at === document.body) fallbackFocus()?.focus();
    });
  }, [fallbackFocus]);

  return {
    open,
    dialog: isOpen ? (
      <EditDetailsDialog key={state.key} project={project} startAi={state.ai} announce={announce} onClose={close} />
    ) : null,
  };
}

function EditDetailsDialog({
  project,
  startAi,
  announce,
  onClose,
}: {
  project: ManualProject;
  startAi: boolean;
  announce: (message: string) => void;
  onClose: () => void;
}) {
  const { projects, updateProject, setDescriptionHint } = useManualProjects();
  const gate = useProjectEditGate(project.id);
  const [initial] = React.useState(() => ({ name: project.name, description: project.description }));
  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description);
  const [tried, setTried] = React.useState(false);
  const [denied, setDenied] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState<{ name: string; description: string } | null>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const formId = React.useId();
  const nameId = React.useId();
  const nameMsgId = React.useId();
  const areaId = React.useId();
  const areaMsgId = React.useId();
  const messageId = React.useId();

  const others = React.useMemo(() => projects.filter((p) => p.id !== project.id).map((p) => p.name), [projects, project.id]);
  const nameCheck = checkProjectName(name, others, PROJECT_NAME_MAX);
  const descCheck = checkDescription(description, PROJECT_DESC_MAX, PROJECT_DESC_COUNTER_FROM);
  const nameChanged = nameCheck.value !== initial.name.trim();
  const descChanged = descCheck.value !== initial.description.trim();
  const dirty = name !== initial.name || description !== initial.description;
  const change = nameChanged ? "rename" : "description";
  // Why a save can't go ahead right now (an auction, the lock), before the press.
  const blocked = gate.reasonOf(change);
  const reason = denied ?? blocked;

  // The products "Update with AI" reads: the project's own rows, the words the maker kept on each.
  const rows = React.useMemo(
    () => productRowsOf(project).map((r) => ({ name: r.name, description: r.description })),
    [project],
  );
  const ai = useDescriptionAiAssist({ products: rows, value: description, onReplace: setDescription, pillClassName: TAP });
  const savingAiText = React.useRef(false);
  const startedAi = React.useRef(false);
  React.useEffect(() => {
    if (!startAi || startedAi.current) return;
    startedAi.current = true;
    ai.start(project.description);
  }, [startAi, ai, project.description]);

  const write = useStoreWrite(
    pending !== null && project.name === pending.name && project.description === pending.description,
    () => {
      if (savingAiText.current) setDescriptionHint(project.id, { dismissedAt: Date.now(), productCount: rows.length });
      savingAiText.current = false;
      const p = pending;
      if (p) {
        const renamed = p.name !== initial.name.trim();
        const described = p.description !== initial.description.trim();
        announce(renamed && described ? "Name and description saved" : renamed ? renamedMessage(p.name) : DESCRIPTION_SAVED);
      }
      ai.reset();
      onClose();
    },
  );

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (write.saving) return;
    setTried(true);
    if (nameCheck.error) {
      nameRef.current?.focus();
      return;
    }
    if (descCheck.tooLong) {
      areaRef.current?.focus();
      return;
    }
    if (!nameChanged && !descChanged && !write.failed) {
      ai.reset();
      onClose();
      return;
    }
    const next = { name: nameCheck.value, description: descCheck.value };
    const fromAi = ai.wrote;
    setDenied(null);
    const outcome = gate.guard(change, () => {
      savingAiText.current = fromAi;
      setPending(next);
      write.start();
      updateProject(project.id, next);
    });
    if (outcome.kind === "refused") setDenied(outcome.reason);
  };

  const leave = () => {
    // After a refused write the record holds text this browser never kept: put the kept text back.
    if (write.failed) updateProject(project.id, initial);
    write.reset();
    ai.reset();
    onClose();
  };
  const requestClose = () => {
    if (write.saving) return;
    if (!dirty) {
      leave();
      return;
    }
    setConfirming(true);
    requestAnimationFrame(() => keepRef.current?.focus());
  };
  const keepEditing = () => {
    setConfirming(false);
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const nameError = tried || lengthOf(name) > PROJECT_NAME_MAX ? nameCheck.error : null;
  const descError = descCheck.tooLong ? descCheck.error : null;

  return (
    <>
      <ModalFrame
        open
        onClose={confirming ? keepEditing : requestClose}
        covered={gate.confirming}
        size="sm"
        title="Edit name and description"
        description="Buyers and the community see these."
        initialFocus={nameRef}
        closeUnavailable={write.saving}
        footer={
          confirming ? (
            <div role="group" aria-label="Discard changes?" className="flex w-full flex-wrap items-center gap-4">
              <p className="mr-auto text-md font-semibold text-text-primary">Discard changes?</p>
              <Button ref={keepRef} type="button" hierarchy="secondary" size="lg" onClick={keepEditing} className={TAP}>
                Keep editing
              </Button>
              <Button type="button" hierarchy="ghost" size="lg" onClick={leave} className={cn(TAP, "text-text-error")}>
                Discard
              </Button>
            </div>
          ) : (
            <div className="ml-auto flex flex-wrap items-center gap-4">
              <Button type="button" hierarchy="ghost" size="lg" onClick={requestClose} disabled={write.saving} className={TAP}>
                Cancel
              </Button>
              <Button
                type="submit"
                form={formId}
                hierarchy="primary"
                size="lg"
                disabled={write.saving}
                aria-disabled={blocked !== null || undefined}
                aria-describedby={reason ? messageId : undefined}
                className={cn(TAP, blocked !== null && "cursor-not-allowed opacity-60")}
              >
                {write.saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )
        }
      >
        <form id={formId} onSubmit={save} noValidate className="flex flex-col gap-8 pt-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor={nameId} className={LABEL}>
                Name
              </label>
              <span aria-hidden className={cn(QUIET, lengthOf(name) > PROJECT_NAME_MAX && "text-text-error")}>
                {`${lengthOf(name)}/${PROJECT_NAME_MAX}`}
              </span>
            </div>
            <TextInput
              ref={nameRef}
              id={nameId}
              size="lg"
              value={name}
              onValueChange={setName}
              invalid={nameError !== null}
              aria-invalid={nameError !== null || undefined}
              aria-describedby={nameMsgId}
              autoComplete="off"
              containerClassName={TAP}
            />
            <p id={nameMsgId} aria-live="polite" className="text-sm">
              {nameError ? (
                <span className="text-text-error">{nameError}</span>
              ) : nameCheck.note ? (
                <span className="text-text-secondary">{nameCheck.note}</span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <label htmlFor={areaId} className={LABEL}>
                Description
              </label>
              {ai.pill}
            </div>
            <Textarea
              ref={areaRef}
              id={areaId}
              value={description}
              rows={6}
              onValueChange={setDescription}
              invalid={descError !== null}
              aria-invalid={descError !== null || undefined}
              aria-describedby={areaMsgId}
              placeholder="What it is, and who it is for."
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(e);
              }}
            />
            {ai.status}
            <div id={areaMsgId} className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
              <span className={descError ? "text-text-error" : "text-text-secondary"}>{descError ?? ""}</span>
              {descCheck.counter && <span className={cn(QUIET, descError && "text-text-error")}>{descCheck.counter}</span>}
            </div>
          </div>

          <div id={messageId} aria-live="polite" className="text-sm empty:hidden">
            {write.failed && <p className="text-text-error">{WRITE_FAILED}</p>}
            {reason && <p className="text-text-secondary">{reason}</p>}
          </div>
        </form>
      </ModalFrame>
      {gate.dialog}
    </>
  );
}
