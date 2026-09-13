"use client";

// History store for IDEEZA's AI create flow. Two surfaces, kept
// separate per spec §2:
//
//   • ChatSession   — Phase 1 concept chat (one chat, many image turns)
//   • BuildJob      — Phase 2 full build (3D + PCB + code), spawned by
//                     "Use this → Generate full product" on any chat
//                     turn. A single chat can spawn many build jobs.
//
// State persists to localStorage so a refresh loses nothing. All
// mutations route through the CreateHistoryProvider; consumers use
// `useCreateHistory()`.

import * as React from "react";
import {
  deriveTitle,
  type ConceptPart,
  type ConceptPartCategory,
} from "./concept";

// ─────────────────────────── types ────────────────────────────────

export type AssistantImageStatus = "pending" | "ready" | "failed";

// Distinguishes the two ways an assistant turn gets created:
//   • "fresh"  — first turn, or a Regenerate (per spec §4c). No visual
//                context from a prior image; the model starts over from
//                the prompt.
//   • "refine" — a follow-up typed in the prompt bar (per spec §4b).
//                The prompt is the CHANGE the user wants on top of the
//                parent image; the model evolves the parent rather than
//                starting over.
export type AssistantTurnKind = "fresh" | "refine";

export type ChatTurn =
  | {
      id: string;
      role: "user";
      text: string;
      ts: number;
    }
  | {
      id: string;
      role: "assistant";
      // Echo of the prompt that produced this image. For refines this is
      // the CHANGE the user typed (e.g. "make it longer") — NOT the full
      // accumulated brief. The orchestrator carries the prompt that ships
      // to the build via the parent chain when needed.
      prompt: string;
      kind: AssistantTurnKind;
      // When kind === "refine": the turn this concept evolves from. The
      // UI uses this to render a "Refines Concept N" breadcrumb so the
      // refinement chain is visible while scrolling.
      parentTurnId?: string;
      status: AssistantImageStatus;
      imageUrl?: string;
      // Whether this image has been promoted to a build (informational —
      // does NOT lock the chat, since spec §1 says one chat can produce
      // many builds).
      usedForBuild?: string; // build id
      ts: number;
    };

export type ChatSession = {
  id: string;
  title: string;
  turns: ChatTurn[];
  createdAt: number;
  updatedAt: number;
};

export type BuildItemKind = "3d" | "pcb" | "code" | "wiring" | "parts";

export type BuildItemStatus =
  | "pending"
  | "building"
  | "ready"
  | "failed"
  // An artifact an older build never produced. Kept in the list so the
  // five rows always read honestly instead of silently shrinking.
  | "skipped";

// The build as a whole. `queued` is a build waiting for the one ahead
// of it (one build runs at a time); `failed` is the system failure —
// the whole job died and the credits went back.
export type BuildStatus =
  | "queued"
  | "running"
  | "ready"
  | "partial"
  | "failed";

export type BuildItem = {
  kind: BuildItemKind;
  status: BuildItemStatus;
  progress: number; // 0–100
};

export type BuildOutcome = "private" | "community" | "sell";

export type BuildJob = {
  id: string;
  chatId: string;
  // The locked concept that started this build — pinned for reference.
  conceptImageUrl: string;
  conceptPrompt: string;
  // The concept as the summarizer read it: a short name, the parts line
  // under it, and the parts themselves — which every deliverable is
  // derived from (see build-artifacts.ts).
  title: string;
  summary: string;
  parts: ConceptPart[];
  // Which concept in the chat this build came from — "2", or "1.1" for
  // a refinement of the first.
  conceptNumber: string;
  status: BuildStatus;
  startedAt?: number;
  endedAt?: number;
  // Minutes the whole build is expected to take, for the countdown.
  estimateMin: number;
  creditsCharged: boolean;
  creditsRefunded: boolean;
  // Set when the build died for a reason that isn't the user's — the
  // credits are refunded and the whole build can be retried.
  failure?: "system";
  // Set by Save Project / Advance Edit once the build becomes a real
  // ManualProject.
  projectId?: string;
  items: BuildItem[];
  createdAt: number;
  updatedAt: number;
  // Once the user picks an outcome the build is closed for that path.
  outcome?: BuildOutcome;
  // The user pressed "Dismiss" on the attention banner for this build.
  // Re-armed automatically the next time the build's status changes.
  attentionDismissedAt?: number;
  // The AI-generated 3D model for this build's enclosure, rendered in the
  // review panel. Generated from conceptImageUrl via /api/three/generate;
  // undefined until it lands (the review panel shows a generating state).
  modelGlbUrl?: string;
};

// What "needs attention" means for a build (spec §7b):
//   • ready (no outcome yet) — user must review and pick Private /
//     Community / Sell
//   • partial / failed       — at least one item failed and is waiting
//     for a retry
export type BuildAttention = {
  job: BuildJob;
  reason: "review" | "retry";
  message: string;
};

// The five artifacts every build produces, in the order they're shown.
export const ITEM_KINDS: BuildItemKind[] = [
  "3d",
  "pcb",
  "code",
  "wiring",
  "parts",
];

export const ITEM_LABELS: Record<BuildItemKind, string> = {
  "3d": "3D model",
  pcb: "PCB",
  code: "Firmware code",
  wiring: "Wiring",
  parts: "Parts",
};

export const ITEM_SUBTITLES: Record<BuildItemKind, string> = {
  "3d": "Printable enclosure with mount points",
  pcb: "Schematic, layout and BOM",
  code: "Starter firmware for the parts used",
  wiring: "Harness and pin-to-pin connections",
  parts: "Bill of materials with suppliers",
};

// How long a full build is expected to take, in minutes.
export const BUILD_ESTIMATE_MIN = 10;

export const OUTCOME_LABELS: Record<BuildOutcome, string> = {
  private: "Save as Private",
  community: "Give to community",
  sell: "Sell on marketplace",
};

// ─────────────────────────── storage ───────────────────────────────

const CHATS_KEY = "ideeza:create:chats";
const BUILDS_KEY = "ideeza:create:builds";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ─────────────────────────── helpers ───────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

// Items an old build never had are "skipped" — they say nothing about
// whether the build finished, so every rollup ignores them.
function liveItems(items: BuildItem[]): BuildItem[] {
  return items.filter((i) => i.status !== "skipped");
}

// The build's state as its items describe it. `statusOf` prefers the
// stored status for the two states items can't express (queued, and a
// whole-build system failure).
function deriveStatus(items: BuildItem[]): BuildStatus {
  const live = liveItems(items);
  if (!live.length) return "ready";
  if (live.every((i) => i.status === "ready")) return "ready";
  const building = live.some(
    (i) => i.status === "building" || i.status === "pending",
  );
  if (!building && live.some((i) => i.status === "failed")) return "partial";
  return "running";
}

export function statusOf(job: BuildJob): BuildStatus {
  if (job.status === "queued" || job.status === "failed") return job.status;
  return deriveStatus(job.items);
}

// Average progress across the artifacts that are actually being built.
function progressOf(items: BuildItem[]): number {
  const live = liveItems(items);
  if (!live.length) return 100;
  return Math.round(live.reduce((s, i) => s + i.progress, 0) / live.length);
}

// Whole minutes since the build started — frozen at endedAt once it's
// over, so a finished build doesn't keep counting.
export function elapsedMinutes(job: BuildJob, now: number = Date.now()): number {
  if (!job.startedAt) return 0;
  const end = job.endedAt ?? now;
  return Math.max(0, Math.floor((end - job.startedAt) / 60_000));
}

// The estimate scaled by what's left to do. Never says "0 minutes left"
// while work remains — the smallest honest answer is 1.
export function minutesLeft(job: BuildJob, now: number = Date.now()): number {
  void now;
  const remaining = (100 - progressOf(job.items)) / 100;
  if (remaining <= 0) return 0;
  return Math.max(1, Math.round(job.estimateMin * remaining));
}

// ─────────────────────────── migration ─────────────────────────────

// Stored builds predate the five-artifact model, the queue and the
// concept summary. Bring each one forward on hydrate — never at render,
// so what the UI reads is what's in storage.
function normalizeJob(raw: BuildJob): BuildJob {
  const stored = raw as Partial<BuildJob> & { items?: BuildItem[] };
  const byKind = new Map<BuildItemKind, BuildItem>();
  for (const item of stored.items ?? []) {
    if (!ITEM_KINDS.includes(item.kind)) continue;
    byKind.set(item.kind, item);
  }
  const items: BuildItem[] = ITEM_KINDS.map(
    (kind) =>
      byKind.get(kind) ?? { kind, status: "skipped" as const, progress: 0 },
  );
  const prompt = stored.conceptPrompt ?? "";
  const status: BuildStatus =
    stored.status && STATUS_VALUES.includes(stored.status)
      ? stored.status
      : deriveStatus(items);
  return {
    ...(stored as BuildJob),
    items,
    title: stored.title || deriveTitle(prompt),
    summary: stored.summary ?? "",
    parts: Array.isArray(stored.parts) ? stored.parts : [],
    conceptNumber: stored.conceptNumber || "1",
    status,
    estimateMin: stored.estimateMin ?? BUILD_ESTIMATE_MIN,
    creditsCharged: stored.creditsCharged ?? false,
    creditsRefunded: stored.creditsRefunded ?? false,
  };
}

const STATUS_VALUES: BuildStatus[] = [
  "queued",
  "running",
  "ready",
  "partial",
  "failed",
];

// Deterministic placeholder image so refreshes don't reshuffle.
// Picsum gives a real-looking photo per seed.
function placeholderImage(seed: string): string {
  const safe = encodeURIComponent(seed.slice(0, 24) || "ideeza");
  return `https://picsum.photos/seed/${safe}/640/480`;
}

// ─────────────────────────── context ───────────────────────────────

type Ctx = {
  hydrated: boolean;
  chats: ChatSession[];
  builds: BuildJob[];

  // Chat ops
  createChat: (initialPrompt: string) => ChatSession;
  appendUserTurn: (chatId: string, text: string) => void;
  appendAssistantTurn: (
    chatId: string,
    input: {
      prompt: string;
      kind: AssistantTurnKind;
      parentTurnId?: string;
    },
  ) => { chatId: string; turnId: string };
  resolveAssistantTurn: (
    chatId: string,
    turnId: string,
    imageUrl: string,
  ) => void;
  failAssistantTurn: (chatId: string, turnId: string) => void;
  getChat: (chatId: string) => ChatSession | null;

  // Build ops
  startBuild: (input: {
    chatId: string;
    turnId: string;
    imageUrl: string;
    prompt: string;
    conceptNumber: string;
    title: string;
    summary: string;
    parts: ConceptPart[];
  }) => BuildJob;
  updateBuildItem: (
    buildId: string,
    kind: BuildItemKind,
    patch: Partial<BuildItem>,
  ) => void;
  retryBuildItem: (buildId: string, kind: BuildItemKind) => void;
  // Whole-build retry, after a system failure took the job down.
  retryBuild: (buildId: string) => void;
  // The build died for a reason that isn't the user's: every artifact
  // fails, the job is marked failed and the credits go back.
  failBuildSystem: (buildId: string) => void;
  // Records that the credits ledger has charged for this build. The
  // component that owns the simulator charges and then calls this, so
  // a build is only ever charged once per run.
  markCharged: (buildId: string) => void;
  // Starts the oldest queued build when nothing is running. Called by
  // the simulator on each tick.
  promoteQueued: () => void;
  setBuildOutcome: (buildId: string, outcome: BuildOutcome) => void;
  setBuildModel: (buildId: string, glbUrl: string) => void;
  getBuild: (buildId: string) => BuildJob | null;
  buildsForChat: (chatId: string) => BuildJob[];

  // Attention surface (spec §7b)
  attentionBuilds: BuildAttention[];
  // The single most-urgent attention item, post-dismissal. `null` when
  // there's nothing the user needs to act on right now.
  topAttention: BuildAttention | null;
  dismissAttention: (buildId: string) => void;
};

const CreateHistoryContext = React.createContext<Ctx | null>(null);

export function CreateHistoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chats, setChats] = React.useState<ChatSession[]>([]);
  const [builds, setBuilds] = React.useState<BuildJob[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Latest builds, readable inside event callbacks (the queue has to
  // know whether something is already running).
  const buildsRef = React.useRef(builds);
  React.useEffect(() => {
    buildsRef.current = builds;
  }, [builds]);

  // Hydrate from storage once on mount. Stored builds are migrated here
  // — once, on the way in — so nothing downstream has to cope with an
  // older shape.
  React.useEffect(() => {
    setChats(loadJSON<ChatSession[]>(CHATS_KEY, []));
    setBuilds(loadJSON<BuildJob[]>(BUILDS_KEY, []).map(normalizeJob));
    setHydrated(true);
  }, []);

  // Persist on every change post-hydration so a refresh keeps state.
  React.useEffect(() => {
    if (!hydrated) return;
    saveJSON(CHATS_KEY, chats);
  }, [chats, hydrated]);
  React.useEffect(() => {
    if (!hydrated) return;
    saveJSON(BUILDS_KEY, builds);
  }, [builds, hydrated]);

  // ── Chat ops ──────────────────────────────────────────────────
  const createChat = React.useCallback((initialPrompt: string) => {
    const now = Date.now();
    const id = makeId("chat");
    const session: ChatSession = {
      id,
      title: deriveTitle(initialPrompt),
      turns: [
        { id: makeId("turn"), role: "user", text: initialPrompt, ts: now },
        {
          id: makeId("turn"),
          role: "assistant",
          prompt: initialPrompt,
          kind: "fresh",
          status: "pending",
          ts: now + 1,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    setChats((arr) => [session, ...arr]);
    return session;
  }, []);

  const appendUserTurn = React.useCallback(
    (chatId: string, text: string) => {
      setChats((arr) =>
        arr.map((c) =>
          c.id === chatId
            ? {
                ...c,
                updatedAt: Date.now(),
                turns: [
                  ...c.turns,
                  {
                    id: makeId("turn"),
                    role: "user",
                    text,
                    ts: Date.now(),
                  },
                ],
              }
            : c,
        ),
      );
    },
    [],
  );

  const appendAssistantTurn = React.useCallback(
    (
      chatId: string,
      input: {
        prompt: string;
        kind: AssistantTurnKind;
        parentTurnId?: string;
      },
    ) => {
      const turnId = makeId("turn");
      setChats((arr) =>
        arr.map((c) =>
          c.id === chatId
            ? {
                ...c,
                updatedAt: Date.now(),
                turns: [
                  ...c.turns,
                  {
                    id: turnId,
                    role: "assistant",
                    prompt: input.prompt,
                    kind: input.kind,
                    parentTurnId: input.parentTurnId,
                    status: "pending",
                    ts: Date.now(),
                  },
                ],
              }
            : c,
        ),
      );
      return { chatId, turnId };
    },
    [],
  );

  const resolveAssistantTurn = React.useCallback(
    (chatId: string, turnId: string, imageUrl: string) => {
      setChats((arr) =>
        arr.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            turns: c.turns.map((t) =>
              t.id === turnId && t.role === "assistant"
                ? { ...t, status: "ready" as const, imageUrl }
                : t,
            ),
          };
        }),
      );
    },
    [],
  );

  const failAssistantTurn = React.useCallback(
    (chatId: string, turnId: string) => {
      setChats((arr) =>
        arr.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            turns: c.turns.map((t) =>
              t.id === turnId && t.role === "assistant"
                ? { ...t, status: "failed" as const }
                : t,
            ),
          };
        }),
      );
    },
    [],
  );

  const getChat = React.useCallback(
    (chatId: string) => chats.find((c) => c.id === chatId) ?? null,
    [chats],
  );

  // ── Build ops ─────────────────────────────────────────────────
  const startBuild = React.useCallback(
    (input: {
      chatId: string;
      turnId: string;
      imageUrl: string;
      prompt: string;
      conceptNumber: string;
      title: string;
      summary: string;
      parts: ConceptPart[];
    }) => {
      const now = Date.now();
      const id = makeId("build");
      // One build runs at a time — a second one waits its turn rather
      // than competing for the same worker.
      const busy = buildsRef.current.some((b) => b.status === "running");
      const job: BuildJob = {
        id,
        chatId: input.chatId,
        conceptImageUrl: input.imageUrl,
        conceptPrompt: input.prompt,
        title: input.title,
        summary: input.summary,
        parts: input.parts,
        conceptNumber: input.conceptNumber,
        status: busy ? "queued" : "running",
        startedAt: busy ? undefined : now,
        estimateMin: BUILD_ESTIMATE_MIN,
        creditsCharged: false,
        creditsRefunded: false,
        items: ITEM_KINDS.map((kind) => ({
          kind,
          status: busy ? ("pending" as const) : ("building" as const),
          progress: 0,
        })),
        createdAt: now,
        updatedAt: now,
      };
      setBuilds((arr) => [job, ...arr]);
      // Mark the source turn as used-for-build so the chat surface can
      // show "Built into <id>" inline.
      setChats((arr) =>
        arr.map((c) => {
          if (c.id !== input.chatId) return c;
          return {
            ...c,
            turns: c.turns.map((t) =>
              t.id === input.turnId && t.role === "assistant"
                ? { ...t, usedForBuild: id }
                : t,
            ),
          };
        }),
      );
      return job;
    },
    [],
  );

  const updateBuildItem = React.useCallback(
    (buildId: string, kind: BuildItemKind, patch: Partial<BuildItem>) => {
      setBuilds((arr) =>
        arr.map((b) => {
          if (b.id !== buildId) return b;
          const nextItems = b.items.map((it) =>
            it.kind === kind ? { ...it, ...patch } : it,
          );
          // Re-arm attention whenever the *rollup* status changes: if a
          // user dismissed an earlier banner but the situation flips
          // (retry succeeded, new failure, build flipped to ready),
          // they should see the new state.
          const wasRolled = computeRollup(b.items);
          const nextRolled = computeRollup(nextItems);
          const statusChanged = wasRolled.status !== nextRolled.status;
          // Keep the job's own status in step with its items, except
          // for the two the items can't express: a queued build stays
          // queued until it's promoted, and a system failure stays
          // failed until the whole build is retried.
          const now = Date.now();
          const derived = deriveStatus(nextItems);
          const status =
            b.status === "queued" || b.status === "failed" ? b.status : derived;
          return {
            ...b,
            updatedAt: now,
            items: nextItems,
            status,
            startedAt:
              status === "running" && !b.startedAt ? now : b.startedAt,
            endedAt:
              status === "running"
                ? undefined
                : status === "ready" || status === "partial"
                  ? (b.endedAt ?? now)
                  : b.endedAt,
            attentionDismissedAt: statusChanged
              ? undefined
              : b.attentionDismissedAt,
          };
        }),
      );
    },
    [],
  );

  const retryBuildItem = React.useCallback(
    (buildId: string, kind: BuildItemKind) => {
      updateBuildItem(buildId, kind, { status: "building", progress: 0 });
    },
    [updateBuildItem],
  );

  const retryBuild = React.useCallback((buildId: string) => {
    const now = Date.now();
    const busy = buildsRef.current.some(
      (b) => b.status === "running" && b.id !== buildId,
    );
    setBuilds((arr) =>
      arr.map((b) => {
        if (b.id !== buildId) return b;
        return {
          ...b,
          status: busy ? "queued" : "running",
          failure: undefined,
          startedAt: busy ? undefined : now,
          endedAt: undefined,
          // The failed run was refunded, so the retry is charged again.
          creditsCharged: false,
          creditsRefunded: false,
          items: b.items.map((it) => ({
            ...it,
            status: busy ? ("pending" as const) : ("building" as const),
            progress: 0,
          })),
          updatedAt: now,
          attentionDismissedAt: undefined,
        };
      }),
    );
  }, []);

  const failBuildSystem = React.useCallback((buildId: string) => {
    const now = Date.now();
    setBuilds((arr) =>
      arr.map((b) => {
        if (b.id !== buildId) return b;
        return {
          ...b,
          status: "failed" as const,
          failure: "system" as const,
          endedAt: now,
          creditsRefunded: b.creditsCharged,
          items: b.items.map((it) =>
            it.status === "skipped" ? it : { ...it, status: "failed" as const },
          ),
          updatedAt: now,
          attentionDismissedAt: undefined,
        };
      }),
    );
  }, []);

  const markCharged = React.useCallback((buildId: string) => {
    setBuilds((arr) =>
      arr.map((b) =>
        b.id === buildId ? { ...b, creditsCharged: true } : b,
      ),
    );
  }, []);

  const promoteQueued = React.useCallback(() => {
    setBuilds((arr) => {
      if (arr.some((b) => b.status === "running")) return arr;
      // Oldest first — the queue is a queue.
      let next: BuildJob | null = null;
      for (const b of arr) {
        if (b.status !== "queued") continue;
        if (!next || b.createdAt < next.createdAt) next = b;
      }
      if (!next) return arr;
      const promoted = next;
      const now = Date.now();
      return arr.map((b) =>
        b.id === promoted.id
          ? {
              ...b,
              status: "running" as const,
              startedAt: now,
              items: b.items.map((it) =>
                it.status === "skipped"
                  ? it
                  : { ...it, status: "building" as const, progress: 0 },
              ),
              updatedAt: now,
            }
          : b,
      );
    });
  }, []);

  const setBuildOutcome = React.useCallback(
    (buildId: string, outcome: BuildOutcome) => {
      setBuilds((arr) =>
        arr.map((b) =>
          b.id === buildId
            ? // Picking an outcome closes the review path → no more
              // attention for this build.
              { ...b, outcome, attentionDismissedAt: undefined }
            : b,
        ),
      );
    },
    [],
  );

  const setBuildModel = React.useCallback((buildId: string, glbUrl: string) => {
    setBuilds((arr) =>
      arr.map((b) =>
        b.id === buildId ? { ...b, modelGlbUrl: glbUrl, updatedAt: Date.now() } : b,
      ),
    );
  }, []);

  const dismissAttention = React.useCallback((buildId: string) => {
    setBuilds((arr) =>
      arr.map((b) =>
        b.id === buildId
          ? { ...b, attentionDismissedAt: Date.now() }
          : b,
      ),
    );
  }, []);

  const getBuild = React.useCallback(
    (buildId: string) => builds.find((b) => b.id === buildId) ?? null,
    [builds],
  );

  const buildsForChat = React.useCallback(
    (chatId: string) => builds.filter((b) => b.chatId === chatId),
    [builds],
  );

  // Attention surface (spec §7b). `attentionBuilds` lists every build
  // that needs the user's attention right now, even if dismissed —
  // that's what powers the red dot on the sidebar. `topAttention`
  // returns the first NOT-yet-dismissed one — that's what powers the
  // in-page banner.
  const attentionBuilds = React.useMemo(() => {
    const out: BuildAttention[] = [];
    for (const job of builds) {
      const att = buildAttention(job);
      if (att) out.push(att);
    }
    return out;
  }, [builds]);

  const topAttention = React.useMemo(() => {
    for (const att of attentionBuilds) {
      if (!att.job.attentionDismissedAt) return att;
    }
    return null;
  }, [attentionBuilds]);

  const value: Ctx = {
    hydrated,
    chats,
    builds,
    createChat,
    appendUserTurn,
    appendAssistantTurn,
    resolveAssistantTurn,
    failAssistantTurn,
    getChat,
    startBuild,
    updateBuildItem,
    retryBuildItem,
    retryBuild,
    failBuildSystem,
    markCharged,
    promoteQueued,
    setBuildOutcome,
    setBuildModel,
    getBuild,
    buildsForChat,
    attentionBuilds,
    topAttention,
    dismissAttention,
  };

  return (
    <CreateHistoryContext.Provider value={value}>
      {children}
    </CreateHistoryContext.Provider>
  );
}

export function useCreateHistory(): Ctx {
  const ctx = React.useContext(CreateHistoryContext);
  if (!ctx) {
    throw new Error(
      "useCreateHistory must be used inside <CreateHistoryProvider>",
    );
  }
  return ctx;
}

// ─────────────────────────── public helpers ────────────────────────

export { placeholderImage, deriveTitle, makeId };
export type { ConceptPart, ConceptPartCategory };

export type BuildRollup = {
  status: "building" | "ready" | "partial" | "failed";
  progress: number;
};

// Derived status across all items on a build. A system failure takes
// the whole job down, so it outranks whatever the items say.
export function rollupBuild(job: BuildJob): BuildRollup {
  if (job.status === "failed") return { status: "failed", progress: 0 };
  return computeRollup(job.items);
}

function computeRollup(items: BuildItem[]): BuildRollup {
  const live = liveItems(items);
  if (!live.length) return { status: "ready", progress: 100 };
  const allReady = live.every((i) => i.status === "ready");
  if (allReady) return { status: "ready", progress: 100 };
  const allFailed = live.every((i) => i.status === "failed");
  if (allFailed) return { status: "failed", progress: 0 };
  const anyFailed = live.some((i) => i.status === "failed");
  const progress = progressOf(items);
  if (anyFailed) return { status: "partial", progress };
  return { status: "building", progress };
}

// Spec §7b — what counts as "needs the user's attention" for a build:
//   • ready (no outcome yet) — must review and pick an outcome
//   • partial / failed       — at least one item failed; retry needed
export function buildAttention(job: BuildJob): BuildAttention | null {
  if (job.failure === "system") {
    return {
      job,
      reason: "retry",
      message: `“${shortTitle(job.title || job.conceptPrompt)}” stopped on our side${job.creditsRefunded ? " — your credits were refunded" : ""}.`,
    };
  }
  const rollup = rollupBuild(job);
  if (rollup.status === "ready" && !job.outcome) {
    return {
      job,
      reason: "review",
      message: `Your build “${shortTitle(job.conceptPrompt)}” is ready to review.`,
    };
  }
  if (rollup.status === "partial" || rollup.status === "failed") {
    return {
      job,
      reason: "retry",
      message: `A piece of “${shortTitle(job.conceptPrompt)}” failed and needs a retry.`,
    };
  }
  return null;
}

function shortTitle(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ");
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}
