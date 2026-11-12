"use client";

// History on a phone (master page "Text → Model": Prompt History 10702:174047
// and its details), on the web's History (history-list.ts): two tabs —
// Prompts (each chat, its newest drawing, its project and how many builds)
// and Builds (each build's state and progress, its project, the newest first,
// filtered by In progress / Ready / Needs attention) — and a search. A row
// opens the chat; a build row opens its pieces, and a failed one has Try
// again (the whole build, or only the pieces that failed) and its steps,
// each failed one with its own Retry. ⋯ on a prompt deletes it, with the
// web's rule for the builds that go with it.
//
// The tab, the filter and the search are client state kept in the address
// by replaceState: a tap never waits for the server and works offline, and a
// reload keeps them. The Figma draws this switch segmented (visual-10).

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AiMagicIcon, ArrowDown01Icon, ArrowUp01Icon, Delete02Icon, MoreHorizontalIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { Tag } from "@/components/ideeza/tag";
import {
  HISTORY_FILTERS,
  buildEntries,
  filterCounts,
  narrowBuilds,
  narrowPrompts,
  promptEntries,
  type BuildEntry,
  type HistoryFilter,
  type HistoryTab,
} from "@/lib/create/history-list";
import { ITEM_LABELS, queuedAhead, rollupBuild, statusOf, useCreateHistory, type BuildItemKind, type BuildJob, type ChatSession } from "@/lib/create/history";
import { useManualProjects } from "@/lib/manual/projects";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { LIST_CARD } from "../kit/list";
import { ActionSheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { ListBones } from "../kit/states";
import { useTabParam } from "../kit/tabs";
import { DeleteChatSheet } from "./delete-chat-sheet";

const TAB_VALUES: readonly HistoryTab[] = ["prompts", "builds"];
const FILTER_VALUES = HISTORY_FILTERS.map((f) => f.id) as readonly HistoryFilter[];
/** Rows shown at a time; Show more adds as many again (the web pages its History). */
const PAGE = 12;

const STATUS: Record<BuildEntry["status"], { word: string; tone: "brand" | "success" | "error" | "warning" | "neutral" }> = {
  waiting: { word: "Waiting", tone: "neutral" },
  building: { word: "Building", tone: "brand" },
  ready: { word: "Ready", tone: "success" },
  failed: { word: "Needs a retry", tone: "error" },
  paused: { word: "Paused", tone: "warning" },
};

function firstPrompt(chat: ChatSession): string {
  const t = chat.turns.find((x) => x.role === "user");
  return t?.role === "user" ? t.text : chat.title;
}

function newestImage(chat: ChatSession): string | undefined {
  for (let i = chat.turns.length - 1; i >= 0; i--) {
    const t = chat.turns[i];
    if (t.role === "assistant" && t.status === "ready" && t.imageUrl) return t.imageUrl;
  }
  return undefined;
}

/** The search, kept in the address (`?q=`) by replaceState, so a reload keeps it. */
function useQueryParam(): [string, (q: string) => void] {
  const params = useSearchParams();
  const [query, setQuery] = React.useState(() => params.get("q") ?? "");
  const set = React.useCallback((q: string) => {
    setQuery(q);
    const sp = new URLSearchParams(window.location.search);
    if (q) sp.set("q", q);
    else sp.delete("q");
    const s = sp.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, []);
  return [query, set];
}

export function AiHistory() {
  const [tab, setTab] = useTabParam<HistoryTab>("tab", TAB_VALUES, "prompts");
  const [filter, setFilter] = useTabParam<HistoryFilter>("filter", FILTER_VALUES, "all");
  const [query, setQuery] = useQueryParam();
  const [shown, setShown] = React.useState(PAGE);
  const [menuFor, setMenuFor] = React.useState<ChatSession | null>(null);
  const [deleting, setDeleting] = React.useState<ChatSession | null>(null);
  const { hydrated, chats, builds, attentionBuilds, retryBuild, retryBuildItem } = useCreateHistory();
  const { projects } = useManualProjects();
  const dates = useDates();
  const [now] = React.useState(() => Date.now());

  const { prompts, buildRows } = React.useMemo(() => {
    const projectName = new Map(projects.map((p) => [p.id, p.name]));
    const attention = new Set(attentionBuilds.map((a) => a.job.id));
    const inputs = builds.map((b) => {
      const rollup = rollupBuild(b);
      return {
        id: b.id,
        chatId: b.chatId,
        title: b.projectChoiceName?.trim() || b.title,
        prompt: b.conceptPrompt,
        imageUrl: b.conceptImageUrl,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        startedAt: b.startedAt,
        endedAt: b.endedAt,
        queued: b.status === "queued",
        blocked: !!b.blocked,
        rollup: rollup.status,
        progress: rollup.progress,
        projectId: b.projectId,
        projectName: b.projectId ? projectName.get(b.projectId) : undefined,
        attention: attention.has(b.id),
        ahead: queuedAhead(b, builds),
        products: [{ id: "primary", name: b.title, items: b.items }, ...(b.companions ?? []).map((c) => ({ id: c.id, name: c.name, items: c.items }))],
      };
    });
    return {
      prompts: promptEntries(
        chats.map((c) => ({ id: c.id, title: c.title, prompt: firstPrompt(c), imageUrl: newestImage(c), updatedAt: c.updatedAt })),
        inputs,
      ),
      buildRows: buildEntries(inputs, new Set(chats.map((c) => c.id))),
    };
  }, [chats, builds, projects, attentionBuilds]);

  const buildById = React.useMemo(() => new Map(builds.map((b) => [b.id, b])), [builds]);
  // The same retry the build's own card offers: a build a system error stopped starts over;
  // otherwise only the pieces that failed run again (the web's History).
  const retry = (job: BuildJob) => {
    if (statusOf(job) === "failed") return retryBuild(job.id);
    for (const it of job.items) if (it.status === "failed") retryBuildItem(job.id, it.kind);
    for (const c of job.companions ?? []) for (const it of c.items) if (it.status === "failed") retryBuildItem(job.id, it.kind, c.id);
  };
  const retryStep = (row: BuildEntry, productId: string, kind: string) => {
    const job = buildById.get(row.id);
    if (!job) return;
    if (statusOf(job) === "failed") retryBuild(job.id);
    else retryBuildItem(job.id, kind as BuildItemKind, productId);
  };

  const counts = filterCounts(buildRows);
  const shownPrompts = narrowPrompts(prompts, query);
  const shownBuilds = narrowBuilds(buildRows, filter, query);
  const list = tab === "prompts" ? shownPrompts : shownBuilds;
  const attentionCount = attentionBuilds.filter((a) => !a.job.attentionDismissedAt).length;
  const setSearch = (q: string) => {
    setQuery(q);
    setShown(PAGE);
  };

  return (
    <Screen top={<TopBar back="/m/ai" title="History" />}>
      <div className="flex flex-col gap-6 px-8 pb-8 pt-2">
        <div role="tablist" aria-label="History" className="grid grid-cols-2 rounded-xl bg-bg-subtle p-1">
          {TAB_VALUES.map((t) => {
            const on = t === tab;
            const n = t === "prompts" ? prompts.length : buildRows.length;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                id={`history-tab-${t}`}
                aria-controls="history-panel"
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => {
                  setTab(t);
                  setFilter("all");
                  setShown(PAGE);
                }}
                className={cn(
                  T.rowTitle,
                  "relative inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  on ? "bg-bg-surface text-text-primary shadow-1" : "text-text-secondary",
                )}
              >
                {t === "prompts" ? "Prompts" : "Builds"} <span className="tabular-nums">{n}</span>
                {/* The web's attention dot on Builds: a build waits for the maker. */}
                {t === "builds" && attentionCount > 0 && (
                  <>
                    <span aria-hidden className="size-[8px] rounded-full bg-bg-error" />
                    <span className="sr-only">, {attentionCount} need attention</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <SearchInput size="xl" value={query} onValueChange={setSearch} placeholder={tab === "prompts" ? "Search prompts" : "Search builds"} aria-label="Search" />
        {tab === "builds" && (
          <div className="-mx-8 flex gap-3 overflow-x-auto px-8 [scrollbar-width:none]">
            {HISTORY_FILTERS.map((f) => (
              <Tag
                key={f.id}
                selected={f.id === filter}
                onClick={() => {
                  setFilter(f.id);
                  setShown(PAGE);
                }}
              >
                {f.label} {counts[f.id]}
              </Tag>
            ))}
          </div>
        )}

        <div id="history-panel" role="tabpanel" aria-labelledby={`history-tab-${tab}`} className="flex flex-col gap-3">
          {!hydrated ? (
            <ListBones rows={5} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={AiMagicIcon}
              title={query ? `No ${tab} match “${query}”` : tab === "builds" && filter !== "all" ? "No builds here" : tab === "prompts" ? "No prompts yet" : "No builds yet"}
              body={
                query
                  ? "Try other words."
                  : tab === "builds" && filter !== "all"
                    ? "None of your builds is in this state."
                    : tab === "prompts"
                      ? "Every idea you describe on the AI tab is kept here."
                      : "Builds appear here once a concept is built."
              }
              action={
                query
                  ? { label: "Clear search", onClick: () => setSearch("") }
                  : tab === "builds" && filter !== "all"
                    ? { label: "Show all", onClick: () => setFilter("all") }
                    : { label: "Describe an idea", href: "/m/ai" }
              }
            />
          ) : tab === "prompts" ? (
            <ul className="flex flex-col gap-3">
              {shownPrompts.slice(0, shown).map((p) => {
                const chat = chats.find((c) => c.id === p.chatId) ?? null;
                return (
                  <li key={p.chatId} className={cn(LIST_CARD, "flex-row items-center gap-2")}>
                    <Link href={`/m/ai/chat/${p.chatId}`} className="flex min-w-0 flex-1 items-center gap-5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus">
                      <Thumb url={p.imageUrl} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cn(T.rowTitle, "truncate")}>{p.name}</span>
                        <span className={cn(T.meta, "truncate")}>{p.prompt}</span>
                        <span className={cn(T.meta, "truncate text-text-tertiary")}>
                          {dates.stamp(p.ts, now)}
                          {p.projectName ? ` · In ${p.projectName}` : ""}
                          {p.builds ? ` · ${p.builds} ${p.builds === 1 ? "build" : "builds"}` : " · No build yet"}
                        </span>
                      </span>
                    </Link>
                    {chat && (
                      <button
                        type="button"
                        aria-label={`More for ${p.name}`}
                        onClick={() => setMenuFor(chat)}
                        className="mr-2 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <Icon icon={MoreHorizontalIcon} size={18} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="flex flex-col gap-3">
              {shownBuilds.slice(0, shown).map((b) => {
                const job = buildById.get(b.id);
                return <BuildRow key={b.id} row={b} now={now} onRetry={job ? () => retry(job) : undefined} onRetryStep={(productId, kind) => retryStep(b, productId, kind)} />;
              })}
            </ul>
          )}
          {hydrated && list.length > shown && (
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
              Show more
            </Button>
          )}
        </div>
      </div>
      <ActionSheet
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.title}
        items={[{ label: "Delete chat", icon: Delete02Icon, destructive: true, onSelect: () => setDeleting(menuFor) }]}
      />
      <DeleteChatSheet chat={deleting} onClose={() => setDeleting(null)} />
    </Screen>
  );
}

/** A build: tap opens its pieces; a failed one has Try again and its steps, each failed step with Retry. */
function BuildRow({ row: b, now, onRetry, onRetryStep }: { row: BuildEntry; now: number; onRetry?: () => void; onRetryStep: (productId: string, kind: string) => void }) {
  const dates = useDates();
  const [open, setOpen] = React.useState(false);
  const s = STATUS[b.status];
  const failed = b.status === "failed" && !b.older;
  const done = b.products.reduce((n, g) => n + g.done, 0);
  const all = b.products.reduce((n, g) => n + g.steps.length, 0);
  return (
    <li className={LIST_CARD}>
      <Link href={`/m/ai/build/${b.id}`} className="flex items-center gap-5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus">
        <Thumb url={b.imageUrl} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-3">
            <span className={cn(T.rowTitle, "truncate")}>{b.name}</span>
            <Badge tone={s.tone}>{b.status === "building" && b.progress !== undefined ? `${s.word} · ${b.progress}%` : s.word}</Badge>
          </span>
          <span className={cn(T.meta, "truncate")}>
            {b.products.length} {b.products.length === 1 ? "product" : "products"} · {done} of {all} pieces
            {b.projectName && b.projectName !== b.name ? ` · ${b.projectName}` : ""}
          </span>
          <span className={cn(T.meta, "text-text-tertiary")}>
            {dates.stamp(b.createdAt, now)}
            {b.older ? " · an older build of its chat" : ""}
          </span>
        </span>
      </Link>
      {failed && (
        <div className="flex flex-col gap-3 px-5 pb-5">
          <div className="flex gap-3">
            {onRetry && (
              <Button hierarchy="secondary" size="md" className="flex-1" iconLeading={<Icon icon={Refresh01Icon} size={16} />} onClick={onRetry}>
                Try again
              </Button>
            )}
            <Button
              hierarchy="ghost"
              size="md"
              className="flex-1"
              aria-expanded={open}
              iconTrailing={<Icon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={16} />}
              onClick={() => setOpen((v) => !v)}
            >
              Steps
            </Button>
          </div>
          {open && (
            <ul className="flex flex-col gap-2">
              {b.products.flatMap((g) =>
                g.steps.map((st) => (
                  <li key={`${g.id}-${st.kind}`} className="flex min-h-[40px] items-center gap-4">
                    <span className={cn(T.meta, "min-w-0 flex-1 truncate text-text-primary")}>
                      {b.products.length > 1 ? `${g.name} · ` : ""}
                      {ITEM_LABELS[st.kind as BuildItemKind] ?? st.kind}
                    </span>
                    {st.status === "failed" ? (
                      <Button hierarchy="secondary" size="sm" onClick={() => onRetryStep(g.id, st.kind)}>
                        Retry
                      </Button>
                    ) : (
                      <span className={cn(T.meta, st.status === "ready" ? "text-text-success" : "text-text-tertiary")}>
                        {st.status === "ready" ? "Ready" : st.status === "building" ? `${Math.round(st.progress)}%` : "Waiting"}
                      </span>
                    )}
                  </li>
                )),
              )}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function Thumb({ url }: { url?: string }) {
  return (
    <span className="relative inline-flex size-[48px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
      {url ? <Image src={url} alt="" fill sizes="48px" className="object-cover" unoptimized /> : <Icon icon={AiMagicIcon} size={20} />}
    </span>
  );
}
