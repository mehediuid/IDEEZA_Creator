"use client";

// Shared kit Report sheet (KIT-RB-10…19b, MFR-22): one reason list per target
// (profile, post, comment, conversation, message), an optional note (500),
// and "Also block" for a person or a conversation. Send report stays off
// until a reason is picked. States: sending ("Sending…"), couldn't send (an
// M01 error alert, the note kept, Try again), offline (an M01 warning; the
// report is kept — closing the sheet keeps it for this target, reopening
// brings it back — and Send report turns on when the phone is back online),
// then one "Report sent" done state for every target. While the note has
// focus (keyboard up, KIT-RB-12) the reasons fold to the picked one. The
// person reported never learns who reported.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Checkbox, Radio } from "@/components/ideeza/checkbox";
import { Textarea } from "@/components/ideeza/text-input";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Sheet } from "./sheet";
import { useOnline } from "./states";

export const REPORT_NOTE_MAX = 500;

export type ReportReason = { id: string; label: string };
export type ReportInput = { reason: string; note: string; alsoBlock: boolean };

type Phase = "form" | "sending" | "failed" | "sent";

type Draft = { reason: string; note: string; alsoBlock: boolean };
const DRAFT_KEY = (key: string) => `ideeza:m:report-draft:${key}`;

function readDraft(key: string): Draft | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(DRAFT_KEY(key)) ?? "null") as Partial<Draft> | null;
    return v && typeof v.reason === "string" ? { reason: v.reason, note: String(v.note ?? ""), alsoBlock: v.alsoBlock === true } : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: Draft | null): void {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY(key), JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY(key));
  } catch {
    // Storage refused: the draft lasts as long as the sheet.
  }
}

export function ReportSheet({
  open,
  onClose,
  title,
  description,
  reasons,
  blockName,
  question = "What’s wrong?",
  note: noteCopy,
  draftKey,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  /** "Report Philip’s profile", "Report post"… */
  title: string;
  /** "Philip won’t know who reported." / "The maker won’t know who reported." */
  description: string;
  reasons: readonly ReportReason[];
  /** Offers "Also block {name}" (profile and conversation reports). */
  blockName?: string;
  /** The reasons' heading (the Feed asks "Why are you reporting this video?"). */
  question?: string;
  /** The note's words, and the reason that opens it (the Feed's "Tell us more" shows under Others only). */
  note?: { label: string; placeholder: string; onlyFor?: string };
  /** What is reported (a person's or a post's id): an offline draft is kept under it. Defaults to the title. */
  draftKey?: string;
  /** Saves the report; a throw is "Couldn’t send your report". */
  onSend: (r: ReportInput) => Promise<void>;
}) {
  const online = useOnline();
  const [reason, setReason] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [alsoBlock, setAlsoBlock] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("form");
  const [blocked, setBlocked] = React.useState(false);
  const [writing, setWriting] = React.useState(false);
  const key = draftKey ?? title;

  // Reopening brings back what was kept while offline (state adjusted as the sheet opens).
  const [wasOpen, setWasOpen] = React.useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    const d = open ? readDraft(key) : null;
    if (d) {
      setReason(d.reason);
      setNote(d.note);
      setAlsoBlock(d.alsoBlock);
    }
  }

  const close = () => {
    onClose();
    // Offline, the report is kept for when the phone is back; otherwise closing drops it.
    writeDraft(key, !online && reason && phase !== "sent" ? { reason, note, alsoBlock } : null);
    setReason(null);
    setNote("");
    setAlsoBlock(false);
    setPhase("form");
    setBlocked(false);
    setWriting(false);
  };

  const send = async () => {
    if (!reason || !online) return;
    setPhase("sending");
    try {
      const kept = !noteCopy?.onlyFor || reason === noteCopy.onlyFor ? note.trim() : "";
      await onSend({ reason, note: kept, alsoBlock: !!blockName && alsoBlock });
      setBlocked(!!blockName && alsoBlock);
      writeDraft(key, null);
      setPhase("sent");
    } catch {
      setPhase("failed");
    }
  };

  if (phase === "sent") {
    return (
      <Sheet
        open={open}
        onClose={close}
        title="Report sent"
        actions={
          <Button size="xl" className="w-full" onClick={close}>
            Done
          </Button>
        }
      >
        <p className={T.body}>Thanks for telling us. You can find it in Settings › Privacy &amp; safety › Your reports.</p>
        {/* The web's honest line (report dialog, done state). */}
        <p className={T.body}>In this demo nobody reviews reports yet.</p>
        {blocked && <p className={T.body}>You blocked {blockName} too.</p>}
      </Sheet>
    );
  }

  const sending = phase === "sending";
  const showNote = !noteCopy?.onlyFor || reason === noteCopy.onlyFor;
  const shown = writing && reason ? reasons.filter((r) => r.id === reason) : reasons;
  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      description={description}
      actions={
        <>
          <Button size="xl" className="w-full" disabled={!reason || !online || sending} onClick={send}>
            {sending ? "Sending…" : phase === "failed" ? "Try again" : "Send report"}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      {phase === "failed" && (
        <Banner tone="error" title="Couldn’t send your report">
          Your note is kept. Try again.
        </Banner>
      )}
      {!online && (
        <Banner tone="attention" title="You’re offline">
          Your report is kept here. Send it when you’re back online.
        </Banner>
      )}
      <fieldset className="flex flex-col gap-6" disabled={sending}>
        <legend className={cn(T.rowTitle, "pb-6")}>{question}</legend>
        <div role="radiogroup" className="flex flex-col">
          {shown.map((r) => (
            <label key={r.id} className="relative flex min-h-[44px] cursor-pointer items-center gap-8 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
              <input
                type="radio"
                name="report-reason"
                className="sr-only"
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
              />
              <Radio checked={reason === r.id} decorative />
              <span className={cn(T.bodyLg, "text-[color:var(--color-input-label)]")}>{r.label}</span>
            </label>
          ))}
        </div>
        {showNote && (
          <label className="flex flex-col gap-2">
            <span className={T.label}>{noteCopy?.label ?? "Note (optional)"}</span>
            <Textarea
              value={note}
              onFocus={() => setWriting(true)}
              onBlur={() => setWriting(false)}
              onValueChange={(v) => setNote(v.slice(0, REPORT_NOTE_MAX))}
              placeholder={noteCopy?.placeholder ?? "Tell us what happened"}
              rows={4}
              maxLength={REPORT_NOTE_MAX}
            />
            <span className={cn(T.caption, "self-end text-text-tertiary tabular-nums")}>
              {note.length}/{REPORT_NOTE_MAX}
            </span>
          </label>
        )}
        {blockName && (
          <label className="relative flex cursor-pointer items-center gap-4 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
            <input
              type="checkbox"
              className="sr-only"
              checked={alsoBlock}
              onChange={() => setAlsoBlock((v) => !v)}
            />
            <Checkbox checked={alsoBlock} decorative />
            <span className={cn(T.body, "text-text-primary")}>Also block {blockName}</span>
          </label>
        )}
      </fieldset>
    </Sheet>
  );
}
