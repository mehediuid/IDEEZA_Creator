"use client";

// The list pane (spec §6): "Messages", Acting as and Message settings, the
// demo line, Inbox · Requests with their counts, search, All · Unread ·
// Archived and the Project filter, then one row per conversation — a link,
// marked current while it's open. It lives in the Messages layout, so its
// tab, search and filters hold while conversations open beside it.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationOff01Icon, Settings02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ButtonGroup, IconButton, SearchInput, SelectMenu } from "@/components/ideeza";
import { conversationHref } from "@/lib/messages/links";
import {
  countsFor,
  listFor,
  shortTimeOf,
  subjectNameOf,
  subjectsFor,
  type ListFilter,
  type ListRow,
  type Side,
  type Tab,
} from "@/lib/messages/rules";
import { cn } from "@/lib/utils";
import { ActingAsSelect } from "./acting-as";
import { Avatar } from "./avatar";
import { useMessagesView } from "./messages-context";
import { SettingsDialog } from "./settings-dialog";

const FILTERS: { value: ListFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "archived", label: "Archived" },
];

const ALL_PROJECTS = "all";
const SIDE_MINE = "side:mine";
const SIDE_THEIRS = "side:theirs";

function Row({ row, current }: { row: ListRow; current: boolean }) {
  const { now, me, people } = useMessagesView();
  const c = row.conversation;
  const team = c.kind === "team";
  const subjectName = subjectNameOf(c.subject);
  const person = row.other ? people.personOf(row.other.id, c.participants) : null;
  const title = team ? `${subjectName} team` : (person?.name ?? "Someone");
  const relation = !team && row.other ? people.relationOf(me, row.other.id, c.subject).short : null;
  const teamSize = team && c.subject.kind === "project" ? 1 + people.teamIdsOf(c.subject.projectId).length : 0;
  const href = conversationHref(c.id);
  return (
    <li>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex gap-4 px-6 py-4 outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
          current ? "bg-bg-brand-subtle" : "hover:bg-bg-subtle",
        )}
      >
        <Avatar initials={person?.initials ?? ""} team={team} className="mt-[2px]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                "min-w-0 truncate text-md leading-md text-text-primary",
                row.unread ? "font-bold" : "font-medium",
              )}
            >
              {title}
            </span>
            <span className="ml-auto shrink-0 pl-2 text-md leading-md text-text-tertiary">
              <time dateTime={new Date(row.lastAt).toISOString()}>{shortTimeOf(row.lastAt, now)}</time>
            </span>
          </span>
          <span className="truncate text-md leading-md text-text-secondary">
            {team ? `Team · ${teamSize} ${teamSize === 1 ? "person" : "people"}` : relation ? `${subjectName} · ${relation}` : subjectName}
          </span>
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-md leading-md",
                row.unread ? "font-medium text-text-primary" : "text-text-tertiary",
              )}
            >
              {row.preview}
            </span>
            {row.muted && (
              <>
                <Icon icon={NotificationOff01Icon} size={16} className="shrink-0 text-text-tertiary" />
                <span className="sr-only">Muted</span>
              </>
            )}
            {row.unread && (
              <>
                <span aria-hidden className="size-[8px] shrink-0 rounded-full bg-bg-brand" />
                <span className="sr-only">Unread</span>
              </>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 px-6 py-10 text-center">
      <p className="text-md font-semibold leading-md text-text-primary">{title}</p>
      <p className="mx-auto max-w-[40ch] text-md leading-md text-text-secondary">{body}</p>
    </div>
  );
}

export function ConversationList() {
  const { ready, data, me, people } = useMessagesView();
  const pathname = usePathname();
  const [tab, setTab] = React.useState<Tab>("inbox");
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<ListFilter>("all");
  const [subjectPick, setSubjectPick] = React.useState(ALL_PROJECTS);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const counts = React.useMemo(() => countsFor(data, me, people.teamIdsOf), [data, me, people.teamIdsOf]);
  const subjects = React.useMemo(
    () => subjectsFor(data, me, people.teamIdsOf, people.ownerOf),
    [data, me, people.teamIdsOf, people.ownerOf],
  );
  const bothSides = subjects.some((s) => s.side === "mine") && subjects.some((s) => s.side === "theirs");
  const side: Side | null =
    bothSides && subjectPick === SIDE_MINE ? "mine" : bothSides && subjectPick === SIDE_THEIRS ? "theirs" : null;
  const subjectKey = subjects.some((s) => s.key === subjectPick) ? subjectPick : null;
  const projectOptions = React.useMemo(
    () => [
      { value: ALL_PROJECTS, label: "All projects" },
      ...(bothSides
        ? [
            { value: SIDE_MINE, label: "Your projects" },
            { value: SIDE_THEIRS, label: "Others' projects" },
          ]
        : []),
      ...subjects.map((s) => ({ value: s.key, label: s.name, section: s.side === "mine" ? "Your projects" : "Others' projects" })),
    ],
    [subjects, bothSides],
  );
  const rows = React.useMemo(
    () =>
      listFor(data, me, {
        tab,
        filter,
        subjectKey,
        side,
        ownerOf: people.ownerOf,
        q,
        teamIdsOf: people.teamIdsOf,
        nameOf: people.nameOf,
      }),
    [data, me, tab, filter, subjectKey, side, q, people.ownerOf, people.teamIdsOf, people.nameOf],
  );
  const narrowed = q.trim() !== "" || filter !== "all" || subjectKey !== null || side !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col max-md:overflow-y-auto">
      <div className="flex shrink-0 flex-col gap-4 px-6 pb-4 pt-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold leading-xl tracking-tight text-text-primary">Messages</h1>
          <IconButton
            aria-label="Message settings"
            hierarchy="ghost"
            size="lg"
            icon={<Icon icon={Settings02Icon} size={20} />}
            onClick={() => setSettingsOpen(true)}
            disabled={!ready}
            className="max-md:size-[var(--touch-min)]"
          />
        </div>
        <ActingAsSelect />
        <p className="text-md leading-md text-text-tertiary">Demo · messages stay in this browser.</p>
      </div>
      <div className="flex shrink-0 flex-col gap-3 px-6 pb-4">
        <ButtonGroup
          size="xl"
          className="grid w-full grid-cols-2"
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          items={[
            { value: "inbox", label: counts.unread ? `Inbox (${counts.unread})` : "Inbox" },
            { value: "requests", label: counts.requests ? `Requests (${counts.requests})` : "Requests" },
          ]}
        />
        <SearchInput
          value={q}
          onValueChange={setQ}
          placeholder="Search messages"
          aria-label="Search messages"
          className="text-[length:var(--font-size-md)] leading-md"
          containerClassName="min-h-[40px] max-md:min-h-[var(--touch-min)]"
        />
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex min-h-[32px] cursor-pointer items-center rounded-full border border-solid px-5 text-md font-medium leading-md outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] max-md:min-w-[var(--touch-min)] max-md:justify-center max-md:px-6",
                filter === f.value
                  ? "border-border-brand bg-bg-brand-subtle text-text-brand"
                  : "border-border bg-bg-surface text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {subjects.length > 1 && (
          <SelectMenu
            ariaLabel="Project"
            value={subjectKey ?? (side === "mine" ? SIDE_MINE : side === "theirs" ? SIDE_THEIRS : ALL_PROJECTS)}
            placeholder="All projects"
            options={projectOptions}
            onChange={setSubjectPick}
          />
        )}
      </div>
      <div className="border-t border-solid border-border md:min-h-0 md:flex-1 md:overflow-y-auto">
        {!ready ? null : rows.length > 0 ? (
          <ul role="list" aria-label={tab === "inbox" ? "Inbox" : "Requests"} className="flex flex-col py-1">
            {rows.map((row) => (
              <Row key={row.conversation.id} row={row} current={pathname === conversationHref(row.conversation.id)} />
            ))}
          </ul>
        ) : narrowed ? (
          <Empty title="No conversations match" body="Try another search, or show All." />
        ) : tab === "inbox" ? (
          <Empty
            title="No messages yet"
            body="Conversations start from a project: people ask from your listing, and you can write to someone who bought from you (Earn › Money) or to a teammate (Team tab)."
          />
        ) : (
          <Empty title="No requests" body="Messages from people you haven't worked with land here first." />
        )}
      </div>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
