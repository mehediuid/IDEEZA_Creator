// The rows of History (/history): one per concept chat, newest first. A build
// runs inside its chat and the chat opens on its newest build, so the row's
// status, picture and project are that build's. A build whose chat was
// deleted (a project kept it) still has a row, which opens /build/<id>.
// Pure; no imports (node:test loads it). The caller reads each build's
// rollup and attention off the history store.

export const HISTORY_DESCRIPTION = "Ideas and builds you started, newest first";

export type HistoryStatus = "concept" | "waiting" | "building" | "ready" | "failed" | "paused";

export type HistoryFilter = "all" | "progress" | "ready" | "attention";

export const HISTORY_FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "progress", label: "In progress" },
  { id: "ready", label: "Ready" },
  { id: "attention", label: "Needs attention" },
];

export type HistoryChatInput = {
  id: string;
  title: string;
  /** What the maker first typed. */
  prompt: string;
  /** The newest concept image the chat drew. */
  imageUrl?: string;
  updatedAt: number;
};

export type HistoryBuildInput = {
  id: string;
  chatId: string;
  title: string;
  prompt: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
  /** Stored as queued: waiting for the worker, or parked. */
  queued: boolean;
  /** Parked for credits or the monthly limit. */
  blocked: boolean;
  rollup: "building" | "ready" | "partial" | "failed";
  progress: number;
  projectId?: string;
  projectName?: string;
  attention: boolean;
};

export type HistoryEntry = {
  key: string;
  chatId?: string;
  buildId?: string;
  name: string;
  prompt: string;
  imageUrl?: string;
  projectId?: string;
  projectName?: string;
  status: HistoryStatus;
  /** 0–100 while building. */
  progress?: number;
  attention: boolean;
  ts: number;
  href: string;
  /** Only a chat can be deleted from here; a project holds an orphan build. */
  deletable: boolean;
};

function statusOf(b: HistoryBuildInput): HistoryStatus {
  if (b.blocked) return "paused";
  if (b.queued) return "waiting";
  if (b.rollup === "failed" || b.rollup === "partial") return "failed";
  return b.rollup === "building" ? "building" : "ready";
}

function fromBuild(b: HistoryBuildInput) {
  const status = statusOf(b);
  return {
    buildId: b.id,
    projectId: b.projectId,
    projectName: b.projectName,
    status,
    progress: status === "building" ? Math.round(b.progress) : undefined,
    attention: b.attention,
  };
}

export function historyEntries(
  chats: readonly HistoryChatInput[],
  builds: readonly HistoryBuildInput[],
): HistoryEntry[] {
  const newest = new Map<string, HistoryBuildInput>();
  for (const b of builds) {
    const held = newest.get(b.chatId);
    if (!held || b.createdAt > held.createdAt) newest.set(b.chatId, b);
  }
  const chatIds = new Set(chats.map((c) => c.id));
  const rows: HistoryEntry[] = chats.map((c) => {
    const b = newest.get(c.id);
    return {
      key: `chat:${c.id}`,
      chatId: c.id,
      name: c.title,
      prompt: c.prompt,
      imageUrl: b?.imageUrl || c.imageUrl,
      ...(b ? fromBuild(b) : { status: "concept" as const, attention: false }),
      ts: Math.max(c.updatedAt, b?.updatedAt ?? 0),
      href: `/chat/${c.id}`,
      deletable: true,
    };
  });
  for (const b of builds) {
    if (chatIds.has(b.chatId)) continue;
    rows.push({
      key: `build:${b.id}`,
      name: b.title,
      prompt: b.prompt,
      imageUrl: b.imageUrl,
      ...fromBuild(b),
      ts: b.updatedAt,
      href: `/build/${b.id}`,
      deletable: false,
    });
  }
  return rows.sort((a, b) => b.ts - a.ts);
}

function inFilter(e: HistoryEntry, f: HistoryFilter): boolean {
  if (f === "progress") return e.status === "waiting" || e.status === "building";
  if (f === "ready") return e.status === "ready";
  if (f === "attention") return e.attention;
  return true;
}

export function filterCounts(entries: readonly HistoryEntry[]): Record<HistoryFilter, number> {
  const out = { all: 0, progress: 0, ready: 0, attention: 0 };
  for (const e of entries) for (const f of HISTORY_FILTERS) if (inFilter(e, f.id)) out[f.id] += 1;
  return out;
}

export function narrowHistory(entries: readonly HistoryEntry[], filter: HistoryFilter, query: string): HistoryEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter(
    (e) => inFilter(e, filter) && (!q || `${e.name}\n${e.prompt}\n${e.projectName ?? ""}`.toLowerCase().includes(q)),
  );
}

export function parseFilter(raw: string | null): HistoryFilter {
  return HISTORY_FILTERS.some((f) => f.id === raw) ? (raw as HistoryFilter) : "all";
}
