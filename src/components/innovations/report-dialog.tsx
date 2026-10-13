"use client";

// Report — one dialog for a comment and for a post (plan §7): a reason, an
// optional note, Send report. The maker never sees who reported it. Until
// there is moderation the report is kept in this browser, so the same thing
// can't be reported twice (the menu then reads "Reported").

import * as React from "react";
import { Button, ModalFrame, Radio, Textarea } from "@/components/ideeza";

export const REPORT_REASONS = ["Spam", "Harassment or hate", "Stolen design", "Misleading", "Something else"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export function ReportDialog({
  open,
  target,
  onSend,
  onClose,
}: {
  open: boolean;
  target: "comment" | "post";
  onSend: (reason: ReportReason, note: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = React.useState<ReportReason | null>(null);
  const [note, setNote] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const groupId = React.useId();
  const noteId = React.useId();
  const errorId = React.useId();
  // Each opening starts empty (adjusted while rendering, not in an effect).
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason(null);
      setNote("");
      setTried(false);
    }
  }
  const send = () => {
    if (!reason) {
      setTried(true);
      return;
    }
    onSend(reason, note.trim());
  };
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      title={target === "post" ? "Report this post" : "Report this comment"}
      description="Tell us what's wrong. The maker won't see who reported it."
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" hierarchy="primary" size="lg" aria-disabled={!reason || undefined} aria-describedby={tried && !reason ? errorId : undefined} onClick={send}>
            Send report
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <div role="radiogroup" aria-labelledby={groupId} className="flex flex-col gap-2">
          <span id={groupId} className="text-sm font-semibold text-text-primary">
            Reason
          </span>
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className="flex min-h-[var(--touch-min)] items-center gap-4 rounded-lg border border-solid border-border px-6 text-left text-sm text-text-primary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus aria-checked:border-border-brand"
            >
              <Radio decorative checked={reason === r} />
              {r}
            </button>
          ))}
          {tried && !reason && (
            <span id={errorId} role="alert" className="text-sm text-text-error">
              Pick a reason first.
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={noteId} className="text-sm font-semibold text-text-primary">
            Anything else (optional)
          </label>
          <Textarea id={noteId} rows={2} value={note} maxLength={500} onValueChange={setNote} />
        </div>
      </div>
    </ModalFrame>
  );
}
