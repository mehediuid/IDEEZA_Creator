"use client";

// The two dialogs the business-plan chip opens (P2-TABS-14, P2-TABS-15). The
// Ready dialog lives in plan-runner.tsx instead — it has to open on its own,
// on whichever page the maker is on when a run ends, not from a click here.

import * as React from "react";
import { Button, ModalFrame, ProgressBar, Textarea } from "@/components/ideeza";
import type { BusinessPlan } from "@/lib/manual/business-plan";
import { sectionAtOrdinal, useIsPlanLive, retryPlanSection, stopPlanRun } from "./plan-runner";

const MIN = 50;
const MAX = 500;

export function GenerateBusinessPlanDialog({
  open,
  onClose,
  initialPrompt,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  /** The project description + product names (P2-TABS-14). */
  initialPrompt: string;
  onGenerate: (prompt: string) => void;
}) {
  const [text, setText] = React.useState(initialPrompt);
  // Reset the draft to the fresh prefill each time the dialog opens — set
  // during render (React's own "adjusting state on a prop change" pattern),
  // not an effect, so there's no extra commit before the reset is visible.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setText(initialPrompt);
  }

  const trimmed = text.trim();
  const tooShort = trimmed.length < MIN;
  const remaining = MIN - trimmed.length;

  const submit = () => {
    if (tooShort) return;
    onGenerate(trimmed.slice(0, MAX));
  };

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Generate business plan"
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy="primary"
            aria-disabled={tooShort || undefined}
            className={tooShort ? "cursor-not-allowed opacity-60" : undefined}
            onClick={submit}
          >
            Generate plan
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <label htmlFor="business-plan-prompt" className="text-sm font-semibold text-text-primary">
          Describe your product
        </label>
        <Textarea
          id="business-plan-prompt"
          value={text}
          onValueChange={(v) => setText(v.slice(0, MAX))}
          rows={6}
          aria-describedby="business-plan-prompt-help business-plan-prompt-caption business-plan-prompt-count"
        />
        <p id="business-plan-prompt-help" className="text-sm text-text-secondary">
          What does it do, who is it for, and what makes it different from what already exists?
        </p>
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <span id="business-plan-prompt-caption">At least 50 characters — the more detail, the better the plan.</span>
          <span id="business-plan-prompt-count">{trimmed.length} / {MAX}</span>
        </div>
        {tooShort && (
          <p role="status" className="text-xs text-text-error">
            {remaining} more characters needed
          </p>
        )}
      </div>
    </ModalFrame>
  );
}

export function WritingBusinessPlanDialog({ open, onClose, projectId, plan }: { open: boolean; onClose: () => void; projectId: string; plan: BusinessPlan | null }) {
  const live = useIsPlanLive(projectId);
  const run = plan?.run;
  const version = plan?.versions.find((v) => v.n === run?.version) ?? null;
  const current = run && version ? sectionAtOrdinal(version.sections, run.next) : null;

  // The run finished (or was cleared) while the dialog was open — nothing
  // left for it to show, so it steps aside for the Ready dialog / toast.
  React.useEffect(() => {
    if (open && !run) onClose();
  }, [open, run, onClose]);

  if (!run || !current) return null;
  const total = 7;
  const pct = ((run.next - 1) / total) * 100;

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Writing your business plan"
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" disabled={!live} onClick={() => stopPlanRun(projectId)}>
            Stop writing
          </Button>
          <Button type="button" hierarchy="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-text-primary">
          {current.state === "failed" ? `Couldn't write ${current.title}` : `Writing ${current.title} — ${run.next} of ${total}`}
        </p>
        <ProgressBar value={pct} label={`${run.next} of ${total} sections`} />
        {current.state === "failed" ? (
          <Button type="button" hierarchy="secondary" size="sm" className="w-fit" onClick={() => retryPlanSection(projectId, current.id)}>
            Try again
          </Button>
        ) : (
          <p className="text-sm text-text-secondary">About 2–5 minutes. You can close this — writing carries on while IDEEZA is open.</p>
        )}
      </div>
    </ModalFrame>
  );
}
