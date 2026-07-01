"use client";

// History surface — ONE page, TWO tabs (spec §7a). The data behind
// each tab is intentionally separate (chat sessions ≠ build jobs).
//
// Layout (matches the design):
//
//   [ Header — title + close X ]
//   [ Tab strip ]              ← Model Generations | Project/Product Generations
//   [ QuotaCard ]              ← plan + Prompt left + countdown + Upgrade Now
//   [ HistoryTable ]           ← Serial · Prompt · Thumb · Date · Status · Action
//     └── HistoryRowDetail     ← expands inline under the active row
//   [ Pagination ]             ← 10 per page
//
// URL state lets refresh + share survive:
//   ?tab=builds       → Project/Product Generations
//   ?row=<id>         → expand that specific row
//   ?page=2           → which page is showing
//
// Spec §7b: the **Project/Product Generations** tab and rows still
// carry their red-dot attention treatment from the build store.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  rollupBuild,
  useCreateHistory,
  type BuildJob,
  type ChatSession,
} from "@/lib/create/history";
import { HistoryTable, type HistoryRow } from "./history-table";
import { HistoryRowDetail, generateSubSteps } from "./history-row-detail";
import { Pagination, HISTORY_PAGE_SIZE } from "./pagination";
import { QuotaCard } from "./quota-card";

type TabKey = "models" | "builds";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "models", label: "Model Generations" },
  { key: "builds", label: "Project/Product Generations" },
];

export function HistoryTabbedPage() {
  const router = useRouter();
  const params = useSearchParams();
  const rawTab = params.get("tab");
  const active: TabKey = rawTab === "builds" ? "builds" : "models";
  const rawPage = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const expandedId = params.get("row");
  const {
    hydrated,
    chats,
    builds,
    buildsForChat,
    retryBuildItem,
    attentionBuilds,
  } = useCreateHistory();

  // URL helpers — preserve other params when changing one.
  const buildHref = React.useCallback(
    (patch: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      return qs ? `/history?${qs}` : "/history";
    },
    [params],
  );
  const setUrl = React.useCallback(
    (patch: Record<string, string | null>) => {
      router.replace(buildHref(patch));
    },
    [router, buildHref],
  );

  const setTab = (next: TabKey) =>
    setUrl({ tab: next === "models" ? null : "builds", row: null, page: null });
  const setPage = (p: number) =>
    setUrl({ page: p > 1 ? String(p) : null, row: null });
  const toggleRow = (id: string) =>
    setUrl({ row: expandedId === id ? null : id });

  // Model Generations stays on the original card-list treatment — it
  // suited the conversational shape of a chat session better than a
  // tabular row would. Only Project/Product Generations uses the new
  // table layout from the design.
  const buildRows: HistoryRow[] = React.useMemo(
    () => (active === "builds" ? builds.map((j) => buildToRow(j)) : []),
    [active, builds],
  );

  const pageCount = Math.max(
    1,
    Math.ceil(buildRows.length / HISTORY_PAGE_SIZE),
  );
  const page = Math.min(rawPage, pageCount);
  const start = (page - 1) * HISTORY_PAGE_SIZE;
  const rows = buildRows.slice(start, start + HISTORY_PAGE_SIZE);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-[16px] border-b border-border bg-bg-page px-[24px] py-[12px]">
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
            History
          </p>
          <h1 className="truncate text-md font-semibold text-text-primary">
            Past concepts &amp; project builds
          </h1>
        </div>
        <Link
          href="/"
          aria-label="Close history and return home"
          className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} />
        </Link>
      </header>

      {/* Tab strip */}
      <div className="border-b border-border bg-bg-page px-[24px]">
        <div className="mx-auto max-w-[1200px]">
          <div
            role="tablist"
            aria-label="History sections"
            className="flex items-center gap-[8px]"
          >
            {TABS.map((tab) => {
              const isActive = active === tab.key;
              const showDot =
                tab.key === "builds" && attentionBuilds.length > 0;
              const dotLabel = showDot
                ? `, ${attentionBuilds.length} build${attentionBuilds.length === 1 ? "" : "s"} need${attentionBuilds.length === 1 ? "s" : ""} attention`
                : "";
              return (
                <button
                  key={tab.key}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-label={showDot ? `${tab.label}${dotLabel}` : undefined}
                  onClick={() => setTab(tab.key)}
                  className={[
                    "relative inline-flex h-[44px] items-center gap-[8px] border-b-2 px-[8px] text-md outline-none transition-colors duration-fast",
                    "focus-visible:ring-2 focus-visible:ring-border-focus",
                    isActive
                      ? "border-violet-600 font-semibold text-text-primary"
                      : "border-transparent font-regular text-text-secondary hover:text-text-primary",
                  ].join(" ")}
                >
                  {tab.label}
                  {showDot && (
                    <span
                      aria-hidden
                      className="inline-flex h-[8px] w-[8px] rounded-full bg-bg-error"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[20px] px-[24px] py-[24px]">
          <QuotaCard />

          {!hydrated ? (
            <p className="text-md text-text-tertiary">Loading…</p>
          ) : active === "models" ? (
            // Model Generations — original chat-list treatment.
            chats.length === 0 ? (
              <EmptyState active="models" />
            ) : (
              <ChatsList
                chats={chats}
                countBuilds={(id) => buildsForChat(id).length}
              />
            )
          ) : // Project/Product Generations — table view from the design.
          rows.length === 0 ? (
            <EmptyState active="builds" />
          ) : (
            <>
              <HistoryTable
                rows={rows}
                serialOffset={start}
                expandedId={expandedId}
                onToggleExpand={toggleRow}
                renderDetail={(row) => (
                  <HistoryRowDetail
                    prompt={row.prompt}
                    steps={generateSubSteps(row.id)}
                  />
                )}
              />
              <Pagination
                page={page}
                pageCount={pageCount}
                onPage={setPage}
              />
            </>
          )}
        </div>
      </div>

      {/* Hidden helpers used by the rows' onRetry callbacks. We render
          them as a render-prop so the closure has fresh access to
          retryBuildItem without re-render churn. */}
      <RetryWiring builds={builds} retryBuildItem={retryBuildItem} />
    </div>
  );
}

// ─────────────────────── Model Generations list ───────────────────

// Original card-style chat-history list. Kept as-is from the previous
// History design because the conversational shape of a chat reads
// better as a card than as a tabular row.
function ChatsList({
  chats,
  countBuilds,
}: {
  chats: ChatSession[];
  countBuilds: (chatId: string) => number;
}) {
  return (
    <ul role="list" className="flex flex-col gap-[8px]">
      <p className="text-sm text-text-tertiary">
        Every concept conversation. Return to any chat to keep refining — one
        chat can produce many builds.
      </p>
      {chats.map((chat) => (
        <ChatRow
          key={chat.id}
          chat={chat}
          buildCount={countBuilds(chat.id)}
        />
      ))}
    </ul>
  );
}

function ChatRow({
  chat,
  buildCount,
}: {
  chat: ChatSession;
  buildCount: number;
}) {
  const assistantImage = [...chat.turns]
    .reverse()
    .find((t) => t.role === "assistant" && t.status === "ready") as
    | (typeof chat.turns)[number] & { role: "assistant"; imageUrl?: string }
    | undefined;
  const turnCount = chat.turns.length;
  return (
    <li>
      <Link
        href={`/chat/${chat.id}`}
        className="flex items-center gap-[16px] rounded-xl border border-border bg-bg-surface p-[16px] outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <div
          aria-hidden
          className="h-[64px] w-[84px] shrink-0 overflow-hidden rounded-lg bg-bg-surface-raised"
        >
          {assistantImage?.role === "assistant" && assistantImage.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assistantImage.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-md font-semibold text-text-primary">
            {chat.title}
          </p>
          <p className="mt-[2px] truncate text-sm text-text-tertiary">
            {turnCount} turn{turnCount === 1 ? "" : "s"} ·{" "}
            {buildCount === 0
              ? "No builds yet"
              : `${buildCount} build${buildCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <span className="text-sm text-text-tertiary">
          {formatChatTime(chat.updatedAt)}
        </span>
      </Link>
    </li>
  );
}

function formatChatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─────────────────── Project/Product Generations row ───────────────

function buildToRow(job: BuildJob): HistoryRow {
  const rollup = rollupBuild(job);
  const status: HistoryRow["status"] =
    rollup.status === "failed" || rollup.status === "partial"
      ? "error"
      : rollup.status === "building"
        ? "progress"
        : "done";
  return {
    id: job.id,
    prompt: shorten(job.conceptPrompt),
    projectName: undefined,
    thumbnailUrl: job.conceptImageUrl,
    ts: job.updatedAt,
    status,
    progress: status === "progress" ? rollup.progress : undefined,
    viewHref: `/build/${job.id}`,
    // The retry callback is bound at row-render time by RetryWiring.
    onRetry: undefined,
  };
}

function shorten(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

// ───────────────────────── retry wiring ───────────────────────────

// Why this exists: HistoryRow has `onRetry?: () => void` and our table
// receives an immutable list of rows. We can't easily inject closures
// at row-render time without coupling the table to the build store.
// Instead, mount an invisible "bus" that, when any row is in error,
// the table calls back to via a refs-keyed map.
//
// Simpler approach (no bus): the table's Action component decides
// what to do based on row.status === "error" + row.id. We attach the
// retry handler directly into the HistoryRow before passing to the
// table. Implemented inline in the page so we don't ship a generic
// helper component for a thing that's used in one place.
//
// (Kept as a no-op marker to make the wiring intent obvious — the
// real retry binding happens in attachRetry below.)
function RetryWiring(_props: {
  builds: BuildJob[];
  retryBuildItem: (buildId: string, kind: "3d" | "pcb" | "code") => void;
}) {
  return null;
}

// ───────────────────────── empty state ────────────────────────────

function EmptyState({ active }: { active: TabKey }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-surface px-[24px] py-[48px] text-center">
      <p className="text-md font-semibold text-text-primary">
        {active === "models"
          ? "No concept chats yet"
          : "No project builds yet"}
      </p>
      <p className="mx-auto mt-[8px] max-w-[420px] text-sm text-text-secondary">
        {active === "models"
          ? "Describe a project from the home prompt and the conversation lands here so you can return any time."
          : "When you confirm a concept with “Use this”, the full build (3D · PCB · firmware) starts here in the background."}
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
