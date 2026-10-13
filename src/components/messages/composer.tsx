"use client";

// The composer (spec §6): the pending context the entry point brought ("About:
// …"), an autosizing message field, + for a photo or PDF (and, for the maker,
// a project), the attached chips with remove, and Send. Enter sends and
// Shift+Enter adds a line; a counter shows from 1,800 characters; a refused
// send keeps the draft and says why under the field.

import * as React from "react";
import { Add01Icon, Cancel01Icon, Folder01Icon, Image01Icon, Pdf01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Textarea } from "@/components/ideeza";
import { sendMessage, type NewConversation } from "@/lib/messages/actions";
import { fileError } from "@/lib/messages/rules";
import { COUNT_FROM, FILE_TYPES, FILES_MAX, ME, TEXT_MAX, type CardRef, type ContextRef, type PersonId } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { MenuButton, type MenuItem } from "./menu";
import { sizeOf } from "./message-files";
import { useMessagesView } from "./messages-context";
import { ProjectPicker } from "./project-picker";

const MAX_FIELD_PX = 200;

function Chip({ icon, label, onRemove, removeLabel }: { icon: typeof Add01Icon; label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <li className="flex max-w-full items-center gap-2 rounded-lg border border-solid border-border bg-bg-surface py-1 pl-3 pr-1">
      <Icon icon={icon} size={16} className="shrink-0 text-text-secondary" />
      <span className="min-w-0 truncate text-md leading-md text-text-primary">{label}</span>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="inline-flex size-[28px] shrink-0 cursor-pointer items-center justify-center rounded-md text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
      >
        <Icon icon={Cancel01Icon} size={14} />
      </button>
    </li>
  );
}

export function Composer({
  recipientName,
  conversationId,
  create,
  pending,
  pendingLine,
  teamIds,
  autoFocus = false,
  onSent,
}: {
  /** "Mira" or "Smart Lamp team": the field's label is "Message to {Name}". */
  recipientName: string;
  conversationId: string | null;
  /** The conversation the first Send creates, when there is none yet. */
  create?: NewConversation;
  pending: ContextRef | null;
  /** The pending context as the chip says it. */
  pendingLine: string | null;
  teamIds?: readonly PersonId[];
  autoFocus?: boolean;
  onSent: (conversationId: string) => void;
}) {
  const { me, meAs, unreadable } = useMessagesView();
  const [text, setText] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [cards, setCards] = React.useState<CardRef[]>([]);
  const [fileErrors, setFileErrors] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const fieldRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const counterId = React.useId();
  const errorId = React.useId();

  React.useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_FIELD_PX)}px`;
  }, [text]);

  React.useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches) fieldRef.current?.focus();
  }, [autoFocus]);

  const empty = !text.trim() && !files.length && !cards.length;
  const canSend = !unreadable && !sending && !empty;
  const showCount = text.length >= COUNT_FROM;

  const addFiles = (picked: FileList | null) => {
    if (!picked) return;
    const errs: string[] = [];
    const next = [...files];
    for (const f of Array.from(picked)) {
      const err = fileError(f);
      if (err) errs.push(err);
      else if (next.length >= FILES_MAX) {
        errs.push(`Attach at most ${FILES_MAX} files to one message.`);
        break;
      } else next.push(f);
    }
    setFiles(next);
    setFileErrors(errs);
  };

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    const r = await sendMessage({
      conversationId,
      create,
      from: { id: me, name: meAs.name },
      text,
      files,
      cards,
      context: pending,
      teamIds,
    });
    setSending(false);
    if (!r.ok) {
      setError(r.reason);
      return;
    }
    setText("");
    setFiles([]);
    setCards([]);
    setFileErrors([]);
    setError(null);
    fieldRef.current?.focus();
    onSent(r.value.conversationId);
  };

  const addItems: MenuItem[] = [
    { id: "file", label: "Photo or PDF", onSelect: () => fileRef.current?.click() },
    ...(me === ME ? [{ id: "project", label: "Project", onSelect: () => setPicking(true) }] : []),
  ];

  const describedBy = [showCount ? counterId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-solid border-border bg-bg-surface px-6 py-4 md:px-8">
      {pendingLine && (
        <p className="w-fit max-w-full truncate rounded-full bg-bg-subtle px-4 py-1 text-md leading-md text-text-secondary">
          {pendingLine}
        </p>
      )}
      {(files.length > 0 || cards.length > 0) && (
        <ul role="list" aria-label="Attached" className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <Chip
              key={`${f.name}-${i}`}
              icon={f.type === "application/pdf" ? Pdf01Icon : Image01Icon}
              label={`${f.name} · ${sizeOf(f.size)}`}
              removeLabel={`Remove ${f.name}`}
              onRemove={() => setFiles((all) => all.filter((_, j) => j !== i))}
            />
          ))}
          {cards.map((c) => (
            <Chip
              key={c.projectId}
              icon={Folder01Icon}
              label={c.name}
              removeLabel={`Remove ${c.name}`}
              onRemove={() => setCards((all) => all.filter((x) => x.projectId !== c.projectId))}
            />
          ))}
        </ul>
      )}
      {fileErrors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1">
          {fileErrors.map((e, i) => (
            <li key={i} className="text-md leading-md text-text-error">
              {e}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-3">
        <MenuButton
          label="Add to message"
          align="start"
          items={addItems}
          trigger={<Icon icon={Add01Icon} size={20} />}
          className="size-[42px]"
        />
        <Textarea
          ref={fieldRef}
          rows={1}
          value={text}
          maxLength={TEXT_MAX}
          disabled={unreadable}
          onValueChange={(v) => {
            setText(v);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          aria-label={`Message to ${recipientName}`}
          aria-describedby={describedBy}
          placeholder="Write a message…"
          containerClassName="min-w-0 flex-1"
          className="max-h-[200px] resize-none overflow-y-auto py-[var(--spacing-5)] max-md:min-h-[var(--touch-min)]"
        />
        <Button
          type="button"
          hierarchy="primary"
          size="lg"
          disabled={!canSend}
          loading={sending}
          onClick={() => void send()}
          className="max-md:min-h-[var(--touch-min)]"
        >
          Send
        </Button>
      </div>
      {(showCount || error) && (
        <div className="flex items-start justify-between gap-4">
          {error ? (
            <p id={errorId} role="alert" className="text-md leading-md text-text-error">
              {error}
            </p>
          ) : (
            <span />
          )}
          {showCount && (
            <p
              id={counterId}
              className={cn("shrink-0 text-md tabular-nums leading-md", text.length >= TEXT_MAX ? "text-text-error" : "text-text-secondary")}
            >
              {text.length.toLocaleString("en-US")} / {TEXT_MAX.toLocaleString("en-US")}
            </p>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={FILE_TYPES.join(",")}
        multiple
        hidden
        tabIndex={-1}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {picking && (
        <ProjectPicker
          attached={cards.map((c) => c.projectId)}
          onClose={() => setPicking(false)}
          onPick={(card) => {
            setCards((all) => [...all, card]);
            setPicking(false);
            fieldRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
