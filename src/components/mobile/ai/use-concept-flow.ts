"use client";

// The AI tab's chat, run on the web's own stores and routes. This is the
// phone's copy of the web orchestrator (components/create/concept-chat.tsx):
// the same store calls in the same order, the same guards, the same money
// rules — only the screens around it are the phone's.
//
//   • the setup question → read the idea (companions + summarize, free),
//     then one render per product kept, 1 credit each
//   • pending renders → started once each (or picked back up after a
//     reload, never charged twice), refunded when they fail
//   • each landed drawing → read back in the background (parts, spec hints)
//   • the composer → a change to the product in focus, or a new product
//   • Refine / Regenerate / Try again → a new turn, never an overwrite
//   • Build → every chosen product read, the gate's lines, then one job
//   • spec edits, quality, network links → the answered question's edits

import * as React from "react";
import {
  conceptBriefOf,
  deriveTitle,
  useCreateHistory,
  type BuildJob,
  type BuildProduct,
  type ChatSession,
  type ChatTurn,
  type ConceptFailReason,
  type SetupAnswer,
} from "@/lib/create/history";
import { summaryFromParts, type ConceptSummary } from "@/lib/create/concept";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import type { RenderQuality } from "@/lib/create/quality";
import { cleanPick, pickCost, withQuality, type PiecePick, type PieceQuality } from "@/lib/create/pieces";
import { companionId as slugFor, parseProductRequest, type Companion } from "@/lib/create/companions";
import {
  buildHolds,
  companionNameOf,
  composerTarget,
  productNameOf,
  type ProjectState,
} from "@/lib/create/project-state";
import {
  asNetworkReply,
  conceptNetworkOf,
  linkEditFor,
  networkReset,
  protocolChange,
  radioReset,
} from "@/lib/create/concept-network";
import type { ResolvedSpec, SpecEdits } from "@/lib/spec/types";
import { blocksBuild, deriveSpec, effectiveParts, partsForBuild } from "@/lib/spec/derive";
import { rebaseEdits } from "@/lib/spec/edits";
import { cardFacts, specLine } from "@/lib/spec/format";
import { asConceptSummary, cleanEdits } from "@/lib/spec/hints";
import { useManualProjects } from "@/lib/manual/projects";
import { useGuards } from "@/lib/manual/use-write-guard";
import { readSettings } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";
import { useRailModel } from "@/components/create/chat-rail";
import { conceptLabels } from "@/components/create/chat-thread";
import { summarizeConcept } from "@/components/create/confirm-build-dialog";
import type { LinkChange } from "@/components/create/network-rail";
import { useSaveMode } from "@/components/create/save-step";
import { useBuildModel } from "@/components/create/use-build-model";
import { useOnline } from "../kit/states";

const POLL_MS = 2_500;
/** Longer than the generator's own budget, so the server gives up first. */
const POLL_CEILING_MS = 180_000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const NO_CHAT: ChatSession = { id: "", title: "", turns: [], createdAt: 0, updatedAt: 0 };
const REREAD_SESSION_KEY = "ideeza:create:reread";

export type AssistantTurn = Extract<ChatTurn, { role: "assistant" }>;
export type SetupTurn = Extract<ChatTurn, { role: "setup" }>;

class FailedRender extends Error {
  readonly reason?: ConceptFailReason;
  constructor(reason?: ConceptFailReason) {
    super(reason ?? "render failed");
    this.reason = reason;
  }
}

async function pollUntilReady(job: string): Promise<string> {
  const deadline = Date.now() + POLL_CEILING_MS;
  for (;;) {
    if (Date.now() > deadline) throw new FailedRender("busy");
    await wait(POLL_MS);
    const res = await fetch(`/api/concept/generate?job=${encodeURIComponent(job)}`);
    const data = (await res.json().catch(() => ({}))) as { status?: string; imageUrl?: string; reason?: ConceptFailReason };
    if (!res.ok) throw new FailedRender(data.reason);
    if (data.status === "ready" && data.imageUrl) return data.imageUrl;
  }
}

function loadReread(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(REREAD_SESSION_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveReread(ids: ReadonlySet<string>) {
  try {
    window.sessionStorage.setItem(REREAD_SESSION_KEY, JSON.stringify([...ids]));
  } catch {
    // Unavailable: the in-memory set still stops a loop within this page load.
  }
}

/** "Charger for a handheld soil meter…", not "…for A handheld soil meter". */
function asPhrase(prompt: string): string {
  const t = prompt.trim();
  return /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

/** One gate line per product: size · board · power, then what it does —
 *  read off the parts as edited (the web gate's own `gateLine`). */
function gateLine(name: string, spec: ResolvedSpec, concept: ConceptSummary, edits: SpecEdits): string {
  const parts = effectiveParts(concept.parts, spec.battery, edits);
  const line = specLine(name, spec);
  const what = cardFacts(spec, parts)
    .filter((f) => (f.key === "radio" || f.key === "part") && !line.includes(f.value))
    .map((f) => (f.label ? `${f.label} ${f.value}` : f.value));
  return [line, ...what].join(" · ") + (concept.fallback ? " · stand-in parts" : "");
}

/** What the Build sheet confirms: the source concept, a line per product
 *  and the readings those lines came from (so Build doesn't read again). */
export type Gate = {
  turnId: string;
  imageUrl: string;
  prompt: string;
  lines: string[];
  read: ReadonlyMap<string, ConceptSummary>;
  companions: Companion[];
};

export type GateResult = { gate: Gate } | { blocked: string } | null;

export function useConceptFlow(chatId: string) {
  const history = useCreateHistory();
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
    addBuildProduct,
    setTurnConcept,
    setSpecEdits,
    setPieces,
    setNetworkEdit,
    setNetworkAdded,
  } = history;
  const { canAfford, charge, overCap, refund, balance, hydrated: creditsHydrated } = useCredits();
  const canRender = canAfford(CONCEPT_COST);
  // Offline, nothing that needs the model is started: no charge, no refund, no failed card.
  const online = useOnline();
  const chat = getChat(chatId);

  // The projects a single product could join: not one sold in full (the guards' lock).
  const { projects, updateProject } = useManualProjects();
  const guards = useGuards();
  const dates = useDates();
  const addTo = React.useMemo(() => {
    const setup = chat?.turns.find((t) => t.role === "setup");
    return setup?.role === "setup" ? (setup.addTo ?? null) : null;
  }, [chat]);
  const setupProjects = React.useMemo(
    () =>
      projects
        .filter((p) => guards.lockOf(p) === null)
        .map((p) => {
          // Two projects can share a name, so each says what it holds and when it last changed (the web's row).
          const n = p.products?.length || 1;
          return { id: p.id, name: p.name, preselect: p.id === addTo, detail: `${n} product${n === 1 ? "" : "s"} · updated ${dates.date(p.updatedAt)}` };
        }),
    [projects, guards, addTo, dates],
  );

  // The latest build this chat started — derived, so a reload lands back on it.
  const activeBuild = React.useMemo(() => {
    if (!chat) return null;
    let latest: BuildJob | null = null;
    for (const b of builds) if (b.chatId === chat.id && (!latest || b.createdAt > latest.createdAt)) latest = b;
    return latest;
  }, [builds, chat]);

  const labels = React.useMemo(() => conceptLabels(chat?.turns ?? []), [chat?.turns]);

  // The product the composer changes: the one last opened, the primary until then.
  const [focusedProduct, setFocusedProduct] = React.useState<string | null>("primary");
  const target = React.useMemo(() => composerTarget(chat ?? NO_CHAT, focusedProduct), [chat, focusedProduct]);

  const projectName = React.useMemo(() => {
    const setup = chat?.turns.find((t) => t.role === "setup");
    if (setup?.role !== "setup" || !setup.answer) return "";
    return setup.answer.projectName.trim() || projects.find((p) => p.id === setup.answer!.projectId)?.name || "";
  }, [chat, projects]);
  const savedName = React.useMemo(() => {
    const id = activeBuild?.projectId;
    return id ? projects.find((p) => p.id === id)?.name : undefined;
  }, [activeBuild, projects]);
  const saveInfo = useSaveMode(activeBuild ?? null);
  const rail = useRailModel(chat ?? NO_CHAT, activeBuild, labels, projectName, savedName, saveInfo?.mode ?? null);
  const state = rail.state;
  const stateNow = React.useRef<ProjectState>(state);
  React.useEffect(() => {
    stateNow.current = state;
  }, [state]);

  // The 3D enclosure is generated where the build is followed, which is here.
  useBuildModel(activeBuild);

  const editsFor = React.useCallback(
    (productId: string) => {
      const setup = chat?.turns.find((t) => t.role === "setup" && t.answer);
      return cleanEdits(setup?.role === "setup" ? setup.answer?.specs?.[productId] : undefined);
    },
    [chat],
  );
  const editsNow = React.useRef(editsFor);
  React.useEffect(() => {
    editsNow.current = editsFor;
  }, [editsFor]);
  /** The edits as they apply to the concept being built; a built product is booked as it was built. */
  const editsAt = React.useCallback((productId: string, conceptParts: ConceptSummary["parts"], turnId: string) => {
    const built = stateNow.current;
    if (built.locked.has(turnId)) return built.edits.get(turnId) ?? {};
    return rebaseEdits(editsNow.current(productId), conceptParts, turnId).edits;
  }, []);

  const answeredSetupId = React.useMemo(() => {
    const t = chat?.turns.find((x) => x.role === "setup" && x.status === "answered" && x.answer);
    return t?.id ?? null;
  }, [chat]);

  // ── renders ──────────────────────────────────────────────────────
  const runGeneration = React.useCallback(
    async (cid: string, turnId: string, input: { prompt: string; kind: "fresh" | "refine"; parentImageUrl?: string; quality?: RenderQuality }) => {
      try {
        if (overCap(CONCEPT_COST)) throw new FailedRender("cap");
        if (!charge(turnId, CONCEPT_COST, "concept")) throw new FailedRender("credits");
        const draw = async (body: typeof input) => {
          const res = await fetch("/api/concept/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(readSettings().ai.volunteerPool ? body : { ...body, pool: "off" }),
          });
          const data = (await res.json().catch(() => ({}))) as { job?: string; reason?: ConceptFailReason };
          if (!res.ok) throw new FailedRender(data.reason);
          if (!data.job) throw new FailedRender();
          setTurnJob(cid, turnId, data.job);
          return pollUntilReady(data.job);
        };
        let imageUrl: string;
        try {
          imageUrl = await draw(input);
        } catch (err) {
          // The image service's safety filter refuses ordinary product words ("shooter", "magazine")
          // by mistake: a fresh drawing asks once more by itself, as a plain product photo, on the
          // same charge, before the maker is handed a failure.
          if (!(err instanceof FailedRender) || err.reason !== "filtered" || input.kind !== "fresh") throw err;
          imageUrl = await draw({ ...input, prompt: `Studio product photo on a plain background: ${input.prompt}` });
        }
        resolveAssistantTurn(cid, turnId, imageUrl);
      } catch (err) {
        refund(turnId);
        failAssistantTurn(cid, turnId, err instanceof FailedRender ? err.reason : undefined);
      }
    },
    [charge, overCap, refund, setTurnJob, resolveAssistantTurn, failAssistantTurn],
  );

  const resumeGeneration = React.useCallback(
    async (cid: string, turnId: string, job: string) => {
      try {
        resolveAssistantTurn(cid, turnId, await pollUntilReady(job));
      } catch (err) {
        refund(turnId);
        failAssistantTurn(cid, turnId, err instanceof FailedRender ? err.reason : undefined);
      }
    },
    [refund, resolveAssistantTurn, failAssistantTurn],
  );

  // Every pending turn is started once (or picked back up after a reload).
  const kickedOff = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!hydrated || !chat || !online) return;
    for (const turn of chat.turns) {
      if (turn.role !== "assistant" || turn.status !== "pending") continue;
      if (kickedOff.current.has(turn.id)) continue;
      kickedOff.current.add(turn.id);
      const parent =
        turn.kind === "refine" && turn.parentTurnId
          ? chat.turns.find((x) => x.id === turn.parentTurnId && x.role === "assistant" && x.status === "ready")
          : null;
      const parentImageUrl = parent && parent.role === "assistant" ? parent.imageUrl : undefined;
      if (turn.renderJob) {
        void resumeGeneration(chat.id, turn.id, turn.renderJob);
        continue;
      }
      void runGeneration(chat.id, turn.id, { prompt: turn.prompt, kind: turn.kind, parentImageUrl, quality: chat.quality });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per turn list, guarded per turn id
  }, [hydrated, chat?.id, chat?.turns, online]);

  // The setup question arrives empty: what the product is and what else it
  // needs are read from the prompt alone, free, before anything is drawn.
  const classified = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!hydrated || !chat || !online) return;
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
        const [plan, summary] = await Promise.all([ask("/api/concept/companions"), ask("/api/concept/summarize")]);
        const companions = (plan?.companions as Companion[] | undefined) ?? [];
        const network = asNetworkReply(plan?.network) ?? undefined;
        setSetupDetails(cid, tid, {
          companions,
          ...(network ? { network } : null),
          productName: typeof summary?.title === "string" ? summary.title : undefined,
          productSummary: typeof summary?.description === "string" ? summary.description : undefined,
        });
      })();
    }
  }, [hydrated, chat, online, setSetupDetails]);

  // ── background reads ─────────────────────────────────────────────
  const reading = React.useRef(new Set<string>());
  const retried = React.useRef<Set<string> | null>(null);
  const retriedTurns = React.useCallback(() => {
    if (!retried.current) retried.current = loadReread();
    return retried.current;
  }, []);
  const [rereading, setRereading] = React.useState<ReadonlySet<string>>(() => new Set());
  const readConcept = React.useCallback(
    (turnId: string) => {
      if (!chat || reading.current.has(turnId)) return;
      reading.current.add(turnId);
      setRereading((prev) => new Set(prev).add(turnId));
      const cid = chat.id;
      void summarizeConcept(turnId, conceptBriefOf(chat.turns, turnId), undefined, companionNameOf(chat.turns, turnId)).then((concept) => {
        setTurnConcept(cid, turnId, concept);
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
  const products = state.products;
  React.useEffect(() => {
    if (!chat) return;
    const asked = retriedTurns();
    for (const t of products) {
      if (t.status !== "ready") continue;
      const kept = asConceptSummary(t.concept);
      if (kept && !kept.fallback) continue;
      if (kept && asked.has(t.id)) continue;
      asked.add(t.id);
      saveReread(asked);
      readConcept(t.id);
    }
  }, [chat, products, readConcept, retriedTurns]);

  // ── the question ─────────────────────────────────────────────────
  const answerSetup = React.useCallback(
    (answer: SetupAnswer) => {
      if (!chat || !online) return;
      const setup = chat.turns.find((t): t is SetupTurn => t.role === "setup");
      if (!setup || setup.status !== "asking") return;
      answerSetupTurn(chat.id, setup.id, answer, answer.projectName.trim() || projects.find((p) => p.id === answer.projectId)?.name);
      appendAssistantTurn(chat.id, { prompt: setup.prompt, kind: "fresh" });
      for (const id of answer.picked) {
        const companion = setup.companions.find((c) => c.id === id);
        if (!companion) continue;
        appendAssistantTurn(chat.id, { prompt: `${companion.name} for ${asPhrase(setup.prompt)}`, kind: "fresh", companionOf: companion.id });
      }
    },
    [chat, online, projects, answerSetupTurn, appendAssistantTurn],
  );

  const setupPending = !!chat?.turns.some((t) => t.role === "setup" && t.status !== "answered");
  const held = buildHolds(activeBuild);

  // ── the composer ─────────────────────────────────────────────────
  /** A sentence typed into the composer: a new product ("add a charger") or
   *  a change to the product in focus. False when nothing was started. */
  const submit = React.useCallback(
    (text: string): boolean => {
      if (!chat || !canRender || !online || setupPending || held) return false;
      const asked = parseProductRequest(text);
      const setup = chat.turns.find((t): t is SetupTurn => t.role === "setup" && t.status === "answered" && !!t.answer);
      if (asked && setup) {
        appendUserTurn(chat.id, text);
        const id = slugFor(asked.name);
        const already = setup.companions.find((c) => c.id === id);
        addSetupProduct(chat.id, setup.id, {
          id,
          name: already?.name ?? asked.name,
          why: already?.why ?? `You asked for ${asked.name.toLowerCase()}.`,
        });
        setFocusedProduct(id);
        appendAssistantTurn(chat.id, { prompt: `${asked.name} for ${asPhrase(setup.prompt)}`, kind: "fresh", companionOf: id });
        return true;
      }
      if (target.kind === "refine") {
        appendUserTurn(chat.id, text);
        appendAssistantTurn(chat.id, { prompt: text, kind: "refine", parentTurnId: target.turn.id, companionOf: target.turn.companionOf });
        return true;
      }
      if (target.kind === "fresh" && !chat.turns.some((t) => t.role === "assistant")) {
        appendUserTurn(chat.id, text);
        appendAssistantTurn(chat.id, { prompt: text, kind: "fresh" });
        return true;
      }
      return false;
    },
    [chat, canRender, online, setupPending, held, target, appendUserTurn, appendAssistantTurn, addSetupProduct],
  );

  /** A change described in the Refine sheet, on that exact drawing. */
  const refine = React.useCallback(
    (turnId: string, text: string): boolean => {
      if (!chat || !canRender || !online || held) return false;
      const parent = chat.turns.find((x) => x.id === turnId);
      if (!parent || parent.role !== "assistant" || parent.status !== "ready" || !parent.imageUrl) return false;
      appendUserTurn(chat.id, text);
      appendAssistantTurn(chat.id, { prompt: text, kind: "refine", parentTurnId: turnId, companionOf: parent.companionOf });
      setFocusedProduct(parent.companionOf ?? "primary");
      return true;
    },
    [chat, canRender, online, held, appendUserTurn, appendAssistantTurn],
  );

  /** A fresh take on the same product — Regenerate, and a failed card's Try again. */
  const regenerate = React.useCallback(
    (turnId: string): boolean => {
      if (!chat || !canRender || !online || held) return false;
      const source = chat.turns.find((x) => x.id === turnId);
      if (!source || source.role !== "assistant") return false;
      setFocusedProduct(source.companionOf ?? "primary");
      appendAssistantTurn(chat.id, { prompt: source.kind === "refine" ? conceptBriefOf(chat.turns, turnId) : source.prompt, kind: "fresh", companionOf: source.companionOf });
      return true;
    },
    [chat, canRender, online, held, appendAssistantTurn],
  );

  /** In or out of the next build — a companion only; the primary is always built. */
  const toggleInBuild = React.useCallback(
    (companionId: string) => {
      if (!chat || !answeredSetupId || held) return;
      const out = state.leftOut.has(companionId);
      setSetupLeftOut(chat.id, answeredSetupId, companionId, !out);
    },
    [chat, answeredSetupId, held, state.leftOut, setSetupLeftOut],
  );

  /** A product the classifier offered and the maker passed over, drawn now. */
  const addOffered = React.useCallback(
    (companionId: string) => {
      if (!chat || !answeredSetupId || !canRender || !online || held) return;
      const setup = chat.turns.find((t): t is SetupTurn => t.id === answeredSetupId && t.role === "setup");
      const companion = setup?.companions.find((c) => c.id === companionId);
      if (!setup || !companion) return;
      addSetupPick(chat.id, setup.id, companionId);
      setFocusedProduct(companionId);
      appendAssistantTurn(chat.id, { prompt: `${companion.name} for ${asPhrase(setup.prompt)}`, kind: "fresh", companionOf: companionId });
    },
    [chat, answeredSetupId, canRender, online, held, addSetupPick, appendAssistantTurn],
  );

  /** Add a product by name (the web canvas's own Add a product): drawn like one asked for in
   *  the composer. A name that was removed before comes back with its concept, free. */
  const addProduct = React.useCallback(
    (name: string): "added" | "restored" | null => {
      const clean = name.trim();
      if (!chat || !answeredSetupId || !clean || held) return null;
      const setup = chat.turns.find((t): t is SetupTurn => t.id === answeredSetupId && t.role === "setup");
      if (!setup) return null;
      const id = slugFor(clean);
      if (state.removed.some((r) => r.id === id)) {
        addSetupPick(chat.id, setup.id, id);
        setFocusedProduct(id);
        return "restored";
      }
      if (!canRender || !online) return null;
      const already = setup.companions.find((c) => c.id === id);
      addSetupProduct(chat.id, setup.id, { id, name: already?.name ?? clean, why: already?.why ?? `You added ${clean.toLowerCase()}.` });
      setFocusedProduct(id);
      appendAssistantTurn(chat.id, { prompt: `${clean} for ${asPhrase(setup.prompt)}`, kind: "fresh", companionOf: id });
      return "added";
    },
    [chat, answeredSetupId, held, state.removed, canRender, online, addSetupPick, addSetupProduct, appendAssistantTurn],
  );

  /** Out of the project (never the main product). Its concepts stay in the chat, so
   *  putting it back draws nothing and costs nothing. */
  const removeProduct = React.useCallback(
    (companionId: string) => {
      if (!chat || !answeredSetupId || held || companionId === "primary") return;
      dropSetupPick(chat.id, answeredSetupId, companionId);
      setFocusedProduct("primary");
    },
    [chat, answeredSetupId, held, dropSetupPick],
  );
  const restoreProduct = React.useCallback(
    (companionId: string) => {
      if (!chat || !answeredSetupId || held) return;
      addSetupPick(chat.id, answeredSetupId, companionId);
      setFocusedProduct(companionId);
    },
    [chat, answeredSetupId, held, addSetupPick],
  );

  // ── spec, quality, network ───────────────────────────────────────
  const editSpec = React.useCallback(
    (productId: string, edits: SpecEdits) => {
      if (chat && answeredSetupId) setSpecEdits(chat.id, answeredSetupId, productId, edits);
    },
    [chat, answeredSetupId, setSpecEdits],
  );

  /** The card's Quality: every piece of that product at the level picked. */
  const setQuality = React.useCallback(
    (productId: string, quality: PieceQuality) => {
      if (!chat || !answeredSetupId || held) return;
      const pick = state.picks.get(productId) ?? cleanPick(undefined, chat.quality);
      setPieces(chat.id, answeredSetupId, productId, withQuality(pick, quality));
    },
    [chat, answeredSetupId, held, state.picks, setPieces],
  );

  const network = React.useMemo(() => conceptNetworkOf(state), [state]);
  const saveLink = React.useCallback(
    (linkId: string, change: LinkChange) => {
      const link = network.links.find((l) => l.id === linkId);
      if (!chat || !answeredSetupId || !link || link.locked) return;
      const set = change.radio ? protocolChange(link, network.peers, change.radio) : [];
      for (const e of set) setSpecEdits(chat.id, answeredSetupId, e.productId, e.edits);
      setNetworkEdit(chat.id, answeredSetupId, linkId, linkEditFor(link, change, set.map((e) => e.productId)));
    },
    [chat, answeredSetupId, network, setSpecEdits, setNetworkEdit],
  );
  const resetLink = React.useCallback(
    (linkId: string) => {
      const link = network.links.find((l) => l.id === linkId);
      if (!chat || !answeredSetupId || !link || link.locked) return;
      for (const e of radioReset(link, network.peers)) setSpecEdits(chat.id, answeredSetupId, e.productId, e.edits);
      setNetworkEdit(chat.id, answeredSetupId, linkId, null);
    },
    [chat, answeredSetupId, network, setSpecEdits, setNetworkEdit],
  );
  const addNetwork = React.useCallback(() => {
    if (chat && answeredSetupId) setNetworkAdded(chat.id, answeredSetupId, true);
  }, [chat, answeredSetupId, setNetworkAdded]);
  const removeNetwork = React.useCallback(() => {
    if (!chat || !answeredSetupId || network.links.some((l) => l.locked)) return;
    for (const e of networkReset(network)) setSpecEdits(chat.id, answeredSetupId, e.productId, e.edits);
    setNetworkAdded(chat.id, answeredSetupId, false);
  }, [chat, answeredSetupId, network, setSpecEdits, setNetworkAdded]);

  // ── the build ────────────────────────────────────────────────────
  const readForBuild = React.useCallback(
    async (turn: AssistantTurn, brief: string) => {
      const kept = asConceptSummary(turn.concept);
      if (kept?.fallback) {
        const asked = retriedTurns();
        if (asked.has(turn.id) && !reading.current.has(turn.id)) return kept;
        asked.add(turn.id);
        saveReread(asked);
      }
      const companion = chat ? companionNameOf(chat.turns, turn.id) : undefined;
      const concept = await summarizeConcept(turn.id, brief, kept, companion);
      if (chat && kept?.fallback && !concept.fallback) setTurnConcept(chat.id, turn.id, concept);
      return concept;
    },
    [chat, setTurnConcept, retriedTurns],
  );

  const [preparing, setPreparing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  /** Build: every chosen product is read, one at a time, and the gate's lines
   *  worked out — or the product whose size can't be built is named. */
  const prepareBuild = React.useCallback(async (): Promise<GateResult> => {
    if (!chat || held || preparing || !online) return null;
    const primary = state.products.find((t) => !t.companionOf);
    if (!primary || primary.status !== "ready" || !primary.imageUrl) return null;
    const setup = chat.turns.find((x): x is SetupTurn => x.role === "setup" && x.status === "answered" && !!x.answer);
    const decided = setup?.answer
      ? setup.companions.filter((c) => setup.answer!.picked.includes(c.id) && !(setup.answer!.leftOut ?? []).includes(c.id))
      : [];
    const latestReady = (id: string) => {
      for (let i = chat.turns.length - 1; i >= 0; i -= 1) {
        const x = chat.turns[i];
        if (x.role === "assistant" && x.companionOf === id && x.status === "ready") return x;
      }
      return null;
    };
    const reads = [
      { productId: "primary", turn: primary },
      ...decided.flatMap((c) => {
        const turn = latestReady(c.id);
        return turn ? [{ productId: c.id, turn }] : [];
      }),
    ];
    setPreparing(true);
    try {
      const concepts: ConceptSummary[] = [];
      for (const r of reads) concepts.push(await readForBuild(r.turn, conceptBriefOf(chat.turns, r.turn.id)));
      const names = stateNow.current.setup;
      const read = reads.map((r, i) => {
        const edits = editsAt(r.productId, concepts[i].parts, r.turn.id);
        const spec = deriveSpec(concepts[i].parts, concepts[i].hints, edits);
        const name = productNameOf(names, r.turn) || concepts[i].title;
        return { productId: r.productId, name, line: gateLine(name, spec, concepts[i], edits), spec };
      });
      const blocked = read.find((r) => blocksBuild(r.spec));
      if (blocked) return { blocked: blocked.productId };
      return {
        gate: {
          turnId: primary.id,
          imageUrl: primary.imageUrl,
          prompt: conceptBriefOf(chat.turns, primary.id),
          lines: read.map((r) => r.line),
          read: new Map(reads.map((r, i) => [r.turn.id, concepts[i]])),
          companions: decided,
        },
      };
    } finally {
      setPreparing(false);
    }
  }, [chat, held, preparing, online, state.products, readForBuild, editsAt]);

  /** Build, confirmed: one job for every chosen product. False when nothing was booked. */
  const confirmBuild = React.useCallback(
    async (gate: Gate): Promise<{ booked: boolean; blocked?: string }> => {
      if (!chat || !online) return { booked: false };
      setSubmitting(true);
      try {
        const primaryRead = gate.read.get(gate.turnId) ?? (await summarizeConcept(gate.turnId, gate.prompt));
        // Each companion, from the readings the gate's lines came from.
        const companions: Omit<BuildProduct, "items">[] = [];
        for (const c of gate.companions) {
          let turn: AssistantTurn | null = null;
          for (let i = chat.turns.length - 1; i >= 0; i -= 1) {
            const t = chat.turns[i];
            if (t.role === "assistant" && t.companionOf === c.id && t.status === "ready" && t.imageUrl) {
              turn = t;
              break;
            }
          }
          if (!turn) continue;
          const brief = conceptBriefOf(chat.turns, turn.id);
          const concept = gate.read.get(turn.id) ?? (await readForBuild(turn, brief));
          const edits = editsAt(c.id, concept.parts, turn.id);
          const spec = deriveSpec(concept.parts, concept.hints, edits);
          const parts = partsForBuild(concept.parts, spec.battery, edits);
          companions.push({
            id: c.id,
            name: c.name,
            conceptImageUrl: turn.imageUrl ?? "",
            conceptPrompt: brief,
            title: c.name || concept.title,
            summary: summaryFromParts(parts),
            description: concept.description,
            parts,
            spec,
          });
        }
        const edits = editsAt("primary", primaryRead.parts, gate.turnId);
        const spec = deriveSpec(primaryRead.parts, primaryRead.hints, edits);
        const blocked = blocksBuild(spec) ? "primary" : companions.find((c) => c.spec && blocksBuild(c.spec))?.id;
        if (blocked) return { booked: false, blocked };
        const answered = chat.turns.find((t): t is SetupTurn => t.role === "setup" && t.status === "answered" && !!t.answer);
        const parts = partsForBuild(primaryRead.parts, spec.battery, edits);
        startBuild({
          chatId: chat.id,
          turnId: gate.turnId,
          imageUrl: gate.imageUrl,
          prompt: gate.prompt,
          conceptNumber: labels.get(gate.turnId) ?? "1",
          title: answered?.productName?.trim() || primaryRead.title || deriveTitle(gate.prompt),
          summary: summaryFromParts(parts),
          description: primaryRead.description,
          projectChoiceId: answered?.answer?.projectId,
          projectChoiceName: answered?.answer?.projectName,
          parts,
          spec,
          companions,
          picks: Object.fromEntries(
            ["primary", ...companions.map((c) => c.id)].map((id) => [id, stateNow.current.picks.get(id) ?? cleanPick(undefined, chat.quality)]),
          ),
        });
        // Booked first: the server is told without holding the sheet (a slow network can't lose the booking).
        void fetch("/api/build/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: chat.id, turnId: gate.turnId, imageUrl: gate.imageUrl, prompt: gate.prompt }),
        }).catch(() => null);
        return { booked: true };
      } finally {
        setSubmitting(false);
      }
    },
    [chat, online, labels, startBuild, editsAt, readForBuild],
  );

  /** The products the maker drew and then left out of this build (Build
   *  options): each one's concept, ready to build into it later — no new
   *  drawing (the owner's approved sample, "Not in this build"). */
  const leftOutProducts = React.useMemo(() => {
    if (!chat || !activeBuild) return [];
    const setup = chat.turns.find((t): t is SetupTurn => t.role === "setup" && t.status === "answered" && !!t.answer);
    if (!setup?.answer) return [];
    const inJob = new Set((activeBuild.companions ?? []).map((c) => c.id));
    return setup.companions
      .filter((c) => setup.answer!.picked.includes(c.id) && state.leftOut.has(c.id) && !inJob.has(c.id))
      .flatMap((c) => {
        let turn: AssistantTurn | null = null;
        for (let i = chat.turns.length - 1; i >= 0; i -= 1) {
          const x = chat.turns[i];
          if (x.role === "assistant" && x.companionOf === c.id && x.status === "ready" && x.imageUrl) {
            turn = x;
            break;
          }
        }
        if (!turn?.imageUrl) return [];
        const pick: PiecePick = state.picks.get(c.id) ?? cleanPick(undefined, chat.quality);
        return [{ id: c.id, name: c.name, imageUrl: turn.imageUrl, turn, pick, cost: pickCost(pick) }];
      });
  }, [chat, activeBuild, state.leftOut, state.picks]);

  /** Build a left-out product into this build, from its drawn concept: read,
   *  checked against its size, charged on its own, booked. A build already
   *  saved gets the product in its project too. */
  const buildLeftOut = React.useCallback(
    async (companionId: string): Promise<"booked" | "short" | { blocked: string } | null> => {
      const job = activeBuild;
      if (!chat || !job || !answeredSetupId || preparing || !online) return null;
      const item = leftOutProducts.find((p) => p.id === companionId);
      if (!item) return null;
      if (!canAfford(item.cost)) return "short";
      setPreparing(true);
      try {
        const brief = conceptBriefOf(chat.turns, item.turn.id);
        const concept = await readForBuild(item.turn, brief);
        const edits = editsAt(companionId, concept.parts, item.turn.id);
        const spec = deriveSpec(concept.parts, concept.hints, edits);
        if (blocksBuild(spec)) return { blocked: companionId };
        const parts = partsForBuild(concept.parts, spec.battery, edits);
        if (!charge(`${job.id}:product:${companionId}`, item.cost, "build")) return "short";
        addBuildProduct(
          job.id,
          {
            id: companionId,
            name: item.name,
            conceptImageUrl: item.imageUrl,
            conceptPrompt: brief,
            title: item.name || concept.title,
            summary: summaryFromParts(parts),
            description: concept.description,
            parts,
            spec,
          },
          item.pick,
        );
        setSetupLeftOut(chat.id, answeredSetupId, companionId, false);
        const holder = saveInfo?.mode.kind === "saved" ? saveInfo.mode.project : null;
        if (holder) {
          updateProject(holder.id, {
            products: [
              ...(holder.products ?? []),
              { name: item.name || concept.title, description: concept.description ?? "", source: { buildId: job.id, productId: companionId } },
            ],
          });
        }
        return "booked";
      } finally {
        setPreparing(false);
      }
    },
    [chat, activeBuild, answeredSetupId, preparing, online, leftOutProducts, canAfford, readForBuild, editsAt, charge, addBuildProduct, setSetupLeftOut, saveInfo, updateProject],
  );

  return {
    hydrated,
    creditsHydrated,
    chat,
    activeBuild,
    labels,
    rail,
    state,
    stage: rail.stage,
    balance,
    canRender,
    online,
    addTo,
    setupPending,
    held,
    projectName,
    savedName,
    saveInfo,
    setupProjects,
    answerSetup,
    focusedProduct,
    setFocusedProduct,
    target,
    submit,
    refine,
    regenerate,
    toggleInBuild,
    addOffered,
    addProduct,
    removeProduct,
    restoreProduct,
    readConcept,
    rereading,
    editsFor,
    editSpec,
    setQuality,
    network,
    saveLink,
    resetLink,
    addNetwork,
    removeNetwork,
    prepareBuild,
    confirmBuild,
    leftOutProducts,
    buildLeftOut,
    preparing,
    submitting,
  };
}

export type ConceptFlow = ReturnType<typeof useConceptFlow>;
