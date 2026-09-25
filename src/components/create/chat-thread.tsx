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
import { Add01Icon, Refresh01Icon, Undo02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { TextInput } from "@/components/ideeza/text-input";
import {
  type BuildJob,
  type ChatSession,
  type ChatTurn,
  type SetupAnswer,
} from "@/lib/create/history";
import { buildCost, CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { cleanEdits } from "@/lib/spec/hints";
import type { SpecEdits } from "@/lib/spec/types";
import {
  productIdOf,
  productNameOf as sharedProductNameOf,
  projectState,
} from "@/lib/create/project-state";
import { OUTLINE_BUTTON, OUTLINE_BUTTON_OFF } from "./buttons";
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
  onAddNamedProduct,
  onRemoveProduct,
  onRestoreProduct,
  onToggleInBuild,
  job,
  focusedProduct,
  onFocusProduct,
  openSpecs,
  onSpecOpenChange,
  onFocusSpec,
  onSpecChange,
  rereading,
  onRereadConcept,
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
  /** A product nobody offered, named by the maker — drawn as its own
   *  concept (one credit) and added to the project. */
  onAddNamedProduct: (name: string) => void;
  /** Out of the project; its concepts stay, so Restore is free. */
  onRemoveProduct: (companionId: string) => void;
  onRestoreProduct: (companionId: string) => void;
  /** In or out of the next build, for a product that stays in the project. */
  onToggleInBuild: (companionId: string) => void;
  /** The build this chat started, once it has one. The canvas leads with the
   *  build's own surface then — the deliverables arriving one by one —
   *  rather than sending the maker to a page of its own. */
  job?: BuildJob | null;
  /** Which product the chat is looking at, shared with the rail and the
   *  composer so all three name the same thing. */
  focusedProduct?: string;
  onFocusProduct?: (productId: string) => void;
  /** Cards whose spec is open, shared with the build path that opens one. */
  openSpecs?: ReadonlySet<string>;
  onSpecOpenChange?: (productId: string, open: boolean) => void;
  /** Opens a card's spec and focuses its size — the Build line's way to a
   *  size that can't be built. */
  onFocusSpec?: (productId: string) => void;
  onSpecChange?: (productId: string, edits: SpecEdits) => void;
  /** Turns whose concept is being read again right now. */
  rereading?: ReadonlySet<string>;
  /** Read a turn's concept again — offered on a card showing the stand-in. */
  onRereadConcept?: (turnId: string) => void;
}) {
  // One label per concept, so a card, its breadcrumb and the editor all
  // name the same thing.
  const labels = React.useMemo(() => conceptLabels(chat.turns), [chat.turns]);

  // Scroll to the newest turn when one ARRIVES, so a new drawing is in view.
  // Not on opening the chat: that scrolled to the foot of the canvas and cut
  // off the tops of the first cards, on a page the maker had just come back
  // to read from the top.
  const endRef = React.useRef<HTMLDivElement>(null);
  const seenTurns = React.useRef(chat.turns.length);
  React.useEffect(() => {
    if (chat.turns.length <= seenTurns.current) {
      seenTurns.current = chat.turns.length;
      return;
    }
    seenTurns.current = chat.turns.length;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.turns.length]);

  // The canvas shows the CURRENT state of the build, not its history: one
  // card per product, each the latest concept for it. Every refine used to
  // stack another card here, so a two-product build with a few refines
  // became a column nobody could see the shape of. The history is not
  // lost — the rail beside this records every render as it happened.
  //
  // This is the one project model the rail reads too (project-state.ts) —
  // so the canvas and the rail can't work out two different answers to
  // "what changed since the build" or "what doesn't fit" from the same chat.
  const state = React.useMemo(() => projectState(chat, job), [chat, job]);
  const {
    setup,
    answer,
    products,
    leftOut,
    selected,
    concepts,
    specs,
    specBlock,
    inBuild,
    conceptChanged,
    specChanged,
    changedSinceBuild,
    available,
    removed,
    allReady,
    failedChoice,
  } = state;

  // Every card is titled with the product it is a drawing of — the name the
  // question gave it, which is the name the rail and the composer use too.
  const productNameOf = (t: Extract<ChatTurn, { role: "assistant" }>) =>
    sharedProductNameOf(setup, t);

  const buildable = products.find(
    (t) => t.status === "ready" && !t.companionOf,
  );
  const offerBuild = !!buildable && (!job || changedSinceBuild);

  // The credit gate is explained ONCE, beside the one build action — every
  // reason it is off is the same reason. The rendered balance, not
  // canAfford(): the provider refreshes that ref in its own effect, which
  // runs after ours, so it reads a render behind here.
  const { hydrated: creditsHydrated, balance } = useCredits();
  const cost = buildCost(selected.length);
  const shortForBuild = creditsHydrated && balance < cost;
  const shortForRender = creditsHydrated && balance < CONCEPT_COST;

  // Top-aligned: an open spec makes one card tall, and stretched rows gave
  // its neighbour a matching void under its buttons.
  const conceptGrid = (
    <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-[20px]">
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
          // A project of one has nothing to choose between, and a chat from
          // before the setup question has no answer to record the choice in.
          buildChoice={
            answer && products.length > 1
              ? turn.companionOf
                ? {
                    included: !leftOut.has(turn.companionOf),
                    onToggle: () => onToggleInBuild(turn.companionOf!),
                  }
                : { included: true, locked: true }
              : undefined
          }
          spec={
            turn.status === "ready"
              ? {
                  productId: productIdOf(turn),
                  spec: specs.get(turn.id) ?? null,
                  parts: concepts.get(turn.id)?.parts ?? [],
                  fallback: !!concepts.get(turn.id)?.fallback,
                  rereading: rereading?.has(turn.id) ?? false,
                  onReread:
                    concepts.get(turn.id)?.fallback && onRereadConcept
                      ? () => onRereadConcept(turn.id)
                      : undefined,
                  edits: cleanEdits(answer?.specs?.[productIdOf(turn)]),
                  open: openSpecs?.has(productIdOf(turn)) ?? false,
                  onOpenChange: (open) => onSpecOpenChange?.(productIdOf(turn), open),
                  onChange:
                    answer && onSpecChange
                      ? (edits) => onSpecChange(productIdOf(turn), edits)
                      : undefined,
                }
              : undefined
          }
          onRemove={
            answer && turn.companionOf
              ? () => {
                  if (focusedProduct === turn.companionOf) onFocusProduct?.("primary");
                  onRemoveProduct(turn.companionOf!);
                }
              : undefined
          }
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

      {/* One product is one 640 px card, so its section is that wide too —
          the build action used to sit at the far edge of a 1000 px canvas,
          a long way from the card it builds. Several products take the width. */}
      {products.length > 0 && (
        <div
          className={[
            "flex w-full flex-col items-start gap-[28px]",
            products.length === 1 ? "max-w-[640px]" : "",
          ].join(" ")}
        >
          {job ? (
            <header className="flex flex-col gap-[2px]">
              <h2 className="text-lg font-semibold text-text-primary">
                Concepts
              </h2>
              <p className="text-sm text-text-tertiary">
                {conceptChanged
                  ? "Changed since this build — build again to carry the change into the deliverables."
                  : specChanged
                    ? "Spec changed since this build — building again makes a new version."
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

          {/* Figma-less, the maker's own ask: what is missing is added here,
              beside what it joins — a name typed and drawn, a product the
              classifier offered and was passed over, or one taken out and
              wanted back. The composer still reads "add a charger" too;
              this is the place to do it without phrasing a sentence. */}
          {answer && (
            <AddProductSection
              existing={products.map((t) => productNameOf(t) ?? "")}
              available={available}
              removed={removed}
              shortForRender={shortForRender}
              onAddOffered={onAddProduct}
              onRestore={onRestoreProduct}
              onAddNamed={onAddNamedProduct}
            />
          )}

          {offerBuild && buildable && (
            <BuildAction
              products={selected.length}
              total={products.length}
              cost={cost}
              again={!!job}
              allReady={allReady}
              failedName={failedChoice ? productNameOf(failedChoice) ?? "One product" : undefined}
              preparing={preparingTurnId === buildable.id}
              specBlock={specBlock ? productNameOf(specBlock) ?? "One product" : undefined}
              onBuild={() =>
                specBlock ? onFocusSpec?.(productIdOf(specBlock)) : onBuild(buildable.id)
              }
            />
          )}
          {offerBuild && allReady && shortForBuild && (
            <InsufficientCreditsBanner cost={cost} />
          )}
        </div>
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
  total,
  cost,
  again,
  allReady,
  failedName,
  preparing,
  specBlock,
  onBuild,
}: {
  /** The products this build takes. */
  products: number;
  /** Every product in the project, ticked or not. */
  total: number;
  cost: number;
  /** A build exists and a concept has changed since — this books the next. */
  again: boolean;
  allReady: boolean;
  /** A chosen product whose concept failed — it holds the build until it is
   *  drawn again, left out or removed. */
  failedName?: string;
  preparing: boolean;
  /** A chosen product whose size its parts can't fit. The button stays live
   *  and takes the maker to that card's size instead of the gate. */
  specBlock?: string;
  onBuild: () => void;
}) {
  const { hydrated, balance } = useCredits();
  const short = hydrated && balance < cost;
  // Preparing is busy, not disabled: a disabled button drops focus to <body>,
  // so the gate that opens next had nowhere to hand focus back to.
  const blocked = short || !allReady;
  const reason = short
    ? `Not enough credits — this build costs ${cost}, you have ${balance}`
    : failedName
      ? `${failedName}'s concept didn't come through — try it again, or leave it out of this build`
      : !allReady
        ? "One of the concepts is still drawing"
        : specBlock
          ? `${specBlock} doesn't fit the size you set — fix it, or build it as Draft`
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
          ? `${products < total ? `${products} of ${total}` : products} product${
              (products < total ? total : products) === 1 ? "" : "s"
            } · ${cost} credits`
          : failedName
            ? "A chosen concept didn't come through"
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
        onClick={preparing ? undefined : onBuild}
        disabled={blocked}
        aria-disabled={blocked || preparing}
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
        {preparing ? "Preparing the build…" : specBlock ? `Fix ${specBlock}'s size` : label}
      </button>
      {/* The reason a disabled button is off, where the keyboard and a touch
          screen can reach it — a title on a disabled button reaches neither. */}
      {reason && !preparing && (
        <p className="w-full text-right text-sm text-text-tertiary">{reason}</p>
      )}
    </div>
  );
}

/** Grows or restores the project, right under the products it adds to —
 *  one quiet row, in the cards' own button family, so the build below stays
 *  the only filled button on the canvas. "Add a product" opens a name field
 *  in place; the classifier's passed-over offers and the products taken out
 *  sit beside it as chips. A typed name already here says so; one that was
 *  offered, or removed, takes that product instead of drawing a twin. */
function AddProductSection({
  existing,
  available,
  removed,
  shortForRender,
  onAddOffered,
  onRestore,
  onAddNamed,
}: {
  existing: string[];
  available: { id: string; name: string; why: string }[];
  removed: { id: string; name: string; why: string }[];
  shortForRender: boolean;
  onAddOffered: (id: string) => void;
  onRestore: (id: string) => void;
  onAddNamed: (name: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [note, setNote] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const openerRef = React.useRef<HTMLButtonElement>(null);
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) openerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const trimmed = name.trim().replace(/\s+/g, " ").slice(0, 48);
  const offered = trimmed ? available.find((a) => same(a.name, trimmed)) : undefined;
  const wasRemoved = trimmed ? removed.find((r) => same(r.name, trimmed)) : undefined;
  const costs = !wasRemoved;
  const noCredits = `Not enough credits — a concept render costs ${CONCEPT_COST}`;

  const close = () => {
    setOpen(false);
    setName("");
    setNote("");
  };
  const submit = () => {
    if (!trimmed) return;
    const twin = existing.find((n) => same(n, trimmed));
    if (twin) {
      setNote(`${twin} is already in this project.`);
      return;
    }
    if (wasRemoved) onRestore(wasRemoved.id);
    else if (shortForRender) return;
    else if (offered) onAddOffered(offered.id);
    else onAddNamed(trimmed);
    close();
  };

  const chip =
    "inline-flex h-[32px] items-center gap-[6px] rounded-lg border border-solid border-border bg-bg-surface px-[10px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:text-text-disabled disabled:hover:border-border";

  const suggested = available.length > 0 && (
    <div className="flex flex-wrap items-center gap-[8px]">
      <span className="text-sm text-text-tertiary">Suggested · {CONCEPT_COST} credit each</span>
      {available.map((a) => (
        <button
          key={a.id}
          type="button"
          data-testid="available-product"
          onClick={() => onAddOffered(a.id)}
          disabled={shortForRender}
          aria-label={`Add ${a.name} — ${CONCEPT_COST} credit. ${a.why}`}
          title={shortForRender ? noCredits : a.why}
          className={chip}
        >
          <Icon icon={Add01Icon} size={14} />
          {a.name}
        </button>
      ))}
    </div>
  );

  return (
    <section aria-label="Add a product" className="flex w-full flex-col gap-[12px]">
      {open ? (
        <form
          className="flex w-full max-w-[640px] flex-col gap-[6px]"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-center gap-[8px]">
            <div className="min-w-0 flex-1">
              <label htmlFor="add-product-name" className="sr-only">
                Product name
              </label>
              <TextInput
                id="add-product-name"
                ref={inputRef}
                value={name}
                onValueChange={(v) => {
                  setName(v);
                  setNote("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    close();
                  }
                }}
                placeholder="Name a product — e.g. Charging dock"
                maxLength={48}
                aria-describedby="add-product-note"
              />
            </div>
            <button
              type="submit"
              disabled={!trimmed || (costs && shortForRender)}
              title={costs && shortForRender ? noCredits : undefined}
              className={!trimmed || (costs && shortForRender) ? OUTLINE_BUTTON_OFF : OUTLINE_BUTTON}
            >
              {wasRemoved ? (
                <>
                  <Icon icon={Undo02Icon} size={15} />
                  Restore · free
                </>
              ) : (
                <>
                  <Icon icon={Add01Icon} size={15} />
                  Add · {CONCEPT_COST} credit
                </>
              )}
            </button>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-[36px] items-center rounded-lg px-[10px] text-sm font-medium text-text-tertiary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Cancel
            </button>
          </div>
          <p id="add-product-note" role="status" className="px-[2px] text-sm text-text-tertiary">
            {note ||
              (wasRemoved
                ? `${wasRemoved.name} was removed — its concept is kept, so putting it back is free.`
                : costs && shortForRender
                  ? `${noCredits}.`
                  : "Drawn as its own concept, then it joins the next build.")}
          </p>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-x-[20px] gap-y-[10px]">
          <button
            ref={openerRef}
            type="button"
            onClick={() => setOpen(true)}
            className={OUTLINE_BUTTON}
          >
            <Icon icon={Add01Icon} size={16} />
            Add a product
          </button>
          {suggested}
        </div>
      )}
      {open && suggested}

      {removed.length > 0 && (
        <div className="flex flex-wrap items-center gap-[8px]">
          <span className="text-sm text-text-tertiary">Removed · restore free</span>
          {removed.map((r) => (
            <button
              key={r.id}
              type="button"
              data-testid="removed-product"
              onClick={() => onRestore(r.id)}
              aria-label={`Restore ${r.name} — free, its concept is kept`}
              title="Put it back — its concept is kept, nothing is drawn or charged"
              className={chip}
            >
              <Icon icon={Undo02Icon} size={14} />
              {r.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
