"use client";

// ProjectInfoModal — the "Project Information" dialog that opens when
// the user clicks "Create Project" from the manual-mode info panel.
//
// Two states, driven by the "Choose Project" dropdown:
//   1. Existing project picked   → Name field hidden; Description
//                                  pre-fills with that project's saved
//                                  description (editable); submit sets
//                                  it as the active project and routes
//                                  to the next incomplete step.
//   2. "Create New Project"      → Name field visible (required);
//                                  Description optional; submit creates
//                                  a draft project and routes to /pcb.
//
// Submit is disabled until a valid selection exists:
//   • Existing project chosen, OR
//   • "Create New Project" + a non-empty name.
//
// A11y: real <dialog>-style overlay with aria-modal, focus trap (focus
// returns to the trigger on close), Esc + outside-click dismiss, and
// every control reachable by Tab in visual order.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./icon";
import {
  stepHref,
  firstIncompleteStep,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";

const NEW_SENTINEL = "__new__";

export function ProjectInfoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { projects, createProject, selectProject, updateProject } =
    useManualProjects();

  // Default to "create new" on every open so the dropdown shows the
  // empty-placeholder state when projects exist and the create-new
  // state otherwise.
  const [choice, setChoice] = React.useState<string>("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  const firstFieldRef = React.useRef<HTMLSelectElement>(null);

  // Reset form state whenever the modal opens.
  React.useEffect(() => {
    if (!open) return;
    setChoice("");
    setName("");
    setDescription("");
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  }, [open]);

  // Esc dismiss.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // When the user picks an existing project, pre-fill description so
  // they can update it without retyping. Switching back to New clears.
  React.useEffect(() => {
    if (!choice || choice === NEW_SENTINEL) {
      setDescription("");
      return;
    }
    const existing = projects.find((p) => p.id === choice);
    if (existing) setDescription(existing.description);
  }, [choice, projects]);

  if (!open) return null;

  const isNew = choice === NEW_SENTINEL;
  const canSubmit =
    (isNew && name.trim().length > 0) ||
    (!isNew && choice !== "" && projects.some((p) => p.id === choice));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (isNew) {
      const project = createProject({
        name: name.trim(),
        description: description.trim(),
      });
      onClose();
      router.push(stepHref(project, "pcb"));
      return;
    }
    // Existing project: persist any description edits, set as active,
    // route to the next incomplete step so the user resumes where they
    // left off rather than starting over.
    const existing = projects.find((p) => p.id === choice);
    if (!existing) return;
    if (description.trim() !== existing.description) {
      updateProject(existing.id, { description: description.trim() });
    }
    selectProject(existing.id);
    onClose();
    router.push(stepHref(existing, firstIncompleteStep(existing)));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-info-title"
      onClick={onClose}
      className="fixed inset-0 z-modal flex items-center justify-center px-[16px] py-[24px]"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-bg-page/60 backdrop-blur-sm"
      />

      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-3"
      >
        <header className="flex items-start gap-[16px] border-b border-border px-[24px] py-[20px]">
          <h2
            id="project-info-title"
            className="flex-1 text-xl font-bold tracking-tight text-text-primary"
          >
            Project Information
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Cancel01Icon} />
          </button>
        </header>

        <div className="flex flex-col gap-[20px] px-[24px] py-[20px]">
          {/* Choose Project */}
          <FieldLabel label="Choose Project" htmlFor="project-choice">
            <div className="relative">
              <select
                id="project-choice"
                ref={firstFieldRef}
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                className="h-[44px] w-full appearance-none rounded-lg border border-border bg-bg-page pl-[14px] pr-[40px] text-md text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus focus:bg-bg-surface"
              >
                <option value="" disabled>
                  Choose Project
                </option>
                <option value={NEW_SENTINEL}>Create New Project</option>
                {projects.length > 0 && (
                  <optgroup label="Existing projects">
                    {projects.map((p) => (
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
          </FieldLabel>

          {/* Project Name — only when creating new */}
          {isNew && (
            <FieldLabel label="Project Name" htmlFor="project-name" required>
              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="eg. My Drone Project"
                autoComplete="off"
                aria-required
                className="h-[44px] w-full rounded-lg border border-border bg-bg-page px-[14px] text-md text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus focus:bg-bg-surface placeholder:text-text-tertiary"
              />
            </FieldLabel>
          )}

          {/* Project Description */}
          <FieldLabel
            label="Project Description"
            htmlFor="project-description"
          >
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write description"
              rows={4}
              className="w-full resize-y rounded-lg border border-border bg-bg-page px-[14px] py-[12px] text-md leading-relaxed text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus focus:bg-bg-surface placeholder:text-text-tertiary"
            />
            <p className="mt-[4px] text-2xs text-text-tertiary">
              Optional.
            </p>
          </FieldLabel>
        </div>

        <footer className="border-t border-border px-[24px] py-[16px]">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-[44px] w-full items-center justify-center gap-[8px] rounded-lg bg-violet-600 text-md font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Project
          </button>
        </footer>
      </form>
    </div>
  );
}

function FieldLabel({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[8px]">
      <label
        htmlFor={htmlFor}
        className="text-md font-semibold text-text-primary"
      >
        {label}
        {required && (
          <span aria-hidden className="ml-[4px] text-text-error">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
