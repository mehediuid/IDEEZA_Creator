"use client";

// A thread's timeline (MS-10 · 13 · 18 · 30): the safety line (a centred system note),
// a day break (A24 Divider with its label), context lines, and messages in
// runs as Kit / Chat bubble — theirs left on bg/subtle, yours right on
// bg/brand-subtle, the time under a run; in a team thread a received run
// carries "Name · Role" above it and the sender's avatar beside its last
// bubble. A bubble shows the line it replies to, its photos (tap opens the
// viewer), PDFs (the phone's own preview), shared projects, "Edited",
// "Message deleted", the web's reported-message lines and, under a risky
// message you received, the scam hint (M01 Careful). Hold a message for its
// menu; swipe it right to reply. Your messages on their way read Sending…;
// one that couldn't go reads Not sent with Retry (KIT-OF-03). It opens at the
// newest and follows new ones while you're at the bottom.

import * as React from "react";
import { ArrowTurnBackwardIcon, Pdf01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Banner } from "@/components/ideeza/banner";
import { Divider } from "@/components/ideeza/divider";
import { useContextInfo } from "@/components/messages/context-card";
import { sizeOf } from "@/components/messages/message-files";
import { useMessagesView } from "@/components/messages/messages-context";
import { useMessageFileUrl } from "@/lib/messages/files";
import { initialsOfName } from "@/lib/messages/people";
import { firstNameOf, phoneContextSentenceOf, quoteOf, threadRowsOf, type OutboxItem } from "@/lib/messages/phone";
import { isRisky, RISK_NOTE } from "@/lib/messages/risk";
import { clockOf, dayLabelOf, reportEvidenceOf } from "@/lib/messages/rules";
import type { CardRef, Entry, FileRef, MessageEntry, Participant, Subject } from "@/lib/messages/types";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useBubbleGestures } from "./gestures";
import { BUBBLE, BubbleMeta, bubbleTone, ContextCard, SystemNote, TEXT_ACTION, type Side } from "./kit";
import { useSubjectAccess } from "./view";

const NEAR_BOTTOM_PX = 96;

/** A message on its way, shown until the store has it. */
export type SendingItem = { id: string; text: string; fileNames: string[]; cards: CardRef[]; at: number };

export type TimelineHandlers = {
  onHold: (e: MessageEntry) => void;
  onReply: (e: MessageEntry) => void;
  onOpenPhoto: (fileKey: string) => void;
  onRetry: (item: OutboxItem) => void;
  onUnsentMenu: (item: OutboxItem) => void;
};

function Photo({ file, onOpen }: { file: FileRef; onOpen: () => void }) {
  const { url, missing } = useMessageFileUrl(file.key);
  if (missing) return <p className={cn(T.meta, "rounded-lg border border-dashed border-border px-4 py-3 text-text-tertiary")}>{file.name} isn’t on this phone any more.</p>;
  return (
    <button
      type="button"
      aria-label={`Open ${file.name}`}
      onClick={onOpen}
      disabled={!url}
      className="block size-[120px] overflow-hidden rounded-lg bg-bg-subtle outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {/* A blob URL from IndexedDB: next/image can't optimise it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" draggable={false} className="size-full object-cover" />}
    </button>
  );
}

function Pdf({ file }: { file: FileRef }) {
  const { url, missing } = useMessageFileUrl(file.key);
  if (missing) return <p className={cn(T.meta, "rounded-lg border border-dashed border-border px-4 py-3 text-text-tertiary")}>{file.name} isn’t on this phone any more.</p>;
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${file.name}, ${sizeOf(file.size)}`}
      className="flex min-h-[48px] w-[240px] max-w-full items-center gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span className="text-[color:var(--color-icon-secondary)]">
        <Icon icon={Pdf01Icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(T.rowTitle, "block truncate")}>{file.name}</span>
        <span className={cn(T.meta, "block")}>PDF · {sizeOf(file.size)}</span>
      </span>
    </a>
  );
}

function Files({ files, side, onOpenPhoto }: { files: FileRef[]; side: Side; onOpenPhoto: (key: string) => void }) {
  if (!files.length) return null;
  return (
    <ul role="list" className={cn("flex flex-wrap gap-2", side === "yours" ? "justify-end" : "justify-start")}>
      {files.map((f) => (
        <li key={f.key}>{f.type === "application/pdf" ? <Pdf file={f} /> : <Photo file={f} onOpen={() => onOpenPhoto(f.key)} />}</li>
      ))}
    </ul>
  );
}

function SharedProject({ card }: { card: CardRef }) {
  const subject = React.useMemo<Subject>(() => ({ kind: "project", projectId: card.projectId, name: card.name }), [card.projectId, card.name]);
  const access = useSubjectAccess(subject);
  return (
    <div className="w-[280px] max-w-full">
      <ContextCard access={access} caption="Project" label="Shared project" />
    </div>
  );
}

function Quote({ entries, entryId, snapshots }: { entries: readonly Entry[]; entryId: string; snapshots: readonly Participant[] }) {
  const { me, people } = useMessagesView();
  const q = quoteOf(entries, entryId);
  if (!q) return null;
  const who = q.from === me ? "You" : firstNameOf(people.personOf(q.from, snapshots).name);
  return (
    <span className="mb-2 flex flex-col border-l-[length:var(--border-width-2)] border-solid border-border-strong pl-4">
      <span className={cn(T.meta, "text-text-primary")}>{who}</span>
      <span className={cn(T.meta, "line-clamp-2")}>{q.line}</span>
    </span>
  );
}

function Message({
  entry,
  side,
  entries,
  snapshots,
  readOnly,
  handlers,
}: {
  entry: MessageEntry;
  side: Side;
  entries: readonly Entry[];
  snapshots: readonly Participant[];
  readOnly: boolean;
  handlers: TimelineHandlers;
}) {
  const { me, data, people } = useMessagesView();
  const deleted = entry.deletedAt !== undefined;
  const evidence = side === "yours" ? null : reportEvidenceOf(data, entry.id, me);
  const changedSince = !!evidence && !deleted && evidence.text !== entry.text;
  const gestures = useBubbleGestures({
    onHold: readOnly || (deleted && !evidence) ? null : () => handlers.onHold(entry),
    onReply: readOnly || deleted ? null : () => handlers.onReply(entry),
  });
  const shownText = deleted ? (evidence?.text ?? "") : entry.text;
  const shownFiles = deleted ? (evidence?.files ?? []) : entry.files;

  return (
    <div className={cn("flex flex-col gap-2", side === "yours" ? "items-end" : "items-start")}>
      <div
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        aria-haspopup={readOnly ? undefined : "dialog"}
        aria-label={readOnly ? undefined : `${side === "yours" ? "Your message" : "Message"}: ${deleted && !evidence ? "deleted" : shownText || "attachment"}. Hold for options.`}
        {...gestures.handlers}
        // The bubble follows the finger while you swipe to reply: a measured offset.
        style={gestures.offset ? { transform: `translateX(${gestures.offset}px)` } : undefined}
        className={cn(
          "relative flex max-w-full touch-pan-y select-none flex-col gap-2 outline-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-border-focus",
          side === "yours" ? "items-end" : "items-start",
          !gestures.offset && "transition-transform duration-fast ease-out",
        )}
      >
        {gestures.offset > 0 && (
          <span aria-hidden className={cn("absolute -left-12 top-1/2 -translate-y-1/2", gestures.replyArmed ? "text-[color:var(--color-icon-brand)]" : "text-[color:var(--color-icon-secondary)]")}>
            <Icon icon={ArrowTurnBackwardIcon} size={20} />
          </span>
        )}
        {deleted && !evidence ? (
          <p className={cn(T.body, "rounded-lg border-[length:var(--border-width-1)] border-dashed border-border px-6 py-4 text-text-tertiary")}>Message deleted</p>
        ) : (
          (shownText || entry.replyTo) && (
            <p className={cn(BUBBLE, bubbleTone(side))}>
              {entry.replyTo && !deleted && <Quote entries={entries} entryId={entry.replyTo} snapshots={snapshots} />}
              {shownText}
            </p>
          )
        )}
        <Files files={shownFiles} side={side} onOpenPhoto={handlers.onOpenPhoto} />
        {!deleted && entry.cards.map((c) => <SharedProject key={c.projectId} card={c} />)}
      </div>
      {!deleted && entry.editedAt !== undefined && <BubbleMeta>Edited</BubbleMeta>}
      {evidence && (
        <div className={cn(T.meta, "flex flex-col gap-1")}>
          <p>
            {deleted
              ? `${people.nameOf(entry.from)} deleted this message. You still see it because you reported it; it's kept with your report.`
              : changedSince
                ? "You reported this message before it was edited. Your report keeps it as it was:"
                : "You reported this message."}
          </p>
          {changedSince && evidence.text && (
            <p className="whitespace-pre-wrap break-words border-l-[length:var(--border-width-2)] border-solid border-border pl-3 text-text-primary">{evidence.text}</p>
          )}
        </div>
      )}
      {side === "theirs" && !deleted && isRisky(entry.text) && (
        <Banner tone="attention" title="Careful" className="w-full">
          {RISK_NOTE.replace(/^Careful: t/, "T")}
        </Banner>
      )}
    </div>
  );
}

function Unsent({ item, onRetry, onMenu }: { item: OutboxItem; onRetry: () => void; onMenu: () => void }) {
  const gestures = useBubbleGestures({ onHold: onMenu, onReply: null });
  return (
    <div className="flex flex-col items-end gap-2 pl-24">
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`Not sent: ${item.text || "attachment"}. Hold for options.`}
        {...gestures.handlers}
        className="flex max-w-full touch-pan-y select-none flex-col items-end gap-2 outline-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {item.text && <p className={cn(BUBBLE, bubbleTone("yours"))}>{item.text}</p>}
        <Files files={item.files} side="yours" onOpenPhoto={() => onMenu()} />
        {item.cards.map((c) => (
          <SharedProject key={c.projectId} card={c} />
        ))}
      </div>
      {/* One line under the bubble, as a chat app marks a message that didn't go. */}
      <div className="flex items-center gap-4">
        <BubbleMeta tone="error">Not sent</BubbleMeta>
        <button type="button" onClick={onRetry} className={TEXT_ACTION}>
          Retry
        </button>
      </div>
    </div>
  );
}

export function Timeline({
  conversationId,
  entries,
  team,
  subject,
  snapshots,
  teamMemberId,
  label,
  readOnly,
  sending,
  unsent,
  handlers,
  onAway,
}: {
  conversationId: string | null;
  entries: readonly Entry[];
  team: boolean;
  subject: Subject;
  snapshots: readonly Participant[];
  teamMemberId: string | null;
  /** Names the log: "Conversation with Mira Chen". */
  label: string;
  /** A draft: nothing to hold or reply to yet. */
  readOnly: boolean;
  sending: SendingItem[];
  unsent: OutboxItem[];
  handlers: TimelineHandlers;
  /** Whether you've scrolled away from the newest (the context card folds to one line). */
  onAway: (away: boolean) => void;
}) {
  const { me, now, people } = useMessagesView();
  const infoOf = useContextInfo(teamMemberId, subject);
  const { locale } = useDates();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const atBottom = React.useRef(true);
  const rows = React.useMemo(() => threadRowsOf(entries), [entries]);
  const roleOf = React.useCallback(
    (id: string) =>
      subject.kind === "project" ? people.sources.teams.find((t) => t.projectId === subject.projectId)?.members.find((m) => m.id === id)?.role ?? null : null,
    [people.sources.teams, subject],
  );
  const last = entries[entries.length - 1];
  const tail = `${last?.id}|${sending.length}|${unsent.length}`;

  const toBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  React.useLayoutEffect(() => {
    atBottom.current = true;
    toBottom();
  }, [conversationId]);

  React.useLayoutEffect(() => {
    if (atBottom.current || last?.from === me || sending.length) toBottom();
  }, [tail, last?.from, me, sending.length]);

  // Photos load after the first paint, and the foot grows (a reply bar, the keyboard): stay at the newest.
  React.useEffect(() => {
    const el = contentRef.current;
    const box = scrollRef.current;
    if (!el || !box || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) toBottom();
    });
    ro.observe(el);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-label={label}
      aria-live="off"
      tabIndex={-1}
      onScroll={(e) => {
        const el = e.currentTarget;
        const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
        atBottom.current = near;
        onAway(!near);
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
    >
      <div ref={contentRef} className="flex min-h-full flex-col justify-end gap-6 px-8 pb-6 pt-4">
        <SystemNote>IDEEZA never asks you to pay or share your wallet phrase in Messages.</SystemNote>
        {rows.map((row) => {
          if (row.kind === "day") {
            return (
              <div key={row.key} className="flex items-center gap-8">
                <Divider className="flex-1" />
                <p className={cn(T.overline, "shrink-0 text-text-primary")}>{dayLabelOf(row.at, now, locale)}</p>
                <Divider className="flex-1" />
              </div>
            );
          }
          if (row.kind === "context") {
            return (
              <p key={row.key} className={cn(T.meta, "text-center")}>
                {phoneContextSentenceOf(row.entry.context, infoOf(row.entry.context))}
              </p>
            );
          }
          const side: Side = row.from === me ? "yours" : "theirs";
          const tailEntry = row.items[row.items.length - 1];
          const name = side === "yours" ? "You" : people.personOf(row.from, snapshots).name;
          const role = team && side === "theirs" ? roleOf(row.from) : null;
          const time = (
            <BubbleMeta>
              <time dateTime={new Date(tailEntry.at).toISOString()}>{clockOf(tailEntry.at, locale)}</time>
            </BubbleMeta>
          );
          const messages = row.items.map((e) => (
            <Message key={e.id} entry={e} side={side} entries={entries} snapshots={snapshots} readOnly={readOnly} handlers={handlers} />
          ));
          if (team && side === "theirs") {
            return (
              <div key={row.key} className="flex items-end gap-4 pr-24">
                <span className="pb-[22px]">
                  <Avatar size="sm" initials={initialsOfName(name)} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                  <p className={cn(T.meta, "text-text-tertiary")}>{role ? `${firstNameOf(name)} · ${role}` : name}</p>
                  {messages}
                  {time}
                </div>
              </div>
            );
          }
          return (
            <div key={row.key} className={cn("flex flex-col gap-2", side === "yours" ? "items-end pl-24" : "items-start pr-24")}>
              <span className="sr-only">{name}</span>
              {messages}
              {time}
            </div>
          );
        })}
        {sending.map((s) => (
          <div key={s.id} className="flex flex-col items-end gap-2 pl-24">
            {s.text && <p className={cn(BUBBLE, bubbleTone("yours"))}>{s.text}</p>}
            {s.fileNames.map((n) => (
              <BubbleMeta key={n}>{n}</BubbleMeta>
            ))}
            {s.cards.map((c) => (
              <BubbleMeta key={c.projectId}>{c.name}</BubbleMeta>
            ))}
            <BubbleMeta>Sending…</BubbleMeta>
          </div>
        ))}
        {unsent.map((item) => (
          <Unsent key={item.id} item={item} onRetry={() => handlers.onRetry(item)} onMenu={() => handlers.onUnsentMenu(item)} />
        ))}
      </div>
    </div>
  );
}
