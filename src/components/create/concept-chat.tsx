"use client";

// ConceptChat — Phase 1 orchestrator. Owns the per-page UI state:
//   • prompt bar submissions    → /api/concept/generate + new turn
//   • per-image Regenerate       → /api/concept/generate + new turn
//                                  using the source prompt (never
//                                  overwrites the older turn)
//   • per-image "Use this"       → opens ConfirmBuildDialog with that
//                                  specific image+prompt
//   • ConfirmBuildDialog confirm → /api/build/start + record job in
//                                  the Project create history + route
//                                  to /build/[jobId] — unless the job
//                                  queues behind another build, in which
//                                  case we stay in the chat and show a
//                                  queued notice instead

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cancel01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  deriveTitle,
  queuedAhead,
  useCreateHistory,
  type BuildJob,
  type BuildProduct,
  type ChatTurn,
  type ConceptFailReason,
  type SetupAnswer,
} from "@/lib/create/history";
import type { ConceptSummary } from "@/lib/create/concept";
import { useCreatePlan } from "@/lib/create/plan";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { useManualProjects } from "@/lib/manual/projects";
import { ChatRail } from "./chat-rail";
import { ChatThread, conceptLabels } from "./chat-thread";
import { PromptBar } from "./prompt-bar";
import { ConfirmBuildDialog, summarizeConcept } from "./confirm-build-dialog";
import type { CompanionTurn } from "./confirm-build-dialog";
import {
  SINGLE_PRODUCT,
  companionId,
  type Companion,
  type CompanionPlan,
} from "@/lib/create/companions";
import { readGateDismissed } from "@/lib/create/gate-preference";

// Part 4 §4.8 — "the list is generated once and locked for that concept",
// so the answer is cached per turn and an in-flight request is shared. A
// classifier that cannot be reached answers SINGLE_PRODUCT, which is both
// the common case and the safe one: a wrong companion list sends the user
// down a branch that costs credits.
const companionCache = new Map<string, CompanionPlan>();
const companionPending = new Map<string, Promise<CompanionPlan>>();

function classifyCompanions(
  turnId: string,
  prompt: string,
  title: string,
): Promise<CompanionPlan> {
  const cached = companionCache.get(turnId);
  if (cached) return Promise.resolve(cached);
  const inFlight = companionPending.get(turnId);
  if (inFlight) return inFlight;
  const request = (async (): Promise<CompanionPlan> => {
    try {
      const res = await fetch("/api/concept/companions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, title }),
      });
      if (!res.ok) return SINGLE_PRODUCT;
      const data = (await res.json()) as Partial<CompanionPlan>;
      if (data.isSystem !== true || !Array.isArray(data.companions)) {
        return SINGLE_PRODUCT;
      }
      return { isSystem: true, companions: data.companions };
    } catch {
      return SINGLE_PRODUCT;
    }
  })();
  companionPending.set(turnId, request);
  request
    .then((plan) => companionCache.set(turnId, plan))
    .finally(() => companionPending.delete(turnId));
  return request;
}
import { ImageEditorModal } from "./image-editor-modal";

const POLL_MS = 2_500;
/** Longer than the generator’s own budget, so the server is what gives up
 *  first and the card gets a reason rather than this bare timeout. */
const POLL_CEILING_MS = 180_000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  const router = useRouter();
  const {
    hydrated,
    builds,
    getChat,
    getBuild,
    appendUserTurn,
    appendAssistantTurn,
    resolveAssistantTurn,
    failAssistantTurn,
    setTurnJob,
    setSetupDetails,
    answerSetupTurn,
    setTurnProgress,
    startBuild,
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
    () => projects.map((p) => ({ id: p.id, name: p.name })),
    [projects],
  );

  const [confirmFor, setConfirmFor] = React.useState<{
    turnId: string;
    imageUrl: string;
    prompt: string;
  } | null>(null);
  const [submittingBuild, setSubmittingBuild] = React.useState(false);
  // Set when a confirmed build went into the queue behind another one —
  // the notice above the prompt bar is the only place that says so at
  // the moment it happens (the concept's own row carries it afterwards).
  const [queuedNotice, setQueuedNotice] = React.useState<string | null>(null);
  // Full-screen image editor: editorTurnId is the concept currently shown in
  // the lightbox (null = closed). Submitting an edit closes the editor; the
  // refine then continues in the thread (pending → ready), where the user can
  // watch it land and reopen Refine to iterate.
  const [editorTurnId, setEditorTurnId] = React.useState<string | null>(null);
  // Part 4 §4.4 — the companion products offered for the concept the gate
  // is open on, and which of them are ticked. The concepts themselves live
  // in the thread, so §4.8's "deselecting preserves the concept" needs
  // nothing stored here.
  const [companionPlan, setCompanionPlan] = React.useState<Companion[]>([]);
  const [productTitle, setProductTitle] = React.useState("");
  const [pickedCompanions, setPickedCompanions] = React.useState<Set<string>>(
    () => new Set(),
  );
  // Which concept's "Use this concept" is waiting on the summarize +
  // classify round-trips, so that one card's button can say so.
  const [preparingTurnId, setPreparingTurnId] = React.useState<string | null>(
    null,
  );
  // The notice names one specific build — once it leaves the queue
  // (started, finished, or failed), there's nothing left for it to
  // point at. Derived from live build state each render (via `builds`,
  // read fresh by `getBuild`) rather than mirrored into its own effect,
  // so it can't go stale on screen or trigger a cascading re-render.
  const queuedNoticeJob = queuedNotice ? getBuild(queuedNotice) : null;
  const showQueuedNotice = queuedNoticeJob?.status === "queued";

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
      answerSetupTurn(chat.id, turnId, answer);

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
          prompt: `${companion.name} for ${setup.prompt}`,
          kind: "fresh",
          companionOf: companion.id,
        });
      }
    },
    [chat, answerSetupTurn, appendAssistantTurn],
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

  // Render progress. The generator gives no milestones, so the card
  // shows the honest shape of a wait: fast at first, slowing as it goes,
  // and parked at 90 until the image really lands (resolve writes 100).
  // A timer per pending turn, so several renders in flight each move.
  const progressTimers = React.useRef<
    Map<string, ReturnType<typeof setInterval>>
  >(new Map());
  React.useEffect(() => {
    const timers = progressTimers.current;
    // The sweep comes first: a chat that has gone (cleared storage, a
    // route change) leaves no pending turns, and returning before this
    // would leave its intervals ticking against a turn nothing renders.
    const pending = new Set(
      (chat?.turns ?? [])
        .filter((t) => t.role === "assistant" && t.status === "pending")
        .map((t) => t.id),
    );
    for (const [id, handle] of timers) {
      if (pending.has(id)) continue;
      clearInterval(handle);
      timers.delete(id);
    }
    if (!chat) return;
    for (const turn of chat.turns) {
      if (turn.role !== "assistant" || turn.status !== "pending") continue;
      if (timers.has(turn.id)) continue;
      const cid = chat.id;
      const tid = turn.id;
      let p = turn.progress ?? 0;
      timers.set(
        tid,
        setInterval(() => {
          p = Math.min(90, p + Math.max(1, (90 - p) * 0.12));
          setTurnProgress(cid, tid, p);
        }, 700),
      );
    }
  }, [chat, setTurnProgress]);
  React.useEffect(() => {
    const timers = progressTimers.current;
    return () => {
      for (const handle of timers.values()) clearInterval(handle);
      timers.clear();
    };
  }, []);



  // One lineage label per concept — the same map the thread renders from,
  // so every surface names a concept identically.
  const labels = React.useMemo(
    () => conceptLabels(chat?.turns ?? []),
    [chat?.turns],
  );

  // The most-recent READY assistant turn — what a prompt-bar submission
  // evolves from. If nothing is ready yet (the first generation is still
  // pending), refinement degrades to a fresh take so the user is never
  // blocked.
  const latestReadyTurn = React.useMemo(() => {
    if (!chat) return null;
    let last: Extract<
      (typeof chat.turns)[number],
      { role: "assistant" }
    > | null = null;
    for (const t of chat.turns) {
      if (t.role === "assistant" && t.status === "ready" && t.imageUrl) {
        last = t;
      }
    }
    return last;
  }, [chat]);

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
      if (!chat || !canAfford(CONCEPT_COST)) return;
      appendUserTurn(chat.id, text);
      // Prompt-bar submissions REFINE the latest ready concept (spec
      // §4b). They only fall back to "fresh" when nothing has rendered
      // yet (so the user isn't stuck on first load).
      if (latestReadyTurn) {
        const { turnId } = appendAssistantTurn(chat.id, {
          prompt: text,
          kind: "refine",
          parentTurnId: latestReadyTurn.id,
        });
        runGeneration(chat.id, turnId, {
          prompt: text,
          kind: "refine",
          parentImageUrl: latestReadyTurn.imageUrl,
        });
        return;
      }
      const { turnId } = appendAssistantTurn(chat.id, {
        prompt: text,
        kind: "fresh",
      });
      runGeneration(chat.id, turnId, { prompt: text, kind: "fresh" });
    },
    [
      chat,
      canAfford,
      latestReadyTurn,
      appendUserTurn,
      appendAssistantTurn,
      runGeneration,
    ],
  );

  const handleRegenerate = React.useCallback(
    (sourcePrompt: string, sourceTurnId: string) => {
      if (!chat || !canAfford(CONCEPT_COST)) return;
      // Regenerate (spec §4c) is a FRESH take on the same prompt — it
      // ignores the existing image. No new user turn because the user
      // didn't retype anything.
      const { turnId } = appendAssistantTurn(chat.id, {
        prompt: sourcePrompt,
        kind: "fresh",
      });
      setRegenSource((prev) => ({ ...prev, [turnId]: sourceTurnId }));
      runGeneration(chat.id, turnId, {
        prompt: sourcePrompt,
        kind: "fresh",
      });
    },
    [chat, canAfford, appendAssistantTurn, runGeneration],
  );

  // The one path from an approved concept to a booked build. Both the
  // gate's Confirm and the skip that replaces it when the gate has been
  // dismissed (spec §4.5) come through here, so a dismissed gate cannot
  // start a different kind of build from the one the dialog starts.
  const startBuildFor = React.useCallback(
    async (
      source: { turnId: string; imageUrl: string; prompt: string },
      concept: ConceptSummary,
      // §4.4 — the companion products whose concepts are ready. Empty on
      // every single-product build.
      companions: Omit<BuildProduct, "items">[] = [],
    ) => {
      if (!chat) return;
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
        const job = startBuild({
          chatId: chat.id,
          turnId: source.turnId,
          imageUrl: source.imageUrl,
          prompt: source.prompt,
          conceptNumber: labels.get(source.turnId) ?? "1",
          title: concept.title || deriveTitle(source.prompt),
          summary: concept.summary,
          parts: concept.parts,
          companions,
        });
        // A queued build isn't building yet, so we stay in the chat and
        // say so beside the concept that started it — the build page
        // would only show a waiting room. Any earlier notice is for a
        // build this new confirm has nothing to do with, so it's
        // replaced (or cleared, if this one didn't queue) rather than
        // left pointing at a stale job.
        if (job.status === "queued") {
          setQueuedNotice(job.id);
          return;
        }
        setQueuedNotice(null);
        router.push(`/build/${job.id}`);
      } finally {
        setSubmittingBuild(false);
        setConfirmFor(null);
      }
    },
    [chat, labels, startBuild, router],
  );

  // The step after the companion screen, and the whole of it on the
  // ordinary single-product path: the gate, or the build straight away
  // when the gate has been dismissed (§4.5).
  const goToGate = React.useCallback(
    (source: { turnId: string; imageUrl: string; prompt: string }) => {
      if (readGateDismissed()) {
        setSubmittingBuild(true);
        void summarizeConcept(source.turnId, source.prompt).then((concept) =>
          startBuildFor(source, concept),
        );
        return;
      }
      setConfirmFor(source);
    },
    [startBuildFor],
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
      const source = { turnId: t.id, imageUrl: t.imageUrl, prompt: t.prompt };
      if (t.companionOf) {
        goToGate(source);
        return;
      }
      setPreparingTurnId(t.id);
      void summarizeConcept(t.id, t.prompt)
        .then((concept) =>
          classifyCompanions(t.id, t.prompt, concept.title).then((plan) => ({
            plan,
            title: concept.title,
          })),
        )
        .then(({ plan, title }) => {
          setPreparingTurnId(null);
          setProductTitle(title);
          // §4.8 — "concept is preserved; re-selecting does not require
          // regeneration": a companion whose concept already landed comes
          // back ticked, because it was paid for and is going to be built
          // unless the user says otherwise. Those concepts can only exist
          // from an earlier pass, so the turns this callback closed over
          // already hold them.
          const alreadyRendered = new Set(
            chat.turns
              .filter(
                (x) =>
                  x.role === "assistant" &&
                  x.status === "ready" &&
                  !!x.companionOf,
              )
              .map((x) => (x.role === "assistant" ? x.companionOf! : "")),
          );
          setCompanionPlan(plan.companions);
          setPickedCompanions(
            new Set(
              plan.companions
                .filter((c) => alreadyRendered.has(c.id))
                .map((c) => c.id),
            ),
          );
          goToGate(source);
        })
        .catch(() => {
          setPreparingTurnId(null);
          goToGate(source);
        });
    },
    [chat, goToGate],
  );

  // §4.4.2 — leaving the companion screen books ONE job for every product
  // that is ready: the primary, plus each ticked companion whose concept
  // has landed. A ticked companion with no concept is not built and is not
  // reported as missing (§4.4.4: "unselected companions are simply not
  // built"); its row already said it needs a concept first.
  // The ticked companions whose concept has landed, summarised the way
  // the primary is so every product's deliverables come from a real parts
  // list rather than from its name. A ticked companion still waiting on
  // its concept is simply not built (§4.4.4) — its row said it needs one.
  const readyCompanionProducts = React.useCallback(async (): Promise<
    Omit<BuildProduct, "items">[]
  > => {
    if (!chat) return [];
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
    const ready = companionPlan
      .filter((c) => pickedCompanions.has(c.id))
      .map((c) => ({ companion: c, turn: turnFor(c.id) }))
      .filter(
        (x): x is { companion: Companion; turn: ChatTurn & { role: "assistant" } } =>
          x.turn !== null,
      );
    return Promise.all(
      ready.map(({ companion, turn }) =>
        summarizeConcept(turn.id, turn.prompt).then((concept) => ({
          id: companion.id,
          name: companion.name,
          conceptImageUrl: turn.imageUrl ?? "",
          conceptPrompt: turn.prompt,
          title: concept.title || companion.name,
          summary: concept.summary,
          parts: concept.parts,
        })),
      ),
    );
  }, [chat, companionPlan, pickedCompanions]);

  // §4.4.3 — a product the classifier did not offer. It joins the same
  // list, ticked, so the next step is the same "Generate concept" every
  // other row takes; the AI's own entries are untouched, which is what
  // §4.4.4's read-only rule is about. A name that collides with an
  // existing row just selects that row rather than adding a twin.
  const handleAddOwnCompanion = React.useCallback((name: string) => {
    const id = companionId(name);
    if (!id) return;
    setCompanionPlan((prev) =>
      prev.some((c) => c.id === id)
        ? prev
        : [...prev, { id, name: name.trim(), why: "You added this one." }],
    );
    setPickedCompanions((prev) => new Set(prev).add(id));
  }, []);

  // §4.4.4 — the row reads the live turn rather than a stored flag: the
  // companion's concept IS a turn, so the dialog and the model can never
  // disagree about whether one exists or how far it has got. The latest
  // turn for that companion wins, so a regenerate moves the row back to
  // rendering.
  const companionConceptTurn = React.useCallback(
    (id: string): CompanionTurn | null => {
      if (!chat) return null;
      for (let i = chat.turns.length - 1; i >= 0; i -= 1) {
        const t = chat.turns[i];
        if (t.role !== "assistant" || t.companionOf !== id) continue;
        return {
          turnId: t.id,
          status: t.status,
          progress: t.progress ?? 0,
          imageUrl: t.imageUrl,
          prompt: t.prompt,
        };
      }
      return null;
    },
    [chat],
  );

  // §4.4.5 — the companion's own loop, run from the dialog. A refine
  // evolves the image that is on screen; a regenerate takes a fresh run at
  // the same brief. Both append a turn carrying the same `companionOf`,
  // so the row follows the newest one.
  const handleRefineCompanion = React.useCallback(
    (companion: Companion, change: string) => {
      if (!chat || !canAfford(CONCEPT_COST)) return;
      const current = companionConceptTurn(companion.id);
      if (!current || current.status !== "ready") return;
      const { turnId } = appendAssistantTurn(chat.id, {
        prompt: change,
        kind: "refine",
        parentTurnId: current.turnId,
        companionOf: companion.id,
      });
      kickedOff.current.add(turnId);
      runGeneration(chat.id, turnId, {
        prompt: change,
        kind: "refine",
        parentImageUrl: current.imageUrl,
      });
    },
    [chat, canAfford, companionConceptTurn, appendAssistantTurn, runGeneration],
  );

  const handleRegenerateCompanion = React.useCallback(
    (companion: Companion) => {
      if (!chat || !confirmFor || !canAfford(CONCEPT_COST)) return;
      const prompt = `${companion.name} for this ${productTitle}: ${confirmFor.prompt}`;
      const { turnId } = appendAssistantTurn(chat.id, {
        prompt,
        kind: "fresh",
        companionOf: companion.id,
      });
      kickedOff.current.add(turnId);
      runGeneration(chat.id, turnId, { prompt, kind: "fresh" });
    },
    [
      chat,
      confirmFor,
      productTitle,
      canAfford,
      appendAssistantTurn,
      runGeneration,
    ],
  );


  // §4.4.5 — a companion's concept is generated as part of THIS system,
  // not as a standalone object: the prompt inherits the parent's own
  // words so the two products read as a family. It lands in the thread
  // like any other concept, with its own refine and regenerate.
  const handleGenerateCompanion = React.useCallback(
    (companion: Companion) => {
      if (!chat || !confirmFor) return;
      if (!canAfford(CONCEPT_COST)) return;
      const prompt = `${companion.name} for this ${productTitle}: ${confirmFor.prompt}`;
      const { turnId } = appendAssistantTurn(chat.id, {
        prompt,
        kind: "fresh",
        companionOf: companion.id,
      });
      kickedOff.current.add(turnId);
      runGeneration(chat.id, turnId, { prompt, kind: "fresh" });
      // The dialog stays open: the row shows the render's own progress and
      // then its preview. Closing it and asking the user to come back was
      // two trips for one decision.
    },
    [
      chat,
      confirmFor,
      productTitle,
      canAfford,
      appendAssistantTurn,
      runGeneration,
    ],
  );

  // Open the full-screen editor on a specific concept image.
  const handleOpenEditor = React.useCallback((turnId: string) => {
    setEditorTurnId(turnId);
  }, []);

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
      const { turnId } = appendAssistantTurn(chat.id, {
        prompt: text,
        kind: "refine",
        parentTurnId: editorTurnId,
      });
      // Drive generation here; mark kicked-off so the auto-run effect doesn't
      // fire it a second time.
      kickedOff.current.add(turnId);
      runGeneration(chat.id, turnId, {
        prompt: text,
        kind: "refine",
        parentImageUrl: parent.imageUrl,
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
      runGeneration,
    ],
  );


  const handleConfirmBuild = React.useCallback(
    async (concept: ConceptSummary) => {
      if (!confirmFor) return;
      const companions = await readyCompanionProducts();
      await startBuildFor(confirmFor, concept, companions);
    },
    [confirmFor, readyCompanionProducts, startBuildFor],
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

  return (
    <div className="flex h-full">
      {/* Two panes, the shape the work actually has: the rail on the left is
          the running account — what was asked, what was decided, what is
          happening right now — and the canvas beside it is where the work
          appears, questions first and then the concepts. A render takes the
          better part of a minute and a multi-product build runs several at
          once, so the account of it needs its own column rather than
          competing with the output for the same one. */}
      <aside className="flex w-[360px] shrink-0 flex-col border-r border-solid border-border bg-bg-surface">
        <div className="flex-1 overflow-y-auto">
          <ChatRail chat={chat} labels={labels} />
        </div>
        <div className="border-t border-solid border-border">
          <div className="w-full px-[14px] py-[14px]">
          {showQueuedNotice && (
            <div
              role="status"
              data-testid="queued-notice"
              className="mb-[12px] flex items-center gap-[10px] rounded-xl border border-solid border-border bg-bg-subtle px-[14px] py-[10px] text-sm text-text-secondary"
            >
              <Icon icon={Clock01Icon} size={16} />
              {queuedNoticeText(queuedNoticeJob, builds)}
              <Link
                href={`/build/${queuedNotice}`}
                className="ml-auto font-semibold text-text-brand no-underline outline-none transition-colors duration-fast hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                View build
              </Link>
              <button
                type="button"
                onClick={() => setQueuedNotice(null)}
                aria-label="Dismiss"
                className="inline-flex h-[24px] w-[24px] items-center justify-center rounded-md text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Cancel01Icon} size={14} />
              </button>
            </div>
          )}
          {/* Never disabled while a concept renders — describing the next
              change shouldn't wait on the current one. */}
          <PromptBar onSubmit={handleUserSubmit} canRender={canRender} />
          <p className="mt-[8px] text-center text-sm font-regular text-text-tertiary">
            {canRender
              ? `Start by describing the concept. Each render costs ${CONCEPT_COST} credit${CONCEPT_COST === 1 ? "" : "s"} — refine and regenerate as often as you like.`
              : "You are out of credits — top them up to render another concept."}
          </p>
          </div>
        </div>
      </aside>

      {/* The canvas. The questions land here first, then the concepts —
          side by side, because a system build draws several at once. */}
      <main className="flex-1 overflow-y-auto bg-bg-page">
        <div className="mx-auto w-full max-w-[880px] px-[32px] py-[32px]">
          <ChatThread
            chat={chat}
            regeneratingFrom={regeneratingFrom}
            preparingTurnId={preparingTurnId}
            projects={setupProjects}
            onAnswerSetup={handleAnswerSetup}
            onRegenerateAt={handleRegenerate}
            onUseTurn={handleUseTurn}
            onRefineTurn={handleOpenEditor}
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
        conceptLabel={
          confirmFor ? (labels.get(confirmFor.turnId) ?? "1") : "1"
        }
        conceptImageUrl={confirmFor?.imageUrl}
        conceptPrompt={confirmFor?.prompt ?? ""}
        submitting={submittingBuild}
        onCancel={() => setConfirmFor(null)}
        onConfirm={handleConfirmBuild}
        companions={companionPlan}
        selectedCompanions={pickedCompanions}
        companionTurn={companionConceptTurn}
        onToggleCompanion={(id) =>
          setPickedCompanions((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onGenerateCompanion={handleGenerateCompanion}
        onRefineCompanion={handleRefineCompanion}
        onRegenerateCompanion={handleRegenerateCompanion}
        onAddCompanion={handleAddOwnCompanion}
      />

      <ImageEditorModal
        open={editorTurnId !== null && editorImage !== null}
        image={editorImage}
        conceptLabel={editorConceptLabel}
        nextRefineIndex={editorNextRefineIndex}
        onClose={() => setEditorTurnId(null)}
        onSubmitEdit={handleSubmitEdit}
      />
    </div>
  );
}

// What the notice under the prompt bar says about a build that didn't
// start. A build parked on credits isn't waiting its turn — it is
// waiting on the user — so it reads the way the concept card's own
// status line reads; everything else names the real queue depth
// instead of assuming one build is ahead.
function queuedNoticeText(job: BuildJob, builds: BuildJob[]): string {
  if (job.blocked === "credits") return "Paused — top up credits to start";
  const ahead = queuedAhead(job, builds);
  if (ahead === 0) return "Queued — starts when the current build finishes";
  return `Queued — ${ahead} build${ahead === 1 ? "" : "s"} ahead of you`;
}

function LoadingShell() {
  return (
    <div className="flex h-full items-center justify-center text-md text-text-tertiary">
      Loading chat…
    </div>
  );
}

function NotFoundShell() {
  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col items-center justify-center gap-[16px] px-[24px] text-center">
      <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
        Concept chat
      </p>
      <h1 className="text-2xl font-bold text-text-primary">
        We couldn&apos;t find this chat
      </h1>
      <p className="text-md text-text-secondary">
        It may have been cleared from this browser. Start a new one from the
        home prompt.
      </p>
      <Link
        href="/"
        className="inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-violet-600 px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Back to Home
      </Link>
    </div>
  );
}
