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
  BuildJob,
  ChatSession,
  ChatTurn,
  SetupAnswer,
} from "@/lib/create/history";
import { BUILD_COST, useCredits } from "@/lib/create/credits";
import { ImageTurn, InsufficientCreditsBanner } from "./image-turn";
import { SetupTurn, type SetupProject } from "./setup-turn";
import { ReviewOutputs } from "./review-outputs";

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
  onAddProduct,
  job,
  focusedProduct,
  onFocusProduct,
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
  /** Take up a product the maker passed over at the question. */
  onAddProduct: (companionId: string) => void;
  /** The build this chat started, once it has one. The canvas becomes the
   *  build's own surface then — the deliverables arriving one by one —
   *  rather than sending the maker to a page of its own. */
  job?: BuildJob | null;
  /** Which product the chat is looking at, shared with the rail and the
   *  composer so all three name the same thing. */
  focusedProduct?: string;
  onFocusProduct?: (productId: string) => void;
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

  // The canvas shows the CURRENT state of the build, not its history: one
  // card per product, each the latest concept for it. Every refine used to
  // stack another card here, so a two-product build with a few refines
  // became a column nobody could see the shape of. The history is not
  // lost — the rail beside this records every render as it happened.
  const products = React.useMemo(() => {
    const latest = new Map<string, Extract<ChatTurn, { role: "assistant" }>>();
    for (const t of chat.turns) {
      if (t.role !== "assistant") continue;
      latest.set(t.companionOf ?? "primary", t);
    }
    // Primary first; the companions keep the order they were offered in.
    const primary = latest.get("primary");
    const rest = [...latest.entries()]
      .filter(([k]) => k !== "primary")
      .map(([, t]) => t);
    return primary ? [primary, ...rest] : rest;
  }, [chat.turns]);

  const setup = React.useMemo(
    () => chat.turns.find((t) => t.role === "setup"),
    [chat.turns],
  );
  const projectName =
    setup?.role === "setup" ? (setup.answer?.projectName ?? "") : "";

  // One build, one action. A card per product each carrying "Use this
  // concept" asked for the same build once per product — and answering it
  // twice was the same answer both times.
  // Offered, and not being built: no concept has been drawn for it and the
  // answer did not include it.
  const available = React.useMemo(() => {
    if (setup?.role !== "setup" || setup.status !== "answered") return [];
    const drawn = new Set(
      chat.turns
        .filter((t) => t.role === "assistant" && t.companionOf)
        .map((t) => (t.role === "assistant" ? t.companionOf! : "")),
    );
    return setup.companions.filter((x) => !drawn.has(x.id));
  }, [setup, chat.turns]);

  const buildable = products.find(
    (t) => t.status === "ready" && !t.companionOf,
  );
  const allReady =
    products.length > 0 && products.every((t) => t.status === "ready");

  return (
    <div
      role="log"
      aria-label="Concepts"
      aria-live="polite"
      className="flex flex-col items-start gap-[28px]"
    >
      {/* The questions, while they are still questions. Once they are
          answered the rail carries the decision, and a read-back of it at the
          top of the canvas says the same thing twice in the same eyeful. */}
      {setup?.role === "setup" && setup.status !== "answered" && (
        <SetupTurn
          prompt={setup.prompt}
          status={setup.status}
          companions={setup.companions}
          productName={setup.productName}
          productSummary={setup.productSummary}
          answer={setup.answer}
          projects={projects}
          onAnswer={(a) => onAnswerSetup(setup.id, a)}
        />
      )}

      {/* Once the build is running the canvas is the build: its products as
          tabs, each deliverable as a tab under them, filling in as they
          land. The concepts that got here are in the rail, in the order
          they happened — the canvas shows the current state of the work,
          which is now the output rather than the drawings of it. */}
      {job && (
        <div className="w-full">
          <ReviewOutputs
            job={job}
            productId={focusedProduct}
            onProductChange={onFocusProduct}
            projectName={projectName}
          />
        </div>
      )}

      {!job && products.length > 0 && (
        <>
          {projectName && (
            <header className="flex flex-col gap-[2px]">
              <h2 className="text-lg font-semibold text-text-primary">
                {projectName}
              </h2>
              <p className="text-sm text-text-tertiary">
                {products.length} product{products.length === 1 ? "" : "s"} in
                this project
              </p>
            </header>
          )}

          <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[20px]">
            {products.map((turn) => (
              <div key={turn.id} aria-label={`Concept ${labels.get(turn.id) ?? "1"}`}>
                <ImageTurn
                  turn={turn}
                  conceptLabel={labels.get(turn.id) ?? "1"}
                  parentConceptLabel={
                    turn.kind === "refine" && turn.parentTurnId
                      ? labels.get(turn.parentTurnId)
                      : undefined
                  }
                  regenerating={regeneratingFrom?.has(turn.id) ?? false}
                  onRegenerate={() => onRegenerateAt(turn.prompt, turn.id)}
                  preparing={preparingTurnId === turn.id}
                  onUseThis={() => onUseTurn(turn.id)}
                  onRefine={() => onRefineTurn(turn.id)}
                  showUse={false}
                />
              </div>
            ))}
          </div>

          {/* Everything the classifier found that is not being built. The
              answer at the question was "not now", which is not "never" —
              and the offer is already paid for in thinking, so making them
              start again to get it back would lose work they had done. */}
          {available.length > 0 && (
            <section className="flex w-full flex-col gap-[8px] border-t border-solid border-border pt-[20px]">
              <h3 className="text-sm font-semibold text-text-primary">
                Add another product to this project
              </h3>
              <ul role="list" className="flex flex-col gap-[2px]">
                {available.map((a) => (
                  <li
                    key={a.id}
                    data-testid="available-product"
                    className="flex items-start gap-[12px] rounded-xl px-[12px] py-[10px] transition-colors duration-fast hover:bg-bg-subtle"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-md font-medium text-text-primary">
                        {a.name}
                      </span>
                      <span className="mt-[1px] block text-sm leading-relaxed text-text-tertiary">
                        {a.why}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddProduct(a.id)}
                      className="mt-[2px] inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Add · 1 credit
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {buildable && (
            <BuildAction
              products={products.length}
              allReady={allReady}
              preparing={preparingTurnId === buildable.id}
              onBuild={() => onUseTurn(buildable.id)}
            />
          )}
          {bannerAfterId && <InsufficientCreditsBanner />}
        </>
      )}
      <div ref={endRef} />
    </div>
  );
}

/** The one decision the canvas offers: build what is on it. Held back until
 *  every product has a concept, because a build books a job per product and
 *  a product with nothing drawn has nothing to build from. */
function BuildAction({
  products,
  allReady,
  preparing,
  onBuild,
}: {
  products: number;
  allReady: boolean;
  preparing: boolean;
  onBuild: () => void;
}) {
  const { hydrated, balance } = useCredits();
  const cost = BUILD_COST * products;
  const short = hydrated && balance < cost;
  const blocked = short || !allReady || preparing;
  return (
    <div className="flex w-full items-center gap-[12px] border-t border-solid border-border pt-[20px]">
      <p className="text-sm text-text-tertiary">
        {allReady
          ? `Engineering ${products} product${products === 1 ? "" : "s"} · ${cost} credits`
          : "Waiting for every concept to land"}
        {short ? ` · you have ${balance}` : ""}
      </p>
      <button
        type="button"
        data-testid="build-action"
        onClick={onBuild}
        disabled={blocked}
        aria-busy={preparing}
        title={
          short
            ? "Not enough credits"
            : !allReady
              ? "One of the concepts is still rendering"
              : undefined
        }
        className={
          blocked
            ? "ml-auto inline-flex h-[40px] cursor-not-allowed items-center gap-[8px] rounded-lg bg-bg-subtle px-[16px] text-md font-semibold text-text-disabled"
            : "ml-auto inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
        }
      >
        {preparing ? "Preparing…" : "Generate the full product"}
      </button>
    </div>
  );
}

