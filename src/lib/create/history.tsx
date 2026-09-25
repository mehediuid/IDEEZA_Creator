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
import type { Companion } from "./companions";
import {
  BRIEF_CHANGES,
  deriveTitle,
  type ConceptPart,
  type ConceptPartCategory,
  type ConceptSummary,
} from "./concept";
import { asResolvedSpec } from "../spec/hints";
import type { ResolvedSpec, SpecEdits } from "../spec/types";

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

/** Why a concept render failed, when we know. The card says a different
 *  sentence for each, because only one of them is worth retrying and only
 *  one of them is the user's own balance. An older turn carries none, and
 *  reads as the generic failure it was stored as. */
export type ConceptFailReason =
  | "provider-credit"
  | "busy"
  | "unreachable"
  | "storage"
  | "parent-lost"
  | "credits"
  | "filtered";

/** What the flow asks before it spends anything.
 *
 *  A prompt used to go straight to a render. It does not any more: the two
 *  decisions that shape a build — which project it belongs to, and whether
 *  the idea is one product or several — are cheap to ask and expensive to
 *  get wrong, and asking them first means the first image is already the
 *  right image. Nothing is charged until this turn is answered. */
export type SetupAnswer = {
  /** An existing project, when the build is one product and the maker
   *  picked one. Empty when they are making a new project. */
  projectId: string;
  /** The name for a new project. §4.4.8 puts every product of a system in
   *  one project, so a multi-product build always takes this path. */
  projectName: string;
  /** companionId of every additional product the maker ticked. */
  picked: string[];
  /** Products still in the project that the maker left out of the next
   *  build — ticked off on the canvas, their concepts kept. */
  leftOut?: string[];
  /** The maker's spec edits per product — "primary" or a companion id. Kept
   *  per product, not per drawing, so a size set once survives a refine. */
  specs?: Record<string, SpecEdits>;
};

export type ChatTurn =
  | {
      id: string;
      role: "user";
      text: string;
      ts: number;
    }
  | {
      id: string;
      role: "setup";
      /** The prompt these questions are about. */
      prompt: string;
      /** "loading" while the classifier runs, "asking" once the questions
        *  can be shown, "answered" after — the card then reads the decision
        *  back rather than disappearing, so the thread still explains
        *  itself. */
      status: "loading" | "asking" | "answered";
      /** What the classifier offered. Empty for an ordinary single product. */
      companions: Companion[];
      /** The product the maker described, named and described by the model
       *  rather than echoed back at them. The prompt is what they typed; a
       *  product needs a name. Absent until the summary lands, and absent on
       *  turns that predate it. */
      productName?: string;
      productSummary?: string;
      answer?: SetupAnswer;
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
      // UI numbers a refine off its parent ("Concept 1.1"), so the
      // refinement chain is visible while scrolling.
      parentTurnId?: string;
      status: AssistantImageStatus;
      // Set with status "failed" — see ConceptFailReason.
      failReason?: ConceptFailReason;
      // The render in flight, as the generate route’s opaque job token.
      // Kept on the turn, and so in localStorage, because a render outlives
      // the page: reloading mid-render must pick the same job back up rather
      // than start — and charge for — a second one.
      renderJob?: string;
      imageUrl?: string;
      // Whether this image has been promoted to a build (informational —
      // does NOT lock the chat, since spec §1 says one chat can produce
      // many builds).
      usedForBuild?: string; // build id
      // Part 4 §4.4 — the companion product this concept is for, by its
      // `companionId`. Absent on the primary concept, which is the
      // product the chat started from and is always included.
      companionOf?: string;
      // The concept as the summarizer read it — parts and spec hints — kept
      // on the turn so the spec on the card survives a reload without the
      // model being asked again. Read in the background once the image lands.
      concept?: ConceptSummary;
      ts: number;
    };

/**
 * The whole brief a concept was drawn from. A refine's own `prompt` is only
 * the change typed for it, so reading a refine alone asked the summarizer
 * what "make it matte black" is — it answered with a matte-black something
 * else, and that product's parts became the build. Walks the refine chain
 * back to the concept it started from and names every change after it,
 * oldest first. A chain whose root is gone starts from the chat's own idea.
 */
export function conceptBriefOf(turns: ChatTurn[], turnId: string): string {
  const byId = new Map(turns.map((t) => [t.id, t]));
  const changes: string[] = [];
  const seen = new Set<string>();
  let root = "";
  let companion: string | undefined;
  let cur = byId.get(turnId);
  while (cur && cur.role === "assistant" && !seen.has(cur.id)) {
    seen.add(cur.id);
    companion = cur.companionOf;
    if (cur.kind !== "refine") {
      root = cur.prompt.trim();
      break;
    }
    changes.unshift(cur.prompt.trim());
    cur = cur.parentTurnId ? byId.get(cur.parentTurnId) : undefined;
  }
  if (!root && !companion) {
    const setup = turns.find((t) => t.role === "setup");
    root = setup ? setup.prompt.trim() : "";
  }
  const kept = changes.filter(Boolean);
  if (!root) return kept.join("; ");
  if (!kept.length) return root;
  return `${root.replace(/[.\s]+$/, "")}${BRIEF_CHANGES}${kept.join("; ")}`;
}

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

/** Part 4 §4.4 — a companion product built alongside the primary one.
 *  The primary stays on the job itself (§4.4.4: "the original concept is
 *  always included and cannot be deselected"), so this list holds only
 *  the extras. Each carries its own concept and its own five artifacts,
 *  because §4.4.9 wants a badge per product, not per project. */
export type BuildProduct = {
  /** The `companionId` the picker selected it by. */
  id: string;
  /** "Remote controller" — what the classifier called it. */
  name: string;
  conceptImageUrl: string;
  conceptPrompt: string;
  title: string;
  summary: string;
  /** What this product IS, in a sentence the model wrote. `summary` is the
   *  parts line, which is not a description: the Brief was filling its
   *  "one line · what does it do?" with "ATmega328P · GPS Receiver · IMU …". */
  description?: string;
  parts: ConceptPart[];
  /** The spec as it stood when the build was booked. The canvas can change
   *  afterwards; this build does not. Absent on builds older than the spec. */
  spec?: ResolvedSpec;
  items: BuildItem[];
};

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
  /** The primary product's description, for the same reason the companions
   *  carry one: `summary` is a parts line. */
  description?: string;
  parts: ConceptPart[];
  /** The primary product's booked spec — see BuildProduct.spec. */
  spec?: ResolvedSpec;
  /** The project this build was always meant for, answered at the setup
   *  question long before Save: an existing project by id, or the name typed
   *  for a new one. Not `projectId`, which is only set once the build really
   *  becomes a project — this is the maker's intent, carried so the Brief
   *  does not ask them the same question a second time with an empty box. */
  projectChoiceId?: string;
  projectChoiceName?: string;
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
  // Why a queued build isn't starting. "credits" means its turn came up
  // but the balance couldn't cover it, so it went back in the queue
  // rather than running unpaid.
  blocked?: "credits";
  // Set by Save Project / Open in editor once the build becomes a real
  // ManualProject.
  projectId?: string;
  items: BuildItem[];
  /** §4.4.8 — all products live in one project, so they live in one job
   *  too. Empty on every single-product build, which is most of them. */
  companions: BuildProduct[];
  createdAt: number;
  updatedAt: number;
  // The user pressed "Dismiss" on the attention banner for this build.
  // Re-armed automatically the next time the build's status changes.
  attentionDismissedAt?: number;
  // The AI-generated 3D model for this build's enclosure, rendered in the
  // review panel. Generated from conceptImageUrl via /api/three/generate;
  // undefined until it lands (the review panel shows a generating state).
  modelGlbUrl?: string;
  /** The generation failed or never answered. The 3D panel says so and
   *  offers a retry, instead of a spinner that turns forever. */
  modelFailed?: boolean;
};

// What "needs attention" means for a build (spec §7b):
//   • ready, not yet saved as a project — user must review it
//   • partial / failed       — at least one item failed and is waiting
//     for a retry
//   • credits                — the queue reached it but the balance
//     couldn't cover it; it's parked, waiting on a top-up
export type BuildAttention = {
  job: BuildJob;
  reason: "review" | "retry" | "credits";
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
  parts: "Bill of materials, grouped by function",
};

// How long a full build is expected to take, in minutes — what it really
// takes here, about a minute. It said ten ("About 8–12 minutes") for a build
// that finished in one, which made every later estimate hard to believe. The
// overrun stop (§4.6) reads twice this.
export const BUILD_ESTIMATE_MIN = 1;

// ─────────────────────────── storage ───────────────────────────────

const CHATS_KEY = "ideeza:create:chats";
const BUILDS_KEY = "ideeza:create:builds";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    // Both stores hold arrays and the callers map over them, so a stored
    // value of the wrong shape would throw during hydration and take the
    // whole app with it. Fall back instead.
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
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

/** Every artifact in the job — the primary product's and each
 *  companion's (§4.4). A multi-product build is not finished until all of
 *  its products are, so every rollup reads this rather than `job.items`. */
export function allItems(job: BuildJob): BuildItem[] {
  const extra = job.companions ?? [];
  if (!extra.length) return job.items;
  return [...job.items, ...extra.flatMap((c) => c.items)];
}

/** The products a build covers, primary first. §4.7 opens each into its
 *  own tabs, and §4.4.9 gives each its own badge, so both surfaces walk
 *  this rather than special-casing the primary. */
export function productsOf(job: BuildJob): BuildProduct[] {
  return [
    {
      id: "primary",
      name: job.title,
      conceptImageUrl: job.conceptImageUrl,
      conceptPrompt: job.conceptPrompt,
      title: job.title,
      summary: job.summary,
      parts: job.parts,
      ...(job.spec ? { spec: job.spec } : null),
      items: job.items,
    },
    ...(job.companions ?? []),
  ];
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
  // Across every product: a build with a finished drone and a still-
  // running remote is running, not ready.
  return deriveStatus(allItems(job));
}

/** Is this job actually occupying the single build worker?
 *
 *  Not `job.status === "running"`, which is what every caller used to ask.
 *  Nothing ever writes a terminal status back onto a job — a build's
 *  completion is derived from its items by `statusOf`/`rollupBuild` — so the
 *  stored field reads "running" from the moment a build is promoted until
 *  the end of time. The first build a browser ever finished therefore held
 *  the worker for good: `startBuild` booked every later build as queued,
 *  `promoteQueued` refused to promote it because something was still
 *  "running", and the build sat on "Waiting" with every row spinning and
 *  nothing behind it. `enforceSingleRunning` made it worse — the ghost was
 *  the oldest "running" job, so a build that did start was demoted back
 *  behind it.
 *
 *  The worker is held by work in flight, so that is what this asks: the
 *  stored flag says the job was started, and the items say whether it is
 *  still going. A freshly promoted job whose rows are all still pending
 *  derives as "building", so it holds the worker from the first tick.
 */
export function isWorkingBuild(job: BuildJob): boolean {
  return (
    job.status === "running" &&
    allItems(job).some((i) => i.status === "building")
  );
}

/** Start every artifact that is still waiting — across every product, not
 *  just the primary's five.
 *
 *  `promoteQueued` used to map `job.items` alone, so a promoted
 *  multi-product build began with the primary building and each companion's
 *  rows left pending forever. The tick only advances what is `building`, so
 *  the primary finished, the companions never moved, the job never derived
 *  as done, and it held the single worker for good: every build booked after
 *  it came back queued and sat on "Waiting" with nothing behind it. */
function startPendingItems(job: BuildJob): BuildJob {
  const start = (it: BuildItem): BuildItem =>
    it.status === "pending"
      ? { ...it, status: "building" as const, progress: 0 }
      : it;
  return {
    ...job,
    items: job.items.map(start),
    companions: (job.companions ?? []).map((c) => ({
      ...c,
      items: c.items.map(start),
    })),
  };
}

// How many builds are really waiting in front of this one: queued jobs
// booked before it. The build currently running isn't "ahead in the
// queue" — it's the one the queue is waiting on, which every caller
// says separately.
export function queuedAhead(job: BuildJob, builds: BuildJob[]): number {
  return builds.filter(
    (b) =>
      b.id !== job.id &&
      statusOf(b) === "queued" &&
      b.createdAt < job.createdAt,
  ).length;
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

/** Part 4 §4.6 — "if the job exceeds roughly twice expected duration".
 *  A running job past that has stopped behaving like one that is going to
 *  finish, so the card stops waiting quietly and offers the way out. Only
 *  a running job can overrun: a queued one has not started its clock, and
 *  a finished one has stopped it. */
export function isOverrunning(job: BuildJob, now: number = Date.now()): boolean {
  if (statusOf(job) !== "running") return false;
  return elapsedMinutes(job, now) > job.estimateMin * 2;
}

// ─────────────────────────── migration ─────────────────────────────

// Stored builds predate the five-artifact model, the queue and the
// concept summary. Bring each one forward on hydrate — never at render,
// so what the UI reads is what's in storage.
// One product's five artifacts, brought forward from storage. An item's
// own fields are storage too — a hand-edited or half-written build must
// not reach the UI with a NaN bar width or a status nothing renders. A
// kind that is absent reads as `skipped`, so the five rows are always
// there and one never silently disappears.
//
// Shared by the primary and by every companion product (§4.4), which is
// why it is a function rather than inline in normalizeJob.
function normalizeItems(raw: unknown): BuildItem[] {
  const byKind = new Map<BuildItemKind, BuildItem>();
  for (const item of Array.isArray(raw) ? (raw as BuildItem[]) : []) {
    if (!item || !ITEM_KINDS.includes(item.kind)) continue;
    const progress = Number(item.progress);
    byKind.set(item.kind, {
      kind: item.kind,
      status: ITEM_STATUS_VALUES.includes(item.status)
        ? item.status
        : "pending",
      progress: Number.isFinite(progress)
        ? Math.max(0, Math.min(100, progress))
        : 0,
    });
  }
  return ITEM_KINDS.map(
    (kind) =>
      byKind.get(kind) ?? { kind, status: "skipped" as const, progress: 0 },
  );
}

function normalizeJob(raw: BuildJob): BuildJob {
  const stored = raw as Partial<BuildJob> & { items?: BuildItem[] };
  const items = normalizeItems(stored.items);
  const prompt = stored.conceptPrompt ?? "";
  const status: BuildStatus =
    stored.status && STATUS_VALUES.includes(stored.status)
      ? stored.status
      : deriveStatus(items);
  // A build stored before companions existed has none, and a hand-edited
  // entry must not reach the UI with a product that has no artifacts.
  const companions: BuildProduct[] = Array.isArray(stored.companions)
    ? stored.companions
        .filter((c) => c && typeof c.id === "string" && c.id.trim())
        .map((c) => ({
          id: c.id,
          name: String(c.name ?? c.title ?? c.id),
          conceptImageUrl: String(c.conceptImageUrl ?? ""),
          conceptPrompt: String(c.conceptPrompt ?? ""),
          title: String(c.title ?? c.name ?? ""),
          summary: String(c.summary ?? ""),
          ...(typeof c.description === "string" && c.description.trim()
            ? { description: c.description }
            : null),
          parts: Array.isArray(c.parts) ? c.parts : [],
          ...(() => {
            const spec = asResolvedSpec(c.spec);
            return spec ? { spec } : null;
          })(),
          items: normalizeItems(c.items),
        }))
    : [];
  return {
    ...(stored as BuildJob),
    items,
    companions,
    title: stored.title || deriveTitle(prompt),
    summary: stored.summary ?? "",
    ...(typeof stored.description === "string" && stored.description.trim()
      ? { description: stored.description }
      : null),
    ...(typeof stored.projectChoiceId === "string" && stored.projectChoiceId
      ? { projectChoiceId: stored.projectChoiceId }
      : null),
    ...(typeof stored.projectChoiceName === "string" && stored.projectChoiceName
      ? { projectChoiceName: stored.projectChoiceName }
      : null),
    parts: Array.isArray(stored.parts) ? stored.parts : [],
    spec: asResolvedSpec(stored.spec),
    conceptNumber: stored.conceptNumber || "1",
    status,
    estimateMin: stored.estimateMin ?? BUILD_ESTIMATE_MIN,
    creditsCharged: stored.creditsCharged ?? false,
    creditsRefunded: stored.creditsRefunded ?? false,
    modelFailed: stored.modelFailed === true ? true : undefined,
    // Only a queued build can be waiting on credits.
    blocked:
      status === "queued" && stored.blocked === "credits"
        ? "credits"
        : undefined,
  };
}

const STATUS_VALUES: BuildStatus[] = [
  "queued",
  "running",
  "ready",
  "partial",
  "failed",
];

const ITEM_STATUS_VALUES: BuildItemStatus[] = [
  "pending",
  "building",
  "ready",
  "failed",
  "skipped",
];

// Only one build may be "running" at a time (spec: one build runs at a
// time). A hand-edited or otherwise corrupted store can hold more than
// one — hydrate must restore the invariant rather than let the queue
// worker referee it, since `promoteQueued`/the simulator assume it
// already holds. The oldest running job keeps running; the rest go back
// to the queue with the work that was in flight reset to pending,
// exactly like any other demotion into "queued".
function enforceSingleRunning(jobs: BuildJob[]): BuildJob[] {
  const running = jobs.filter(isWorkingBuild);
  if (running.length <= 1) return jobs;
  let oldest = running[0];
  for (const j of running) {
    if (j.createdAt < oldest.createdAt) oldest = j;
  }
  return jobs.map((j) =>
    isWorkingBuild(j) && j.id !== oldest.id
      ? {
          ...j,
          status: "queued" as const,
          startedAt: undefined,
          items: j.items.map((it) =>
            it.status === "building"
              ? { ...it, status: "pending" as const, progress: 0 }
              : it,
          ),
        }
      : j,
  );
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
      companionOf?: string;
    },
  ) => { chatId: string; turnId: string };
  resolveAssistantTurn: (
    chatId: string,
    turnId: string,
    imageUrl: string,
  ) => void;
  failAssistantTurn: (
    chatId: string,
    turnId: string,
    reason?: ConceptFailReason,
  ) => void;
  setTurnJob: (chatId: string, turnId: string, job: string) => void;
  setSetupDetails: (
    chatId: string,
    turnId: string,
    details: {
      companions: Companion[];
      productName?: string;
      productSummary?: string;
    },
  ) => void;
  answerSetupTurn: (
    chatId: string,
    turnId: string,
    answer: SetupAnswer,
    /** The project's name, which the chat then goes by — in History and
     *  everywhere else — instead of the maker's opening sentence. */
    title?: string,
  ) => void;
  addSetupPick: (chatId: string, turnId: string, companionId: string) => void;
  addSetupProduct: (chatId: string, turnId: string, companion: Companion) => void;
  /** Takes a product out of the project. Its concepts stay in the chat, so
   *  putting it back (`addSetupPick`) draws nothing and costs nothing. */
  dropSetupPick: (chatId: string, turnId: string, companionId: string) => void;
  /** In or out of the next build, for a product that stays in the project. */
  setSetupLeftOut: (chatId: string, turnId: string, companionId: string, out: boolean) => void;
  /** The concept as read back — parts and spec hints — kept on its turn. */
  setTurnConcept: (chatId: string, turnId: string, concept: ConceptSummary) => void;
  /** The maker's spec edits for one product, on the answered question. */
  setSpecEdits: (chatId: string, turnId: string, productId: string, edits: SpecEdits) => void;
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
    description?: string;
    projectChoiceId?: string;
    projectChoiceName?: string;
    parts: ConceptPart[];
    /** The primary's spec at booking — see BuildJob.spec. */
    spec?: ResolvedSpec;
    companions?: Omit<BuildProduct, "items">[];
  }) => BuildJob;
  updateBuildItem: (
    buildId: string,
    kind: BuildItemKind,
    patch: Partial<BuildItem>,
    productId?: string,
  ) => void;
  retryBuildItem: (
    buildId: string,
    kind: BuildItemKind,
    productId?: string,
  ) => void;
  // Whole-build retry, after a system failure took the job down.
  retryBuild: (buildId: string) => void;
  // Part 4 §4.6 — cancellation is a queued-only action, and a no-op on
  // anything else. A queued job has never been charged (the simulator
  // charges on start), so there is nothing to put back and the copy says
  // that rather than promising a refund.
  cancelBuild: (buildId: string) => void;
  // The build died for a reason that isn't the user's: every artifact
  // fails and the job is marked failed. The refund is a separate step —
  // see markRefunded — so the flag can never claim money moved that
  // didn't.
  failBuildSystem: (buildId: string) => void;
  // Records that the credits ledger holds an open charge for this
  // build. The simulator calls it only once the ledger really shows the
  // charge, so the flag can't claim money moved that didn't.
  markCharged: (buildId: string) => void;
  // Records that the ledger has actually put this build's credits back.
  // Same rule: called only once the refund is really on the ledger.
  markRefunded: (buildId: string) => void;
  // Its turn came up but the balance couldn't cover it: back to the
  // queue, flagged, rather than running unpaid.
  blockForCredits: (buildId: string) => void;
  // Starts the oldest queued build when nothing is running. Called by
  // the simulator on each tick.
  promoteQueued: () => void;
  // Records the ManualProject this build became, so Save Project /
  // Open in editor create one project per build and reuse it after that.
  setBuildProject: (buildId: string, projectId: string) => void;
  setBuildModel: (buildId: string, glbUrl: string) => void;
  setBuildModelFailed: (buildId: string, failed: boolean) => void;
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
    setBuilds(
      enforceSingleRunning(
        loadJSON<BuildJob[]>(BUILDS_KEY, []).map(normalizeJob),
      ),
    );
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
        // Questions, not a render. The first image costs a credit and is
        // shaped by the answers, so it waits for them.
        {
          id: makeId("turn"),
          role: "setup",
          prompt: initialPrompt,
          status: "loading",
          companions: [],
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
        companionOf?: string;
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
                    companionOf: input.companionOf,
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
    (chatId: string, turnId: string, reason?: ConceptFailReason) => {
      setChats((arr) =>
        arr.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            turns: c.turns.map((t) =>
              t.id === turnId && t.role === "assistant"
                ? { ...t, status: "failed" as const, failReason: reason }
                : t,
            ),
          };
        }),
      );
    },
    [],
  );

  // The reading has come back — what this product is, and what else it needs
  // — so the questions can be asked. Written in one go, because a card that
  // filled in halfway would ask before it knew what it was asking about.
  const setSetupDetails = React.useCallback(
    (
      chatId: string,
      turnId: string,
      details: {
        companions: Companion[];
        productName?: string;
        productSummary?: string;
      },
    ) => {
      setChats((arr) =>
        arr.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                turns: c.turns.map((t) =>
                  t.id === turnId && t.role === "setup" && t.status === "loading"
                    ? { ...t, ...details, status: "asking" as const }
                    : t,
                ),
              },
        ),
      );
    },
    [],
  );

  // The maker has answered. The card stops asking and starts reading the
  // decision back; the orchestrator watches for this and starts the renders.
  const answerSetupTurn = React.useCallback(
    (chatId: string, turnId: string, answer: SetupAnswer, title?: string) => {
      setChats((arr) =>
        arr.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                ...(title?.trim() ? { title: title.trim() } : null),
                updatedAt: Date.now(),
                turns: c.turns.map((t) =>
                  t.id === turnId && t.role === "setup"
                    ? { ...t, answer, status: "answered" as const }
                    : t,
                ),
              },
        ),
      );
    },
    [],
  );

  // A product the maker passed over at the question, taken up later. The
  // offer does not expire: deciding not to build the charging case today is
  // not deciding never to, and the classifier already found it — making them
  // start a new chat to get it back would be losing work they had done.
  // A product the maker asked for in the composer, which the classifier never
  // offered — §4.4.3's escape hatch, reached by typing rather than by a field.
  // It joins the answered question's own list, so the canvas, the gate and the
  // build all see it exactly like one that was offered.
  const addSetupProduct = React.useCallback(
    (chatId: string, turnId: string, companion: Companion) => {
      setChats((arr) =>
        arr.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                turns: c.turns.map((t) =>
                  t.id === turnId && t.role === "setup" && t.answer
                    ? {
                        ...t,
                        companions: t.companions.some((x) => x.id === companion.id)
                          ? t.companions
                          : [...t.companions, companion],
                        answer: {
                          ...t.answer,
                          picked: t.answer.picked.includes(companion.id)
                            ? t.answer.picked
                            : [...t.answer.picked, companion.id],
                        },
                      }
                    : t,
                ),
              },
        ),
      );
    },
    [],
  );

  const addSetupPick = React.useCallback(
    (chatId: string, turnId: string, companionId: string) => {
      setChats((arr) =>
        arr.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                turns: c.turns.map((t) =>
                  t.id === turnId && t.role === "setup" && t.answer
                    ? {
                        ...t,
                        answer: {
                          ...t.answer,
                          picked: t.answer.picked.includes(companionId)
                            ? t.answer.picked
                            : [...t.answer.picked, companionId],
                        },
                      }
                    : t,
                ),
              },
        ),
      );
    },
    [],
  );

  const patchSetupAnswer = React.useCallback(
    (chatId: string, turnId: string, patch: (a: SetupAnswer) => SetupAnswer) => {
      setChats((arr) =>
        arr.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                turns: c.turns.map((t) =>
                  t.id === turnId && t.role === "setup" && t.answer
                    ? { ...t, answer: patch(t.answer) }
                    : t,
                ),
              },
        ),
      );
    },
    [],
  );

  const dropSetupPick = React.useCallback(
    (chatId: string, turnId: string, companionId: string) =>
      patchSetupAnswer(chatId, turnId, (a) => ({
        ...a,
        picked: a.picked.filter((id) => id !== companionId),
        leftOut: (a.leftOut ?? []).filter((id) => id !== companionId),
      })),
    [patchSetupAnswer],
  );

  const setSetupLeftOut = React.useCallback(
    (chatId: string, turnId: string, companionId: string, out: boolean) =>
      patchSetupAnswer(chatId, turnId, (a) => {
        const rest = (a.leftOut ?? []).filter((id) => id !== companionId);
        return { ...a, leftOut: out ? [...rest, companionId] : rest };
      }),
    [patchSetupAnswer],
  );

  const setSpecEdits = React.useCallback(
    (chatId: string, turnId: string, productId: string, edits: SpecEdits) =>
      patchSetupAnswer(chatId, turnId, (a) => ({
        ...a,
        specs: { ...(a.specs ?? {}), [productId]: edits },
      })),
    [patchSetupAnswer],
  );

  const setTurnConcept = React.useCallback(
    (chatId: string, turnId: string, concept: ConceptSummary) => {
      setChats((arr) =>
        arr.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                turns: c.turns.map((t) =>
                  t.id === turnId && t.role === "assistant" ? { ...t, concept } : t,
                ),
              },
        ),
      );
    },
    [],
  );

  // The job token for a render in flight. Written once, as soon as the
  // generator accepts the work, so a reload can resume that job instead of
  // submitting another.
  const setTurnJob = React.useCallback(
    (chatId: string, turnId: string, job: string) => {
      setChats((arr) =>
        arr.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            turns: c.turns.map((t) =>
              t.id === turnId && t.role === "assistant"
                ? { ...t, renderJob: job }
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
      /** The model's sentence about the product, kept apart from `summary`,
       *  which is the parts line. */
      description?: string;
      parts: ConceptPart[];
      /** What the maker already answered at the setup question: an existing
       *  project, or the name for the new one every multi-product build gets.
       *  Carried onto the job so Save does not ask it again. */
      projectChoiceId?: string;
      projectChoiceName?: string;
      /** The primary's spec at booking — see BuildJob.spec. */
      spec?: ResolvedSpec;
      /** §4.4 — the companion products whose concepts are ready. Absent
       *  on every single-product build. */
      companions?: Omit<BuildProduct, "items">[];
    }) => {
      const now = Date.now();
      const id = makeId("build");
      // One build runs at a time — a second one waits its turn rather
      // than competing for the same worker.
      const busy = buildsRef.current.some(isWorkingBuild);
      const job: BuildJob = {
        id,
        chatId: input.chatId,
        conceptImageUrl: input.imageUrl,
        conceptPrompt: input.prompt,
        title: input.title,
        summary: input.summary,
        ...(input.description?.trim() ? { description: input.description } : null),
        ...(input.projectChoiceId ? { projectChoiceId: input.projectChoiceId } : null),
        ...(input.projectChoiceName?.trim()
          ? { projectChoiceName: input.projectChoiceName }
          : null),
        parts: input.parts,
        ...(input.spec ? { spec: input.spec } : null),
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
        // Every product gets the same five artifacts — §4.7 opens each one
        // into its own 3D / PCB / Code / BOM tabs, so each needs its own
        // set rather than a share of the primary's.
        companions: (input.companions ?? []).map((c) => ({
          ...c,
          items: ITEM_KINDS.map((kind) => ({
            kind,
            status: busy ? ("pending" as const) : ("building" as const),
            progress: 0,
          })),
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
    (
      buildId: string,
      kind: BuildItemKind,
      patch: Partial<BuildItem>,
      // §4.4 — which product's artifact. "primary" (the default) is the
      // job's own; anything else names a companion by its id. An id that
      // matches no product leaves the job untouched rather than writing
      // the patch somewhere it does not belong.
      productId: string = "primary",
    ) => {
      setBuilds((arr) =>
        arr.map((b) => {
          if (b.id !== buildId) return b;
          const onPrimary = productId === "primary";
          if (!onPrimary && !(b.companions ?? []).some((c) => c.id === productId)) {
            return b;
          }
          const nextItems = onPrimary
            ? b.items.map((it) => (it.kind === kind ? { ...it, ...patch } : it))
            : b.items;
          const nextCompanions = onPrimary
            ? (b.companions ?? [])
            : (b.companions ?? []).map((c) =>
                c.id === productId
                  ? {
                      ...c,
                      items: c.items.map((it) =>
                        it.kind === kind ? { ...it, ...patch } : it,
                      ),
                    }
                  : c,
              );
          // Every rollup below reads the whole job, not one product: a
          // build is ready when all of its products are.
          const allBefore = allItems(b);
          const allAfter = allItems({
            ...b,
            items: nextItems,
            companions: nextCompanions,
          });
          // Re-arm attention whenever the *rollup* status changes: if a
          // user dismissed an earlier banner but the situation flips
          // (retry succeeded, new failure, build flipped to ready),
          // they should see the new state.
          const wasRolled = computeRollup(allBefore);
          const nextRolled = computeRollup(allAfter);
          const statusChanged = wasRolled.status !== nextRolled.status;
          // Keep the job's own status in step with its items, except
          // for the two the items can't express: a queued build stays
          // queued until it's promoted, and a system failure stays
          // failed until the whole build is retried.
          const now = Date.now();
          const derived = deriveStatus(allAfter);
          const status =
            b.status === "queued" || b.status === "failed" ? b.status : derived;
          return {
            ...b,
            updatedAt: now,
            items: nextItems,
            companions: nextCompanions,
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

  // Retrying one artifact restarts that artifact — but only if this
  // build may run at all. `updateBuildItem` recomputes the job's status
  // from its items, so on a partial build the retried row would flip the
  // whole job back to "running" while another build already holds the
  // worker. When something else is running, the retry goes back in the
  // queue with that row pending and waits for promotion, exactly like
  // retryBuild.
  const retryBuildItem = React.useCallback(
    (buildId: string, kind: BuildItemKind, productId: string = "primary") => {
      const busy = buildsRef.current.some(
        (b) => isWorkingBuild(b) && b.id !== buildId,
      );
      if (!busy) {
        updateBuildItem(
          buildId,
          kind,
          { status: "building", progress: 0 },
          productId,
        );
        return;
      }
      const now = Date.now();
      const onPrimary = productId === "primary";
      const requeue = (it: BuildItem) =>
        it.kind === kind
          ? { ...it, status: "pending" as const, progress: 0 }
          : it;
      setBuilds((arr) =>
        arr.map((b) =>
          b.id === buildId
            ? {
                ...b,
                status: "queued" as const,
                startedAt: undefined,
                endedAt: undefined,
                items: onPrimary ? b.items.map(requeue) : b.items,
                companions: onPrimary
                  ? (b.companions ?? [])
                  : (b.companions ?? []).map((c) =>
                      c.id === productId
                        ? { ...c, items: c.items.map(requeue) }
                        : c,
                    ),
                updatedAt: now,
                attentionDismissedAt: undefined,
              }
            : b,
        ),
      );
    },
    [updateBuildItem],
  );

  // Part 4 §4.6 — "allowed only in Queued state". Once generation has
  // started it is unavailable, because cancel-then-refund would be the
  // farming loop the spec warns about. The guard is inside the updater so
  // a status that changed between the click and here still decides it.
  const cancelBuild = React.useCallback((buildId: string) => {
    setBuilds((arr) => {
      const b = arr.find((x) => x.id === buildId);
      if (!b || statusOf(b) !== "queued") return arr;
      return arr.filter((x) => x.id !== buildId);
    });
  }, []);

  const retryBuild = React.useCallback((buildId: string) => {
    const now = Date.now();
    const busy = buildsRef.current.some(
      (b) => isWorkingBuild(b) && b.id !== buildId,
    );
    // Every artifact starts over; whether it starts now or waits depends
    // on whether another build already holds the worker.
    const restart = (it: BuildItem): BuildItem => ({
      ...it,
      status: busy ? ("pending" as const) : ("building" as const),
      progress: 0,
    });
    setBuilds((arr) =>
      arr.map((b) => {
        if (b.id !== buildId) return b;
        return {
          ...b,
          status: busy ? "queued" : "running",
          failure: undefined,
          blocked: undefined,
          startedAt: busy ? undefined : now,
          endedAt: undefined,
          // The failed run was refunded, so the retry is charged again.
          creditsCharged: false,
          creditsRefunded: false,
          items: b.items.map(restart),
          // §4.4 — a whole-build retry restarts the whole build, which is
          // every product in it, not only the one the job started from.
          companions: (b.companions ?? []).map((c) => ({
            ...c,
            items: c.items.map(restart),
          })),
          updatedAt: now,
          attentionDismissedAt: undefined,
        };
      }),
    );
  }, []);

  // The failure alone. Whether the money went back is the ledger's
  // answer, recorded by markRefunded once refund() has actually run.
  // An artifact that had already reached "ready" was really produced —
  // the failure stopped the rest, it didn't undo that one.
  const downed = (it: BuildItem): BuildItem =>
    it.status === "skipped" || it.status === "ready"
      ? it
      : { ...it, status: "failed" as const };

  const failBuildSystem = React.useCallback((buildId: string) => {
    const now = Date.now();
    setBuilds((arr) =>
      arr.map((b) => {
        if (b.id !== buildId) return b;
        return {
          ...b,
          status: "failed" as const,
          failure: "system" as const,
          blocked: undefined,
          endedAt: now,
          // An artifact that had already reached "ready" was really
          // produced — the failure stopped the rest, it didn't undo
          // that one.
          items: b.items.map(downed),
          // The failure is the job's, so it takes every product with it.
          companions: (b.companions ?? []).map((c) => ({
            ...c,
            items: c.items.map(downed),
          })),
          updatedAt: now,
          attentionDismissedAt: undefined,
        };
      }),
    );
  }, []);

  const markCharged = React.useCallback((buildId: string) => {
    setBuilds((arr) =>
      arr.map((b) =>
        b.id === buildId
          ? { ...b, creditsCharged: true, blocked: undefined }
          : b,
      ),
    );
  }, []);

  const markRefunded = React.useCallback((buildId: string) => {
    setBuilds((arr) =>
      arr.map((b) =>
        b.id === buildId && !b.creditsRefunded
          ? { ...b, creditsRefunded: true, updatedAt: Date.now() }
          : b,
      ),
    );
  }, []);

  const blockForCredits = React.useCallback((buildId: string) => {
    setBuilds((arr) => {
      const b = arr.find((x) => x.id === buildId);
      // Not found, or already parked — return the same array reference
      // (find-before-map, like promoteQueued) so this is a true no-op:
      // nothing re-renders and nothing re-persists to localStorage.
      if (!b || (b.status === "queued" && b.blocked === "credits")) return arr;
      return arr.map((x) =>
        x.id === buildId
          ? {
              ...x,
              status: "queued" as const,
              blocked: "credits" as const,
              startedAt: undefined,
              endedAt: undefined,
              // Whatever was in flight goes back to waiting; a finished
              // artifact stays finished.
              items: x.items.map((it) =>
                it.status === "building"
                  ? { ...it, status: "pending" as const, progress: 0 }
                  : it,
              ),
              updatedAt: Date.now(),
            }
          : x,
      );
    });
  }, []);

  const promoteQueued = React.useCallback(() => {
    setBuilds((arr) => {
      if (arr.some(isWorkingBuild)) return arr;
      const now = Date.now();
      // A job left holding the worker with nothing in flight — the shape
      // the old promotion produced, and the shape a build stored by an
      // older version of this app still has. It is already started and
      // already paid for, so it is picked up where it stopped rather than
      // being sent to the back of a queue it is at the front of.
      const stalled = arr.find(
        (b) =>
          b.status === "running" &&
          allItems(b).some((i) => i.status === "pending"),
      );
      if (stalled) {
        return arr.map((b) =>
          b.id === stalled.id
            ? { ...startPendingItems(b), updatedAt: now }
            : b,
        );
      }
      // Oldest first — the queue is a queue.
      let next: BuildJob | null = null;
      for (const b of arr) {
        if (b.status !== "queued") continue;
        if (!next || b.createdAt < next.createdAt) next = b;
      }
      if (!next) return arr;
      const promoted = next;
      return arr.map((b) =>
        b.id === promoted.id
          ? {
              // Only what is waiting starts, and every product's waiting
              // rows, not the primary's alone. A build that queued for a
              // single retry keeps the artifacts it already delivered —
              // restarting them would throw away real work.
              ...startPendingItems(b),
              status: "running" as const,
              blocked: undefined,
              startedAt: now,
              updatedAt: now,
            }
          : b,
      );
    });
  }, []);

  const setBuildProject = React.useCallback(
    (buildId: string, projectId: string) => {
      setBuilds((arr) =>
        arr.map((b) =>
          b.id === buildId
            ? { ...b, projectId, updatedAt: Date.now() }
            : b,
        ),
      );
    },
    [],
  );

  const setBuildModel = React.useCallback((buildId: string, glbUrl: string) => {
    setBuilds((arr) =>
      arr.map((b) =>
        b.id === buildId
          ? { ...b, modelGlbUrl: glbUrl, modelFailed: undefined, updatedAt: Date.now() }
          : b,
      ),
    );
  }, []);

  const setBuildModelFailed = React.useCallback(
    (buildId: string, failed: boolean) => {
      setBuilds((arr) =>
        arr.map((b) =>
          b.id === buildId
            ? { ...b, modelFailed: failed || undefined, updatedAt: Date.now() }
            : b,
        ),
      );
    },
    [],
  );

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
    setTurnJob,
    setSetupDetails,
    answerSetupTurn,
    addSetupPick,
    addSetupProduct,
    dropSetupPick,
    setSetupLeftOut,
    setTurnConcept,
    setSpecEdits,
    getChat,
    startBuild,
    updateBuildItem,
    retryBuildItem,
    retryBuild,
    cancelBuild,
    failBuildSystem,
    markCharged,
    markRefunded,
    blockForCredits,
    promoteQueued,
    setBuildProject,
    setBuildModel,
    setBuildModelFailed,
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
  // Across every product (§4.4): the shell swaps the status card for the
  // review on this answer, and a build whose drone is finished while its
  // remote is still rendering is not ready to review.
  return computeRollup(allItems(job));
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
//   • ready, not yet reviewed — must be opened and taken somewhere
//   • partial / failed        — at least one item failed; retry needed
//
// "Reviewed" is the `projectId` that Save Project / Open in editor set
// when the build becomes a real project. Without it a saved build keeps
// asking to be reviewed forever — the work is done and the bell is
// still lit.
export function buildAttention(job: BuildJob): BuildAttention | null {
  // One naming rule for every message: the build's own title, and only
  // when it has none, a title derived from the prompt that started it.
  const name = shortTitle(job.title || deriveTitle(job.conceptPrompt));
  if (job.blocked === "credits") {
    return {
      job,
      reason: "credits",
      message: `${name} is paused — top up credits to start it`,
    };
  }
  if (job.failure === "system") {
    return {
      job,
      reason: "retry",
      message: `“${name}” stopped on our side${job.creditsRefunded ? " — your credits were refunded" : ""}.`,
    };
  }
  const rollup = rollupBuild(job);
  if (rollup.status === "ready" && !job.projectId) {
    return {
      job,
      reason: "review",
      message: `Your build “${name}” is ready to review.`,
    };
  }
  if (rollup.status === "partial" || rollup.status === "failed") {
    return {
      job,
      reason: "retry",
      message: `A piece of “${name}” failed and needs a retry.`,
    };
  }
  return null;
}

function shortTitle(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ");
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}
