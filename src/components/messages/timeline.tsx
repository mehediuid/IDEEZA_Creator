"use client";

// The conversation's timeline (spec §6), its own scroll area: the safety line
// first, a divider per day, context entries as a centred line, and messages in
// groups (one sender, minutes apart) with the sender's name above in a team
// conversation and the time under the group. It opens at the newest entry and
// follows new ones while the reader is at the bottom (or wrote it).

import * as React from "react";
import { Shield01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { contextSentenceOf } from "@/lib/messages/people";
import { clockOf, dayLabelOf } from "@/lib/messages/rules";
import type { ContextEntry, Entry, MessageEntry, Participant, Subject } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { useContextInfo } from "./context-card";
import { MessageItem } from "./message-item";
import { useMessagesView } from "./messages-context";
import type { DateLocale } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";

const GROUP_MS = 5 * 60 * 1000;
const NEAR_BOTTOM_PX = 96;

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "context"; entry: ContextEntry }
  | { kind: "group"; key: string; from: string; items: MessageEntry[] };

function rowsOf(entries: readonly Entry[], now: number, locale: DateLocale): Row[] {
  const rows: Row[] = [];
  let day = "";
  for (const e of entries) {
    const d = new Date(e.at).toDateString();
    if (d !== day) {
      day = d;
      rows.push({ kind: "day", key: `day-${e.id}`, label: dayLabelOf(e.at, now, locale) });
    }
    if (e.kind === "context") {
      rows.push({ kind: "context", entry: e });
      continue;
    }
    const last = rows[rows.length - 1];
    if (last?.kind === "group" && last.from === e.from && e.at - last.items[last.items.length - 1].at <= GROUP_MS) {
      last.items.push(e);
    } else rows.push({ kind: "group", key: e.id, from: e.from, items: [e] });
  }
  return rows;
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
  onReport,
}: {
  conversationId: string | null;
  entries: readonly Entry[];
  team: boolean;
  subject: Subject;
  snapshots: readonly Participant[];
  teamMemberId: string | null;
  /** Names the log: "Conversation with Mira". */
  label: string;
  readOnly: boolean;
  onReport: (entryId: string) => void;
}) {
  const { me, now, people } = useMessagesView();
  const infoOf = useContextInfo(teamMemberId, subject);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const atBottom = React.useRef(true);
  // Settings › Language › Date & Time Formatting.
  const { locale } = useDates();
  const rows = React.useMemo(() => rowsOf(entries, now, locale), [entries, now, locale]);
  const last = entries[entries.length - 1];

  const toBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  React.useLayoutEffect(() => {
    atBottom.current = true;
    toBottom();
  }, [conversationId]);

  React.useLayoutEffect(() => {
    if (atBottom.current || last?.from === me) toBottom();
  }, [last?.id, last?.from, me]);

  // Photos load after the first paint and push the newest message down.
  React.useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) toBottom();
    });
    ro.observe(el);
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
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
    >
      <div ref={contentRef} className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-6 py-8 md:px-8">
        <p className="mx-auto flex max-w-[52ch] items-start gap-2 text-center text-md leading-md text-text-secondary">
          <Icon icon={Shield01Icon} size={16} className="mt-[2px] shrink-0" />
          <span>IDEEZA never asks you to pay or share your wallet phrase in Messages.</span>
        </p>
        {rows.map((row) => {
          if (row.kind === "day") {
            return (
              <div key={row.key} className="flex items-center gap-4">
                <span aria-hidden className="h-px flex-1 bg-border" />
                <p className="text-md font-medium leading-md text-text-tertiary">{row.label}</p>
                <span aria-hidden className="h-px flex-1 bg-border" />
              </div>
            );
          }
          if (row.kind === "context") {
            return (
              <p key={row.entry.id} className="mx-auto max-w-[62ch] text-center text-md leading-md text-text-secondary">
                {contextSentenceOf(row.entry.context, infoOf(row.entry.context))}
              </p>
            );
          }
          const mine = row.from === me;
          const name = mine ? "You" : people.personOf(row.from, snapshots).name;
          const tail = row.items[row.items.length - 1];
          return (
            <div key={row.key} className={cn("flex flex-col gap-2", mine ? "items-end" : "items-start")}>
              {team && !mine ? (
                <p className="px-1 text-md font-semibold leading-md text-text-secondary">{name}</p>
              ) : (
                <span className="sr-only">{name}</span>
              )}
              {row.items.map((e) => (
                <MessageItem key={e.id} entry={e} mine={mine} readOnly={readOnly} onReport={onReport} />
              ))}
              <p className="px-1 text-md leading-md text-text-tertiary">
                <time dateTime={new Date(tail.at).toISOString()}>{clockOf(tail.at, locale)}</time>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
