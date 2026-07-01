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

export type BuildItemKind = "3d" | "pcb" | "code";

export type BuildItemStatus = "pending" | "building" | "ready" | "failed";

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

export const ITEM_LABELS: Record<BuildItemKind, string> = {
  "3d": "3D model",
  pcb: "PCB",
  code: "Firmware code",
};

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

function deriveTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 56) return trimmed || "Untitled concept";
  return `${trimmed.slice(0, 56)}…`;
}

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
  }) => BuildJob;
  updateBuildItem: (
    buildId: string,
    kind: BuildItemKind,
    patch: Partial<BuildItem>,
  ) => void;
  retryBuildItem: (buildId: string, kind: BuildItemKind) => void;
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

  // Hydrate from storage once on mount.
  React.useEffect(() => {
    setChats(loadJSON<ChatSession[]>(CHATS_KEY, []));
    setBuilds(loadJSON<BuildJob[]>(BUILDS_KEY, []));
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
    }) => {
      const now = Date.now();
      const id = makeId("build");
      const job: BuildJob = {
        id,
        chatId: input.chatId,
        conceptImageUrl: input.imageUrl,
        conceptPrompt: input.prompt,
        items: [
          { kind: "3d", status: "building", progress: 0 },
          { kind: "pcb", status: "building", progress: 0 },
          { kind: "code", status: "building", progress: 0 },
        ],
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
          return {
            ...b,
            updatedAt: Date.now(),
            items: nextItems,
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

export type BuildRollup = {
  status: "building" | "ready" | "partial" | "failed";
  progress: number;
};

// Derived status across all items on a build.
export function rollupBuild(job: BuildJob): BuildRollup {
  return computeRollup(job.items);
}

function computeRollup(items: BuildItem[]): BuildRollup {
  const allReady = items.every((i) => i.status === "ready");
  if (allReady) return { status: "ready", progress: 100 };
  const allFailed = items.every((i) => i.status === "failed");
  if (allFailed) return { status: "failed", progress: 0 };
  const anyFailed = items.some((i) => i.status === "failed");
  const progress = Math.round(
    items.reduce((sum, i) => sum + i.progress, 0) / items.length,
  );
  if (anyFailed) return { status: "partial", progress };
  return { status: "building", progress };
}

// Spec §7b — what counts as "needs the user's attention" for a build:
//   • ready (no outcome yet) — must review and pick an outcome
//   • partial / failed       — at least one item failed; retry needed
export function buildAttention(job: BuildJob): BuildAttention | null {
  const rollup = computeRollup(job.items);
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
