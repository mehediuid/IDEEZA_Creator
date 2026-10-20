// The two lists of History (/history).
//
//   Prompts — one row per concept chat, newest first: what the maker asked
//             for, the project its newest build went to, how many builds.
//   Builds  — one row per build job, newest first, with each product's five
//             artifacts as steps (status, progress, how long each took).
//             The chat opens on its newest build, so an earlier build of the
//             same chat is `older`; a build whose chat was deleted (a project
//             kept it) opens /build/<id>.
//
// Pure, relative imports only (node:test loads it). The caller reads each build's
// rollup, attention and queue place off the history store.

import { itemDuration, type TimedItem } from "./item-times";

export const HISTORY_DESCRIPTION = "Your prompts and the builds made from them";

export type HistoryTab = "prompts" | "builds";

export type BuildStatusLabel = "waiting" | "building" | "ready" | "failed" | "paused";

export type HistoryFilter = "all" | "progress" | "ready" | "attention";

export const HISTORY_FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "progress", label: "In progress" },
  { id: "ready", label: "Ready" },
  { id: "attention", label: "Needs attention" },
];

// ───────────────────────────── prompts ─────────────────────────────

export type HistoryChatInput = {
  id: string;
  title: string;
  /** What the maker first typed. */
  prompt: string;
  /** The newest concept image the chat drew. */
  imageUrl?: string;
  updatedAt: number;
};

export type PromptEntry = {
  chatId: string;
  name: string;
  prompt: string;
  imageUrl?: string;
  projectId?: string;
  projectName?: string;
  builds: number;
  ts: number;
  href: string;
};

// ───────────────────────────── builds ──────────────────────────────

export type HistoryItemInput = TimedItem & { progress: number };

export type HistoryBuildInput = {
  id: string;
  chatId: string;
  title: string;
  prompt: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  endedAt?: number;
  /** Stored as queued: waiting for the worker, or parked. */
  queued: boolean;
  /** Parked for credits or the monthly limit. */
  blocked: boolean;
  rollup: "building" | "ready" | "partial" | "failed";
  progress: number;
  projectId?: string;
  projectName?: string;
  attention: boolean;
  /** Queued builds ahead of this one. */
  ahead: number;
  products: { id: string; name: string; items: HistoryItemInput[] }[];
};

export type BuildStep = {
  kind: string;
  status: "pending" | "building" | "ready" | "failed";
  progress: number;
  /** How long it took, once it finished; absent on builds stored before the stamps. */
  ms?: number;
};

export type BuildStepGroup = { id: string; name: string; steps: BuildStep[]; done: number; failed: number };

export type BuildEntry = {
  id: string;
  chatId: string;
  name: string;
  prompt: string;
  imageUrl?: string;
  projectId?: string;
  projectName?: string;
  status: BuildStatusLabel;
  /** 0–100 while building. */
  progress?: number;
  attention: boolean;
  /** A newer build of the same chat replaced this one in the chat. */
  older: boolean;
  ahead: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  products: BuildStepGroup[];
  href: string;
};

function statusOf(b: HistoryBuildInput): BuildStatusLabel {
  if (b.blocked) return "paused";
  if (b.queued) return "waiting";
  if (b.rollup === "failed" || b.rollup === "partial") return "failed";
  return b.rollup === "building" ? "building" : "ready";
}

function newestByChat(builds: readonly HistoryBuildInput[]): Map<string, HistoryBuildInput> {
  const newest = new Map<string, HistoryBuildInput>();
  for (const b of builds) {
    const held = newest.get(b.chatId);
    if (!held || b.createdAt > held.createdAt) newest.set(b.chatId, b);
  }
  return newest;
}

export function promptEntries(
  chats: readonly HistoryChatInput[],
  builds: readonly HistoryBuildInput[],
): PromptEntry[] {
  const newest = newestByChat(builds);
  return chats
    .map((c) => {
      const b = newest.get(c.id);
      return {
        chatId: c.id,
        name: c.title,
        prompt: c.prompt,
        imageUrl: c.imageUrl || b?.imageUrl,
        projectId: b?.projectId,
        projectName: b?.projectName,
        builds: builds.filter((x) => x.chatId === c.id).length,
        ts: Math.max(c.updatedAt, b?.updatedAt ?? 0),
        href: `/chat/${c.id}`,
      };
    })
    .sort((a, b) => b.ts - a.ts);
}

export function buildEntries(builds: readonly HistoryBuildInput[], chatIds: ReadonlySet<string>): BuildEntry[] {
  const newest = newestByChat(builds);
  return builds
    .map((b) => {
      const status = statusOf(b);
      const hasChat = chatIds.has(b.chatId);
      const older = hasChat && newest.get(b.chatId)?.id !== b.id;
      return {
        id: b.id,
        chatId: b.chatId,
        name: b.title,
        prompt: b.prompt,
        imageUrl: b.imageUrl,
        projectId: b.projectId,
        projectName: b.projectName,
        status,
        progress: status === "building" ? Math.round(b.progress) : undefined,
        attention: !older && b.attention,
        older,
        ahead: status === "waiting" ? b.ahead : 0,
        createdAt: b.createdAt,
        startedAt: b.startedAt,
        endedAt: b.endedAt,
        products: b.products.map((p) => {
          const steps: BuildStep[] = p.items
            .filter((it) => it.status !== "skipped")
            .map((it) => ({
              kind: it.kind,
              status: it.status as BuildStep["status"],
              progress: Math.round(it.progress),
              ms: itemDuration(it, b.startedAt),
            }));
          return {
            id: p.id,
            name: p.name,
            steps,
            done: steps.filter((s) => s.status === "ready").length,
            failed: steps.filter((s) => s.status === "failed").length,
          };
        }),
        href: hasChat ? `/chat/${b.chatId}` : `/build/${b.id}`,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ───────────────────────── filter and search ───────────────────────

function inFilter(e: BuildEntry, f: HistoryFilter): boolean {
  if (f === "progress") return e.status === "waiting" || e.status === "building";
  if (f === "ready") return e.status === "ready";
  if (f === "attention") return e.attention;
  return true;
}

export function filterCounts(entries: readonly BuildEntry[]): Record<HistoryFilter, number> {
  const out = { all: 0, progress: 0, ready: 0, attention: 0 };
  for (const e of entries) for (const f of HISTORY_FILTERS) if (inFilter(e, f.id)) out[f.id] += 1;
  return out;
}

const has = (text: string, q: string) => text.toLowerCase().includes(q);

export function narrowBuilds(entries: readonly BuildEntry[], filter: HistoryFilter, query: string): BuildEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter(
    (e) =>
      inFilter(e, filter) &&
      (!q || has([e.name, e.prompt, e.projectName ?? "", ...e.products.map((p) => p.name)].join("\n"), q)),
  );
}

export function narrowPrompts(entries: readonly PromptEntry[], query: string): PromptEntry[] {
  const q = query.trim().toLowerCase();
  return q ? entries.filter((e) => has(`${e.name}\n${e.prompt}\n${e.projectName ?? ""}`, q)) : [...entries];
}

export function parseFilter(raw: string | null): HistoryFilter {
  return HISTORY_FILTERS.some((f) => f.id === raw) ? (raw as HistoryFilter) : "all";
}

export function parseTab(raw: string | null): HistoryTab {
  return raw === "builds" ? "builds" : "prompts";
}

/** "42 seconds", "1 min 5 seconds", "3 min". */
export function durationLabel(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000));
  if (total < 60) return `${total} second${total === 1 ? "" : "s"}`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s ? `${m} min ${s} second${s === 1 ? "" : "s"}` : `${m} min`;
}
