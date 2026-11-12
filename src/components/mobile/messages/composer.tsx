"use client";

// The composer (Shared kit Kit / Composer, MS-10 · 14…18, KIT-KB-02…02c):
// + (A02 Ghost 44) opens Add to message — Photo · PDF · Project (Project for
// the maker) — the field (Text input 44, growing to five lines) and Send (A02
// Primary 44, off while there's nothing to send). Above it, the context bar
// says what Send will do: "Replying to Mira · …", "Editing message", or the
// entry point's "About: …". Photos ask the phone's photo permission once
// (KIT-PM-02, the kit's pre-prompt). Attached photos and PDFs show above the
// field, each with ✕, and the web's file rules (type, 10 MB, 5 files) as
// inline errors. A refused send keeps the draft and says why under the field.
// On a touch keyboard Return starts a new line (the field grows to five) and
// the Send button sends; with a hardware keyboard Enter sends, Shift+Enter
// starts a line.

import * as React from "react";
import { Add01Icon, Cancel01Icon, Folder01Icon, Image01Icon, Pdf01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton } from "@/components/ideeza/icon-button";
import { Textarea } from "@/components/ideeza/text-input";
import { sizeOf } from "@/components/messages/message-files";
import { fileError } from "@/lib/messages/rules";
import { COUNT_FROM, FILE_TYPES, FILES_MAX, TEXT_MAX, type CardRef } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { usePrePrompt } from "../kit/permission-sheet";
import { ActionSheet } from "../kit/sheet";
import { T } from "../type";
import { ComposerContextBar, InlineNote } from "./kit";
import { ShareProjectSheet } from "./sheets";

const PHOTO_TYPES = FILE_TYPES.filter((t) => t.startsWith("image/"));
const MAX_FIELD_PX = 136;

const COARSE = "(pointer: coarse)";
function watchPointer(onChange: () => void) {
  const mq = window.matchMedia(COARSE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
/** A touch keyboard (no Shift to hold): Return writes a new line there. */
function useTouchKeyboard(): boolean {
  return React.useSyncExternalStore(
    watchPointer,
    () => window.matchMedia(COARSE).matches,
    () => false,
  );
}

export type Draft = { text: string; files: File[]; cards: CardRef[] };

export type ComposerMode = { kind: "reply"; line: string } | { kind: "edit"; text: string } | null;

/** A picked file, and a preview address for a photo (let go when it leaves the composer). */
type Picked = { file: File; url: string | null };

function release(all: readonly Picked[]) {
  for (const p of all) if (p.url) URL.revokeObjectURL(p.url);
}

function PhotoThumb({ picked, onRemove }: { picked: Picked; onRemove: () => void }) {
  return (
    <li className="relative size-[56px] shrink-0">
      {/* A picked photo, shown from memory before it is sent. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {picked.url && <img src={picked.url} alt="" className="size-full rounded-lg bg-bg-subtle object-cover" />}
      <button
        type="button"
        aria-label={`Remove ${picked.file.name}`}
        onClick={onRemove}
        className="absolute -right-2 -top-2 inline-flex size-[24px] items-center justify-center rounded-full border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface text-[color:var(--color-icon-default)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus after:absolute after:inset-[-10px] after:content-['']"
      >
        <Icon icon={Cancel01Icon} size={14} />
      </button>
    </li>
  );
}

function Chip({ icon, label, onRemove, removeLabel }: { icon: typeof Add01Icon; label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <li className="flex h-[40px] max-w-full items-center gap-2 rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface pl-4">
      <span className="text-[color:var(--color-icon-secondary)]">
        <Icon icon={icon} size={16} />
      </span>
      <span className={cn(T.body, "min-w-0 truncate text-text-primary")}>{label}</span>
      <IconButton hierarchy="ghost" size="lg" aria-label={removeLabel} icon={<Icon icon={Cancel01Icon} size={16} />} onClick={onRemove} />
    </li>
  );
}

export function Composer({
  recipientName,
  mode,
  onCloseMode,
  contextLine,
  canAddProject,
  disabled,
  autoFocus,
  onSend,
  onSaveEdit,
}: {
  /** "Mira Chen" or "Smart Lamp team": the field is "Message to {name}". */
  recipientName: string;
  mode: ComposerMode;
  onCloseMode: () => void;
  /** The entry point's context for the next message ("About: …"). */
  contextLine: string | null;
  canAddProject: boolean;
  /** Nothing can be sent yet (the messages can't be read, or are still being read). */
  disabled?: boolean;
  autoFocus?: boolean;
  /** Sends the draft; a reason when it was refused (the draft stays), null once it's on its way. */
  onSend: (d: Draft) => Promise<string | null>;
  /** Saves an edit; a reason when it was refused. */
  onSaveEdit: (text: string) => string | null;
}) {
  const [text, setText] = React.useState("");
  const [files, setFiles] = React.useState<Picked[]>([]);
  const [cards, setCards] = React.useState<CardRef[]>([]);
  const [fileErrors, setFileErrors] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const photosAsk = usePrePrompt("photos");
  const touch = useTouchKeyboard();
  const fieldRef = React.useRef<HTMLTextAreaElement>(null);
  const photoRef = React.useRef<HTMLInputElement>(null);
  const pdfRef = React.useRef<HTMLInputElement>(null);
  const stash = React.useRef<string | null>(null);
  const held = React.useRef<Picked[]>([]);
  React.useEffect(() => {
    held.current = files;
  }, [files]);
  React.useEffect(() => () => release(held.current), []);
  const errorId = React.useId();
  const editing = mode?.kind === "edit";

  // Editing puts the message in the field and keeps your draft aside until it ends.
  const editText = mode?.kind === "edit" ? mode.text : null;
  React.useEffect(() => {
    if (editText === null) {
      if (stash.current !== null) {
        setText(stash.current);
        stash.current = null;
      }
      return;
    }
    setText((t) => {
      if (stash.current === null) stash.current = t;
      return editText;
    });
    setError(null);
  }, [editText]);

  React.useEffect(() => {
    if (mode) fieldRef.current?.focus();
  }, [mode]);

  React.useEffect(() => {
    if (autoFocus) fieldRef.current?.focus();
  }, [autoFocus]);

  React.useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_FIELD_PX)}px`;
  }, [text]);

  const empty = editing ? !text.trim() : !text.trim() && !files.length && !cards.length;
  const canSend = !disabled && !busy && !empty;

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
      } else next.push({ file: f, url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null });
    }
    setFiles(next);
    setFileErrors(errs);
  };

  const pickPhotos = () => photosAsk.ask(() => photoRef.current?.click());

  const send = async () => {
    if (!canSend) return;
    if (editing) {
      const why = onSaveEdit(text);
      setError(why);
      return;
    }
    setBusy(true);
    const why = await onSend({ text, files: files.map((p) => p.file), cards });
    setBusy(false);
    if (why) {
      setError(why);
      return;
    }
    setText("");
    release(files);
    setFiles([]);
    setCards([]);
    setFileErrors([]);
    setError(null);
    fieldRef.current?.focus();
  };

  const bar = editing ? (
    <ComposerContextBar onClose={onCloseMode} closeLabel="Stop editing">
      Editing message
    </ComposerContextBar>
  ) : mode?.kind === "reply" ? (
    <ComposerContextBar onClose={onCloseMode} closeLabel="Stop replying">
      {mode.line}
    </ComposerContextBar>
  ) : contextLine ? (
    <ComposerContextBar>{contextLine}</ComposerContextBar>
  ) : null;

  const attached = !editing && (files.length > 0 || cards.length > 0);
  return (
    <div className="flex flex-col border-t-[length:var(--border-width-1)] border-solid border-border bg-bg-surface">
      {bar && <div className="border-b-[length:var(--border-width-1)] border-solid border-border-subtle">{bar}</div>}
      {(attached || fileErrors.length > 0) && (
        <div className="flex flex-col gap-3 px-8 pt-6">
          {attached && (
            <ul role="list" aria-label="Attached" className="flex flex-wrap items-center gap-4">
              {files.map((p, i) => {
                const remove = () => {
                  release([p]);
                  setFiles((all) => all.filter((_, j) => j !== i));
                };
                return p.url ? (
                  <PhotoThumb key={`${p.file.name}-${i}`} picked={p} onRemove={remove} />
                ) : (
                  <Chip key={`${p.file.name}-${i}`} icon={Pdf01Icon} label={`${p.file.name} · ${sizeOf(p.file.size)}`} removeLabel={`Remove ${p.file.name}`} onRemove={remove} />
                );
              })}
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
            <div role="alert" className="flex flex-col gap-1">
              {fileErrors.map((e, i) => (
                <InlineNote key={i} tone="error">
                  {e}
                </InlineNote>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex items-end gap-4 py-6 pl-2 pr-8">
        <IconButton
          hierarchy="ghost"
          size="xl"
          aria-label={editing ? "Add to message (not while editing)" : "Add to message"}
          disabled={editing || disabled}
          icon={<Icon icon={Add01Icon} size={22} />}
          onClick={() => setAdding(true)}
        />
        <Textarea
          ref={fieldRef}
          rows={1}
          value={text}
          maxLength={TEXT_MAX}
          disabled={disabled}
          enterKeyHint={touch ? "enter" : "send"}
          onValueChange={(v) => {
            setText(v);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !touch && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            } else if (e.key === "Escape" && mode) {
              e.preventDefault();
              onCloseMode();
            }
          }}
          aria-label={editing ? "Edit your message" : `Message to ${recipientName}`}
          aria-describedby={error ? errorId : undefined}
          placeholder={attached ? "Add a message (optional)" : "Write a message…"}
          containerClassName="min-h-[44px] min-w-0 flex-1"
          className={cn(T.bodyLg, "resize-none overflow-y-auto py-4")}
        />
        <IconButton
          hierarchy="primary"
          size="xl"
          aria-label={editing ? "Save" : "Send"}
          disabled={!canSend}
          icon={<Icon icon={SentIcon} size={22} />}
          onClick={() => void send()}
        />
      </div>
      {(error || text.length >= COUNT_FROM) && (
        <div className="flex items-start justify-between gap-4 px-8 pb-4">
          {error ? (
            <div id={errorId} role="alert" className="min-w-0 flex-1">
              <InlineNote tone="error">{error}</InlineNote>
            </div>
          ) : (
            <span />
          )}
          {text.length >= COUNT_FROM && (
            <p className={cn(T.meta, "shrink-0 tabular-nums", text.length >= TEXT_MAX && "text-text-error")}>
              {text.length.toLocaleString("en-US")} / {TEXT_MAX.toLocaleString("en-US")}
            </p>
          )}
        </div>
      )}
      <input
        ref={photoRef}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        multiple
        hidden
        tabIndex={-1}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        tabIndex={-1}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <ActionSheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add to message"
        items={[
          { label: "Photo", icon: Image01Icon, onSelect: pickPhotos },
          { label: "PDF", icon: Pdf01Icon, onSelect: () => pdfRef.current?.click() },
          ...(canAddProject ? [{ label: "Project", icon: Folder01Icon, onSelect: () => setSharing(true) }] : []),
        ]}
      />
      <ShareProjectSheet
        open={sharing}
        onClose={() => setSharing(false)}
        attached={cards.map((c) => c.projectId)}
        onPick={(card) => {
          setCards((all) => [...all, card]);
          setSharing(false);
        }}
      />
      {photosAsk.sheet}
    </div>
  );
}
