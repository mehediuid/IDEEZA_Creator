"use client";

// ProjectDetailsFields — a project's name and description, the one pair of
// fields every place that makes a project asks for (P2-SAVE-3, P2-SAVE-14):
// the save step before Save, and Build manually's "Create New Project".
//
// The rules are project-header.ts's, unchanged, so the save step, Build
// manually and the project page's rename can never disagree (P2-SAVE-15):
// - name: required, 1–80 characters after trimming, no DOM maxLength (an
//   over-long name is shown and counted); a name another project already has
//   is a note, never an error;
// - description: optional, up to 1,000 characters, a counter from 800.
// Errors show after the field is left or on a refused submit, and once shown
// follow every keystroke, so they clear as the maker fixes them. Each field
// has a visible label; the required mark is aria-hidden, with aria-required.
//
// Enter in the name submits; Cmd/Ctrl+Enter in the description submits.
// "Update with AI" sits beside the description's label when `aiProducts`
// holds two or more described products (P2-SAVE-8).

import * as React from "react";
import { TextInput, Textarea } from "@/components/ideeza";
import type { DescribedProduct } from "@/lib/manual/describe";
import { checkDescription, checkProjectName } from "@/lib/manual/project-header";
import { PROJECT_DESC_COUNTER_FROM, PROJECT_DESC_MAX, PROJECT_NAME_MAX } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { useDescriptionAiAssist } from "./description-ai-assist";

export type DetailsField = "name" | "description";

export type ProjectDetailsFieldsHandle = {
  /** Focuses the first field that refuses a submit; false when both pass. */
  focusFirstInvalid: () => boolean;
  /** Focuses the name and selects its text. */
  focusName: () => void;
};

export type ProjectDetailsFieldsProps = {
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  /** The other projects' names, for the duplicate note. */
  otherNames: readonly string[];
  /** Which fields show their errors: left once, or a refused submit. */
  shown: Record<DetailsField, boolean>;
  onShow: (field: DetailsField) => void;
  /** Enter in the name, Cmd/Ctrl+Enter in the description. */
  onSubmit: () => void;
  /** Under the name field — the save step's "Add it to a project you already have instead". */
  afterName?: React.ReactNode;
  /** The products "Update with AI" reads; it shows only with two or more described. */
  aiProducts?: readonly DescribedProduct[];
  /** Tells the caller a run's text is in the field (P2-TABS-22's hint). */
  onAiWrote?: (wrote: boolean) => void;
  /** Blocks typing while the caller saves. */
  disabled?: boolean;
  /** The name's input, for a dialog's initial focus. */
  nameRef?: React.RefObject<HTMLInputElement | null>;
};

/** 44 px targets: every place these fields live is a dialog under 640 px wide (P2-SAVE-16). */
const TOUCH = "min-h-[var(--touch-min)]";

export const ProjectDetailsFields = React.forwardRef<ProjectDetailsFieldsHandle, ProjectDetailsFieldsProps>(
  function ProjectDetailsFields(
    {
      name,
      description,
      onNameChange,
      onDescriptionChange,
      otherNames,
      shown,
      onShow,
      onSubmit,
      afterName,
      aiProducts,
      onAiWrote,
      disabled,
      nameRef: outerNameRef,
    },
    ref,
  ) {
    const ownNameRef = React.useRef<HTMLInputElement>(null);
    const nameRef = outerNameRef ?? ownNameRef;
    const areaRef = React.useRef<HTMLTextAreaElement>(null);
    const nameId = React.useId();
    const nameMsgId = React.useId();
    const areaId = React.useId();
    const areaMsgId = React.useId();

    const nameCheck = checkProjectName(name, otherNames, PROJECT_NAME_MAX);
    const descCheck = checkDescription(description, PROJECT_DESC_MAX, PROJECT_DESC_COUNTER_FROM);
    const nameError = shown.name ? nameCheck.error : null;
    const descError = shown.description ? descCheck.error : null;

    const ai = useDescriptionAiAssist({
      products: aiProducts ?? [],
      value: description,
      onReplace: onDescriptionChange,
      pillClassName: TOUCH,
    });
    const wrote = ai.wrote;
    React.useEffect(() => {
      onAiWrote?.(wrote);
    }, [wrote, onAiWrote]);

    React.useImperativeHandle(
      ref,
      () => ({
        focusFirstInvalid: () => {
          if (nameCheck.error) {
            nameRef.current?.focus();
            return true;
          }
          if (descCheck.error) {
            areaRef.current?.focus();
            return true;
          }
          return false;
        },
        focusName: () => {
          nameRef.current?.focus();
          nameRef.current?.select();
        },
      }),
      [nameCheck.error, descCheck.error, nameRef],
    );

    // It grows with its text, from four rows, so a long description never
    // scrolls inside the field — the dialog body scrolls instead.
    React.useLayoutEffect(() => {
      const el = areaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [description]);

    return (
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <label htmlFor={nameId} className="text-md font-semibold text-text-primary">
            Project name
            <span aria-hidden className="ml-1 text-text-error">
              *
            </span>
          </label>
          <TextInput
            ref={nameRef}
            id={nameId}
            size="xl"
            value={name}
            onValueChange={onNameChange}
            onBlur={() => onShow("name")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSubmit();
              }
            }}
            invalid={nameError !== null}
            aria-required="true"
            aria-invalid={nameError !== null || undefined}
            aria-describedby={nameError || nameCheck.note ? nameMsgId : undefined}
            autoComplete="off"
            disabled={disabled}
          />
          <div id={nameMsgId} className="text-sm empty:hidden">
            {nameError ? (
              <p className="text-text-error">
                {nameCheck.counter ? <span className="tabular-nums">{nameCheck.counter} · </span> : null}
                {nameError}
              </p>
            ) : nameCheck.note ? (
              <p className="text-text-secondary">{nameCheck.note}</p>
            ) : null}
          </div>
          {afterName}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <label htmlFor={areaId} className="text-md font-semibold text-text-primary">
              Project description
            </label>
            {ai.pill}
          </div>
          <Textarea
            ref={areaRef}
            id={areaId}
            rows={4}
            value={description}
            onValueChange={onDescriptionChange}
            onBlur={() => onShow("description")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSubmit();
              }
            }}
            invalid={descError !== null}
            aria-invalid={descError !== null || undefined}
            aria-describedby={areaMsgId}
            disabled={disabled}
            className="resize-none overflow-hidden"
          />
          {ai.status}
          <div id={areaMsgId} className="flex flex-wrap items-center justify-between gap-x-4 text-sm">
            {descError ? (
              <p className="text-text-error">{descError}</p>
            ) : (
              <p className="text-text-secondary">Optional.</p>
            )}
            {descCheck.counter && (
              <p className={cn("tabular-nums", descCheck.tooLong ? "text-text-error" : "text-text-secondary")}>
                {descCheck.counter}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  },
);
