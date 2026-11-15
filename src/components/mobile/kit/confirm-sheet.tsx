"use client";

// Shared kit confirms (KIT-CF-01…03, MFR-28): a Sheet whose title is a question
// naming the thing and whose button is the verb — never Yes / OK / Confirm.
// The way back and the action share one row (owner 2026-11-15: two stacked
// XL buttons wasted the thumb zone), the action on the right: Primary for a
// neutral confirm, Danger for a destructive one. Labels too long for half a
// row stack instead, the action on top. A typed confirm keeps the action off until the name is
// typed exactly. ("Can't yet" sends you where to fix it: build that with
// Sheet and a Primary that goes there.) While it works the sheet can't be
// closed; if `onConfirm` throws, an M01 error says nothing changed and the
// action becomes Try again (KIT-ER-03).

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Sheet } from "./sheet";

export function ConfirmSheet({
  open,
  onClose,
  title,
  body,
  verb,
  destructive,
  typed,
  typedLabel = "Type the name to confirm",
  cancelLabel = "Cancel",
  onConfirm,
}: {
  /** KIT-CF-01 keeps the way back in words: "Keep editing". */
  cancelLabel?: string;
  open: boolean;
  onClose: () => void;
  title: string;
  body?: React.ReactNode;
  verb: string;
  destructive?: boolean;
  /** The name to type before the action turns on (delete a project, the account). */
  typed?: string;
  /** The typed field's label (KIT-CF-03: "Type the project name to confirm"). */
  typedLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const fieldId = React.useId();
  const matches = !typed || text.trim() === typed;
  // Half a row holds about 16 characters at 375 px; longer labels stack.
  const row = Math.max(verb.length, cancelLabel.length, failed ? 9 : 0) <= 16;
  // Kit rule: a field error shows on blur or submit, never while typing.
  const mismatch = !!typed && checked && text.trim() !== "" && !matches;

  const reset = () => {
    setText("");
    setChecked(false);
    setFailed(false);
    onClose();
  };
  const close = () => {
    if (!busy) reset();
  };
  const confirm = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await onConfirm();
      reset();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      actions={
        <div className={row ? "flex gap-4" : "flex flex-col-reverse gap-4"}>
          <Button hierarchy="secondary" size="xl" className={row ? "min-w-0 flex-1" : "w-full"} disabled={busy} onClick={close}>
            {cancelLabel}
          </Button>
          <Button
            hierarchy={destructive ? "danger" : "primary"}
            size="xl"
            className={row ? "min-w-0 flex-1" : "w-full"}
            disabled={!matches}
            loading={busy}
            onClick={confirm}
          >
            {failed ? "Try again" : verb}
          </Button>
        </div>
      }
    >
      {failed && (
        <Banner tone="error" title={`Couldn’t ${verb.charAt(0).toLowerCase()}${verb.slice(1)}`}>
          Nothing changed. Try again.
        </Banner>
      )}
      {body && <div className={T.body}>{body}</div>}
      {typed && (
        <div className="flex flex-col gap-3">
          <label htmlFor={fieldId} className={T.label}>
            {typedLabel}
          </label>
          <TextInput
            id={fieldId}
            size="xl"
            value={text}
            onValueChange={(v) => {
              setText(v);
              setChecked(false);
            }}
            onBlur={() => setChecked(true)}
            invalid={mismatch}
            autoComplete="off"
            autoCapitalize="off"
          />
          {mismatch && <span className={cn(T.caption, "text-text-error")}>That doesn’t match “{typed}”.</span>}
        </div>
      )}
    </Sheet>
  );
}
