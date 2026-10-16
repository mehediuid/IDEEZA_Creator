"use client";

// One message in the timeline (spec §6): the bubble (mine right on the brand
// tint, others left on the subtle fill), its photos, PDFs and project cards,
// "Edited", "Message deleted", and the scam hint under a risky message I
// received. ⋯ holds Edit · Delete on my own message within its 15 minutes and
// Report message on someone else's; Edit opens in place with Save and Cancel.

import * as React from "react";
import { Alert02Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog, Textarea } from "@/components/ideeza";
import { deleteMessage, editMessage } from "@/lib/messages/actions";
import { isRisky, RISK_NOTE } from "@/lib/messages/risk";
import { canEdit } from "@/lib/messages/rules";
import { TEXT_MAX, type MessageEntry } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./context-card";
import { MenuButton, type MenuItem } from "./menu";
import { MessageFiles } from "./message-files";
import { useMessagesView } from "./messages-context";

const TAP = "max-md:min-h-[var(--touch-min)]";

function Editor({ entry, onDone }: { entry: MessageEntry; onDone: () => void }) {
  const { me } = useMessagesView();
  const [text, setText] = React.useState(entry.text);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const errorId = React.useId();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const save = () => {
    const r = editMessage(entry.id, me, text);
    if (r.ok) onDone();
    else setError(r.reason);
  };

  return (
    <div className="flex w-[min(560px,100%)] flex-col gap-3">
      <Textarea
        ref={ref}
        rows={3}
        value={text}
        maxLength={TEXT_MAX}
        aria-label="Edit message"
        aria-describedby={error ? errorId : undefined}
        invalid={!!error}
        onValueChange={(v) => {
          setText(v);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onDone();
          } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            save();
          }
        }}
      />
      {error && (
        <p id={errorId} role="alert" className="text-md leading-md text-text-error">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" hierarchy="primary" size="lg" className={TAP} disabled={!text.trim()} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}

export function MessageItem({
  entry,
  mine,
  readOnly,
  onReport,
}: {
  entry: MessageEntry;
  mine: boolean;
  /** No actions at all (a conversation the reader can't write in). */
  readOnly: boolean;
  onReport: (entryId: string) => void;
}) {
  const { me, now } = useMessagesView();
  const [editing, setEditing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const rowRef = React.useRef<HTMLDivElement>(null);
  const wasEditing = React.useRef(false);
  const deleted = entry.deletedAt !== undefined;
  const editable = !readOnly && canEdit(entry, me, now);

  const items: MenuItem[] = editable
    ? [
        { id: "edit", label: "Edit", onSelect: () => setEditing(true) },
        { id: "delete", label: "Delete", danger: true, onSelect: () => setConfirming(true) },
      ]
    : !readOnly && !mine && !deleted
      ? [{ id: "report", label: "Report message", onSelect: () => onReport(entry.id) }]
      : [];

  // The editor took the row's place; when it closes, the keyboard goes back to ⋯.
  React.useEffect(() => {
    if (editing) wasEditing.current = true;
    else if (wasEditing.current) {
      wasEditing.current = false;
      rowRef.current?.querySelector<HTMLElement>('button[aria-haspopup="menu"]')?.focus();
    }
  }, [editing]);

  if (editing) {
    return (
      <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
        <Editor entry={entry} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div ref={rowRef} className={cn("group/msg flex w-full items-start gap-2", mine ? "flex-row-reverse" : "flex-row")}>
      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-2 md:max-w-[75%]", mine ? "items-end" : "items-start")}>
        {deleted ? (
          <p className="rounded-xl border border-dashed border-border px-6 py-3 text-md leading-md text-text-tertiary">
            Message deleted
          </p>
        ) : (
          entry.text && (
            <p
              className={cn(
                "whitespace-pre-wrap break-words rounded-xl px-6 py-3 text-md leading-md text-text-primary [overflow-wrap:anywhere]",
                mine ? "bg-bg-brand-subtle" : "bg-bg-subtle",
              )}
            >
              {entry.text}
            </p>
          )
        )}
        {!deleted && <MessageFiles files={entry.files} mine={mine} />}
        {!deleted && entry.cards.map((c) => <ProjectCard key={c.projectId} projectId={c.projectId} name={c.name} />)}
        {!deleted && entry.editedAt !== undefined && <p className="px-1 text-md leading-md text-text-tertiary">Edited</p>}
        {!mine && !deleted && isRisky(entry.text) && (
          <p className="flex max-w-[62ch] items-start gap-2 px-1 text-md leading-md text-text-warning">
            <Icon icon={Alert02Icon} size={16} className="mt-[2px] shrink-0" />
            <span>{RISK_NOTE}</span>
          </p>
        )}
        {error && (
          <p role="alert" className="px-1 text-md leading-md text-text-error">
            {error}
          </p>
        )}
      </div>
      {items.length > 0 && (
        <MenuButton
          label={mine ? "Actions for your message" : "Actions for this message"}
          align={mine ? "end" : "start"}
          items={items}
          trigger={<Icon icon={MoreHorizontalIcon} size={18} />}
          className="mt-2 max-md:mt-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/msg:opacity-100 [@media(hover:hover)]:group-focus-within/msg:opacity-100 aria-expanded:opacity-100"
        />
      )}
      {confirming && (
        <ConfirmDialog
          open
          title="Delete this message?"
          confirmLabel="Delete"
          onCancel={() => setConfirming(false)}
          onConfirm={() => void (async () => {
            setConfirming(false);
            const r = await deleteMessage(entry.id, me);
            setError(r.ok ? null : r.reason);
            // ⋯ went with the message's content: the keyboard lands on the timeline.
            if (r.ok) rowRef.current?.closest<HTMLElement>('[role="log"]')?.focus({ preventScroll: true });
          })()}
        >
          <p className="text-md leading-md text-text-secondary">It shows as &quot;Message deleted&quot; for everyone in this conversation.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
