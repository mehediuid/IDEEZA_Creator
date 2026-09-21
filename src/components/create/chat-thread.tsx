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
// ("Concept 1.1"), so the dotted label alone carries the evolution
// chain while scrolling.

import * as React from "react";
import type {
  ChatSession,
  ChatTurn,
  SetupAnswer,
} from "@/lib/create/history";
import { BUILD_COST, useCredits } from "@/lib/create/credits";
import { ImageTurn, InsufficientCreditsBanner } from "./image-turn";
import { SetupTurn, type SetupProject } from "./setup-turn";

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
  regeneratingFrom,
  preparingTurnId,
  projects,
  onAnswerSetup,
  onRegenerateAt,
  onUseTurn,
  onRefineTurn,
}: {
  projects: SetupProject[];
  onAnswerSetup: (turnId: string, answer: SetupAnswer) => void;
  chat: ChatSession;
  // Turns whose Regenerate is still rendering its fresh take — the
  // orchestrator owns the child→source link, the card only reads it.
  regeneratingFrom?: ReadonlySet<string>;
  /** The turn whose "Use this concept" is waiting on the two model calls
   *  that have to answer before the gate can open. */
  preparingTurnId?: string | null;
  onRegenerateAt: (sourcePrompt: string, sourceTurnId: string) => void;
  onUseTurn: (turnId: string) => void;
  onRefineTurn: (turnId: string) => void;
}) {
  // One label per concept, so a card, its breadcrumb and the editor all
  // name the same thing.
  const labels = React.useMemo(() => conceptLabels(chat.turns), [chat.turns]);

  // The credit gate is explained ONCE, under the newest concept the user
  // could still have built — every greyed "Use this concept" above it
  // has the same reason, and repeating the notice per card would say it
  // down the whole conversation. It sits inside the thread (not below
  // it) so the auto-scroll to the newest turn carries it into view.
  // The rendered balance, not canAfford(): the provider refreshes that
  // ref in its own effect, which runs after ours, so it reads a render
  // behind here (build-simulator.tsx reads it the same way).
  const { hydrated: creditsHydrated, balance } = useCredits();
  const bannerAfterId = React.useMemo(() => {
    if (!creditsHydrated || balance >= BUILD_COST) return null;
    let id: string | null = null;
    for (const t of chat.turns) {
      if (t.role !== "assistant" || t.status !== "ready" || t.usedForBuild) {
        continue;
      }
      id = t.id;
    }
    return id;
  }, [chat.turns, creditsHydrated, balance]);

  // Auto-scroll to the newest turn so the latest result is in view.
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.turns.length]);

  return (
    <div
      role="log"
      aria-label="Concepts"
      aria-live="polite"
      className="flex flex-col items-start gap-[28px]"
    >
      {chat.turns.map((turn) => {
        // The maker’s own words are in the rail beside this. Repeating them
        // on the canvas would push the work they are about off the screen.
        if (turn.role === "user") return null;
        if (turn.role === "setup") {
          return (
            <div key={turn.id} className="flex">
              <SetupTurn
                prompt={turn.prompt}
                status={turn.status}
                companions={turn.companions}
                productName={turn.productName}
                productSummary={turn.productSummary}
                answer={turn.answer}
                projects={projects}
                onAnswer={(a) => onAnswerSetup(turn.id, a)}
              />
            </div>
          );
        }
        const label = labels.get(turn.id) ?? "1";
        const parentLabel =
          turn.kind === "refine" && turn.parentTurnId
            ? labels.get(turn.parentTurnId)
            : undefined;
        return (
          <React.Fragment key={turn.id}>
            <div className="flex" aria-label={`Concept ${label}`}>
              <ImageTurn
                turn={turn}
                conceptLabel={label}
                parentConceptLabel={parentLabel}
                regenerating={regeneratingFrom?.has(turn.id) ?? false}
                onRegenerate={() => onRegenerateAt(turn.prompt, turn.id)}
                preparing={preparingTurnId === turn.id}
                onUseThis={() => onUseTurn(turn.id)}
                onRefine={() => onRefineTurn(turn.id)}
              />
            </div>
            {turn.id === bannerAfterId && <InsufficientCreditsBanner />}
          </React.Fragment>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

