"use client";

// ProjectInfoModal — the "Project Information" dialog that opens when
// the user clicks "Create Project" from the manual-mode info panel.
//
// Two states, driven by the "Choose Project" dropdown:
//   1. Existing project picked   → no name field; the project's saved
//                                  description shows read-only (CNT-6 — its
//                                  one home is the project's own inline
//                                  editor); submit makes it the active
//                                  project and opens the editor on the
//                                  product it resumes (P2-SAVE-14 as changed:
//                                  `editorHref(p, resumeProductOf(p), step)`).
//   2. "Create New Project"      → the shared ProjectDetailsFields (P2-SAVE-14):
//                                  the save step's name and description, with
//                                  its checks, limits and copy — 1–80
//                                  characters with the duplicate note, 0–1,000
//                                  with a counter from 800, errors on blur and
//                                  on submit. No cover (a hand-made project
//                                  has no image) and no "Update with AI" (no
//                                  products yet). Submit makes a draft project
//                                  and opens its first product's PCB
//                                  (`editorHref(p, "p1", "pcb")`).
//
// A project sold in full is read-only (decision 12), so it isn't offered.
//
// Create Project is never silently disabled: a press that can't go ahead
// says why, under the field that needs it, and focuses it.
//
// The frame is the shared ModalFrame: focus moves in and stays in, Esc and
// the scrim close it, and focus goes back to the trigger.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "./icon";
import { Button, ModalFrame } from "@/components/ideeza";
import {
  ProjectDetailsFields,
  type DetailsField,
  type ProjectDetailsFieldsHandle,
} from "@/components/projects/project-details-fields";
import { projectLockOf } from "@/lib/manual/edit-gate";
import { editorHref, productResumeOf, resumeProductOf } from "@/lib/manual/editor-scope";
import { checkDescription, checkProjectName } from "@/lib/manual/project-header";
import {
  PROJECT_DESC_COUNTER_FROM,
  PROJECT_DESC_MAX,
  PROJECT_NAME_MAX,
  useManualProjects,
} from "@/lib/manual/projects";
import { useMarket } from "@/lib/market/market-store";

const NEW_SENTINEL = "__new__";
const CHOOSE_FIRST = "Choose a project, or create a new one.";

export function ProjectInfoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Mounted per open, so every open starts from an empty form.
  if (!open) return null;
  return <ProjectInfoDialog onClose={onClose} />;
}

function ProjectInfoDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { projects, createProject, selectProject } = useManualProjects();
  const { data: market } = useMarket();
  const openable = React.useMemo(() => projects.filter((p) => projectLockOf(p, market.sales) === null), [projects, market]);

  const [choice, setChoice] = React.useState<string>("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [shown, setShown] = React.useState<Record<DetailsField, boolean>>({ name: false, description: false });
  const [choiceError, setChoiceError] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  const selectRef = React.useRef<HTMLSelectElement>(null);
  const fieldsRef = React.useRef<ProjectDetailsFieldsHandle>(null);
  const choiceMsgId = React.useId();

  const isNew = choice === NEW_SENTINEL;
  const existing = !isNew && choice ? (openable.find((p) => p.id === choice) ?? null) : null;
  const otherNames = React.useMemo(() => projects.map((p) => p.name), [projects]);

  const submit = () => {
    if (leaving) return;
    if (isNew) {
      const nameCheck = checkProjectName(name, otherNames, PROJECT_NAME_MAX);
      const descCheck = checkDescription(description, PROJECT_DESC_MAX, PROJECT_DESC_COUNTER_FROM);
      if (nameCheck.error || descCheck.error) {
        setShown({ name: true, description: true });
        window.requestAnimationFrame(() => fieldsRef.current?.focusFirstInvalid());
        return;
      }
      setLeaving(true);
      const project = createProject({ name: nameCheck.value, description: descCheck.value });
      onClose();
      router.push(editorHref(project, "p1", "pcb"));
      return;
    }
    if (!existing) {
      setChoiceError(true);
      selectRef.current?.focus();
      return;
    }
    // Existing project: make it the active one and open the product it
    // resumes, at the step it was left on. Its description is shown for
    // context only (CNT-6) — this modal picks or creates a project, it never
    // writes over what the project's own inline editor holds.
    setLeaving(true);
    const row = resumeProductOf(existing);
    selectProject(existing.id);
    onClose();
    router.push(editorHref(existing, row, productResumeOf(existing, row).step));
  };

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      title="Project Information"
      initialFocus={selectRef}
      footer={
        <Button
          type="button"
          hierarchy="primary"
          size="lg"
          onClick={submit}
          aria-busy={leaving || undefined}
          className="min-h-[var(--touch-min)] w-full"
        >
          Create Project
        </Button>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-10"
      >
        <div className="flex flex-col gap-3">
          <label htmlFor="project-choice" className="text-md font-semibold text-text-primary">
            Choose Project
          </label>
          <div className="relative">
            <select
              id="project-choice"
              ref={selectRef}
              value={choice}
              onChange={(e) => {
                setChoice(e.target.value);
                setChoiceError(false);
              }}
              aria-invalid={choiceError || undefined}
              aria-describedby={choiceError ? choiceMsgId : undefined}
              className="h-[44px] w-full appearance-none rounded-lg border border-border bg-bg-page pl-[14px] pr-[40px] text-md text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus focus:bg-bg-surface aria-invalid:border-border-error"
            >
              <option value="" disabled>
                Choose Project
              </option>
              <option value={NEW_SENTINEL}>Create New Project</option>
              {openable.length > 0 && (
                <optgroup label="Existing projects">
                  {openable.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.status === "draft" ? "· Draft" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-text-tertiary"
            >
              <Icon icon={ArrowDown01Icon} />
            </span>
          </div>
          {choiceError && (
            <p id={choiceMsgId} className="text-sm text-text-error">
              {CHOOSE_FIRST}
            </p>
          )}
        </div>

        {isNew && (
          <ProjectDetailsFields
            ref={fieldsRef}
            name={name}
            description={description}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            otherNames={otherNames}
            shown={shown}
            onShow={(f) => setShown((s) => (s[f] ? s : { ...s, [f]: true }))}
            onSubmit={submit}
          />
        )}

        {existing && (
          <div className="flex flex-col gap-3">
            <label htmlFor="project-description" className="text-md font-semibold text-text-primary">
              Project Description
            </label>
            <textarea
              id="project-description"
              value={existing.description}
              readOnly
              aria-readonly
              rows={4}
              className="w-full cursor-not-allowed resize-none rounded-lg border border-border bg-bg-page px-[14px] py-[12px] text-md leading-relaxed text-text-secondary outline-none"
            />
            <p className="text-sm text-text-tertiary">From the project&apos;s own page — edit it there.</p>
          </div>
        )}
      </form>
    </ModalFrame>
  );
}
