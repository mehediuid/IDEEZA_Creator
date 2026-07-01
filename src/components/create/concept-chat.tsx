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
import {
  ArrowLeft01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Icon } from "@/components/dashboard/icon";
import { useCreateHistory, type ChatSession } from "@/lib/create/history";
import { useCreatePlan } from "@/lib/create/plan";
import { ChatThread } from "./chat-thread";
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
    startBuild,
    buildsForChat,
  } = useCreateHistory();
  const { incrementPrompt } = useCreatePlan();

  const chat = getChat(chatId);

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
  const [editorTurnId, setEditorTurnId] = React.useState<string | null>(null);

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

  // Find the most-recent READY assistant turn — what a prompt-bar
  // submission should evolve from. If nothing is ready yet (e.g. the
  // very first generation is still pending), refinement degrades to a
  // fresh take so the user is never blocked.
  //
  // Also compute its position number in the assistant-turn sequence so
  // the prompt-bar hint can say "refines Concept N" naturally.
  const { latestReadyTurn, latestReadyConceptNumber } = React.useMemo(() => {
    if (!chat) return { latestReadyTurn: null, latestReadyConceptNumber: 0 };
    let conceptIdx = 0;
    let last: Extract<
      (typeof chat.turns)[number],
      { role: "assistant" }
    > | null = null;
    let lastIdx = 0;
    for (const t of chat.turns) {
      if (t.role === "assistant") {
        conceptIdx += 1;
        if (t.status === "ready" && t.imageUrl) {
          last = t;
          lastIdx = conceptIdx;
        }
      }
    }
    return { latestReadyTurn: last, latestReadyConceptNumber: lastIdx };
  }, [chat]);

  // Concept number of the turn currently open in the editor (for its label).
  const editorConceptNumber = React.useMemo(() => {
    if (!chat || !editorTurnId) return 1;
    let n = 0;
    for (const t of chat.turns) {
      if (t.role === "assistant") {
        n += 1;
        if (t.id === editorTurnId) return n;
      }
    }
    return n || 1;
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
    (sourcePrompt: string) => {
      if (!chat) return;
      // Regenerate (spec §4c) is a FRESH take on the same prompt — it
      // ignores the existing image. No new user turn because the user
      // didn't retype anything.
      const { turnId } = appendAssistantTurn(chat.id, {
        prompt: sourcePrompt,
        kind: "fresh",
      });
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

  const handleConfirmBuild = React.useCallback(async () => {
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
      const job = startBuild({
        chatId: chat.id,
        turnId: confirmFor.turnId,
        imageUrl: confirmFor.imageUrl,
        prompt: confirmFor.prompt,
      });
      router.push(`/build/${job.id}`);
    } finally {
      setSubmittingBuild(false);
      setConfirmFor(null);
    }
  }, [chat, confirmFor, startBuild, router]);

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
      <ChatHeader chat={chat} buildCount={buildsForChat(chat.id).length} />

      {/* Thread — scrolls; prompt bar is pinned below. */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] px-[24px] py-[32px]">
          <ChatThread
            chat={chat}
            onRegenerateAt={handleRegenerate}
            onUseTurn={handleUseTurn}
            onRefineTurn={handleOpenEditor}
          />
        </div>
      </div>

      <div className="border-t border-border bg-bg-page">
        <div className="mx-auto w-full max-w-[760px] px-[24px] py-[16px]">
          <PromptBar
            onSubmit={handleUserSubmit}
            busy={chat.turns.some(
              (t) => t.role === "assistant" && t.status === "pending",
            )}
            placeholder={
              latestReadyTurn
                ? "Describe a change to refine, or regenerate for a fresh take…"
                : "Describe the concept you want to see…"
            }
          />
          <p className="mt-[8px] text-center text-2xs font-medium text-text-tertiary">
            {latestReadyTurn
              ? `Typing a change refines Concept ${latestReadyConceptNumber}. Use Regenerate for a fresh take. One chat can produce many builds.`
              : "Start by describing the concept. Refine and regenerate as many times as you like."}
          </p>
        </div>
      </div>

      <ConfirmBuildDialog
        open={confirmFor !== null}
        conceptImageUrl={confirmFor?.imageUrl}
        conceptPrompt={confirmFor?.prompt ?? ""}
        submitting={submittingBuild}
        onCancel={() => setConfirmFor(null)}
        onConfirm={handleConfirmBuild}
      />

      <ImageEditorModal
        open={editorTurnId !== null && editorImage !== null}
        image={editorImage}
        title={chat.title}
        conceptNumber={editorConceptNumber}
        onClose={() => setEditorTurnId(null)}
        onSubmitEdit={handleSubmitEdit}
      />
    </div>
  );
}

function ChatHeader({
  chat,
  buildCount,
}: {
  chat: ChatSession;
  buildCount: number;
}) {
  return (
    <header className="flex items-center gap-[16px] border-b border-border bg-bg-page px-[24px] py-[12px]">
      <Link
        href="/"
        aria-label="Back to Home"
        className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={ArrowLeft01Icon} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
          Concept chat
        </p>
        <h1 className="truncate text-md font-semibold text-text-primary">
          {chat.title}
        </h1>
      </div>
      {buildCount > 0 && (
        <Link
          href="/history/builds"
          className="inline-flex h-[32px] items-center gap-[8px] rounded-full border border-border bg-bg-surface px-[12px] text-2xs font-bold uppercase tracking-wider text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Clock01Icon} size={14} />
          {buildCount} build{buildCount === 1 ? "" : "s"}
        </Link>
      )}
    </header>
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
