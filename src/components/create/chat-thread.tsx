"use client";

// ChatThread — renders every turn in the concept conversation. User
// prompts are right-aligned text bubbles; assistant turns are
// left-aligned ImageTurn cards.
//
// Spec §4a / §10: regenerations APPEND new turns and never overwrite
// older ones. The thread is the in-session history; the user scrolls
// back to compare or reuse any prior result.
//
// Spec §4c: each image turn is labelled "Concept N" so users can locate
// a specific version. Refinements get a "Refines Concept M" breadcrumb
// so the evolution chain is visible while scrolling.

import * as React from "react";
import type { ChatSession } from "@/lib/create/history";
import { ImageTurn } from "./image-turn";

export function ChatThread({
  chat,
  onRegenerateAt,
  onUseTurn,
  onRefineTurn,
}: {
  chat: ChatSession;
  onRegenerateAt: (sourcePrompt: string) => void;
  onUseTurn: (turnId: string) => void;
  onRefineTurn: (turnId: string) => void;
}) {
  // Number each assistant turn in render order so the labels match what
  // the user sees in the thread. A map from turnId → concept number lets
  // refine-children point back to their parent's number for breadcrumb
  // copy ("Refines Concept 2").
  const conceptNumber = React.useMemo(() => {
    const out = new Map<string, number>();
    let n = 0;
    for (const t of chat.turns) {
      if (t.role === "assistant") {
        n += 1;
        out.set(t.id, n);
      }
    }
    return out;
  }, [chat.turns]);

  // Auto-scroll to the newest turn so the latest result is in view.
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.turns.length]);

  return (
    <div
      role="log"
      aria-label="Concept conversation"
      aria-live="polite"
      className="flex flex-col gap-[24px]"
    >
      {chat.turns.map((turn) => {
        if (turn.role === "user") {
          return <UserBubble key={turn.id} text={turn.text} />;
        }
        const number = conceptNumber.get(turn.id) ?? 1;
        const parentNumber =
          turn.kind === "refine" && turn.parentTurnId
            ? conceptNumber.get(turn.parentTurnId)
            : undefined;
        return (
          <div
            key={turn.id}
            className="flex"
            aria-label={`Concept ${number}`}
          >
            <ImageTurn
              turn={turn}
              conceptNumber={number}
              parentConceptNumber={parentNumber}
              onRegenerate={() => onRegenerateAt(turn.prompt)}
              onUseThis={() => onUseTurn(turn.id)}
              onRefine={() => onRefineTurn(turn.id)}
            />
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p
        className="max-w-[560px] whitespace-pre-wrap rounded-2xl rounded-br-md bg-bg-brand-subtle px-[18px] py-[12px] text-md text-text-primary"
        role="comment"
        aria-label="Your prompt"
      >
        {text}
      </p>
    </div>
  );
}
