"use client";

// ChatThread — the chat's canvas. The setup question while it is still a
// question; then one card per product (its current concept) and the one build
// action for all of them; once a build exists, the build leads and the
// concepts stay beneath it, so a change made after the build is visible and
// can be built again.
//
// Spec §4a / §10: regenerations APPEND new turns and never overwrite older
// ones — the rail keeps that history; the canvas shows the current state.
//
// Spec §4c: each concept carries a lineage number ("1.1" is the first refine
// of concept 1) beside the product's name.

import * as React from "react";
import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  productsOf,
  type BuildJob,
  type ChatSession,
  type ChatTurn,
  type SetupAnswer,
} from "@/lib/create/history";
import { buildCost, CONCEPT_COST, useCredits } from "@/lib/create/credits";
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
  projectName = "",
  onRegenerateAt,
  onBuild,
  onRefineTurn,
  onAddProduct,
  job,
  focusedProduct,
  onFocusProduct,
}: {
  projects: SetupProject[];
  onAnswerSetup: (turnId: string, answer: SetupAnswer) => void;
  chat: ChatSession;
  /** The project's name — typed at the question, or the existing project
   *  picked there. The rail and the review card use the same one. */
  projectName?: string;
  // Turns whose Regenerate is still rendering its fresh take — the
  // orchestrator owns the child→source link, the card only reads it.
  regeneratingFrom?: ReadonlySet<string>;
  /** The turn whose build is waiting on the model calls that have to answer
   *  before the gate can open. */
  preparingTurnId?: string | null;
  onRegenerateAt: (sourcePrompt: string, sourceTurnId: string) => void;
  /** Build what is on the canvas, starting from the primary's concept. */
  onBuild: (turnId: string) => void;
  onRefineTurn: (turnId: string) => void;
  /** Take up a product the maker passed over at the question. */
  onAddProduct: (companionId: string) => void;
  /** The build this chat started, once it has one. The canvas leads with the
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

  // Every card is titled with the product it is a drawing of — the name the
  // question gave it, which is the name the rail and the composer use too.
  const productNameOf = (t: Extract<ChatTurn, { role: "assistant" }>) => {
    if (setup?.role !== "setup") return undefined;
    if (!t.companionOf) return setup.productName?.trim() || undefined;
    return setup.companions.find((c) => c.id === t.companionOf)?.name;
  };

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

  // Which drawings the current build was made from. A concept changed after
  // the build — refined, regenerated, or a product added — is not in it, and
  // the canvas says so: that change used to be charged and then hidden
  // behind the review card, because the canvas showed nothing else once a
  // build existed.
  const builtImages = React.useMemo(
    () =>
      new Set(
        job ? productsOf(job).map((p) => p.conceptImageUrl).filter(Boolean) : [],
      ),
    [job],
  );
  const inBuild = (t: Extract<ChatTurn, { role: "assistant" }>) =>
    !!t.imageUrl && builtImages.has(t.imageUrl);
  const changedSinceBuild =
    !!job && products.some((t) => t.status !== "ready" || !inBuild(t));

  const buildable = products.find(
    (t) => t.status === "ready" && !t.companionOf,
  );
  const allReady =
    products.length > 0 && products.every((t) => t.status === "ready");
  const offerBuild = !!buildable && (!job || changedSinceBuild);

  // The credit gate is explained ONCE, beside the one build action — every
  // reason it is off is the same reason. The rendered balance, not
  // canAfford(): the provider refreshes that ref in its own effect, which
  // runs after ours, so it reads a render behind here.
  const { hydrated: creditsHydrated, balance } = useCredits();
  const cost = buildCost(products.length);
  const shortForBuild = creditsHydrated && balance < cost;

  const conceptGrid = (
    <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[20px]">
      {products.map((turn) => (
        <ImageTurn
          key={turn.id}
          turn={turn}
          conceptLabel={labels.get(turn.id) ?? "1"}
          parentConceptLabel={
            turn.kind === "refine" && turn.parentTurnId
              ? labels.get(turn.parentTurnId)
              : undefined
          }
          productName={productNameOf(turn)}
          inBuild={!!job && inBuild(turn)}
          regenerating={regeneratingFrom?.has(turn.id) ?? false}
          onRegenerate={() => onRegenerateAt(turn.prompt, turn.id)}
          onRefine={() => onRefineTurn(turn.id)}
        />
      ))}
    </div>
  );

  return (
    <div aria-label="Concepts" className="flex flex-col items-start gap-[28px]">
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

      {/* Once a build exists it leads the canvas: its products as tabs, each
          deliverable as a tab under them, filling in as they land. */}
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

      {products.length > 0 && (
        <>
          {job ? (
            <header className="flex flex-col gap-[2px]">
              <h2 className="text-lg font-semibold text-text-primary">
                Concepts
              </h2>
              <p className="text-sm text-text-tertiary">
                {changedSinceBuild
                  ? "Changed since this build — build again to carry the change into the deliverables."
                  : "The drawings this build was made from. Refine one to change the next build."}
              </p>
            </header>
          ) : (
            projectName && (
              <header className="flex flex-col gap-[2px]">
                <h2 className="text-lg font-semibold text-text-primary">
                  {projectName}
                </h2>
                <p className="text-sm text-text-tertiary">
                  {products.length} product{products.length === 1 ? "" : "s"} in
                  this project
                </p>
              </header>
            )
          )}

          {conceptGrid}

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
                      Add · {CONCEPT_COST} credit
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {offerBuild && buildable && (
            <BuildAction
              products={products.length}
              cost={cost}
              again={!!job}
              allReady={allReady}
              preparing={preparingTurnId === buildable.id}
              onBuild={() => onBuild(buildable.id)}
            />
          )}
          {offerBuild && allReady && shortForBuild && (
            <InsufficientCreditsBanner cost={cost} />
          )}
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
  cost,
  again,
  allReady,
  preparing,
  onBuild,
}: {
  products: number;
  cost: number;
  /** A build exists and a concept has changed since — this books the next. */
  again: boolean;
  allReady: boolean;
  preparing: boolean;
  onBuild: () => void;
}) {
  const { hydrated, balance } = useCredits();
  const short = hydrated && balance < cost;
  const blocked = short || !allReady || preparing;
  const reason = short
    ? `Not enough credits — this build costs ${cost}, you have ${balance}`
    : !allReady
      ? "One of the concepts is still drawing"
      : undefined;
  const label = again
    ? "Build again"
    : products === 1
      ? "Build this product"
      : `Build ${products} products`;
  return (
    <div className="flex w-full flex-wrap items-center gap-[12px] border-t border-solid border-border pt-[20px]">
      <p className="text-sm text-text-secondary">
        {allReady
          ? `${products} product${products === 1 ? "" : "s"} · ${cost} credits`
          : "Waiting for every concept to land"}
        {short ? (
          <span className="text-text-error"> · you have {balance}</span>
        ) : null}
      </p>
      {/* Busy looks like the gate's own busy: the brand fill, dimmed, turning
          — not a grey that reads as disabled while the work is under way. */}
      <button
        type="button"
        data-testid="build-action"
        onClick={onBuild}
        disabled={blocked}
        aria-busy={preparing}
        title={reason}
        className={
          preparing
            ? "ml-auto inline-flex h-[40px] cursor-wait items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand opacity-80"
            : blocked
              ? "ml-auto inline-flex h-[40px] cursor-not-allowed items-center gap-[8px] rounded-lg bg-bg-subtle px-[16px] text-md font-semibold text-text-disabled"
              : "ml-auto inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
        }
      >
        {preparing && (
          <span aria-hidden className="inline-flex motion-safe:animate-spin">
            <Icon icon={Refresh01Icon} size={16} />
          </span>
        )}
        {preparing ? "Preparing the build…" : label}
      </button>
      {/* The reason a disabled button is off, where the keyboard and a touch
          screen can reach it — a title on a disabled button reaches neither. */}
      {reason && !preparing && (
        <p className="w-full text-right text-sm text-text-tertiary">{reason}</p>
      )}
    </div>
  );
}
