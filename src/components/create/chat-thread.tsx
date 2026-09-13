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
// a specific version. Refinements are numbered off their parent
// ("Concept 1.1") and get a "Refines Concept M" breadcrumb, so the
// evolution chain is visible while scrolling.

import * as React from "react";
import type { ChatSession, ChatTurn } from "@/lib/create/history";
import { ImageTurn } from "./image-turn";

// Label every concept by its lineage, not by its position: a fresh take
// counts up ("1", "2", …) and a refine hangs off the concept it evolves
// ("1.1", "1.2"), which is how the user talks about them — "the second
// try at the first idea". A refine whose parent is gone (older stored
// chats) reads as a fresh one rather than pointing at nothing.
export function conceptLabels(turns: ChatTurn[]): Map<string, string> {
  const out = new Map<string, string>();
  const children = new Map<string, number>();
  let fresh = 0;
  for (const t of turns) {
    if (t.role !== "assistant") continue;
    const parentId = t.kind === "refine" ? t.parentTurnId : undefined;
    const parentLabel = parentId ? out.get(parentId) : undefined;
    if (parentId && parentLabel) {
      const k = (children.get(parentId) ?? 0) + 1;
      children.set(parentId, k);
      out.set(t.id, `${parentLabel}.${k}`);
      continue;
    }
    fresh += 1;
    out.set(t.id, String(fresh));
  }
  return out;
}

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
  // One label per concept, so a card, its breadcrumb and the editor all
  // name the same thing.
  const labels = React.useMemo(() => conceptLabels(chat.turns), [chat.turns]);

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
        const label = labels.get(turn.id) ?? "1";
        const parentLabel =
          turn.kind === "refine" && turn.parentTurnId
            ? labels.get(turn.parentTurnId)
            : undefined;
        return (
          <div
            key={turn.id}
            className="flex"
            aria-label={`Concept ${label}`}
          >
            <ImageTurn
              turn={turn}
              conceptLabel={label}
              parentConceptLabel={parentLabel}
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
