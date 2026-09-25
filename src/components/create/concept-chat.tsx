"use client";

// ConceptChat — the create flow's orchestrator. Owns the per-page UI state:
//   • the setup question          → the renders it asks for, one per product
//   • composer submissions        → a refine of the product in focus, or a new
//                                   product when the maker asks for one
//   • per-card Refine / Regenerate → a new turn (never overwrites the older one)
//   • the canvas's one build action → the gate, then a booked build
//   • the build                   → stays here: it leads the canvas, its
//                                   pieces join the rail's product rows and
//                                   its whole-build states take the rail's
//                                   next-step slot
//   • the rail's jumps            → which product the composer changes, and
//                                   taking the maker to the canvas control
//                                   that does the next step

import * as React from "react";
import Link from "next/link";
import {
  conceptBriefOf,
  deriveTitle,
  statusOf,
  useCreateHistory,
  type BuildJob,
  type BuildProduct,
  type ChatSession,
  type ChatTurn,
  type ConceptFailReason,
  type SetupAnswer,
} from "@/lib/create/history";
import type { ConceptSummary } from "@/lib/create/concept";
import type { ResolvedSpec, SpecEdits } from "@/lib/spec/types";
import { blocksBuild, deriveSpec, partsForBuild } from "@/lib/spec/derive";
import { specLine } from "@/lib/spec/format";
import { asConceptSummary, cleanEdits } from "@/lib/spec/hints";
import { useCreatePlan } from "@/lib/create/plan";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { useManualProjects } from "@/lib/manual/projects";
import {
  composerTarget,
  productNameOf,
  type JumpTarget,
} from "@/lib/create/project-state";
import {
  ADD_PRODUCT_ID,
  BUILD_ACTION_ID,
  BUILD_REVIEW_ID,
  CREDITS_NOTICE_ID,
  SETUP_QUESTION_ID,
  productCardId,
  productRetryId,
} from "./anchors";
import { ProjectRail, RailAnnouncer, useRailModel } from "./chat-rail";
import { BuildStatus } from "./build-status";
import { useBuildModel } from "./use-build-model";
import { ChatThread, conceptLabels } from "./chat-thread";
import { PromptBar } from "./prompt-bar";
import { ConfirmBuildDialog, summarizeConcept } from "./confirm-build-dialog";
import {
  companionId as slugFor,
  parseProductRequest,
  type Companion,
} from "@/lib/create/companions";

import { ImageEditorModal } from "./image-editor-modal";
import { specSizeInputId } from "./spec-panel";

const POLL_MS = 2_500;
/** Longer than the generator’s own budget, so the server is what gives up
 *  first and the card gets a reason rather than this bare timeout. */
const POLL_CEILING_MS = 180_000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** What the rail reads before the chat has been read from storage. Its hook
 *  has to run on every render, and the loading and not-found returns come
 *  after it; neither of them shows the rail. */
const NO_CHAT: ChatSession = { id: "", title: "", turns: [], createdAt: 0, updatedAt: 0 };

/** How long a jump's ring stays on the place it landed (spec §4). */
const ARRIVAL_MS = 1_200;

/** Where a jump lands: the element scrolled to and ringed, and the one the
 *  keyboard goes to — the control itself, inside its card, when the jump
 *  names one. */
function landingOf(target: JumpTarget): { ring: string; focus: string } {
  switch (target.kind) {
    case "setup":
      return { ring: SETUP_QUESTION_ID, focus: SETUP_QUESTION_ID };
    case "card":
    case "spec":
      return { ring: productCardId(target.productId), focus: productCardId(target.productId) };
    case "retry":
      return { ring: productCardId(target.productId), focus: productRetryId(target.productId) };
    case "build":
      return { ring: BUILD_ACTION_ID, focus: BUILD_ACTION_ID };
    case "credits":
      return { ring: CREDITS_NOTICE_ID, focus: CREDITS_NOTICE_ID };
    case "review":
      return { ring: BUILD_REVIEW_ID, focus: BUILD_REVIEW_ID };
    case "add":
      return { ring: ADD_PRODUCT_ID, focus: ADD_PRODUCT_ID };
  }
}

/** Side by side from `md` (768 px); below it the rail and the canvas are two
 *  tabs, and only one of them is on screen. */
const sideBySide = () => window.matchMedia("(min-width: 768px)").matches;

/** The gate's line for one product. A stand-in says so here too: the gate
 *  is the last thing read before credits move (review 2 I4). */
function gateLine(name: string, spec: ResolvedSpec, concept: ConceptSummary): string {
  return `${specLine(name, spec)}${concept.fallback ? " · stand-in parts" : ""}`;
}

/** The maker's sentence as the tail of another one: a companion is drawn as
 *  "Charger for a handheld soil meter…", not "…for A handheld soil meter". */
function asPhrase(prompt: string): string {
  const t = prompt.trim();
  return /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

// Turn ids the background reader has already retried once this browser
// session (e2e #4) — kept in sessionStorage, not just the in-memory ref, so
// reloading the same tab doesn't ask the model again; a fresh tab (a new
// session) still gets its one retry. Every access is wrapped: a blocked or
// full store (private browsing, quota) falls back to whatever the in-memory
// ref already knows, so the worst case is one extra read per page load,
// never a loop.
const REREAD_SESSION_KEY = "ideeza:create:reread";

function loadRereadTurnIds(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(REREAD_SESSION_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

function saveRereadTurnIds(ids: ReadonlySet<string>): void {
  try {
    window.sessionStorage.setItem(REREAD_SESSION_KEY, JSON.stringify([...ids]));
  } catch {
    // Unavailable — the in-memory ref still stops a loop within this page
    // load, just not across a reload.
  }
}

/** Ask the route whether the render has landed, until it has. The route is
 *  the one holding the deadline; this loop only stops waiting if it somehow
 *  never answers. */
async function pollUntilReady(job: string): Promise<string> {
  const deadline = Date.now() + POLL_CEILING_MS;
  for (;;) {
    if (Date.now() > deadline) throw new FailedRender("busy");
    await wait(POLL_MS);
    const res = await fetch(
      `/api/concept/generate?job=${encodeURIComponent(job)}`,
    );
    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      imageUrl?: string;
      reason?: ConceptFailReason;
    };
    if (!res.ok) throw new FailedRender(data.reason);
    if (data.status === "ready" && data.imageUrl) return data.imageUrl;
  }
}

/** Thrown by `runGeneration` so the one catch below knows which of the
 *  ways to fail it is looking at. An unknown reason is left undefined
 *  rather than guessed at — the card has a sentence for that too. */
class FailedRender extends Error {
  readonly reason?: ConceptFailReason;
  constructor(reason?: ConceptFailReason) {
    super(reason ?? "render failed");
    this.reason = reason;
  }
}

export function ConceptChat({ chatId }: { chatId: string }) {
  const {
    hydrated,
    builds,
    getChat,
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
    startBuild,
    setTurnConcept,
    setSpecEdits,
  } = useCreateHistory();
  const { incrementPrompt } = useCreatePlan();
  // Every concept render costs credits — the first draft, a refine and a
  // regenerate alike. `canAfford` gates the three controls that start one;
  // the charge itself happens in `runGeneration`, the single funnel all
  // three go through, so there is one place money can move.
  const { canAfford, charge, refund } = useCredits();
  const canRender = canAfford(CONCEPT_COST);

  const chat = getChat(chatId);

  // The projects a single-product build could join. A multi-product build
  // always makes a new one (§4.4.8 puts a system in one project), so this
  // list is only ever offered for the single case.
  const { projects } = useManualProjects();
  const setupProjects = React.useMemo(
    () =>
      projects.map((p) => {
        const n = p.products?.length || 1;
        return {
          id: p.id,
          name: p.name,
          detail: `${n} product${n === 1 ? "" : "s"} · updated ${new Date(
            p.updatedAt,
          ).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
        };
      }),
    [projects],
  );

  const [confirmFor, setConfirmFor] = React.useState<{
    turnId: string;
    imageUrl: string;
    prompt: string;
    /** One line per product — size · board · power — read before paying. */
    lines: string[];
    /** Each product's concept as it was read for those lines, by turn id —
     *  what Confirm builds from, so it doesn't queue the same readings a
     *  second time behind the gate's own (review 2 I5). */
    read: ReadonlyMap<string, ConceptSummary>;
  } | null>(null);
  const [submittingBuild, setSubmittingBuild] = React.useState(false);
  // Full-screen image editor: editorTurnId is the concept currently shown in
  // the lightbox (null = closed). Submitting an edit closes the editor; the
  // refine then continues in the thread (pending → ready), where the user can
  // watch it land and reopen Refine to iterate.
  const [focusedProduct, setFocusedProduct] = React.useState("primary");
  // Which pane a phone shows; both show from `md`.
  const [pane, setPane] = React.useState<"work" | "chat">("work");
  const [editorTurnId, setEditorTurnId] = React.useState<string | null>(null);
  // Part 4 §4.4 — the companion products offered for the concept the gate
  // is open on, and which of them are ticked. The concepts themselves live
  // in the thread, so §4.8's "deselecting preserves the concept" needs
  // nothing stored here.
  const [companionPlan, setCompanionPlan] = React.useState<Companion[]>([]);
  const [pickedCompanions, setPickedCompanions] = React.useState<Set<string>>(
    () => new Set(),
  );
  // Which concept's "Use this concept" is waiting on the summarize +
  // classify round-trips, so that one card's button can say so.
  const [preparingTurnId, setPreparingTurnId] = React.useState<string | null>(
    null,
  );
  // Which cards have their spec open. Held here, not in the card, because the
  // build path opens a card itself when that product's size can't be built.
  const [openSpecs, setOpenSpecs] = React.useState<ReadonlySet<string>>(() => new Set());
  const setSpecOpen = React.useCallback((productId: string, open: boolean) => {
    setOpenSpecs((prev) => {
      const next = new Set(prev);
      if (open) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);
  // Opens the card's spec and puts the keyboard on its size — where the
  // conflict the Build line names can be fixed.
  const focusSpec = React.useCallback(
    (productId: string) => {
      setSpecOpen(productId, true);
      setFocusedProduct(productId);
      setPane("work");
      requestAnimationFrame(() => document.getElementById(specSizeInputId(productId))?.focus());
    },
    [setSpecOpen],
  );
  const handleSpecChange = React.useCallback(
    (productId: string, edits: SpecEdits) => {
      if (!chat) return;
      const setup = chat.turns.find((t) => t.role === "setup" && t.answer);
      if (setup) setSpecEdits(chat.id, setup.id, productId, edits);
    },
    [chat, setSpecEdits],
  );
  // The maker's edits for one product, from the answered question.
  const editsFor = React.useCallback(
    (productId: string) => {
      const setup = chat?.turns.find((t) => t.role === "setup" && t.answer);
      return cleanEdits(setup?.role === "setup" ? setup.answer?.specs?.[productId] : undefined);
    },
    [chat],
  );
  // The same edits as they are now, for the build path's async steps. A size
  // typed while "Preparing the build…" is out lands after the click that
  // started it, and that click's closure still holds the size before it.
  const editsNow = React.useRef(editsFor);
  React.useEffect(() => {
    editsNow.current = editsFor;
  }, [editsFor]);
  // The build this chat started, if it has one. Derived rather than held
  // in state, so a reload lands back on the build instead of an empty
  // canvas — the job record already knows which chat it came from.
  const activeBuild = React.useMemo(() => {
    if (!chat) return null;
    let latest: BuildJob | null = null;
    for (const b of builds) {
      if (b.chatId !== chat.id) continue;
      if (!latest || b.createdAt > latest.createdAt) latest = b;
    }
    return latest;
  }, [builds, chat]);

  // The spec on each card is worked out from its concept's parts, so each
  // product's latest drawing is read as soon as it lands rather than when
  // Build is pressed. summarizeConcept runs them one at a time, and the
  // reading is kept on the turn, so a reload never asks again.
  //
  // A stand-in is kept too, so the card has something honest to show, but
  // it is not a reading: each turn asks once more per browser session —
  // once, so a model that is down is not asked in a loop, and not on every
  // reload of the same chat either (e2e #4) — and the card's Read again asks
  // whenever the maker wants.
  const reading = React.useRef(new Set<string>());
  // Hydrated from sessionStorage on first use below (retriedLoaded guards
  // against re-reading the store on every render).
  const retried = React.useRef(new Set<string>());
  const retriedLoaded = React.useRef(false);
  // The same set as state, for the card's "Reading again…".
  const [rereading, setRereading] = React.useState<ReadonlySet<string>>(() => new Set());
  const readConcept = React.useCallback(
    (turnId: string) => {
      if (!chat || reading.current.has(turnId)) return;
      reading.current.add(turnId);
      setRereading((prev) => new Set(prev).add(turnId));
      const readChatId = chat.id;
      void summarizeConcept(turnId, conceptBriefOf(chat.turns, turnId)).then((concept) => {
        setTurnConcept(readChatId, turnId, concept);
        reading.current.delete(turnId);
        setRereading((prev) => {
          const next = new Set(prev);
          next.delete(turnId);
          return next;
        });
      });
    },
    [chat, setTurnConcept],
  );
  // The turns asked again this session, read from sessionStorage once. The
  // background reader and the Build path share it, so a stand-in is asked
  // again once per session whichever of them gets there first.
  const retriedTurns = React.useCallback(() => {
    if (!retriedLoaded.current) {
      retried.current = loadRereadTurnIds();
      retriedLoaded.current = true;
    }
    return retried.current;
  }, []);

  // The build's 3D enclosure is generated where the build is reviewed, which
  // is here.
  useBuildModel(activeBuild);

  // Which concept each Regenerate came from: child turn id → source turn
  // id. The source card's Regenerate reads pressed while its child is
  // still rendering, so the click has a visible answer up where it was
  // made. Derived from the live turns, so a finished child releases the
  // button without any cleanup pass.
  const [regenSource, setRegenSource] = React.useState<
    Record<string, string>
  >({});
  const regeneratingFrom = React.useMemo(() => {
    const out = new Set<string>();
    if (!chat) return out;
    for (const t of chat.turns) {
      if (t.role !== "assistant" || t.status !== "pending") continue;
      const source = regenSource[t.id];
      if (source) out.add(source);
    }
    return out;
  }, [chat, regenSource]);

  // …and the entry goes as soon as that child leaves "pending". The map
  // is session state keyed by turn id: unpruned it grows by one entry
  // per Regenerate for as long as the chat stays open.
  const releaseRegenSource = React.useCallback((turnId: string) => {
    setRegenSource((prev) => {
      if (!(turnId in prev)) return prev;
      const next = { ...prev };
      delete next[turnId];
      return next;
    });
  }, []);


  /** Pick a render back up after a reload. No charge: this turn was paid for
   *  when it was submitted, and the job it is waiting on is the same one. */
  const resumeGeneration = React.useCallback(
    async (cid: string, turnId: string, job: string) => {
      try {
        resolveAssistantTurn(cid, turnId, await pollUntilReady(job));
      } catch (err) {
        refund(turnId);
        failAssistantTurn(
          cid,
          turnId,
          err instanceof FailedRender ? err.reason : undefined,
        );
      } finally {
        releaseRegenSource(turnId);
      }
    },
    [refund, resolveAssistantTurn, failAssistantTurn, releaseRegenSource],
  );

  const runGeneration = React.useCallback(
    async (
      cid: string,
      turnId: string,
      input: {
        prompt: string;
        kind: "fresh" | "refine";
        parentImageUrl?: string;
      },
    ) => {
      // Every generation kick — first run, refine, or regenerate —
      // counts against the user's daily prompt quota. The plan store
      // silently no-ops past the cap; surfacing a friendly cap UI is
      // out of scope here (the QuotaCard makes the limit visible).
      incrementPrompt();
      try {
        // Charged before the request, keyed by the turn the render will
        // land in, so a retry of a different turn is its own charge. The
        // controls are already disabled without the balance for it; this
        // catches a balance that ran out between the click and here, and
        // it throws so the one catch below handles both ways to fail.
        if (!charge(turnId, CONCEPT_COST, "concept")) {
          throw new FailedRender("credits");
        }
        const res = await fetch("/api/concept/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        // The route says why it could not render, and each reason needs
        // different words on the card, so the reason is carried rather than
        // flattened into one failure.
        const data = (await res.json().catch(() => ({}))) as {
          job?: string;
          reason?: ConceptFailReason;
        };
        if (!res.ok) throw new FailedRender(data.reason);
        if (!data.job) throw new FailedRender();
        // Written before the first poll: from here the render belongs to the
        // turn, not to this page load.
        setTurnJob(cid, turnId, data.job);
        resolveAssistantTurn(cid, turnId, await pollUntilReady(data.job));
      } catch (err) {
        // Nothing was rendered, so nothing is owed. This is the concept
        // counterpart of the build's system-failure refund: the user pays
        // for output, not for an attempt. A no-op when the charge never
        // landed, since a turn with no open charge has nothing to return.
        refund(turnId);
        failAssistantTurn(
          cid,
          turnId,
          err instanceof FailedRender ? err.reason : undefined,
        );
      } finally {
        // Ready or failed, the turn has left "pending": the Regenerate
        // that spawned it is free again and its entry has nothing left
        // to say.
        releaseRegenSource(turnId);
      }
    },
    [
      incrementPrompt,
      charge,
      refund,
      setTurnJob,
      resolveAssistantTurn,
      failAssistantTurn,
      releaseRegenSource,
    ],
  );

  // The questions are answered: now the renders start, one per product the
  // maker kept. The primary is the concept they described; each companion
  // inherits its parent’s words so the family reads as one design.
  const handleAnswerSetup = React.useCallback(
    (turnId: string, answer: SetupAnswer) => {
      if (!chat) return;
      const setup = chat.turns.find(
        (t) => t.id === turnId && t.role === "setup",
      );
      if (!setup || setup.role !== "setup") return;
      // The chat goes by the project's name from here on — one name for the
      // work in History, the rail and the review card alike.
      answerSetupTurn(
        chat.id,
        turnId,
        answer,
        answer.projectName.trim() ||
          projects.find((p) => p.id === answer.projectId)?.name,
      );

      // Only the turns are created here. Starting them is the auto-run
      // effect’s job, and it has the guard that stops a turn being rendered
      // — and charged — twice; kicking them off from here as well would
      // slip straight past it.
      appendAssistantTurn(chat.id, { prompt: setup.prompt, kind: "fresh" });
      for (const id of answer.picked) {
        const companion = setup.companions.find((c) => c.id === id);
        if (!companion) continue;
        // The companion inherits the parent’s words, so the products read
        // as one family rather than three unrelated objects.
        appendAssistantTurn(chat.id, {
          prompt: `${companion.name} for ${asPhrase(setup.prompt)}`,
          kind: "fresh",
          companionOf: companion.id,
        });
      }
    },
    [chat, projects, answerSetupTurn, appendAssistantTurn],
  );

  // A setup turn arrives with nothing in it. Two readings fill it, both from
  // the prompt alone and both free: what this product IS — its name and the
  // line under it, which the maker should not have to write — and what else
  // it needs. No image has been drawn and no credit has moved.
  const classified = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!hydrated || !chat) return;
    for (const turn of chat.turns) {
      if (turn.role !== "setup" || turn.status !== "loading") continue;
      if (classified.current.has(turn.id)) continue;
      classified.current.add(turn.id);
      const cid = chat.id;
      const tid = turn.id;
      const prompt = turn.prompt;
      void (async () => {
        const ask = async (path: string) => {
          try {
            const res = await fetch(path, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt }),
            });
            return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
          } catch {
            return null;
          }
        };
        // Together, so the card appears once with everything on it.
        const [plan, summary] = await Promise.all([
          ask("/api/concept/companions"),
          ask("/api/concept/summarize"),
        ]);
        setSetupDetails(cid, tid, {
          // No classification is not an error: it means no companions were
          // found, which is the ordinary single-product answer.
          companions: (plan?.companions as Companion[] | undefined) ?? [],
          productName:
            typeof summary?.title === "string" ? summary.title : undefined,
          // The description, not the parts line: this sits under the
          // product’s name, where an inventory would read as noise.
          productSummary:
            typeof summary?.description === "string"
              ? summary.description
              : undefined,
        });
      })();
    }
  }, [hydrated, chat, setSetupDetails]);


  // A product the maker passed over at the question, taken up now. The
  // turn is appended and the auto-run effect draws it, the same path every
  // other concept takes — and the answer grows, so the gate and the build
  // that follow include it without being told separately.
  const handleAddProduct = React.useCallback(
    (companionId: string) => {
      if (!chat) return;
      const setup = chat.turns.find(
        (t) => t.role === "setup" && t.status === "answered",
      );
      if (!setup || setup.role !== "setup") return;
      const companion = setup.companions.find((c) => c.id === companionId);
      if (!companion) return;
      addSetupPick(chat.id, setup.id, companionId);
      setFocusedProduct(companionId);
      appendAssistantTurn(chat.id, {
        prompt: `${companion.name} for ${asPhrase(setup.prompt)}`,
        kind: "fresh",
        companionOf: companionId,
      });
    },
    [chat, addSetupPick, appendAssistantTurn],
  );

  // The canvas's own Add a product: a name nobody offered, drawn the way a
  // product asked for in the composer is (same id, same prompt, same place
  // in the answer), so the gate and the build treat it like any other.
  const handleAddNamedProduct = React.useCallback(
    (name: string) => {
      if (!chat || !canAfford(CONCEPT_COST)) return;
      const setup = chat.turns.find(
        (t) => t.role === "setup" && t.status === "answered" && t.answer,
      );
      if (!setup || setup.role !== "setup") return;
      const id = slugFor(name);
      const already = setup.companions.find((c) => c.id === id);
      addSetupProduct(chat.id, setup.id, {
        id,
        name: already?.name ?? name,
        why: already?.why ?? `You added ${name.toLowerCase()}.`,
      });
      setFocusedProduct(id);
      appendAssistantTurn(chat.id, {
        prompt: `${name} for ${asPhrase(setup.prompt)}`,
        kind: "fresh",
        companionOf: id,
      });
    },
    [chat, canAfford, addSetupProduct, appendAssistantTurn],
  );

  // Out of the project, back in, in or out of the next build — each a change
  // to the answer alone. Nothing is drawn and nothing is charged: a removed
  // product keeps its concepts (Part 4's "re-selecting does not require
  // regeneration"), so restoring it costs nothing.
  const answeredSetupId = React.useMemo(() => {
    const t = chat?.turns.find((x) => x.role === "setup" && x.status === "answered" && x.answer);
    return t?.id ?? null;
  }, [chat]);
  const leftOutNow = React.useMemo(() => {
    const t = chat?.turns.find((x) => x.id === answeredSetupId);
    return t?.role === "setup" ? t.answer?.leftOut ?? [] : [];
  }, [chat, answeredSetupId]);
  const handleRemoveProduct = React.useCallback(
    (companionId: string) => {
      if (!chat || !answeredSetupId) return;
      dropSetupPick(chat.id, answeredSetupId, companionId);
    },
    [chat, answeredSetupId, dropSetupPick],
  );
  const handleRestoreProduct = React.useCallback(
    (companionId: string) => {
      if (!chat || !answeredSetupId) return;
      addSetupPick(chat.id, answeredSetupId, companionId);
      setFocusedProduct(companionId);
    },
    [chat, answeredSetupId, addSetupPick],
  );
  const handleToggleInBuild = React.useCallback(
    (companionId: string) => {
      if (!chat || !answeredSetupId) return;
      setSetupLeftOut(chat.id, answeredSetupId, companionId, !leftOutNow.includes(companionId));
    },
    [chat, answeredSetupId, leftOutNow, setSetupLeftOut],
  );

  // Auto-run any pending assistant turns. This handles:
  //   • the home→chat redirect (initial fresh turn comes in pending),
  //   • turns the user kicked off then refreshed away from before they
  //     finished.
  // Resolved by turn-id so it never double-fires for the same turn.
  const kickedOff = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!hydrated || !chat) return;
    for (const turn of chat.turns) {
      if (turn.role !== "assistant" || turn.status !== "pending") continue;
      if (kickedOff.current.has(turn.id)) continue;
      kickedOff.current.add(turn.id);
      // For a refine, we need the parent image as visual context.
      const parent =
        turn.kind === "refine" && turn.parentTurnId
          ? chat.turns.find(
              (x) =>
                x.id === turn.parentTurnId &&
                x.role === "assistant" &&
                x.status === "ready",
            )
          : null;
      const parentImageUrl =
        parent && parent.role === "assistant" ? parent.imageUrl : undefined;
      // A turn that already holds a job was submitted before this page load —
      // resuming it is the difference between watching the render you paid
      // for and paying for a second one.
      if (turn.renderJob) {
        resumeGeneration(chat.id, turn.id, turn.renderJob);
        continue;
      }
      runGeneration(chat.id, turn.id, {
        prompt: turn.prompt,
        kind: turn.kind,
        parentImageUrl,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, chat?.id, chat?.turns]);

  // One lineage label per concept — the same map the thread renders from,
  // so every surface names a concept identically.
  const labels = React.useMemo(
    () => conceptLabels(chat?.turns ?? []),
    [chat?.turns],
  );

  // Which product the composer is talking about. It used to be "the last
  // turn that happened to finish", which with more than one product is not a
  // choice at all — the drone and its remote render in parallel, so whichever
  // crossed the line last became the thing your next sentence refined. That
  // was usually the first card, and never something the maker had picked.
  //
  // It is the product they last picked instead — its row, or Refine,
  // Regenerate or Add on its card. The primary until then, and the composer
  // says which so it is never a guess. Only that product's own drawing: one
  // with none yet (a failed first render, one still drawing) holds the send
  // rather than refining another product's drawing in its name.
  const target = React.useMemo(
    () => composerTarget(chat ?? NO_CHAT, focusedProduct),
    [chat, focusedProduct],
  );

  // The project this chat's work belongs to, by name: typed at the question
  // for a new one, or the existing project picked there.
  const projectName = React.useMemo(() => {
    const setup = chat?.turns.find((t) => t.role === "setup");
    if (setup?.role !== "setup" || !setup.answer) return "";
    return (
      setup.answer.projectName.trim() ||
      projects.find((p) => p.id === setup.answer!.projectId)?.name ||
      ""
    );
  }, [chat, projects]);

  // The project a finished build was saved into, by the name it has now.
  const savedName = React.useMemo(() => {
    const id = activeBuild?.projectId;
    return id ? projects.find((p) => p.id === id)?.name : undefined;
  }, [activeBuild, projects]);

  // Everything the rail and the page's announcer say, worked out once.
  const rail = useRailModel(chat ?? NO_CHAT, activeBuild, labels, projectName, savedName);

  // The background reader described at `readConcept`: each product the
  // project holds, by its current concept — the rail's own list, so a
  // product taken out of the project isn't read for nothing.
  const projectProducts = rail.state.products;
  React.useEffect(() => {
    if (!chat) return;
    const asked = retriedTurns();
    for (const t of projectProducts) {
      if (t.status !== "ready") continue;
      // A stored concept that doesn't check out is read as if absent.
      const kept = asConceptSummary(t.concept);
      if (kept && !kept.fallback) continue;
      if (kept && asked.has(t.id)) continue;
      asked.add(t.id);
      saveRereadTurnIds(asked);
      readConcept(t.id);
    }
  }, [chat, projectProducts, readConcept, retriedTurns]);

  // The ring a jump left on where it landed, and the timer that takes it off.
  // Set on the element itself rather than through state: it lasts a second,
  // and threading it through the canvas would re-render every card for it.
  const arrived = React.useRef<{ el: HTMLElement; timer: number } | null>(null);
  React.useEffect(
    () => () => {
      if (arrived.current) window.clearTimeout(arrived.current.timer);
    },
    [],
  );

  // Take the maker to a place on the canvas (spec §4): scrolled in, ringed
  // for a moment, and — when `focus` — the keyboard on it. On a phone the
  // canvas is the other tab, so it is shown first; without that there is
  // nothing on screen to scroll to.
  const jumpTo = React.useCallback(
    (target: JumpTarget, { focus }: { focus: boolean }) => {
      if (!sideBySide()) setPane("work");
      // The size field is reached the way the Build line reaches it: the spec
      // opens and the keyboard lands on the size.
      if (target.kind === "spec") focusSpec(target.productId);
      const land = landingOf(target);
      // After the tab switch and the opened spec have rendered.
      requestAnimationFrame(() => {
        const ring = document.getElementById(land.ring);
        if (!ring) return;
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        ring.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
        const prev = arrived.current;
        if (prev) {
          window.clearTimeout(prev.timer);
          prev.el.removeAttribute("data-arrived");
        }
        ring.setAttribute("data-arrived", "true");
        arrived.current = {
          el: ring,
          timer: window.setTimeout(() => {
            ring.removeAttribute("data-arrived");
            arrived.current = null;
          }, ARRIVAL_MS),
        };
        if (!focus || target.kind === "spec") return;
        const control = document.getElementById(land.focus);
        control?.focus({ preventScroll: true });
        // A Try again that can't be pressed (no credits) takes no focus; the
        // card it sits in, whose words say why, does.
        if (document.activeElement !== control) ring.focus({ preventScroll: true });
      });
    },
    [focusSpec],
  );

  // A rail row: the composer, the row and the review's product tab all follow
  // `focusedProduct`, and the canvas brings that product into view — its tab
  // in the review when the build holds it, else its card: the review has no
  // tab for a product added or left out before the build, and showed another
  // product's deliverables under its name. Side by side the keyboard stays on
  // the row, so the maker can go on choosing with the canvas in view; on a
  // phone the rail has just been hidden, so it goes to the canvas.
  const railRows = rail.rows;
  const selectProduct = React.useCallback(
    (productId: string) => {
      setFocusedProduct(productId);
      const inReview = railRows.find((r) => r.productId === productId)?.build;
      jumpTo(inReview ? { kind: "review" } : { kind: "card", productId }, {
        focus: !sideBySide(),
      });
    },
    [railRows, jumpTo],
  );

  // The setup question is still open. Typing then used to skip it: the text
  // started a paid render of its own beside the unanswered question.
  const setupPending = React.useMemo(
    () =>
      !!chat?.turns.some((t) => t.role === "setup" && t.status !== "answered"),
    [chat],
  );

  // The concept open in the editor, and which refine of it the next edit
  // will be — the editor names the number the result will carry.
  const editorConceptLabel = editorTurnId
    ? (labels.get(editorTurnId) ?? "1")
    : "1";
  const editorNextRefineIndex = React.useMemo(() => {
    if (!chat || !editorTurnId) return 1;
    let n = 0;
    for (const t of chat.turns) {
      if (
        t.role === "assistant" &&
        t.kind === "refine" &&
        t.parentTurnId === editorTurnId
      ) {
        n += 1;
      }
    }
    return n + 1;
  }, [chat, editorTurnId]);

  const handleUserSubmit = React.useCallback(
    (text: string) => {
      if (!chat || !canAfford(CONCEPT_COST) || setupPending) return;
      // The composer is held for this already; a sentence that reaches here
      // anyway must not be drawn over some other product's concept.
      if (target.kind === "blocked") return;
      appendUserTurn(chat.id, text);

      // Two different things get typed into this box, and treating them the
      // same is what made the composer feel like a text field rather than an
      // agent: "make it matte black" is a change to the product on screen,
      // and "add a charger" is another product for the project. The second
      // used to be refined into the first — asking for a charger redrew the
      // phone — so it is read for what it is and started as its own product,
      // with its own card, its own place in the rail and its own five
      // deliverables when the build runs.
      const asked = parseProductRequest(text);
      const setup = chat.turns.find(
        (t) => t.role === "setup" && t.status === "answered" && t.answer,
      );
      if (asked && setup && setup.role === "setup") {
        const id = slugFor(asked.name);
        const already = setup.companions.find((c) => c.id === id);
        // Asking twice for the same product is not two products. The second
        // ask draws it again, which is a regenerate of the one that exists.
        addSetupProduct(chat.id, setup.id, {
          id,
          name: already?.name ?? asked.name,
          why: already?.why ?? `You asked for ${asked.name.toLowerCase()}.`,
        });
        setFocusedProduct(id);
        appendAssistantTurn(chat.id, {
          prompt: `${asked.name} for ${asPhrase(setup.prompt)}`,
          kind: "fresh",
          companionOf: id,
        });
        return;
      }
      // Prompt-bar submissions REFINE the focused product's latest concept
      // (spec §4b). Only a chat with nothing drawn at all takes a fresh one.
      if (target.kind === "refine") {
        appendAssistantTurn(chat.id, {
          prompt: text,
          kind: "refine",
          parentTurnId: target.turn.id,
          // A refine is a new take on the SAME product. Without this it
          // landed under the primary, so refining the remote controller
          // replaced the drone's card instead of its own.
          companionOf: target.turn.companionOf,
        });
        return;
      }
      appendAssistantTurn(chat.id, { prompt: text, kind: "fresh" });
    },
    [
      chat,
      canAfford,
      setupPending,
      target,
      appendUserTurn,
      appendAssistantTurn,
      addSetupProduct,
    ],
  );

  const handleRegenerate = React.useCallback(
    (sourcePrompt: string, sourceTurnId: string) => {
      if (!chat || !canAfford(CONCEPT_COST)) return;
      const acted = chat.turns.find((x) => x.id === sourceTurnId);
      if (acted?.role === "assistant") {
        setFocusedProduct(acted.companionOf ?? "primary");
      }
      // Regenerate (spec §4c) is a FRESH take on the same prompt — it
      // ignores the existing image. No new user turn because the user
      // didn't retype anything.
      const source = chat.turns.find((x) => x.id === sourceTurnId);
      const { turnId } = appendAssistantTurn(chat.id, {
        prompt: sourcePrompt,
        kind: "fresh",
        // A fresh take on a companion is still that companion's.
        companionOf:
          source?.role === "assistant" ? source.companionOf : undefined,
      });
      setRegenSource((prev) => ({ ...prev, [turnId]: sourceTurnId }));
    },
    [chat, canAfford, appendAssistantTurn],
  );

  // The one path from an approved concept to a booked build. Both the
  // gate's Confirm and the skip that replaces it when the gate has been
  // dismissed (spec §4.5) come through here, so a dismissed gate cannot
  // start a different kind of build from the one the dialog starts.
  // §4.4.2 — a build books ONE job for every product that is ready: the
  // primary, plus each companion whose concept has landed, summarised the
  // way the primary is so every product's deliverables come from a real
  // parts list rather than from its name. A companion still waiting on its
  // concept is simply not built (§4.4.4) — its row said it needs one.
  //
  // It takes the companions rather than reading them out of state, because
  // one of its callers decides them in the very tick it calls: the gate's
  // dismissed path runs inside the click that sets `companionPlan`, and
  // React has not re-rendered yet, so reading state there saw the previous
  // value — empty — and a dismissed gate booked a three-product project as
  // one product, silently, at the price of three.
  //
  // Every product's concept on this path is read the same way: the reading
  // kept on the turn, checked, is used as is — but a kept stand-in is asked
  // again, and a real answer that comes back is kept on the turn too, so the
  // card stops showing parts the build won't use.
  //
  // That ask happens once per browser session, by whichever of this path and
  // the background reader gets there first. With the model down every ask
  // queues for up to 45 s, one product at a time, so asking on every Build
  // press held "Preparing the build…" for minutes. A turn already asked again
  // is built from its stand-in, which the card, the rail and the gate all say
  // it is — unless that ask is still out, which this waits on rather than
  // starting another.
  const readForBuild = React.useCallback(
    async (turn: Extract<ChatTurn, { role: "assistant" }>, brief: string) => {
      const kept = asConceptSummary(turn.concept);
      if (kept?.fallback) {
        const asked = retriedTurns();
        if (asked.has(turn.id) && !reading.current.has(turn.id)) return kept;
        asked.add(turn.id);
        saveRereadTurnIds(asked);
      }
      const concept = await summarizeConcept(turn.id, brief, kept);
      if (chat && kept?.fallback && !concept.fallback) setTurnConcept(chat.id, turn.id, concept);
      return concept;
    },
    [chat, setTurnConcept, retriedTurns],
  );
  const companionProductsFor = React.useCallback(
    async (
      companions: Companion[],
      /** The readings the gate's lines were drawn from, by turn id. A turn
       *  found here isn't read again. */
      read: ReadonlyMap<string, ConceptSummary> = new Map(),
    ): Promise<Omit<BuildProduct, "items">[]> => {
      if (!chat || !companions.length) return [];
      const turnFor = (id: string) => {
        for (let i = chat.turns.length - 1; i >= 0; i -= 1) {
          const t = chat.turns[i];
          if (
            t.role === "assistant" &&
            t.companionOf === id &&
            t.status === "ready" &&
            t.imageUrl
          ) {
            return t;
          }
        }
        return null;
      };
      const ready = companions
        .map((c) => ({ companion: c, turn: turnFor(c.id) }))
        .filter(
          (
            x,
          ): x is {
            companion: Companion;
            turn: ChatTurn & { role: "assistant" };
          } => x.turn !== null,
        );
      return Promise.all(
        ready.map(({ companion, turn }) => {
          const brief = conceptBriefOf(chat.turns, turn.id);
          const known = read.get(turn.id);
          return (known ? Promise.resolve(known) : readForBuild(turn, brief)).then((concept) => {
            const spec = deriveSpec(concept.parts, concept.hints, editsNow.current(companion.id));
            return {
              id: companion.id,
              name: companion.name,
              conceptImageUrl: turn.imageUrl ?? "",
              conceptPrompt: brief,
              // The name the canvas and the rail already call it, as the
              // primary keeps the name its question gave it.
              title: companion.name || concept.title,
              summary: concept.summary,
              description: concept.description,
              parts: partsForBuild(concept.parts, spec.battery),
              spec,
            };
          });
        }),
      );
    },
    [chat, readForBuild],
  );

  const startBuildFor = React.useCallback(
    async (
      source: { turnId: string; imageUrl: string; prompt: string },
      concept: ConceptSummary,
      // §4.4 — the companion products whose concepts are ready. Empty on
      // every single-product build.
      companions: Omit<BuildProduct, "items">[] = [],
    ) => {
      if (!chat) return;
      // Checked again against the edits as they are now, not as they were
      // when the gate's lines were drawn: a size typed while the build was
      // being prepared, and not yet committed, commits on blur — which is
      // the gate taking focus as it opens, one edit after its lines. A
      // product that no longer fits is not booked; the gate closes on its
      // size instead.
      const spec = deriveSpec(concept.parts, concept.hints, editsNow.current("primary"));
      const blocked = blocksBuild(spec)
        ? "primary"
        : companions.find((c) => c.spec && blocksBuild(c.spec))?.id;
      if (blocked) {
        setConfirmFor(null);
        // After the gate has closed and handed focus back to Build.
        requestAnimationFrame(() => focusSpec(blocked));
        return;
      }
      setSubmittingBuild(true);
      try {
        await fetch("/api/build/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: chat.id,
            turnId: source.turnId,
            imageUrl: source.imageUrl,
            prompt: source.prompt,
          }),
        }).catch(() => null);
        // The concept as the summarizer read it — the same title, parts
        // line and parts the gate would have shown, so every deliverable
        // is derived from the concept that was approved.
        // The project was settled at the question — an existing one for a
        // single product, a new one by name for a system. It rides the job so
        // the Brief's Step 1 opens on that answer instead of an empty chooser
        // asking the maker the same thing a second time.
        const answered = chat.turns.find(
          (t) => t.role === "setup" && t.status === "answered" && t.answer,
        );
        const decidedProject =
          answered && answered.role === "setup" ? answered.answer : undefined;
        // One name for the product from the question onwards: the name the
        // setup question gave it is what the rail, the cards and the composer
        // already call it, so the build carries that rather than a second
        // reading of the same concept.
        const namedAt =
          answered && answered.role === "setup"
            ? answered.productName?.trim()
            : undefined;
        startBuild({
          chatId: chat.id,
          turnId: source.turnId,
          imageUrl: source.imageUrl,
          prompt: source.prompt,
          conceptNumber: labels.get(source.turnId) ?? "1",
          title: namedAt || concept.title || deriveTitle(source.prompt),
          summary: concept.summary,
          description: concept.description,
          projectChoiceId: decidedProject?.projectId,
          projectChoiceName: decidedProject?.projectName,
          parts: partsForBuild(concept.parts, spec.battery),
          spec,
          companions,
        });
        // The build does NOT leave the chat. It used to push /build/<id>,
        // a separate full-screen page with a Back link, which threw away
        // the conversation, the rail and the composer at the exact moment
        // the work got interesting. The job is derived from this chat, so
        // it simply takes over the canvas, and a queued job says what it is
        // waiting for in the rail, where its Cancel is.
      } finally {
        setSubmittingBuild(false);
        setConfirmFor(null);
      }
    },
    [chat, labels, startBuild, focusSpec],
  );

  // The last step before money moves is always the gate. It used to offer
  // "Don't show this again", which removed the only confirmation of a spend
  // for good — nothing anywhere could bring it back.
  const goToGate = React.useCallback(
    (
      source: { turnId: string; imageUrl: string; prompt: string },
      lines: string[],
      read: ReadonlyMap<string, ConceptSummary>,
    ) => {
      setConfirmFor({ ...source, lines, read });
    },
    [],
  );

  // Part 4 §4.4.2 — accepting a concept branches here: the flow asks
  // whether this product is part of a multi-product system and, if it is,
  // offers the other products before anything is generated. Most concepts
  // are not (§4.4.3), and those users go straight on to the gate without
  // ever seeing the screen.
  const handleUseTurn = React.useCallback(
    (turnId: string) => {
      if (!chat) return;
      const t = chat.turns.find((x) => x.id === turnId);
      if (!t || t.role !== "assistant" || !t.imageUrl) return;
      // A companion's own concept does not branch again: §4.4.7 is flat,
      // so a remote has no companions of its own.
      const source = {
        turnId: t.id,
        imageUrl: t.imageUrl,
        prompt: conceptBriefOf(chat.turns, t.id),
      };
      const names = rail.state.setup;
      if (t.companionOf) {
        const companionId = t.companionOf;
        const name = productNameOf(names, t);
        void readForBuild(t, source.prompt).then((concept) => {
          const spec = deriveSpec(concept.parts, concept.hints, editsNow.current(companionId));
          // A size that can't be built goes to its card, as the primary's does.
          if (blocksBuild(spec)) focusSpec(companionId);
          else
            goToGate(source, [gateLine(name || concept.title, spec, concept)], new Map([[t.id, concept]]));
        });
        return;
      }
      // What this build contains was settled before anything was drawn, in
      // the setup question, and every product it names already has a concept
      // in the thread. Classifying again here asked the model the same
      // question a second time and got a different answer — a list the maker
      // had never seen, with their own decision thrown away. The gate reads
      // the decision; it does not retake it.
      const setup = chat.turns.find(
        (x) => x.role === "setup" && x.status === "answered" && x.answer,
      );
      // Ticked off on the canvas means not in this build: the product stays
      // in the project, its concept kept, and the price leaves it out.
      const decided =
        setup && setup.role === "setup" && setup.answer
          ? setup.companions.filter(
              (c) =>
                setup.answer!.picked.includes(c.id) &&
                !(setup.answer!.leftOut ?? []).includes(c.id),
            )
          : [];
      setCompanionPlan(decided);
      // Ticked, because each of these was chosen and drawn already. The box
      // is still there: building a product costs again, so dropping one
      // before paying is a real decision — just not the same one.
      setPickedCompanions(new Set(decided.map((c) => c.id)));

      // Every chosen product is read before the gate opens — one at a time,
      // through the same queue as the background reader — so the gate can
      // say what each will be, and a size that can't be built is caught here
      // even when the reading landed after the card last rendered.
      const latestReady = (id: string) => {
        for (let i = chat.turns.length - 1; i >= 0; i -= 1) {
          const x = chat.turns[i];
          if (x.role === "assistant" && x.companionOf === id && x.status === "ready") return x;
        }
        return null;
      };
      const reads = [
        { productId: "primary", turn: t },
        ...decided.flatMap((c) => {
          const turn = latestReady(c.id);
          return turn ? [{ productId: c.id, turn }] : [];
        }),
      ];
      setPreparingTurnId(t.id);
      void (async () => {
        const concepts: ConceptSummary[] = [];
        for (const r of reads) {
          concepts.push(await readForBuild(r.turn, conceptBriefOf(chat.turns, r.turn.id)));
        }
        // Worked out once every reading is in, from the edits as they are
        // then — the readings can take seconds, and the card stays editable.
        const read = reads.map((r, i) => {
          const spec = deriveSpec(concepts[i].parts, concepts[i].hints, editsNow.current(r.productId));
          const name = productNameOf(names, r.turn) || concepts[i].title;
          return { productId: r.productId, line: gateLine(name, spec, concepts[i]), spec };
        });
        const blocked = read.find((r) => blocksBuild(r.spec));
        if (blocked) focusSpec(blocked.productId);
        else
          goToGate(
            source,
            read.map((r) => r.line),
            new Map(reads.map((r, i) => [r.turn.id, concepts[i]])),
          );
      })().finally(() => setPreparingTurnId(null));
    },
    [chat, rail.state.setup, goToGate, readForBuild, focusSpec],
  );



  // Open the full-screen editor on a specific concept image.
  const handleOpenEditor = React.useCallback(
    (turnId: string) => {
      const t = chat?.turns.find((x) => x.id === turnId);
      if (t?.role === "assistant") setFocusedProduct(t.companionOf ?? "primary");
      setEditorTurnId(turnId);
    },
    [chat],
  );

  // Submit an edit from the editor — refine the SHOWN image (same concept,
  // evolved by the change) and CLOSE the editor. The refine runs in the
  // thread (pending → ready); the user watches it land there and can reopen
  // Refine on the result to keep iterating.
  const handleSubmitEdit = React.useCallback(
    (text: string) => {
      if (!chat || !editorTurnId || !canAfford(CONCEPT_COST)) return;
      const parent = chat.turns.find((x) => x.id === editorTurnId);
      if (
        !parent ||
        parent.role !== "assistant" ||
        parent.status !== "ready" ||
        !parent.imageUrl
      ) {
        return;
      }
      appendUserTurn(chat.id, text);
      appendAssistantTurn(chat.id, {
        prompt: text,
        kind: "refine",
        parentTurnId: editorTurnId,
        companionOf: parent.companionOf,
      });
      // Close the editor — the refine continues in the thread below.
      setEditorTurnId(null);
    },
    [
      chat,
      canAfford,
      editorTurnId,
      appendUserTurn,
      appendAssistantTurn,
    ],
  );

  // The products the gate is about to charge for, by the names the canvas
  // gives them. Empty when there is no answered question to name them from,
  // and the gate then falls back to the concept's own title.
  const gateNames = React.useMemo(() => {
    if (!chat || !confirmFor) return [];
    const source = chat.turns.find((t) => t.id === confirmFor.turnId);
    if (source?.role === "assistant" && source.companionOf) return [];
    const setup = chat.turns.find(
      (t) => t.role === "setup" && t.status === "answered",
    );
    const primary =
      setup && setup.role === "setup" ? setup.productName?.trim() : undefined;
    if (!primary) return [];
    return [
      primary,
      ...companionPlan
        .filter((c) => pickedCompanions.has(c.id))
        .map((c) => c.name),
    ];
  }, [chat, confirmFor, companionPlan, pickedCompanions]);

  const handleConfirmBuild = React.useCallback(
    async (concept: ConceptSummary) => {
      if (!confirmFor) return;
      // Busy on the click itself. Reading each product's concept back is a
      // round-trip per product, and `startBuildFor` — which used to be the
      // first thing to set this — only runs once they have all answered. So
      // the press that begins seconds of work left the button reading
      // "Generate", undimmed and apparently idle, and people pressed it
      // again believing they had missed.
      setSubmittingBuild(true);
      try {
        // The readings the gate's lines came from, not a second round of
        // them: with the model down each companion queued up to 45 s again
        // here, behind the gate's own read of the primary. The gate's
        // reading of the primary wins only when it is a real one — a model
        // that answered while the gate was open — and is kept on the turn.
        const readBefore = confirmFor.read.get(confirmFor.turnId);
        const primary = concept.fallback && readBefore ? readBefore : concept;
        if (chat && !concept.fallback && readBefore?.fallback) {
          setTurnConcept(chat.id, confirmFor.turnId, concept);
        }
        // Each companion's spec is worked out here, at the press, from the
        // edits as they are now; `startBuildFor` does the primary's and
        // books nothing if any of them no longer fits.
        const companions = await companionProductsFor(
          companionPlan.filter((c) => pickedCompanions.has(c.id)),
          confirmFor.read,
        );
        await startBuildFor(confirmFor, primary, companions);
      } finally {
        setSubmittingBuild(false);
      }
    },
    [
      chat,
      confirmFor,
      companionPlan,
      pickedCompanions,
      companionProductsFor,
      startBuildFor,
      setTurnConcept,
    ],
  );

  if (!hydrated) {
    return <LoadingShell />;
  }
  if (!chat) {
    return <NotFoundShell />;
  }

  const editorTurn = editorTurnId
    ? chat.turns.find((x) => x.id === editorTurnId)
    : null;
  const editorImage =
    editorTurn && editorTurn.role === "assistant"
      ? (editorTurn.imageUrl ?? null)
      : null;
  const editorProduct =
    editorTurn?.role === "assistant" ? productNameOf(rail.state.setup, editorTurn) : undefined;

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* The page's one h1, for the heading outline a screen reader walks,
          ahead of both panes: inside the canvas it came after the rail's
          h2 and h3s, so the outline opened on those. The rail and the
          review card already say the name on screen. */}
      <h1 className="sr-only">{chat.title}</h1>
      {/* The one place a screen reader hears the flow change — outside both
          panes, since on a phone the rail is hidden while the canvas shows,
          and that is where the maker is when a render lands. */}
      <RailAnnouncer model={rail} />
      {/* At phone width the two panes are two tabs — side by side they needed
          1000 px and the canvas was simply off the screen. The canvas leads,
          because the question and the work are there; the chat tab carries
          the account and the composer. */}
      <div
        role="tablist"
        aria-label="Chat panes"
        className="flex shrink-0 gap-[4px] border-b border-solid border-border bg-bg-surface px-[12px] py-[8px] md:hidden"
      >
        {(
          [
            ["work", "Canvas"],
            ["chat", "Chat"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pane === id}
            onClick={() => setPane(id)}
            className={[
              "inline-flex h-[36px] flex-1 items-center justify-center rounded-lg text-md font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
              pane === id
                ? "bg-bg-subtle text-text-primary"
                : "text-text-secondary hover:bg-bg-subtle",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
      {/* Two panes, the shape the work actually has: the rail on the left is
          the project's status board — where it is, the one thing to do next,
          each product's state, and the history folded under them — and the
          canvas beside it is where the work appears, questions first and then
          the concepts. A render takes the better part of a minute and a
          multi-product build runs several at once, so the account of it needs
          its own column rather than competing with the output for the same
          one. */}
      <aside
        aria-label="Project"
        className={[
          "min-h-0 flex-1 flex-col border-solid border-border bg-bg-surface md:w-[360px] md:flex-none md:shrink-0 md:border-r",
          pane === "chat" ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        <div className="flex-1 overflow-y-auto">
          <ProjectRail
            model={rail}
            focusedProduct={focusedProduct}
            onSelectProduct={selectProduct}
            onJump={(target) => jumpTo(target, { focus: true })}
            // The whole-build states — queued with its Cancel, waiting on
            // credits, a partial or system failure with its retry, the
            // overrun stop — say what the build is doing, so while it isn't
            // ready they are the next step. Each piece is on its product's row.
            slot={
              activeBuild && statusOf(activeBuild) !== "ready" ? (
                <BuildStatus job={activeBuild} statesOnly inChat />
              ) : undefined
            }
          />
        </div>
        <div className="border-t border-solid border-border">
          <div className="w-full px-[14px] py-[14px]">
          <PromptBar
            onSubmit={(text) => {
              handleUserSubmit(text);
              // On a phone the answer appears on the other tab.
              setPane("work");
            }}
            canRender={canRender}
            blockedReason={
              setupPending
                ? "Answer the question first"
                : target.kind === "blocked"
                  ? target.hint
                  : undefined
            }
            enhanceMode={target.kind === "refine" ? "change" : "brief"}
            placeholder={
              target.kind === "refine"
                ? `Describe a change to ${target.name}…`
                : undefined
            }
          />
          <p className="mt-[8px] text-center text-sm font-regular text-text-tertiary">
            {!canRender
              ? "You are out of credits — top them up to draw another concept."
              : setupPending
                ? "Answer the question on the canvas first — nothing is drawn or charged until you do."
                : target.kind === "blocked"
                  ? `${target.hint}.`
                  : target.kind === "refine"
                    ? `Refines ${target.name} · ${CONCEPT_COST} credit.${
                        // A chat from before the question has one product and
                        // nowhere to add another.
                        rail.state.setup ? " Pick another product above, or name a new one to add it." : ""
                      }`
                    : `Each drawing costs ${CONCEPT_COST} credit.`}
          </p>
          </div>
        </div>
      </aside>

      {/* The canvas. The questions land here first, then the concepts —
          side by side, because a system build draws several at once. It takes
          the whole width it is given: the 880 px measure that used to cap it
          was a prose measure on a surface that carries no prose, so a wide
          screen spent everything past it on empty page while the product tabs,
          the deliverable tabs and the concept grid — all of which grow into
          width — sat squeezed against the rail. */}
      <main
        className={[
          "min-h-0 flex-1 overflow-y-auto bg-bg-page",
          pane === "work" ? "block" : "hidden md:block",
        ].join(" ")}
      >
        <div className="w-full px-[16px] py-[20px] md:px-[32px] md:py-[32px]">
          <ChatThread
            chat={chat}
            regeneratingFrom={regeneratingFrom}
            preparingTurnId={preparingTurnId}
            projects={setupProjects}
            onAnswerSetup={handleAnswerSetup}
            projectName={projectName}
            onRegenerateAt={handleRegenerate}
            onBuild={handleUseTurn}
            onRefineTurn={handleOpenEditor}
            onAddProduct={handleAddProduct}
            onAddNamedProduct={handleAddNamedProduct}
            onRemoveProduct={handleRemoveProduct}
            onRestoreProduct={handleRestoreProduct}
            onToggleInBuild={handleToggleInBuild}
            job={activeBuild}
            focusedProduct={focusedProduct}
            onFocusProduct={setFocusedProduct}
            openSpecs={openSpecs}
            onSpecOpenChange={setSpecOpen}
            onFocusSpec={focusSpec}
            onSpecChange={handleSpecChange}
            rereading={rereading}
            onRereadConcept={readConcept}
          />
        </div>
      </main>

      {/* Part 4 §4.4.2 — the products this build covers are chosen here,
          in the same dialog that confirms the build. One decision, one
          surface: a separate screen in front of this one asked the user
          to approve the same build twice. */}
      <ConfirmBuildDialog
        open={confirmFor !== null}
        turnId={confirmFor?.turnId ?? ""}
        conceptPrompt={confirmFor?.prompt ?? ""}
        initialConcept={confirmFor?.read.get(confirmFor.turnId)}
        products={pickedCompanions.size + 1}
        productNames={gateNames}
        specLines={confirmFor?.lines ?? []}
        submitting={submittingBuild}
        onCancel={() => setConfirmFor(null)}
        onConfirm={handleConfirmBuild}
      />

      <ImageEditorModal
        open={editorTurnId !== null && editorImage !== null}
        image={editorImage}
        conceptLabel={editorConceptLabel}
        nextRefineIndex={editorNextRefineIndex}
        productName={editorProduct}
        onClose={() => setEditorTurnId(null)}
        onSubmitEdit={handleSubmitEdit}
      />
    </div>
  );
}

// The page's own shape while the chat is read from storage — the rail's
// header, next step and product rows, the composer and two cards — so nothing
// jumps when it lands. It was a line of centred text. Below `md` the page is
// two tabs over the canvas, so the shape there is the tab bar and the cards.
function LoadingShell() {
  return (
    <div role="status" aria-label="Loading the chat" className="flex h-full flex-col md:flex-row">
      <span className="sr-only">Loading the chat</span>
      <div className="flex shrink-0 gap-[4px] border-b border-solid border-border bg-bg-surface px-[12px] py-[8px] motion-safe:animate-pulse md:hidden">
        <div className="h-[36px] flex-1 rounded-lg bg-bg-subtle" />
        <div className="flex h-[36px] flex-1 items-center justify-center rounded-lg">
          <div className="h-[12px] w-[48px] rounded bg-bg-subtle" />
        </div>
      </div>
      <div className="hidden w-[360px] shrink-0 flex-col border-r border-solid border-border bg-bg-surface motion-safe:animate-pulse md:flex">
        <div className="flex flex-col gap-[8px] border-b border-solid border-border px-[18px] pb-[14px] pt-[16px]">
          <div className="h-[14px] w-[140px] rounded bg-bg-subtle" />
          <div className="h-[12px] w-[220px] rounded bg-bg-subtle" />
          <div className="h-[12px] w-[180px] rounded bg-bg-subtle" />
        </div>
        <div className="px-[10px] pt-[14px]">
          <div className="h-[64px] w-full rounded-xl bg-bg-subtle" />
        </div>
        <div className="flex flex-col gap-[2px] px-[18px] pt-[18px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex h-[56px] items-center gap-[12px]">
              <div className="h-[40px] w-[40px] shrink-0 rounded-lg bg-bg-subtle" />
              <div className="flex flex-col gap-[6px]">
                <div className="h-[12px] w-[140px] rounded bg-bg-subtle" />
                <div className="h-[12px] w-[100px] rounded bg-bg-subtle" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto border-t border-solid border-border px-[14px] py-[14px]">
          <div className="h-[96px] w-full rounded-2xl bg-bg-subtle" />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(280px,1fr))] content-start gap-[20px] bg-bg-page px-[16px] py-[20px] motion-safe:animate-pulse md:px-[32px] md:py-[32px]">
        <div className="aspect-[64/53] w-full max-w-[640px] rounded-2xl bg-bg-subtle" />
        <div className="aspect-[64/53] w-full max-w-[640px] rounded-2xl bg-bg-subtle" />
      </div>
    </div>
  );
}

function NotFoundShell() {
  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col items-center justify-center gap-[16px] px-[24px] text-center">
      <p className="text-sm font-medium text-text-tertiary">Concept chat</p>
      <h1 className="text-2xl font-bold text-text-primary">
        We couldn&apos;t find this chat
      </h1>
      <p className="text-md text-text-secondary">
        It may have been cleared from this browser. Start a new one from the
        home prompt.
      </p>
      <Link
        href="/"
        className="inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Back to Home
      </Link>
    </div>
  );
}
