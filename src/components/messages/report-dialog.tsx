"use client";

// Report (spec §6): a reason, an optional note and, in a direct conversation,
// "Also block {Name}". The report is a real record; nobody reads it in this
// demo, and the confirmation says so.

import * as React from "react";
import { Button, ModalFrame, Textarea } from "@/components/ideeza";
import { reportConversation } from "@/lib/messages/actions";
import type { PersonId, ReportReason } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { CheckRow, RadioRow } from "./choice";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "scam", label: "Scam or asks to pay outside IDEEZA" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Something else" },
];

const NOTE_MAX = 500;
const TAP = "max-md:min-h-[var(--touch-min)]";

export function ReportDialog({
  by,
  conversationId,
  entryId,
  other,
  onClose,
}: {
  by: PersonId;
  conversationId: string;
  /** A single message; the whole conversation when absent. */
  entryId?: string;
  /** Who "Also block" would block: the other person of a direct conversation, not yet blocked. */
  other: { id: PersonId; name: string } | null;
  onClose: () => void;
}) {
  const [reason, setReason] = React.useState<ReportReason | null>(null);
  const [note, setNote] = React.useState("");
  const [alsoBlock, setAlsoBlock] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const doneRef = React.useRef<HTMLButtonElement>(null);
  const noteId = React.useId();
  const legendId = React.useId();

  const submit = () => {
    if (!reason) {
      setError("Choose a reason.");
      return;
    }
    const r = reportConversation({
      by,
      conversationId,
      entryId,
      reason,
      note,
      alsoBlock: alsoBlock && other ? other.id : null,
    });
    if (!r.ok) {
      setError(r.reason);
      return;
    }
    setError(null);
    setDone(true);
  };

  React.useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      title={entryId ? "Report message" : "Report conversation"}
      footer={
        done ? (
          <Button ref={doneRef} type="button" hierarchy="primary" size="lg" className={cn("ml-auto", TAP)} onClick={onClose}>
            Done
          </Button>
        ) : (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
            <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              aria-disabled={!reason || undefined}
              className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
              onClick={submit}
            >
              Report
            </Button>
          </div>
        )
      }
    >
      {done ? (
        <p role="status" className="max-w-[62ch] text-md leading-md text-text-primary">
          Report saved. In this demo nobody reviews reports yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <div role="radiogroup" aria-labelledby={legendId} className="flex flex-col gap-1">
            <p id={legendId} className="text-md font-semibold leading-md text-text-primary">
              What&apos;s wrong?
            </p>
            {REASONS.map((r) => (
              <RadioRow
                key={r.value}
                name="report-reason"
                checked={reason === r.value}
                onChange={() => {
                  setReason(r.value);
                  setError(null);
                }}
                label={r.label}
              />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <label htmlFor={noteId} className="text-md font-medium leading-md text-text-primary">
              Note (optional)
            </label>
            <Textarea id={noteId} rows={3} maxLength={NOTE_MAX} value={note} onValueChange={(v) => setNote(v.slice(0, NOTE_MAX))} />
          </div>
          {other && <CheckRow checked={alsoBlock} onChange={setAlsoBlock} label={`Also block ${other.name}`} />}
          {error && (
            <p role="alert" className="text-md leading-md text-text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </ModalFrame>
  );
}
