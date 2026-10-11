"use client";

// "Sell copies of {product}" (Build and Earn P1-3): one guided flow over the
// existing edition tracks, opened from the product's row in Earn › Editions.
// What are you selling? → Copies and price → Review, in one ModalFrame (size
// sm, like every edition dialog).
//
// - Each step's Next checks that step only (`stepProblemOf`): the first
//   problem shows under its field and under the button, and focus goes there
//   (More options opens first when the field is inside it). Back keeps
//   everything typed. Closing with anything entered asks first.
// - Review lists the summary, then the edition rules unchanged
//   (`sellChecksOf`): the project's Main listing live or paused (`listGate`,
//   with a link to Earn › Project NFT), this product's AI video (the "edition"
//   readiness, fixed here with the Generate dialog on top), ownership, and for
//   a built product the make-and-ship note and its promises (fixed back on
//   step 2). It also asks the ladder (Build and Earn P1-4): L3 for design
//   files, L4 (the demo identity check) for a built product. Sign and sell
//   waits, aria-disabled, until every row and level passes; pressing it then
//   goes to the first fix.
// - Sign and sell re-reads the tracks and the market, then makes the existing
//   wallet requests in order: "Create {n} lazy NFTs" (`createEditions`) when
//   the use is new, then "Sign the listing" (`listEdition`), with the terms
//   `effectiveTermsOf` fills in. Each `commit` re-reads and writes once, as
//   the Create and Add to marketplace dialogs do. A listing that isn't signed
//   after the create leaves the copies created and unlisted; opening the flow
//   again picks up at the listing.

import * as React from "react";
import { Banner, Button, ConfirmDialog, ModalFrame, Spinner } from "@/components/ideeza";
import { GenerateVideoDialog, videoTargetOf, type VideoTarget } from "@/components/video-jobs/generate-video-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { earnHref } from "@/lib/manual/earn-route";
import type { ProjectView } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { readinessFactsOf, readinessOf } from "@/lib/manual/readiness";
import { canCreate, createTrack, editionChainOf, listTrack, USE_WORD, wholeNumberOf, type TrackTerms } from "@/lib/market/editions";
import { readEditions, useEditions } from "@/lib/market/editions-store";
import {
  ALREADY_ON_SALE,
  draftOf,
  editionUsesOf,
  effectiveTermsOf,
  firstProblemOf,
  KIND_LABEL,
  KIND_SUB,
  kindChoicesOf,
  MORE_FIELDS,
  reviewSummaryOf,
  SELL_STEPS,
  sellChecksOf,
  STEP_LABEL,
  stepProblemOf,
  trackStateOf,
  USE_LABEL,
  withKind,
  type SellCtx,
  type SellDraft,
  type SellField,
  type SellProblem,
  type SellStep,
} from "@/lib/market/sell-flow";
import type { EditionKind, EditionTrack, EditionUse } from "@/lib/market/types";
import { useProjectVideos } from "@/lib/video/store";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { cn } from "@/lib/utils";
import { createdLine, createRequestOf, failureCopy, TAP, writeTracks } from "../../editions/create-dialog";
import { listRequestOf, mainGateNow } from "../../editions/list-dialog";
import { PriceStep, ReviewStep, WhatStep, type Choice } from "./sell-steps";
import { useSellTerms, writeShipPlan } from "./use-sell-terms";
import { LevelCheck, useCommitCheck } from "../ladder/level-check";
import { earnSourceOf } from "../ladder/use-earn-facts";

const LADDER_HANDLED = ["videos", "ownership", "wallet"] as const;
const LADDER_WHAT: Record<EditionKind, string> = { virtual: "sell design files", physical: "sell built products" };

/** Where a problem sends focus: the field, or the checked (else first) option of a group. */
function focusField(prefix: string, field: SellField) {
  requestAnimationFrame(() => {
    const el = document.getElementById(`${prefix}-${field}`);
    if (!el) return;
    const target = el.matches("input, textarea, button")
      ? el
      : el.querySelector<HTMLElement>('[role="radio"][tabindex="0"], input, textarea, button');
    target?.focus();
  });
}

export function SellFlowDialog({
  project: given,
  view,
  productId,
  onClose,
  onDone,
}: {
  project: ManualProject;
  /** The page's one derivation: the Main listing, the mint, the products. */
  view: ProjectView;
  /** The product whose row opened the flow. */
  productId: string;
  onClose: () => void;
  /** After the listing is signed: the sentence the page says, and the listed track. */
  onDone: (message: string, track: EditionTrack) => void;
}) {
  const { request } = useWalletRequest();
  const { projects, setOwnerConfirmed } = useManualProjects();
  // The live record: ownership confirmed in another tab reads here at once.
  const project = projects.find((p) => p.id === given.id) ?? given;
  const brief = useProjectBrief(project.id) ?? null;
  const { record: videos } = useProjectVideos(project.id);
  const { jobs, now } = useVideoJobs();
  const { record: tracks } = useEditions(project.id);
  const terms = useSellTerms(project.id);

  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, view.mint.status === "legacy" && brief ? brief.state : null);
  const product = view.products.find((p) => p.id === productId) ?? null;
  const productName = product ? displayProductName(product.name) : "";

  const [step, setStep] = React.useState<SellStep>("what");
  const [draft, setDraft] = React.useState<SellDraft>(() =>
    draftOf({
      productId,
      network: chain?.network ?? "baseSepolia",
      mainToken: main?.token ?? null,
      tracks,
      plan: terms.physical[productId] ?? null,
    }),
  );
  const [dirty, setDirty] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [problem, setProblem] = React.useState<SellProblem | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [createdHere, setCreatedHere] = React.useState(false);
  const [generating, setGenerating] = React.useState<VideoTarget | null>(null);
  const [discarding, setDiscarding] = React.useState(false);
  const [fixOpen, setFixOpen] = React.useState(false);
  const kind: EditionKind = draft.kind ?? "virtual";
  const ladder = useCommitCheck(kind === "physical" ? "editionPhysical" : "editionVirtual", earnSourceOf(project, view, brief), {
    handled: LADDER_HANDLED,
  });
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const fixRef = React.useRef<HTMLElement | null>(null);
  const prefix = React.useId().replace(/:/g, "");
  const reasonId = `${prefix}-reason`;
  const headingId = `${prefix}-heading`;

  const facts = readinessFactsOf(project, view, brief, videos, jobs, now);
  const askOwner = !facts.ownershipConfirmed;
  const ctx: SellCtx = { productId, network: chain?.network ?? "baseSepolia", tracks, askOwner };
  const videoRule = product ? readinessOf({ ...facts, product }, "edition").rules.find((r) => r.id === "videos") : undefined;
  const readiness = sellChecksOf({
    kind,
    projectName: project.name,
    productName,
    mainView: view.listing,
    video: { ok: videoRule?.ok ?? false, reason: videoRule?.reason ?? null },
    ownershipConfirmed: facts.ownershipConfirmed,
    draft,
  });
  const state = draft.kind && draft.use ? trackStateOf(tracks, productId, draft.kind, draft.use) : { kind: "new" as const };
  const index = SELL_STEPS.indexOf(step);

  // A new step's heading takes focus, so it is said ("Step 2 of 3: Copies and price").
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  if (!chain) return null;

  const edited = () => {
    setDirty(true);
    setProblem(null);
    setError(null);
  };
  const change = (patch: Partial<SellDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    edited();
  };
  const chooseKind = (k: EditionKind) => {
    setDraft((d) => withKind(d, k, tracks, productId));
    edited();
  };

  const go = (to: SellStep) => {
    setProblem(null);
    setError(null);
    setStep(to);
  };

  const requestClose = () => {
    if (busy) return;
    if (dirty || index > 0) setDiscarding(true);
    else onClose();
  };

  const show = (p: SellProblem) => {
    setProblem(p);
    if (p.step !== step) setStep(p.step);
    if (MORE_FIELDS.includes(p.field)) setMoreOpen(true);
    focusField(prefix, p.field);
  };

  const next = () => {
    const p = stepProblemOf(step, draft, ctx);
    if (p) {
      show(p);
      return;
    }
    go(SELL_STEPS[index + 1]);
  };

  const sign = async () => {
    if (busy) return;
    const fresh = readEditions(project.id);
    const p = firstProblemOf(draft, { ...ctx, tracks: fresh });
    if (p) {
      show(p);
      return;
    }
    if (!readiness.ok) {
      fixRef.current?.focus();
      return;
    }
    if (!ladder.ok || !draft.kind || !draft.use || !draft.token) return;
    const sellKind = draft.kind;
    const use: EditionUse = draft.use;
    const at = trackStateOf(fresh, productId, sellKind, use);
    setError(null);
    setBusy(true);

    const made: { track: EditionTrack | null } = { track: at.kind === "created" ? at.track : null };
    if (at.kind === "new") {
      const n = wholeNumberOf(draft.count) ?? 0;
      const result = await request(
        createRequestOf({
          projectName: project.name,
          productName,
          kind: sellKind,
          use,
          n,
          network: chain.network,
          collection: chain.collection,
          doneLine: createdLine(n, use, sellKind),
        }),
        {
          // Nothing is created when the listing can't follow it.
          recheck: () =>
            mainGateNow(project.id, project.name) ??
            (canCreate(readEditions(project.id), productId, sellKind).availableUses.includes(use) ? null : `${USE_WORD[use]} is already created.`),
          commit: (proof) => {
            const track = createTrack({ projectId: project.id, productId, kind: sellKind, use, count: n, now: proof.at });
            const w = writeTracks(project.id, (all) =>
              canCreate(all, productId, sellKind).availableUses.includes(use) ? [...all, track] : null,
            );
            if (!w.ok) return { ok: false, message: w.message };
            made.track = track;
            return { ok: true };
          },
        },
      );
      if (!result.ok || !made.track) {
        setBusy(false);
        const failed = failureCopy(result);
        if (failed) setError(failed);
        return;
      }
      setCreatedHere(true);
    }
    const track = made.track;
    if (!track) {
      setBusy(false);
      return;
    }

    const t = effectiveTermsOf(draft);
    const listing: TrackTerms = { token: draft.token as TrackTerms["token"], regular: t.regular, extended: t.extended, royaltyPct: t.royaltyPct };
    const req = listRequestOf({
      track,
      projectName: project.name,
      productName,
      terms: listing,
      network: chain.network,
      collection: chain.collection,
      editing: false,
    });
    const confirmOwner = askOwner && draft.owner;
    const note = draft.note;
    const result = await request(req, {
      recheck: () => mainGateNow(project.id, project.name),
      commit: (proof) => {
        const gate = mainGateNow(project.id, project.name);
        if (gate) return { ok: false, message: gate };
        if (sellKind === "physical") {
          const s = writeShipPlan(project.id, productId, note, proof.at);
          if (!s.ok) return s;
        }
        const w = writeTracks(project.id, (all) => listTrack(all, track.id, listing, proof.at));
        if (!w.ok) return { ok: false, message: w.message };
        // The box ticked on Review is the Sell rule's ownership fix (readiness `fixedIn: "form"`).
        if (confirmOwner) setOwnerConfirmed(project.id, proof.at);
        return { ok: true };
      },
    });
    setBusy(false);
    if (result.ok) {
      const n = track.supply.total;
      onDone(`${KIND_LABEL[sellKind]} on sale: ${n} ${n === 1 ? "copy" : "copies"} at ${formatAmount(listing.regular, listing.token)}.`, track);
      return;
    }
    const failed = failureCopy(result);
    if (failed) setError(failed);
  };

  // ── the step's body ──
  const stepProps = { draft, change, problem, prefix };
  let body: React.ReactNode;
  switch (step) {
    case "what": {
      const choices: Choice<EditionKind>[] = kindChoicesOf(tracks, productId).map((c) => ({
        value: c.kind,
        title: KIND_LABEL[c.kind],
        lines: c.open ? [KIND_SUB[c.kind]] : [KIND_SUB[c.kind], ALREADY_ON_SALE],
        disabled: !c.open,
      }));
      body = <WhatStep {...stepProps} headingId={headingId} choices={choices} onKind={chooseKind} />;
      break;
    }
    case "price": {
      const uses: Choice<EditionUse>[] = editionUsesOf(tracks, productId, kind).map((c) => ({
        value: c.use,
        title: USE_LABEL[c.use],
        lines: c.open ? [] : [ALREADY_ON_SALE],
        disabled: !c.open,
      }));
      body = (
        <PriceStep
          {...stepProps}
          network={chain.network}
          isNew={state.kind === "new"}
          uses={uses}
          moreOpen={moreOpen}
          onMoreOpen={setMoreOpen}
        />
      );
      break;
    }
    case "review": {
      const count = state.kind === "new" ? (wholeNumberOf(draft.count) ?? 0) : state.track.supply.total;
      body = (
        <ReviewStep
          {...stepProps}
          rows={reviewSummaryOf({ draft, count, networkLabel: networkLabelOf(chain.network) })}
          checks={readiness.checks}
          projectNftHref={earnHref(project.id, "sell")}
          fixRef={fixRef}
          onFix={(fix) => {
            if (fix === "price") {
              const p = stepProblemOf("price", draft, ctx);
              if (p) show(p);
              else go("price");
            } else if (product) setGenerating(videoTargetOf(project, product));
          }}
          askOwner={askOwner}
        >
          {!ladder.ok && (
            <LevelCheck
              check={ladder}
              what={LADDER_WHAT[kind]}
              id={`${prefix}-ladder`}
              project={project}
              brief={brief}
              onCover={setFixOpen}
            />
          )}
        </ReviewStep>
      );
      break;
    }
  }

  const atReview = step === "review";
  const blocked = atReview && (!readiness.ok || !ladder.ok);
  const reason = problem?.message ?? null;

  const footer = (
    <div className="ml-auto flex w-full flex-col items-stretch gap-3 [@media(min-width:480px)]:w-auto [@media(min-width:480px)]:items-end">
      <div className="flex flex-col-reverse gap-4 [@media(min-width:480px)]:flex-row [@media(min-width:480px)]:justify-end">
        <Button
          type="button"
          hierarchy="ghost"
          size="lg"
          disabled={busy}
          className={TAP}
          onClick={index === 0 ? requestClose : () => go(SELL_STEPS[index - 1])}
        >
          {index === 0 ? "Cancel" : "Back"}
        </Button>
        <Button
          type="button"
          hierarchy={atReview ? "primary" : "secondary"}
          size="lg"
          aria-busy={busy || undefined}
          aria-disabled={blocked || undefined}
          aria-describedby={reason || blocked ? reasonId : undefined}
          className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
          onClick={() => (atReview ? void sign() : next())}
        >
          {busy && <Spinner size={16} />}
          {busy ? "Signing…" : atReview ? "Sign and sell" : "Next"}
        </Button>
      </div>
      {reason ? (
        <p
          id={reasonId}
          role="alert"
          className="m-0 max-w-[40ch] text-sm text-[color:var(--color-input-error-text)] [@media(min-width:480px)]:text-right"
        >
          {reason}
        </p>
      ) : (
        blocked && (
          <p id={reasonId} className="m-0 max-w-[40ch] text-sm text-text-secondary [@media(min-width:480px)]:text-right">
            {readiness.blocker ?? "Finish the steps above to sell."}
          </p>
        )
      )}
    </div>
  );

  return (
    <>
      <ModalFrame
        open
        onClose={requestClose}
        covered={busy || generating !== null || discarding || fixOpen}
        size="sm"
        initialFocus={headingRef}
        title={`Sell copies of ${productName}`}
        footer={footer}
      >
        <div inert={busy || undefined} className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 id={headingId} ref={headingRef} tabIndex={-1} className="m-0 text-md font-semibold text-text-primary outline-none">
                <span className="sr-only">{`Step ${index + 1} of ${SELL_STEPS.length}: `}</span>
                {STEP_LABEL[step]}
              </h3>
              <span aria-hidden className="text-sm tabular-nums text-text-secondary">
                Step {index + 1} of {SELL_STEPS.length}
              </span>
            </div>
            <div aria-hidden className="flex gap-1">
              {SELL_STEPS.map((s, i) => (
                <span key={s} className={cn("h-[4px] flex-1 rounded-full", i <= index ? "bg-bg-inverse" : "bg-border")} />
              ))}
            </div>
          </div>
          {error && <Banner tone="error">{error}</Banner>}
          {body}
        </div>
      </ModalFrame>

      <GenerateVideoDialog
        open={generating !== null}
        target={generating}
        back={{ label: "Back to Sell copies", onBack: () => setGenerating(null) }}
        onClose={() => setGenerating(null)}
      />
      <ConfirmDialog
        open={discarding}
        title="Discard this listing?"
        confirmLabel="Discard"
        onCancel={() => setDiscarding(false)}
        onConfirm={() => {
          setDiscarding(false);
          onClose();
        }}
      >
        {createdHere
          ? "The price and options entered here aren't saved. The copies already made stay, not on sale."
          : "Nothing entered here is saved yet. Closing now throws it away."}
      </ConfirmDialog>
    </>
  );
}
