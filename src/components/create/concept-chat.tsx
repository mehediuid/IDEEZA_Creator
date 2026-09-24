"use client";

// ConceptChat — the create flow's orchestrator. Owns the per-page UI state:
//   • the setup question          → the renders it asks for, one per product
//   • composer submissions        → a refine of the product in focus, or a new
//                                   product when the maker asks for one
//   • per-card Refine / Regenerate → a new turn (never overwrites the older one)
//   • the canvas's one build action → the gate, then a booked build
//   • the build                   → stays here: it leads the canvas and its
//                                   pipeline and whole-build states join the rail

import * as React from "react";
import Link from "next/link";
import {
  deriveTitle,
  statusOf,
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
import { BuildRail } from "./build-rail";
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

const POLL_MS = 2_500;
/** Longer than the generator’s own budget, so the server is what gives up
 *  first and the card gets a reason rather than this bare timeout. */
const POLL_CEILING_MS = 180_000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The maker's sentence as the tail of another one: a companion is drawn as
 *  "Charger for a handheld soil meter…", not "…for A handheld soil meter". */
function asPhrase(prompt: string): string {
  const t = prompt.trim();
  return /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
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

  // The most-recent READY assistant turn — what a prompt-bar submission
  // evolves from. If nothing is ready yet (the first generation is still
  // pending), refinement degrades to a fresh take so the user is never
  // blocked.
  // Which product the composer is talking about. It used to be "the last
  // turn that happened to finish", which with more than one product is not a
  // choice at all — the drone and its remote render in parallel, so whichever
  // crossed the line last became the thing your next sentence refined. That
  // was usually the first card, and never something the maker had picked.
  //
  // It is the product they last acted on instead: pressed Refine or
  // Regenerate on, or added. The primary until then, and the composer says
  // which so it is never a guess.
  const latestReadyTurn = React.useMemo(() => {
    if (!chat) return null;
    type Ready = Extract<(typeof chat.turns)[number], { role: "assistant" }>;
    let last: Ready | null = null;
    let fallback: Ready | null = null;
    for (const t of chat.turns) {
      if (t.role !== "assistant" || t.status !== "ready" || !t.imageUrl) continue;
      fallback = t;
      if ((t.companionOf ?? "primary") === focusedProduct) last = t;
    }
    return last ?? fallback;
  }, [chat, focusedProduct]);

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

  // The setup question is still open. Typing then used to skip it: the text
  // started a paid render of its own beside the unanswered question.
  const setupPending = React.useMemo(
    () =>
      !!chat?.turns.some((t) => t.role === "setup" && t.status !== "answered"),
    [chat],
  );

  /** What the composer will refine, by name, for the line under it. */
  const focusedName = React.useMemo(() => {
    const setup = chat?.turns.find((t) => t.role === "setup");
    if (setup?.role !== "setup") return null;
    if (focusedProduct === "primary") return setup.productName?.trim() || null;
    return setup.companions.find((c) => c.id === focusedProduct)?.name ?? null;
  }, [chat, focusedProduct]);

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
      // Prompt-bar submissions REFINE the latest ready concept (spec
      // §4b). They only fall back to "fresh" when nothing has rendered
      // yet (so the user isn't stuck on first load).
      if (latestReadyTurn) {
        appendAssistantTurn(chat.id, {
          prompt: text,
          kind: "refine",
          parentTurnId: latestReadyTurn.id,
          // A refine is a new take on the SAME product. Without this it
          // landed under the primary, so refining the remote controller
          // replaced the drone's card instead of its own.
          companionOf: latestReadyTurn.companionOf,
        });
        return;
      }
      appendAssistantTurn(chat.id, { prompt: text, kind: "fresh" });
    },
    [
      chat,
      canAfford,
      setupPending,
      latestReadyTurn,
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
  const companionProductsFor = React.useCallback(
    async (
      companions: Companion[],
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
        ready.map(({ companion, turn }) =>
          summarizeConcept(turn.id, turn.prompt).then((concept) => ({
            id: companion.id,
            name: companion.name,
            conceptImageUrl: turn.imageUrl ?? "",
            conceptPrompt: turn.prompt,
            title: concept.title || companion.name,
            summary: concept.summary,
            description: concept.description,
            parts: concept.parts,
          })),
        ),
      );
    },
    [chat],
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
          parts: concept.parts,
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
    [chat, labels, startBuild],
  );

  // The last step before money moves is always the gate. It used to offer
  // "Don't show this again", which removed the only confirmation of a spend
  // for good — nothing anywhere could bring it back.
  const goToGate = React.useCallback(
    (source: { turnId: string; imageUrl: string; prompt: string }) => {
      setConfirmFor(source);
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
      const source = { turnId: t.id, imageUrl: t.imageUrl, prompt: t.prompt };
      if (t.companionOf) {
        goToGate(source);
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
      const decided =
        setup && setup.role === "setup" && setup.answer
          ? setup.companions.filter((c) =>
              setup.answer!.picked.includes(c.id),
            )
          : [];
      setCompanionPlan(decided);
      // Ticked, because each of these was chosen and drawn already. The box
      // is still there: building a product costs again, so dropping one
      // before paying is a real decision — just not the same one.
      setPickedCompanions(new Set(decided.map((c) => c.id)));

      // Busy until the gate is open: the concept is read back first, so the
      // gate opens on the real title and parts rather than a stand-in.
      setPreparingTurnId(t.id);
      void summarizeConcept(t.id, t.prompt)
        .catch(() => null)
        .then(() => goToGate(source))
        .finally(() => setPreparingTurnId(null));
    },
    [chat, goToGate],
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
        const companions = await companionProductsFor(
          companionPlan.filter((c) => pickedCompanions.has(c.id)),
        );
        await startBuildFor(confirmFor, concept, companions);
      } finally {
        setSubmittingBuild(false);
      }
    },
    [
      confirmFor,
      companionPlan,
      pickedCompanions,
      companionProductsFor,
      startBuildFor,
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
  const editorSetup = chat.turns.find((t) => t.role === "setup");
  const editorProduct =
    editorTurn?.role === "assistant" && editorSetup?.role === "setup"
      ? editorTurn.companionOf
        ? editorSetup.companions.find((c) => c.id === editorTurn.companionOf)?.name
        : editorSetup.productName?.trim()
      : undefined;

  return (
    <div className="flex h-full flex-col md:flex-row">
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
          the running account — what was asked, what was decided, what is
          happening right now — and the canvas beside it is where the work
          appears, questions first and then the concepts. A render takes the
          better part of a minute and a multi-product build runs several at
          once, so the account of it needs its own column rather than
          competing with the output for the same one. */}
      <aside
        className={[
          "min-h-0 flex-1 flex-col border-solid border-border bg-bg-surface md:w-[360px] md:flex-none md:shrink-0 md:border-r",
          pane === "chat" ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        <div className="flex-1 overflow-y-auto">
          <ChatRail chat={chat} labels={labels} />
          {/* The whole pipeline, stated the moment the build starts — every
              piece of every product, including the ones that have not begun.
              It belongs beside the work, not on a page of its own. */}
          {activeBuild && (
            <div className="border-t border-solid border-border">
              <BuildRail
                job={activeBuild}
                title={projectName}
                activeProductId={focusedProduct}
                onPickProduct={setFocusedProduct}
              />
              {/* The whole-build states — queued with its Cancel, waiting on
                  credits, a partial or system failure with its retry, the
                  overrun stop — which used to exist only on a page the chat
                  no longer sends anyone to. */}
              {statusOf(activeBuild) !== "ready" && (
                <div className="px-[14px] pb-[16px]">
                  <BuildStatus job={activeBuild} statesOnly inChat />
                </div>
              )}
            </div>
          )}
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
            blockedReason={setupPending ? "Answer the question first" : undefined}
            enhanceMode={latestReadyTurn ? "change" : "brief"}
            placeholder={
              focusedName && latestReadyTurn
                ? `Describe a change to ${focusedName}…`
                : undefined
            }
          />
          <p className="mt-[8px] text-center text-sm font-regular text-text-tertiary">
            {!canRender
              ? "You are out of credits — top them up to draw another concept."
              : setupPending
                ? "Answer the question on the canvas first — nothing is drawn or charged until you do."
                : focusedName && latestReadyTurn
                  ? `Refines ${focusedName} · ${CONCEPT_COST} credit. Name another product to add it.`
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
          {/* The page's one h1, for the heading outline a screen reader walks:
              the chat had none, so it opened on an h3. The rail and the
              review card already say the name on screen. */}
          <h1 className="sr-only">{chat.title}</h1>
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
            job={activeBuild}
            focusedProduct={focusedProduct}
            onFocusProduct={setFocusedProduct}
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
        products={pickedCompanions.size + 1}
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

// The page's own shape while the chat is read from storage — the rail, the
// composer and two cards — so nothing jumps when it lands. It was a line of
// centred text.
function LoadingShell() {
  return (
    <div role="status" aria-label="Loading the chat" className="flex h-full">
      <span className="sr-only">Loading the chat</span>
      <div className="hidden w-[360px] shrink-0 flex-col gap-[14px] border-r border-solid border-border bg-bg-surface px-[18px] py-[20px] motion-safe:animate-pulse md:flex">
        <div className="h-[12px] w-[40px] rounded bg-bg-subtle" />
        <div className="h-[14px] w-[260px] rounded bg-bg-subtle" />
        <div className="h-[14px] w-[200px] rounded bg-bg-subtle" />
        <div className="mt-[10px] h-[12px] w-[60px] rounded bg-bg-subtle" />
        <div className="h-[14px] w-[180px] rounded bg-bg-subtle" />
        <div className="h-[14px] w-[220px] rounded bg-bg-subtle" />
        <div className="mt-auto h-[96px] w-full rounded-2xl bg-bg-subtle" />
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
