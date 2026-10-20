"use client";

// History (/history): one list of everything the maker started, one row per
// concept chat, newest first. The build runs inside its chat and the chat
// opens on its newest build, so a row reads that build's status. Plans and
// credits live in Settings › Plan & billing, not here.
//
// URL state survives refresh and share:
//   ?filter=progress|ready|attention   ?q=<search>   ?page=2

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ActivityIcon,
  AlertCircleIcon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  Delete02Icon,
  Idea01Icon,
  PauseIcon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import {
  rollupBuild,
  statusOf,
  useCreateHistory,
  type BuildJob,
  type ChatSession,
} from "@/lib/create/history";
import { chatDeletePlan, projectBuildIds } from "@/lib/create/history-delete";
import {
  HISTORY_DESCRIPTION,
  HISTORY_FILTERS,
  filterCounts,
  historyEntries,
  narrowHistory,
  parseFilter,
  type HistoryEntry,
  type HistoryFilter,
} from "@/lib/create/history-list";
import { useManualProjects } from "@/lib/manual/projects";
import { Icon } from "@/components/dashboard/icon";
import { ConfirmDialog, IconButton, SearchInput } from "@/components/ideeza";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { Pagination, HISTORY_PAGE_SIZE } from "./pagination";

/** What the maker first typed: the setup question's prompt, else the first message. */
function chatPrompt(chat: ChatSession): string {
  for (const t of chat.turns) {
    if (t.role === "setup") return t.prompt;
    if (t.role === "user") return t.text;
  }
  return "";
}

function chatImage(chat: ChatSession): string | undefined {
  for (let i = chat.turns.length - 1; i >= 0; i--) {
    const t = chat.turns[i];
    if (t.role === "assistant" && t.status === "ready" && t.imageUrl) return t.imageUrl;
  }
  return undefined;
}

export function HistoryListPage() {
  const router = useRouter();
  const params = useSearchParams();
  const filter = parseFilter(params.get("filter"));
  const rawPage = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const [text, setText] = React.useState(() => params.get("q") ?? "");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const {
    hydrated,
    chats,
    builds,
    attentionBuilds,
    retryBuild,
    retryBuildItem,
    deleteChat,
  } = useCreateHistory();
  const [deleting, setDeleting] = React.useState<ChatSession | null>(null);
  const { projects } = useManualProjects();

  const entries = React.useMemo(() => {
    const projectName = new Map(projects.map((p) => [p.id, p.name]));
    const attention = new Set(attentionBuilds.map((a) => a.job.id));
    return historyEntries(
      chats.map((c) => ({
        id: c.id,
        title: c.title,
        prompt: chatPrompt(c),
        imageUrl: chatImage(c),
        updatedAt: c.updatedAt,
      })),
      builds.map((b) => {
        const rollup = rollupBuild(b);
        return {
          id: b.id,
          chatId: b.chatId,
          title: b.title,
          prompt: b.conceptPrompt,
          imageUrl: b.conceptImageUrl,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          queued: b.status === "queued",
          blocked: !!b.blocked,
          rollup: rollup.status,
          progress: rollup.progress,
          projectId: b.projectId,
          projectName: b.projectId ? projectName.get(b.projectId) : undefined,
          attention: attention.has(b.id),
        };
      }),
    );
  }, [chats, builds, projects, attentionBuilds]);

  const setUrl = React.useCallback(
    (patch: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) sp.delete(k);
        else sp.set(k, v);
      }
      // The two tabs and the expanded row are gone; their links land on All.
      sp.delete("tab");
      sp.delete("row");
      const qs = sp.toString();
      router.replace(qs ? `/history?${qs}` : "/history", { scroll: false });
    },
    [params, router],
  );

  const setFilter = (next: HistoryFilter) =>
    setUrl({ filter: next === "all" ? null : next, page: null });
  const setQuery = (next: string) => {
    setText(next);
    setUrl({ q: next.trim() ? next : null, page: null });
  };

  const counts = filterCounts(entries);
  const shown = narrowHistory(entries, filter, text);
  const pageCount = Math.max(1, Math.ceil(shown.length / HISTORY_PAGE_SIZE));
  const page = Math.min(rawPage, pageCount);
  const rows = shown.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);

  const buildById = React.useMemo(() => new Map(builds.map((b) => [b.id, b])), [builds]);
  // The same retry the build's own card offers: a build a system error
  // stopped starts over; otherwise only the pieces that failed run again.
  const retry = (job: BuildJob) => {
    if (statusOf(job) === "failed") {
      retryBuild(job.id);
      return;
    }
    for (const it of job.items) if (it.status === "failed") retryBuildItem(job.id, it.kind);
    for (const c of job.companions ?? [])
      for (const it of c.items) if (it.status === "failed") retryBuildItem(job.id, it.kind, c.id);
  };

  return (
    <Page className="flex flex-col">
      <PageHeader title="History" description={HISTORY_DESCRIPTION} />

      {!hydrated ? (
        <p className="text-md text-text-tertiary">Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-col gap-[12px] [@container(min-width:880px)]:flex-row [@container(min-width:880px)]:items-center">
            <form
              role="search"
              onSubmit={(e) => e.preventDefault()}
              className="[@container(min-width:880px)]:max-w-[420px] [@container(min-width:880px)]:flex-1"
            >
              <SearchInput
                ref={searchRef}
                value={text}
                onValueChange={setQuery}
                onClear={() => searchRef.current?.focus()}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && text) {
                    e.preventDefault();
                    setQuery("");
                  }
                }}
                placeholder="Search by name, prompt or project"
                aria-label="Search history"
                enterKeyHint="search"
                className="text-[length:var(--font-size-md)]"
                containerClassName="min-h-[44px] [&>button]:before:-inset-[15.5px]"
              />
            </form>
            <div role="group" aria-label="Show" className="flex flex-wrap gap-[8px]">
              {HISTORY_FILTERS.map((f) => {
                const on = filter === f.id;
                const dot = f.id === "attention" && counts.attention > 0;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "inline-flex min-h-[44px] items-center gap-[8px] rounded-[var(--radius-lg)] border border-solid px-[var(--spacing-6)] text-md font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none",
                      on
                        ? "border-transparent bg-bg-brand-subtle text-text-brand"
                        : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
                    )}
                  >
                    {dot && <span aria-hidden className="inline-flex size-[8px] rounded-full bg-bg-error" />}
                    {f.label}
                    <span className="font-medium tabular-nums">{counts[f.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {rows.length === 0 ? (
            <NoMatch
              query={text.trim()}
              filter={filter}
              onClear={() => {
                if (text.trim()) {
                  setQuery("");
                  searchRef.current?.focus();
                } else {
                  setFilter("all");
                }
              }}
            />
          ) : (
            <>
              <ul role="list" className="mt-[16px] flex flex-col gap-[8px]">
                {rows.map((e) => (
                  <HistoryRow
                    key={e.key}
                    entry={e}
                    onRetry={() => {
                      const job = e.buildId ? buildById.get(e.buildId) : undefined;
                      if (job) retry(job);
                    }}
                    onDelete={() => {
                      const chat = chats.find((c) => c.id === e.chatId);
                      if (chat) setDeleting(chat);
                    }}
                  />
                ))}
              </ul>
              <div className="mt-[16px]">
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  onPage={(p) => setUrl({ page: p > 1 ? String(p) : null })}
                />
              </div>
            </>
          )}
        </>
      )}

      <DeleteChatDialog
        chat={deleting}
        plan={deleting ? chatDeletePlan(deleting.id, builds, projectBuildIds(projects)) : null}
        onCancel={() => setDeleting(null)}
        onDelete={(chat, drop) => {
          deleteChat(chat.id, drop);
          setDeleting(null);
        }}
      />
    </Page>
  );
}

// ───────────────────────────── a row ──────────────────────────────

// Below an 800 px page the row folds to two lines: the name and its prompt,
// then the status, the date and Try again. Wider, they sit on one line with
// the status and date in fixed columns, Try again before them. The name's
// link covers the card; the project link, Try again and Delete sit above it.
function HistoryRow({
  entry: e,
  onRetry,
  onDelete,
}: {
  entry: HistoryEntry;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const dates = useDates();
  return (
    <li className="relative grid grid-cols-[64px_minmax(0,1fr)_36px] items-center gap-x-[12px] gap-y-[6px] rounded-xl border border-solid border-border bg-bg-surface p-[12px] transition-colors duration-fast hover:border-border-strong [@container(min-width:800px)]:grid-cols-[84px_minmax(0,1fr)_auto_36px] [@container(min-width:800px)]:gap-x-[16px] [@container(min-width:800px)]:p-[16px]">
      <div
        aria-hidden
        className="row-span-2 h-[48px] w-[64px] self-start overflow-hidden rounded-lg bg-bg-surface-raised [@container(min-width:800px)]:row-span-1 [@container(min-width:800px)]:h-[64px] [@container(min-width:800px)]:w-[84px] [@container(min-width:800px)]:self-center"
      >
        {e.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="col-start-2 row-start-1 min-w-0">
        <Link
          href={e.href}
          className="block truncate rounded-sm text-md font-semibold text-text-primary no-underline outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-border-focus"
        >
          {e.name}
        </Link>
        <p className="mt-[2px] truncate text-sm text-text-tertiary" title={e.projectName ? undefined : e.prompt}>
          {e.projectId && e.projectName ? (
            <>
              In{" "}
              <Link
                href={`/projects/${e.projectId}`}
                className="relative z-[1] rounded-sm font-semibold text-text-brand no-underline outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {e.projectName}
              </Link>
            </>
          ) : (
            e.prompt
          )}
        </p>
      </div>

      <div className="col-start-2 row-start-2 flex flex-wrap items-center gap-[8px] [@container(min-width:800px)]:col-start-3 [@container(min-width:800px)]:row-start-1 [@container(min-width:800px)]:flex-nowrap [@container(min-width:800px)]:gap-[16px]">
        <span className="[@container(min-width:800px)]:w-[128px]">
          <StatusPill entry={e} />
        </span>
        <span className="text-sm tabular-nums text-text-tertiary [@container(min-width:800px)]:w-[80px] [@container(min-width:800px)]:text-right">
          {dates.stamp(e.ts)}
        </span>
        {e.status === "failed" && (
          <button
            type="button"
            onClick={onRetry}
            className="relative z-[1] inline-flex h-[36px] w-fit items-center gap-[8px] rounded-lg bg-bg-error-subtle px-[14px] text-sm font-semibold text-text-error outline-none transition-colors duration-fast hover:bg-[color-mix(in_srgb,var(--color-bg-error-subtle)_72%,var(--color-bg-surface))] focus-visible:ring-2 focus-visible:ring-border-focus [@container(min-width:800px)]:order-first"
          >
            <Icon icon={Refresh01Icon} size={16} />
            Try again
          </button>
        )}
      </div>

      {e.deletable && (
        <IconButton
          size="md"
          aria-label={`Delete “${e.name}”`}
          icon={<Icon icon={Delete02Icon} size={18} />}
          onClick={onDelete}
          className="relative z-[1] col-start-3 row-span-2 row-start-1 [@container(min-width:800px)]:col-start-4 [@container(min-width:800px)]:row-span-1 [@media(pointer:coarse)]:size-[var(--touch-min)]"
        />
      )}
    </li>
  );
}

const PILL = "inline-flex h-[28px] items-center gap-[6px] rounded-full px-[12px] text-2xs font-bold uppercase tracking-wider tabular-nums";

function StatusPill({ entry: e }: { entry: HistoryEntry }) {
  switch (e.status) {
    case "ready":
      return <span className={cn(PILL, "bg-bg-success-subtle text-text-success")}><Icon icon={CheckmarkBadge01Icon} size={14} />Ready</span>;
    case "failed":
      return <span className={cn(PILL, "bg-bg-error-subtle text-text-error")}><Icon icon={AlertCircleIcon} size={14} />Failed</span>;
    case "paused":
      return <span className={cn(PILL, "bg-bg-warning-subtle text-text-warning")}><Icon icon={PauseIcon} size={14} />Paused</span>;
    case "waiting":
      return <span className={cn(PILL, "bg-bg-brand-subtle text-text-brand")}><Icon icon={Clock01Icon} size={14} />Waiting</span>;
    case "building":
      return <span className={cn(PILL, "bg-bg-brand-subtle text-text-brand")}><Icon icon={ActivityIcon} size={14} />Building {e.progress ?? 0}%</span>;
    default:
      return <span className={cn(PILL, "bg-bg-subtle text-text-secondary")}><Icon icon={Idea01Icon} size={14} />Concept</span>;
  }
}

// ───────────────────────── delete a chat ───────────────────────────

/** Deleting a chat: what goes with it, what a project keeps, and what IDEEZA's server still holds. */
function DeleteChatDialog({
  chat,
  plan,
  onCancel,
  onDelete,
}: {
  chat: ChatSession | null;
  plan: ReturnType<typeof chatDeletePlan> | null;
  onCancel: () => void;
  onDelete: (chat: ChatSession, drop: string[]) => void;
}) {
  const n = plan?.drop.length ?? 0;
  const kept = plan?.kept ?? 0;
  return (
    <ConfirmDialog
      open={!!chat && !!plan}
      title={chat ? `Delete “${chat.title}”?` : ""}
      confirmLabel="Delete chat"
      confirmUnavailable={!!plan?.busy}
      onCancel={onCancel}
      onConfirm={() => {
        if (chat && plan && !plan.busy) onDelete(chat, plan.drop);
      }}
    >
      {plan?.busy ? (
        <p className="m-0">A build from this chat is still waiting or building. You can delete the chat once it finishes.</p>
      ) : (
        <p className="m-0">
          Its prompts and concept images are removed from this browser
          {n ? `, and so ${n === 1 ? "is the build" : `are the ${n} builds`} started from it` : ""}.
          {kept ? ` ${kept === 1 ? "The build a project holds stays" : `The ${kept} builds projects hold stay`} with ${kept === 1 ? "that project" : "those projects"}.` : ""}{" "}
          IDEEZA&apos;s server keeps a copy of each concept image with its prompt, and there&apos;s no way to delete those yet.
        </p>
      )}
    </ConfirmDialog>
  );
}

// ───────────────────────── empty states ────────────────────────────

const EMPTY_BOX = "mt-[16px] rounded-2xl border border-solid border-border bg-bg-surface px-[24px] py-[48px] text-center";

function EmptyState() {
  return (
    <div className={EMPTY_BOX}>
      <p className="text-md font-semibold text-text-primary">Nothing here yet</p>
      <p className="mx-auto mt-[8px] max-w-[420px] text-sm text-text-secondary">
        Describe a project from the Home prompt. Its chat and its build land here, so you can come back to it any time.
      </p>
      <Link
        href="/"
        className="mt-[16px] inline-flex h-[36px] items-center rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Open Home
      </Link>
    </div>
  );
}

const NOTHING: Record<HistoryFilter, string> = {
  all: "Nothing here yet",
  progress: "Nothing is building right now",
  ready: "Nothing is ready yet",
  attention: "Nothing needs your attention",
};

function NoMatch({ query, filter, onClear }: { query: string; filter: HistoryFilter; onClear: () => void }) {
  return (
    <div className={EMPTY_BOX}>
      <p className="text-md font-semibold text-text-primary">
        {query ? `No results for “${query}”` : NOTHING[filter]}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-[16px] inline-flex h-[36px] items-center rounded-lg border border-solid border-border bg-bg-surface px-[16px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {query ? "Clear search" : "Show all"}
      </button>
    </div>
  );
}
