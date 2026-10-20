"use client";

// History (/history): two lists, kept apart because they answer different
// questions.
//
//   Prompts — what you asked for: one row per concept chat, opening it.
//   Builds  — what was made: one row per build, opening onto its steps
//             (history-builds.tsx), live while it runs.
//
// Plans and credits live in Settings › Plan & pricing, not here.
//
// URL state survives refresh and share:
//   ?tab=builds   ?filter=progress|ready|attention   ?q=<search>
//   ?row=<buildId> (the open build)   ?page=2

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import {
  queuedAhead,
  rollupBuild,
  statusOf,
  useCreateHistory,
  type BuildItemKind,
  type BuildJob,
  type ChatSession,
} from "@/lib/create/history";
import { chatDeletePlan, projectBuildIds } from "@/lib/create/history-delete";
import {
  HISTORY_DESCRIPTION,
  HISTORY_FILTERS,
  buildEntries,
  filterCounts,
  narrowBuilds,
  narrowPrompts,
  parseFilter,
  parseTab,
  promptEntries,
  type BuildEntry,
  type HistoryFilter,
  type HistoryTab,
  type PromptEntry,
} from "@/lib/create/history-list";
import { useManualProjects } from "@/lib/manual/projects";
import { Icon } from "@/components/dashboard/icon";
import { ConfirmDialog, IconButton, SearchInput } from "@/components/ideeza";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { BuildsTable } from "./history-builds";
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

const TABS: { id: HistoryTab; label: string }[] = [
  { id: "prompts", label: "Prompts" },
  { id: "builds", label: "Builds" },
];

export function HistoryListPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = parseTab(params.get("tab"));
  const filter = parseFilter(params.get("filter"));
  const rawPage = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const openRow = params.get("row");
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

  const { prompts, buildRows } = React.useMemo(() => {
    const projectName = new Map(projects.map((p) => [p.id, p.name]));
    const attention = new Set(attentionBuilds.map((a) => a.job.id));
    const inputs = builds.map((b) => {
      const rollup = rollupBuild(b);
      return {
        id: b.id,
        chatId: b.chatId,
        title: b.title,
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
        products: [
          { id: "primary", name: b.title, items: b.items },
          ...(b.companions ?? []).map((c) => ({ id: c.id, name: c.name, items: c.items })),
        ],
      };
    });
    return {
      prompts: promptEntries(
        chats.map((c) => ({
          id: c.id,
          title: c.title,
          prompt: chatPrompt(c),
          imageUrl: chatImage(c),
          updatedAt: c.updatedAt,
        })),
        inputs,
      ),
      buildRows: buildEntries(inputs, new Set(chats.map((c) => c.id))),
    };
  }, [chats, builds, projects, attentionBuilds]);

  const setUrl = React.useCallback(
    (patch: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `/history?${qs}` : "/history", { scroll: false });
    },
    [params, router],
  );

  const setTab = (next: HistoryTab) => {
    setText("");
    setUrl({ tab: next === "builds" ? "builds" : null, filter: null, q: null, row: null, page: null });
  };
  const setFilter = (next: HistoryFilter) =>
    setUrl({ filter: next === "all" ? null : next, row: null, page: null });
  const setQuery = (next: string) => {
    setText(next);
    setUrl({ q: next.trim() ? next : null, row: null, page: null });
  };

  const counts = filterCounts(buildRows);
  const shownPrompts = narrowPrompts(prompts, text);
  const shownBuilds = narrowBuilds(buildRows, filter, text);
  const total = tab === "builds" ? shownBuilds.length : shownPrompts.length;
  const pageCount = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const page = Math.min(rawPage, pageCount);
  const slice = <T,>(list: T[]) => list.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);

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
  const retryRow = (row: BuildEntry) => {
    const job = buildById.get(row.id);
    if (job) retry(job);
  };
  const retryStep = (row: BuildEntry, productId: string, kind: string) => {
    const job = buildById.get(row.id);
    if (!job) return;
    if (statusOf(job) === "failed") retryBuild(job.id);
    else retryBuildItem(job.id, kind as BuildItemKind, productId);
  };

  const nothingYet = hydrated && prompts.length === 0 && buildRows.length === 0;

  return (
    <Page className="flex flex-col">
      <PageHeader title="History" description={HISTORY_DESCRIPTION} />

      {!hydrated ? (
        <p className="text-md text-text-tertiary">Loading…</p>
      ) : nothingYet ? (
        <EmptyState
          title="Nothing here yet"
          body="Describe a project from the Home prompt. Its chat lands in Prompts and its build in Builds, so you can come back to either any time."
        />
      ) : (
        <>
          <div role="tablist" aria-label="History sections" className="flex items-center gap-[8px] border-b border-solid border-border">
            {TABS.map((t) => {
              const on = tab === t.id;
              const n = t.id === "builds" ? buildRows.length : prompts.length;
              const dot = t.id === "builds" && counts.attention > 0;
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={on}
                  aria-label={dot ? `${t.label}, ${counts.attention} need${counts.attention === 1 ? "s" : ""} attention` : undefined}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative inline-flex h-[44px] items-center gap-[8px] border-b-2 border-solid px-[8px] text-md outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                    on
                      ? "border-violet-600 font-semibold text-text-primary"
                      : "border-transparent font-regular text-text-secondary hover:text-text-primary",
                  )}
                >
                  {t.label}
                  <span className="font-regular tabular-nums text-text-tertiary">{n}</span>
                  {dot && <span aria-hidden className="inline-flex size-[8px] rounded-full bg-bg-error" />}
                </button>
              );
            })}
          </div>

          <div className="mt-[16px] flex flex-col gap-[12px] [@container(min-width:880px)]:flex-row [@container(min-width:880px)]:items-center">
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
                placeholder={tab === "builds" ? "Search builds by prompt, product or project" : "Search prompts"}
                aria-label={tab === "builds" ? "Search builds" : "Search prompts"}
                enterKeyHint="search"
                className="text-[length:var(--font-size-md)]"
                containerClassName="min-h-[44px] [&>button]:before:-inset-[15.5px]"
              />
            </form>
            {tab === "builds" && (
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
            )}
          </div>

          {tab === "prompts" ? (
            prompts.length === 0 ? (
              <EmptyState title="No prompts yet" body="Describe a project from the Home prompt and its chat lands here, so you can return to it any time." />
            ) : shownPrompts.length === 0 ? (
              <NoMatch label={`No results for “${text.trim()}”`} action="Clear search" onClick={() => { setQuery(""); searchRef.current?.focus(); }} />
            ) : (
              <ul role="list" className="mt-[16px] flex flex-col gap-[8px]">
                {slice(shownPrompts).map((e) => (
                  <PromptRow
                    key={e.chatId}
                    entry={e}
                    onDelete={() => {
                      const chat = chats.find((c) => c.id === e.chatId);
                      if (chat) setDeleting(chat);
                    }}
                  />
                ))}
              </ul>
            )
          ) : buildRows.length === 0 ? (
            <EmptyState
              title="No builds yet"
              body="When you confirm a concept with “Use this”, its build (3D model, PCB, firmware, wiring and parts) runs here."
            />
          ) : shownBuilds.length === 0 ? (
            text.trim() ? (
              <NoMatch label={`No results for “${text.trim()}”`} action="Clear search" onClick={() => { setQuery(""); searchRef.current?.focus(); }} />
            ) : (
              <NoMatch label={NOTHING[filter]} action="Show all" onClick={() => setFilter("all")} />
            )
          ) : (
            <BuildsTable
              rows={slice(shownBuilds)}
              expandedId={openRow}
              onToggle={(id) => setUrl({ row: openRow === id ? null : id })}
              onRetry={retryRow}
              onRetryStep={retryStep}
            />
          )}

          <div className="mt-[16px]">
            <Pagination page={page} pageCount={pageCount} onPage={(p) => setUrl({ page: p > 1 ? String(p) : null, row: null })} />
          </div>
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

// ─────────────────────────── a prompt row ──────────────────────────

// Below a 640 px page the row folds to two lines. The name's link covers
// the card; the project link and Delete sit above it.
function PromptRow({ entry: e, onDelete }: { entry: PromptEntry; onDelete: () => void }) {
  const dates = useDates();
  return (
    <li className="relative grid grid-cols-[64px_minmax(0,1fr)_36px] items-center gap-x-[12px] gap-y-[6px] rounded-xl border border-solid border-border bg-bg-surface p-[12px] transition-colors duration-fast hover:border-border-strong [@container(min-width:640px)]:grid-cols-[84px_minmax(0,1fr)_auto_36px] [@container(min-width:640px)]:gap-x-[16px] [@container(min-width:640px)]:p-[16px]">
      <div
        aria-hidden
        className="row-span-2 h-[48px] w-[64px] self-start overflow-hidden rounded-lg bg-bg-surface-raised [@container(min-width:640px)]:row-span-1 [@container(min-width:640px)]:h-[64px] [@container(min-width:640px)]:w-[84px] [@container(min-width:640px)]:self-center"
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
        <p className="mt-[2px] truncate text-sm text-text-tertiary" title={e.prompt}>
          {e.projectId && e.projectName ? (
            <>
              In{" "}
              <Link
                href={`/projects/${e.projectId}`}
                className="relative z-[1] rounded-sm font-semibold text-text-brand no-underline outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {e.projectName}
              </Link>
              {" · "}
            </>
          ) : null}
          {e.prompt}
        </p>
      </div>

      <p className="col-start-2 row-start-2 flex gap-[12px] text-sm tabular-nums text-text-tertiary [@container(min-width:640px)]:col-start-3 [@container(min-width:640px)]:row-start-1">
        <span>{e.builds ? `${e.builds} build${e.builds === 1 ? "" : "s"}` : "No build yet"}</span>
        <span>{dates.stamp(e.ts)}</span>
      </p>

      <IconButton
        size="md"
        aria-label={`Delete “${e.name}”`}
        icon={<Icon icon={Delete02Icon} size={18} />}
        onClick={onDelete}
        className="relative z-[1] col-start-3 row-span-2 row-start-1 [@container(min-width:640px)]:col-start-4 [@container(min-width:640px)]:row-span-1 [@media(pointer:coarse)]:size-[var(--touch-min)]"
      />
    </li>
  );
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={EMPTY_BOX}>
      <p className="text-md font-semibold text-text-primary">{title}</p>
      <p className="mx-auto mt-[8px] max-w-[420px] text-sm text-text-secondary">{body}</p>
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
  all: "No builds yet",
  progress: "Nothing is building right now",
  ready: "Nothing is ready yet",
  attention: "Nothing needs your attention",
};

function NoMatch({ label, action, onClick }: { label: string; action: string; onClick: () => void }) {
  return (
    <div className={EMPTY_BOX}>
      <p className="text-md font-semibold text-text-primary">{label}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-[16px] inline-flex h-[36px] items-center rounded-lg border border-solid border-border bg-bg-surface px-[16px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {action}
      </button>
    </div>
  );
}
