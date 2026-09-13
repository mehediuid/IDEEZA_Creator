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
//                                  to /build/[jobId]

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cancel01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { deriveTitle, useCreateHistory } from "@/lib/create/history";
import type { ConceptSummary } from "@/lib/create/concept";
import { useCreatePlan } from "@/lib/create/plan";
import { ChatThread, conceptLabels } from "./chat-thread";
import { PromptBar } from "./prompt-bar";
import { ConfirmBuildDialog } from "./confirm-build-dialog";
import { ImageEditorModal } from "./image-editor-modal";

export function ConceptChat({ chatId }: { chatId: string }) {
  const router = useRouter();
  const {
    hydrated,
    getChat,
    appendUserTurn,
    appendAssistantTurn,
    resolveAssistantTurn,
    failAssistantTurn,
    setTurnProgress,
    startBuild,
  } = useCreateHistory();
  const { incrementPrompt } = useCreatePlan();

  const chat = getChat(chatId);

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
    if (!chat) return;
    const timers = progressTimers.current;
    const pending = new Set(
      chat.turns
        .filter((t) => t.role === "assistant" && t.status === "pending")
        .map((t) => t.id),
    );
    for (const [id, handle] of timers) {
      if (pending.has(id)) continue;
      clearInterval(handle);
      timers.delete(id);
    }
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
        const res = await fetch("/api/concept/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error("generation failed");
        const data = (await res.json()) as { imageUrl?: string };
        if (!data.imageUrl) throw new Error("missing imageUrl");
        resolveAssistantTurn(cid, turnId, data.imageUrl);
      } catch {
        failAssistantTurn(cid, turnId);
      }
    },
    [incrementPrompt, resolveAssistantTurn, failAssistantTurn],
  );

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
      if (!chat) return;
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
      latestReadyTurn,
      appendUserTurn,
      appendAssistantTurn,
      runGeneration,
    ],
  );

  const handleRegenerate = React.useCallback(
    (sourcePrompt: string, sourceTurnId: string) => {
      if (!chat) return;
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
    [chat, appendAssistantTurn, runGeneration],
  );

  const handleUseTurn = React.useCallback(
    (turnId: string) => {
      if (!chat) return;
      const t = chat.turns.find((x) => x.id === turnId);
      if (!t || t.role !== "assistant" || !t.imageUrl) return;
      setConfirmFor({
        turnId: t.id,
        imageUrl: t.imageUrl,
        prompt: t.prompt,
      });
    },
    [chat],
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
      if (!chat || !editorTurnId) return;
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
    [chat, editorTurnId, appendUserTurn, appendAssistantTurn, runGeneration],
  );

  const handleConfirmBuild = React.useCallback(
    async (concept: ConceptSummary) => {
      if (!chat || !confirmFor) return;
      setSubmittingBuild(true);
      try {
        await fetch("/api/build/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: chat.id,
            turnId: confirmFor.turnId,
            imageUrl: confirmFor.imageUrl,
            prompt: confirmFor.prompt,
          }),
        }).catch(() => null);
        // The concept as the summarizer read it in the dialog — the same
        // title, parts line and parts the user just approved, so every
        // deliverable is derived from what was on screen.
        const job = startBuild({
          chatId: chat.id,
          turnId: confirmFor.turnId,
          imageUrl: confirmFor.imageUrl,
          prompt: confirmFor.prompt,
          conceptNumber: labels.get(confirmFor.turnId) ?? "1",
          title: concept.title || deriveTitle(confirmFor.prompt),
          summary: concept.summary,
          parts: concept.parts,
        });
        // A queued build isn't building yet, so we stay in the chat and
        // say so beside the concept that started it — the build page
        // would only show a waiting room.
        if (job.status === "queued") {
          setQueuedNotice(job.id);
          return;
        }
        router.push(`/build/${job.id}`);
      } finally {
        setSubmittingBuild(false);
        setConfirmFor(null);
      }
    },
    [chat, confirmFor, labels, startBuild, router],
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
    <div className="flex h-full flex-col">
      {/* Thread — scrolls; prompt bar is pinned below. No page header:
          the app shell's sidebar carries navigation and the thread's
          first user turn already says what this chat is about. */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px] px-[24px] py-[32px]">
          <ChatThread
            chat={chat}
            regeneratingFrom={regeneratingFrom}
            onRegenerateAt={handleRegenerate}
            onUseTurn={handleUseTurn}
            onRefineTurn={handleOpenEditor}
          />
        </div>
      </div>

      <div className="bg-bg-page">
        <div className="mx-auto w-full max-w-[640px] px-[24px] py-[16px]">
          {queuedNotice && (
            <div
              role="status"
              data-testid="queued-notice"
              className="mb-[12px] flex items-center gap-[10px] rounded-xl border border-solid border-border bg-bg-subtle px-[14px] py-[10px] text-sm text-text-secondary"
            >
              <Icon icon={Clock01Icon} size={16} />
              Queued — one build ahead of you
              <Link
                href={`/build/${queuedNotice}`}
                className="ml-auto font-semibold text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
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
          <PromptBar onSubmit={handleUserSubmit} />
          <p className="mt-[8px] text-center text-sm font-regular text-text-tertiary">
            Start by describing the concept. Refine and regenerate as many
            times as you like.
          </p>
        </div>
      </div>

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
