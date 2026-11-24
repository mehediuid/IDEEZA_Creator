"use client";

// Add section on the phone (EARN-7; the web's AddSectionSlot in
// plan-edit.tsx, its fields and words): the last row of ⋯ › Edit's section
// list opens this sheet. A title, then what the section should cover, which
// AI writes from — or the maker writes it themselves below. The sheet's one
// primary follows what was entered: "Write with AI", or "Add section" once
// the maker has written their own text. AI's proposal shows with the web's
// line; Keep adds it (Try again and Discard beside it, as on the web). The
// section goes at the end of the plan, "Added by you"; Move up in its own ⋯
// takes it higher. It saves to the current version in place
// (`saveEditedSections`), never a new version, and stays when the plan is
// regenerated (the web's rule).

import * as React from "react";
import { AiMagicIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { newSectionId, saveEditedSections } from "@/components/projects/business-plan/plan-edit";
import { fetchPlanSection } from "@/components/projects/business-plan/plan-runner";
import { labelize, sectionContextText } from "@/components/projects/business-plan/plan-section";
import type { PlanSection } from "@/lib/manual/business-plan";
import { addedSectionOf, writtenSectionFields } from "@/lib/manual/phone-plan-money";
import { cn } from "@/lib/utils";
import { Sheet } from "../../kit/sheet";
import { EARN_NOTE } from "../parts";
import { FIELD_LABEL } from "./section-view";
import { T } from "../../type";

const BLOCK = "rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-6";

export function AddSectionSheet({
  open,
  projectId,
  versionN,
  sections,
  planPrompt,
  saveBlocked,
  onClose,
  onAdded,
}: {
  open: boolean;
  projectId: string;
  versionN: number;
  /** The version's sections as stored: the new one goes after them. */
  sections: readonly PlanSection[];
  planPrompt: string;
  /** Why nothing can be added now (sold in full meanwhile); null when it can. */
  saveBlocked: string | null;
  onClose: () => void;
  onAdded: (section: PlanSection) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [free, setFree] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [proposal, setProposal] = React.useState<PlanSection["fields"] | null>(null);
  const ids = useFieldIds(["title", "brief", "free"] as const);
  const blockedId = React.useId();

  // Each opening starts clean, as the web's slot does after Cancel or Discard.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle("");
      setBrief("");
      setFree("");
      setBusy(false);
      setFailed(false);
      setProposal(null);
    }
  }

  const add = (fields: PlanSection["fields"]) => {
    if (saveBlocked) return;
    const section = addedSectionOf(newSectionId(), title, fields);
    saveEditedSections(projectId, versionN, sections, [...sections, section]);
    onAdded(section);
  };
  const writeWithAI = async () => {
    if (busy || saveBlocked) return;
    setBusy(true);
    setFailed(false);
    const fields = await fetchPlanSection({ prompt: planPrompt, section: { title: title || "Untitled section", brief }, context: sectionContextText(sections) });
    setBusy(false);
    if (fields) setProposal(fields);
    else setFailed(true);
  };
  const own = free.trim();

  return (
    <Sheet
      open={open}
      onClose={() => !busy && onClose()}
      title="Add section"
      description={proposal ? undefined : "Describe what this section should cover — AI will write it, or type it yourself below."}
      actions={
        <>
          {proposal ? (
            <Button
              size="xl"
              className={cn("w-full", saveBlocked && "cursor-not-allowed opacity-60")}
              aria-disabled={saveBlocked ? true : undefined}
              aria-describedby={saveBlocked ? blockedId : undefined}
              onClick={() => add(proposal)}
            >
              Keep
            </Button>
          ) : own ? (
            <Button
              size="xl"
              className={cn("w-full", saveBlocked && "cursor-not-allowed opacity-60")}
              aria-disabled={saveBlocked ? true : undefined}
              aria-describedby={saveBlocked ? blockedId : undefined}
              onClick={() => add(writtenSectionFields(free))}
            >
              Add section
            </Button>
          ) : (
            <Button
              size="xl"
              className={cn("w-full", saveBlocked && "cursor-not-allowed opacity-60")}
              loading={busy}
              aria-disabled={saveBlocked ? true : undefined}
              aria-describedby={saveBlocked ? blockedId : undefined}
              iconLeading={<Icon icon={AiMagicIcon} size={20} />}
              onClick={() => void writeWithAI()}
            >
              Write with AI
            </Button>
          )}
          {saveBlocked && (
            <p id={blockedId} role="status" className={EARN_NOTE}>
              {saveBlocked}
            </p>
          )}
        </>
      }
    >
      <Field label="Section title" htmlFor={ids.title.id}>
        <TextInput id={ids.title.id} size="xl" value={title} onValueChange={setTitle} placeholder="Section title" disabled={busy} />
      </Field>
      {proposal ? (
        <div className={cn(BLOCK, "flex flex-col gap-4 border-[var(--color-border-brand)] bg-bg-brand-subtle")}>
          <p className={cn(T.meta, "text-text-success")}>Written by AI · just now — edit it freely, it stays when you regenerate the plan.</p>
          {Object.entries(proposal).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-1">
              <p className={FIELD_LABEL}>{labelize(key)}</p>
              <p className={cn(T.body, "whitespace-pre-wrap break-words text-text-primary")}>{Array.isArray(value) ? (value as string[]).join(" · ") : String(value)}</p>
            </div>
          ))}
          <div className="flex gap-4">
            <Button hierarchy="secondary" size="xl" className="min-w-0 flex-1" loading={busy} onClick={() => void writeWithAI()}>
              Try again
            </Button>
            <Button hierarchy="ghost" size="xl" className="min-w-0 flex-1" disabled={busy} onClick={onClose}>
              Discard
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Field label="What this section should cover" htmlFor={ids.brief.id}>
            <Textarea id={ids.brief.id} value={brief} onValueChange={setBrief} rows={2} placeholder="What should this section say?" disabled={busy} />
          </Field>
          {failed && (
            <p role="status" className={cn(T.body, "text-text-error")}>
              Couldn&apos;t write this section. Try again, or write it yourself below.
            </p>
          )}
          <Field label="Write this section yourself" htmlFor={ids.free.id}>
            <Textarea id={ids.free.id} value={free} onValueChange={setFree} rows={4} placeholder="…or write the section yourself" disabled={busy} />
          </Field>
        </>
      )}
    </Sheet>
  );
}
