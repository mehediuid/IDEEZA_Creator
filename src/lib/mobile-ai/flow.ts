// The AI tab's own rules on a phone (mobile Figma "AI create · 2026 update",
// 10706:2). Everything a build or a concept IS comes from the web's create
// stores (lib/create/*); this module only says how the phone words and
// orders it: the ideas under the prompt, the stepper, a piece's status word,
// the build pill over the other tabs (Build queue popups), what the Build log
// counts as spent, and the prompt bubble's preview. Pure, so it is tested
// (tests/projects/mobile-ai.test.mjs); relative imports only.

import { PIECES, aboutTime } from "../create/pieces";

// ─────────────────────────── Start from an idea ───────────────────────────

export type Idea = {
  /** The web's own example (workspace-prompt.tsx CHIP_POOL), word for word:
   *  tapping it puts this in the box. */
  title: string;
  /** What it is made of, under the title (Figma "PM2.5 · CO₂ · Wi-Fi"). */
  line: string;
  /** A real picture of one, from the app's own images; null shows the mark. */
  image: string | null;
};

/** Nine ideas, three on screen — the web's pool, in its order. */
export const IDEAS: readonly Idea[] = [
  { title: "Voice-controlled lamp", line: "Mic · LED · Wi-Fi", image: null },
  { title: "NFC crypto tap card", line: "NFC · secure chip", image: null },
  { title: "Solar-powered charger", line: "Solar · USB-C · ESP32", image: "/innovations/solar-mppt-controller.png" },
  { title: "Smart plant waterer", line: "Soil sensor · pump", image: "/innovations/smart-plant-watering-hub.png" },
  { title: "Bluetooth door sensor", line: "Reed switch · BLE", image: "/innovations/door-window-contact-sensor.png" },
  { title: "E-ink weather display", line: "E-ink · Wi-Fi", image: "/innovations/lora-weather-station.png" },
  { title: "USB-C power bank", line: "18650 cells · USB-C", image: "/innovations/18650-battery-balancer.jpg" },
  { title: "Gesture-controlled LED strip", line: "IMU · LED strip", image: "/images/browse-project/gesture-led.png" },
  { title: "Pocket air-quality monitor", line: "PM2.5 · CO₂ · Wi-Fi", image: "/innovations/air-quality-room-sensor.png" },
];

export const IDEAS_SHOWN = 3;

/** The three on screen at this offset; Shuffle moves the window on by three,
 *  so every press really changes what is offered. */
export function ideasAt(offset: number, shown: number = IDEAS_SHOWN): Idea[] {
  const n = IDEAS.length;
  const start = ((offset % n) + n) % n;
  return Array.from({ length: Math.min(shown, n) }, (_, i) => IDEAS[(start + i) % n]);
}

// ─────────────────────────── the prompt bubble ───────────────────────────

/** Past this the bubble shows the start and "Show full prompt" (05 → 06). */
export const PROMPT_PREVIEW_CHARS = 70;

/** The bubble's short form: whole words, then an ellipsis. Null when the
 *  prompt is short enough to show whole. */
export function promptPreview(text: string, max: number = PROMPT_PREVIEW_CHARS): string | null {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return null;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s,.;:–-]+$/, "")}...`;
}

// ─────────────────────────── the stepper ───────────────────────────

/** The web's stages (project-state.ts `stageOf`). */
export type FlowStage = "idea" | "concepts" | "build" | "save" | "saved";

export const STEPS = ["Idea", "Concepts", "Build", "Save"] as const;

/** How many of the four steps are reached: the current step and every one
 *  before it are filled, and the line between two reached steps is too. */
export function stepsReached(stage: FlowStage): number {
  switch (stage) {
    case "idea":
      return 1;
    case "concepts":
      return 2;
    case "build":
      return 3;
    case "save":
    case "saved":
      return 4;
  }
}

// ─────────────────────────── a piece's row ───────────────────────────

export type PieceKind = "3d" | "pcb" | "code" | "assembly" | "wiring" | "parts";
export type PieceStatus = "pending" | "building" | "ready" | "failed" | "skipped";
export type PieceLite = { kind: PieceKind; status: PieceStatus; progress: number; omitted?: true };

export type PieceTone = "plain" | "working" | "done" | "error" | "muted";

/** What a piece's row says (16 · 17 · A4–A6): its status word, and the
 *  tone it is drawn in. A piece waiting on another says which (the web's
 *  needs rules, pieces.ts: Code, Assembly and Wiring are made from the PCB). */
export function pieceWord(
  piece: PieceLite,
  all: readonly PieceLite[],
  opts: { systemFailure?: boolean; queued?: boolean } = {},
): { word: string; tone: PieceTone } {
  if (piece.status === "skipped") return { word: piece.omitted ? "Not built" : "Not in this build", tone: "muted" };
  if (piece.status === "ready") return { word: "Ready", tone: "done" };
  if (piece.status === "failed") {
    return opts.systemFailure ? { word: "Didn't run", tone: "muted" } : { word: "Couldn't generate", tone: "error" };
  }
  if (piece.status === "building") return { word: `${Math.round(piece.progress)}%`, tone: "working" };
  if (opts.queued) return { word: "Waiting", tone: "plain" };
  const need = PIECES[piece.kind].needs.find((k) => {
    if (k === "parts") return false;
    const other = all.find((p) => p.kind === k);
    return !!other && other.status !== "ready" && other.status !== "skipped";
  });
  return need ? { word: `Waiting · needs the ${PIECES[need].name}`, tone: "plain" } : { word: "Waiting", tone: "plain" };
}

/** What a partial failure says under the failed piece (16): why, and that
 *  the retry is free, naming the pieces still waiting for it. */
export function failedPieceNote(kind: PieceKind, all: readonly PieceLite[]): string {
  const waiting = all
    .filter((p) => p.kind !== kind && p.status === "pending" && PIECES[p.kind].needs.includes(kind))
    .map((p) => PIECES[p.kind].name);
  const after = waiting.length
    ? ` — ${joinWords(waiting)} start${waiting.length === 1 ? "s" : ""} after it.`
    : ".";
  return `${PIECE_FAIL_WHY[kind]} Retrying is free${after}`;
}

const PIECE_FAIL_WHY: Record<PieceKind, string> = {
  pcb: "The board didn't pass its checks.",
  code: "The code didn't compile for the board.",
  "3d": "The enclosure couldn't be shaped around the parts.",
  assembly: "The parts didn't fit together in the enclosure.",
  wiring: "The connections couldn't be worked out.",
  parts: "The parts list couldn't be worked out.",
};

export function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

// ─────────────────────────── the build pill ───────────────────────────

export type PillInput = {
  /** statusOf(job) on the web. */
  status: "queued" | "running" | "ready" | "partial" | "failed";
  /** The project's name, else the build's title. */
  name: string;
  /** Builds queued ahead of this one. */
  ahead: number;
  /** The whole build, 0–100. */
  percent: number;
  /** Seconds the pieces still building need, at most — for "about N min left". */
  secondsLeft: number;
  /** Ran for under this long: "Alright, let's get this processing started!". */
  justStarted: boolean;
  blocked?: "credits" | "cap";
  systemFailure?: boolean;
  refunded?: boolean;
  /** The pieces that failed, named ("PCB", "Magbox PCB"). */
  failed: string[];
  /** Saved as a project: a ready build has nothing left to ask. */
  saved: boolean;
};

export type PillTone = "working" | "done" | "error" | "attention";

export type Pill = {
  tone: PillTone;
  title: string;
  detail?: string;
  /** A state the build sits in (queued, running): shown for as long as it
   *  lasts. The rest say what happened once, then go. */
  lasting: boolean;
};

/** The pill a build shows over the other screens (Build queue popups 01–06),
 *  in the web's words (attention-banner.tsx). Null when there is nothing to
 *  say — a ready build already saved. */
export function pillOf(b: PillInput): Pill | null {
  if (b.blocked === "credits") {
    return { tone: "attention", title: "Build paused", detail: `${b.name} is paused — buy credits to start it`, lasting: false };
  }
  if (b.blocked === "cap") {
    return { tone: "attention", title: "Build paused", detail: `${b.name} is paused: you reached your monthly limit`, lasting: false };
  }
  if (b.status === "queued") {
    return {
      tone: "working",
      title: b.ahead > 0 ? `Your build starts shortly · ${b.ahead} ${b.ahead === 1 ? "build" : "builds"} ahead of you` : "Your build starts shortly",
      lasting: true,
    };
  }
  if (b.status === "running") {
    if (b.justStarted && b.percent < 5) {
      return { tone: "working", title: "Alright, let’s get this processing started!", lasting: true };
    }
    const pct = Math.round(b.percent);
    const left = pct >= 90 || b.secondsLeft <= 5 ? "almost done" : `${aboutTime(b.secondsLeft)} left`;
    return { tone: "working", title: `Building · ${pct}%`, detail: `${b.name} · ${left}`, lasting: true };
  }
  if (b.systemFailure) {
    return {
      tone: "error",
      title: "Build stopped",
      detail: `${b.name} · the build stopped on our side${b.refunded ? " — your credits were refunded" : ""}`,
      lasting: false,
    };
  }
  if (b.status === "partial" || b.status === "failed") {
    const step = b.failed.length > 1 ? "steps" : "step";
    return {
      tone: "error",
      title: "Build needs a retry",
      detail: b.failed.length ? `The ${joinWords(b.failed)} ${step} failed · retrying is free` : "Retrying is free",
      lasting: false,
    };
  }
  if (b.saved) return null;
  return { tone: "done", title: `Build ready to review · ${b.name}`, lasting: false };
}

// ─────────────────────────── credits so far ───────────────────────────

/** One ledger line, as the credits store keeps it (lib/create/credits.tsx). */
export type LedgerLine = { delta: number; reason: string; buildId?: string };

export type Spent = { total: number; concepts: number; refines: number; builds: number; buildCredits: number };

/** What this chat has really cost (Build log's foot): every charge on one of
 *  its turns or builds, less what came back. A render that failed was
 *  refunded, so it doesn't count. `refines`: the turn ids that were a refine. */
export function spentOf(
  ledger: readonly LedgerLine[],
  turnIds: ReadonlySet<string>,
  refineIds: ReadonlySet<string>,
  buildIds: ReadonlySet<string>,
): Spent {
  const net = new Map<string, number>();
  for (const l of ledger) {
    if (!l.buildId) continue;
    // Pieces added to a build later are charged as `<build>:add:<ts>`: part of that build.
    const key = turnIds.has(l.buildId) ? l.buildId : l.buildId.split(":")[0];
    if (!turnIds.has(key) && !buildIds.has(key)) continue;
    if (l.reason === "concept" || l.reason === "build" || l.reason === "refund") {
      net.set(key, (net.get(key) ?? 0) - l.delta);
    }
  }
  let concepts = 0;
  let refines = 0;
  let builds = 0;
  let buildCredits = 0;
  let total = 0;
  for (const [id, spent] of net) {
    if (spent <= 0) continue;
    total += spent;
    if (turnIds.has(id)) {
      if (refineIds.has(id)) refines += 1;
      else concepts += 1;
    } else {
      builds += 1;
      buildCredits += spent;
    }
  }
  return { total, concepts, refines, builds, buildCredits };
}

/** "2 concepts, 1 refine and the 10-credit build." — the line under the total. */
export function spentLine(s: Spent): string {
  if (s.total === 0) return "Nothing charged yet.";
  if (!s.builds && !s.refines) return "One credit for each concept drawn.";
  const parts: string[] = [];
  if (s.concepts) parts.push(`${s.concepts} ${s.concepts === 1 ? "concept" : "concepts"}`);
  if (s.refines) parts.push(`${s.refines} ${s.refines === 1 ? "refine" : "refines"}`);
  if (s.builds === 1) parts.push(`the ${s.buildCredits}-credit build`);
  else if (s.builds > 1) parts.push(`${s.builds} builds (${s.buildCredits} credits)`);
  return `${joinWords(parts)}.`;
}
