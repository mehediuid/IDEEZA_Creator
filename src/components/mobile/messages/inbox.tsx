"use client";

// Message tab › Messages (Figma MS-01…08c): Inbox · Requests (M14, the kit's
// MobileTabs: a tab is client state, never a navigation) with their counts,
// search (A07 at 44, filters live), All · Unread · Archived and the Project
// filter (A18 chips; the project chip opens the kit's pick-one list, MS-04,
// grouped Your projects / Others' projects like the web), then one Kit /
// Conversation row per conversation, edge to edge as a chat app's: the name,
// its relation and the time; the subject; the last line with the unread count
// (time and last line stand out while unread) — swipe it left for Archive or
// Unarchive (MS-05). There is no compose button (P2-MS-2): conversations start
// from a profile, a post or a listing. Requests carries the web's quiet-mode
// and hidden-words lines as rows (the break opens where it's changed; Show /
// Hide again; Hidden words). States (the kit's): loading bones after
// 300 ms, both empty states, an Inbox whose conversations are all archived,
// no results, offline over the cached rows, and couldn't load. The list is
// the web's (`listFor`, `countsFor`). While the tab acts as a demo creator
// (`?as=`), the acting line says so with Back to you.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArrowDown01Icon,
  InboxIcon,
  Moon02Icon,
  NotificationOff01Icon,
  Search01Icon,
  Settings01Icon,
  TextIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { Tag } from "@/components/ideeza/tag";
import { useMessagesView } from "@/components/messages/messages-context";
import { setMember } from "@/lib/messages/actions";
import { initialsOfName } from "@/lib/messages/people";
import {
  askedListingOf,
  M_HIDDEN_WORDS_HREF,
  M_MESSAGE_SETTINGS_HREF,
  M_QUIET_MODE_HREF,
  mThreadHref,
  sameDay,
  unreadCountOf,
} from "@/lib/messages/phone";
import {
  clockOf,
  countsFor,
  hiddenRequestCount,
  listFor,
  shortTimeOf,
  subjectNameOf,
  subjectsFor,
  type ListFilter,
  type ListRow,
  type Side,
  type Tab,
} from "@/lib/messages/rules";
import { ME } from "@/lib/messages/types";
import { quietEndLabel } from "@/lib/settings/audience";
import { quietModeOn } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { Eyebrow } from "../kit/eyebrow";
import { ListCard, ListRow as KitRow } from "../kit/list";
import { PickList, type PickOption } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { EmptyState, ErrorState } from "../kit/state";
import { ListBones, OfflineBanner } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useRowSwipe } from "./gestures";
import { ActingLine, PhoneMessages } from "./view";

const FILTERS: { value: ListFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "archived", label: "Archived" },
];

const TABS = ["inbox", "requests"] as const satisfies readonly Tab[];
const TABS_ID = "m-messages";
const ALL = "all";
const SIDE_MINE = "side:mine";
const SIDE_THEIRS = "side:theirs";
const NO_WORDS: readonly string[] = [];
/** The swiped row's action, 88 wide (the w-[88px] below). */
const ACTION_W = 88;

export function Inbox() {
  return (
    <PhoneMessages>
      <InboxScreen />
    </PhoneMessages>
  );
}

function InboxScreen() {
  const { ready, unreadable, data, me, people, now } = useMessagesView();
  const router = useRouter();
  const settings = useSettings();
  const { locale } = useDates();
  const [tab, setTab] = useTabParam<Tab>("tab", TABS, "inbox");
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<ListFilter>("all");
  const [pick, setPick] = React.useState(ALL);
  const [picking, setPicking] = React.useState(false);
  const [showHidden, setShowHidden] = React.useState(false);

  const hiddenWords = me === ME ? settings.blocking.hiddenWords : NO_WORDS;
  const quietUntil = me === ME && quietModeOn(settings, now) ? settings.audience.quietUntil : null;
  const counts = React.useMemo(() => countsFor(data, me, people.teamIdsOf, hiddenWords), [data, me, people.teamIdsOf, hiddenWords]);
  const hiddenCount = React.useMemo(() => hiddenRequestCount(data, me, hiddenWords), [data, me, hiddenWords]);
  const subjects = React.useMemo(() => subjectsFor(data, me, people.teamIdsOf, people.ownerOf), [data, me, people.teamIdsOf, people.ownerOf]);
  const bothSides = subjects.some((s) => s.side === "mine") && subjects.some((s) => s.side === "theirs");
  const side: Side | null = bothSides && pick === SIDE_MINE ? "mine" : bothSides && pick === SIDE_THEIRS ? "theirs" : null;
  const subjectKey = subjects.some((s) => s.key === pick) ? pick : null;
  // The sheet's groups, as the web's select: the scopes, then each side's subjects under its label.
  const groups = React.useMemo<{ label: string | null; options: PickOption[] }[]>(() => {
    const scopes: PickOption[] = [
      { value: ALL, label: "All projects" },
      ...(bothSides
        ? [
            { value: SIDE_MINE, label: "Your projects" },
            { value: SIDE_THEIRS, label: "Others’ projects" },
          ]
        : []),
    ];
    const of = (s: Side) => subjects.filter((x) => x.side === s).map((x) => ({ value: x.key, label: x.name }));
    return [
      { label: null, options: scopes },
      { label: "Your projects", options: of("mine") },
      { label: "Others’ projects", options: of("theirs") },
    ].filter((g) => g.options.length > 0);
  }, [subjects, bothSides]);
  const pickedValue = subjectKey ?? (side ? pick : ALL);
  const pickedLabel = groups.flatMap((g) => g.options).find((o) => o.value === pickedValue)?.label ?? "All projects";
  const listOpts = React.useMemo(
    () => ({ tab, ownerOf: people.ownerOf, teamIdsOf: people.teamIdsOf, nameOf: people.nameOf, hiddenWords }),
    [tab, people.ownerOf, people.teamIdsOf, people.nameOf, hiddenWords],
  );
  const rows = React.useMemo(
    () => listFor(data, me, { ...listOpts, filter, subjectKey, side, q, showHidden }),
    [data, me, listOpts, filter, subjectKey, side, q, showHidden],
  );
  const searching = q.trim() !== "";
  const narrowed = searching || filter !== "all" || subjectKey !== null || side !== null;
  // An Inbox with nothing in it may still have conversations you archived: say so, not "No messages yet".
  const archivedCount = React.useMemo(
    () => (tab === "inbox" && !narrowed && !rows.length ? listFor(data, me, { ...listOpts, filter: "archived", subjectKey: null, side: null, q: "", showHidden }).length : 0),
    [data, me, listOpts, tab, narrowed, rows.length, showHidden],
  );

  const showAll = () => {
    setQ("");
    setFilter("all");
    setPick(ALL);
  };

  const list = (() => {
    if (unreadable) {
      return (
        <ErrorState
          title="Couldn’t load messages"
          body="Check your connection, or try again in a moment."
          action={{ label: "Try again", onClick: () => window.location.reload() }}
        />
      );
    }
    if (!ready) return <ListBones rows={6} />;
    if (rows.length) {
      return (
        <ul role="list" aria-label={tab === "inbox" ? "Inbox" : "Requests"} className="flex flex-col">
          {rows.map((row) => (
            <SwipeRow key={row.conversation.id} row={row} />
          ))}
        </ul>
      );
    }
    if (narrowed) {
      return (
        <EmptyState
          icon={Search01Icon}
          title="No conversations match"
          body="Try another search, or show All."
          action={searching ? { label: "Clear search", onClick: () => setQ("") } : { label: "Show all", onClick: showAll }}
        />
      );
    }
    if (tab === "inbox") {
      return archivedCount > 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Nothing in your Inbox"
          body={archivedCount === 1 ? "1 conversation is archived." : `${archivedCount} conversations are archived.`}
          action={{ label: "Show archived", onClick: () => setFilter("archived") }}
        />
      ) : (
        // Where they start (a listing, Earn › Money, the Team tab) is said on those screens: the way there is the action.
        <EmptyState icon={InboxIcon} title="No messages yet" body="Conversations start from your projects." action={{ label: "Open my projects", href: "/m/projects" }} />
      );
    }
    // Every request uses a word you hide: the line above already says what's there.
    if (hiddenCount > 0 && !showHidden) return null;
    return <EmptyState icon={InboxIcon} title="No requests" body="Messages from people you haven’t worked with land here first." />;
  })();

  return (
    <Screen
      top={
        <TopBar
          title="Messages"
          actions={[{ icon: Settings01Icon, label: "Message settings", onClick: () => router.push(M_MESSAGE_SETTINGS_HREF) }]}
        />
      }
      className="flex flex-col gap-6 px-8 pb-8"
    >
      <MobileTabs
        label="Messages"
        idBase={TABS_ID}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "inbox", label: "Inbox", count: counts.unread, countLabel: `${counts.unread} unread` },
          { value: "requests", label: "Requests", count: counts.requests, countLabel: `${counts.requests} waiting` },
        ]}
      />
      <SearchInput
        size="xl"
        value={q}
        onValueChange={setQ}
        onClear={() => setQ("")}
        placeholder="Search messages"
        aria-label="Search messages"
        enterKeyHint="search"
      />
      <div role="group" aria-label="Show" className="flex flex-wrap gap-4">
        {FILTERS.map((f) => (
          <Tag key={f.value} selected={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </Tag>
        ))}
        {subjects.length > 1 && (
          <Tag selected={pickedValue !== ALL} onClick={() => setPicking(true)} className="max-w-[160px]">
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="truncate">{pickedLabel}</span>
              <Icon icon={ArrowDown01Icon} size={12} />
            </span>
          </Tag>
        )}
      </div>
      <ActingLine />
      <OfflineBanner />
      <div {...tabPanelProps(TABS_ID, tab)} className="flex flex-col gap-6 outline-none">
        {list}
        {tab === "requests" && (quietUntil !== null || hiddenCount > 0) && (
          // What holds requests back, as rows under the list (Instagram's "Hidden requests"): each opens where it's changed.
          <ListCard label="Requests held back">
            {quietUntil !== null && (
              <KitRow
                href={M_QUIET_MODE_HREF}
                icon={Moon02Icon}
                // Today: the time alone, as the thread writes its times; another day carries its date.
                title={`You’re taking a break until ${sameDay(quietUntil, now) ? clockOf(quietUntil, locale) : quietEndLabel(quietUntil)}`}
                meta="New requests are paused."
              />
            )}
            {hiddenCount > 0 && (
              <KitRow
                icon={ViewOffSlashIcon}
                title={`${hiddenCount === 1 ? "1 request uses" : `${hiddenCount} requests use`} a word you hide`}
                trailing={
                  <Button
                    size="md"
                    hierarchy="secondary"
                    aria-pressed={showHidden}
                    // 36 tall, its tap area 44.
                    className="relative after:absolute after:inset-x-0 after:top-1/2 after:h-[44px] after:-translate-y-1/2 after:content-['']"
                    onClick={() => setShowHidden((v) => !v)}
                  >
                    {showHidden ? "Hide again" : "Show"}
                  </Button>
                }
              />
            )}
            {hiddenCount > 0 && <KitRow href={M_HIDDEN_WORDS_HREF} icon={TextIcon} title="Hidden words" meta="Your list is in Settings." />}
          </ListCard>
        )}
      </div>
      {ready && !unreadable && <p className={cn(T.caption, "text-center text-text-tertiary")}>Demo · messages stay on this phone.</p>}
      <Sheet open={picking} onClose={() => setPicking(false)} title="Project">
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.label ?? ALL} className="flex flex-col gap-2">
              {g.label && (
                <Eyebrow tone="tertiary" as="h3">
                  {g.label}
                </Eyebrow>
              )}
              <PickList
                label={g.label ?? "Project"}
                options={g.options}
                value={pickedValue}
                onPick={(v) => {
                  setPick(v);
                  setPicking(false);
                }}
              />
            </div>
          ))}
        </div>
      </Sheet>
    </Screen>
  );
}

function SwipeRow({ row }: { row: ListRow }) {
  const { data, me, people, now } = useMessagesView();
  const { locale } = useDates();
  const toast = useToast();
  const swipe = useRowSwipe(ACTION_W);
  const c = row.conversation;
  const team = c.kind === "team";
  const subjectName = subjectNameOf(c.subject);
  const person = row.other ? people.personOf(row.other.id, c.participants) : null;
  const title = team ? `${subjectName} team` : (person?.name ?? "Someone");
  const relation =
    !team && row.other ? people.relationOf(me, row.other.id, c.subject, { askedListing: askedListingOf(data, c.id) }) : null;
  const tag = relation ? (relation.short ?? relation.long) : null;
  const teamSize = team && c.subject.kind === "project" ? 1 + people.teamIdsOf(c.subject.projectId).length : 0;
  const count = unreadCountOf(data, c, me);

  const toggleArchive = () => {
    const archived = !row.archived;
    const r = setMember(c.id, me, { archived });
    swipe.close();
    if (!r.ok) {
      toast({ title: r.reason, lead: "error" });
      return;
    }
    toast({
      title: archived ? "Archived" : "Moved back to your list",
      action: { label: "Undo", onClick: () => setMember(c.id, me, { archived: !archived }) },
    });
  };

  const unread = count > 0;
  return (
    <li className="group relative -mx-8 overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex w-[88px]" aria-hidden={swipe.offset === 0 || undefined}>
        <button
          type="button"
          tabIndex={swipe.open ? 0 : -1}
          onClick={toggleArchive}
          className={cn(T.meta, "flex w-full flex-col items-center justify-center gap-1 bg-bg-subtle text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus")}
        >
          <Icon icon={ArchiveIcon} size={20} />
          {row.archived ? "Unarchive" : "Archive"}
        </button>
      </div>
      <Link
        href={mThreadHref(c.id)}
        draggable={false}
        {...swipe.handlers}
        // The row follows the finger: a measured offset.
        style={swipe.offset ? { transform: `translateX(${swipe.offset}px)` } : undefined}
        className={cn(
          // A chat row (WhatsApp / iMessage): the avatar, then the name and the time on one line, what it's
          // about, and the last line with its unread count at the end; it darkens while pressed.
          "relative flex touch-pan-y select-none items-start gap-6 bg-bg-page px-8 outline-none transition-colors duration-fast active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
          !swipe.dragging && "transition-[transform,background-color] ease-out",
        )}
      >
        <span className="py-6">
          <Avatar phone size="lg" initials={team ? initialsOfName(subjectName) : (person?.initials ?? "?")} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1 border-b-[length:var(--border-width-1)] border-solid border-border-subtle py-6 group-last:border-b-0">
          <span className="flex min-w-0 items-center gap-4">
            <span className={cn(T.rowTitle, "min-w-0 truncate")}>{title}</span>
            {tag && (
              <Badge tone="neutral" className="min-w-0 shrink truncate">
                {tag}
              </Badge>
            )}
            <span className={cn(T.meta, "ml-auto shrink-0 pl-2", unread ? "text-text-brand" : "text-text-tertiary")}>
              <time dateTime={new Date(row.lastAt).toISOString()}>{shortTimeOf(row.lastAt, now, locale)}</time>
            </span>
          </span>
          <span className={cn(T.meta, "truncate text-text-tertiary")}>
            {team ? `Team · ${teamSize} ${teamSize === 1 ? "person" : "people"}` : subjectName}
          </span>
          <span className="flex min-w-0 items-center gap-4">
            <span className={cn(unread ? T.rowTitle : T.body, "min-w-0 flex-1 truncate")}>{row.preview}</span>
            {row.muted && (
              <span className="shrink-0 text-[color:var(--color-icon-secondary)]">
                <Icon icon={NotificationOff01Icon} size={16} />
                <span className="sr-only">Muted</span>
              </span>
            )}
            {unread && (
              <Badge tone="brand-solid" className="min-w-[20px] shrink-0 justify-center">
                {count}
                <span className="sr-only"> unread</span>
              </Badge>
            )}
          </span>
          {row.wordHidden && <span className={cn(T.meta, "text-text-tertiary")}>Uses a word you hide</span>}
        </span>
      </Link>
    </li>
  );
}
