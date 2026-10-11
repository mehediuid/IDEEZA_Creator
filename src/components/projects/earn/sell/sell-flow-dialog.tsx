"use client";

// "Sell the design" / "Sell the product" (Build and Earn P1-3): one guided
// flow over the existing edition tracks, opened from an Earn › Editions
// entry card. Product → Use → Supply → Price tiers → Terms → Readiness →
// Sign, in one ModalFrame (size sm, like every edition dialog).
//
// - Each step's Next checks that step (`stepProblemOf`): the first problem
//   shows under its field and under the button, and focus goes there. Back
//   keeps everything typed. Closing with anything entered asks first.
// - Readiness (`sellChecksOf`) is the edition rules unchanged: the project's
//   Main listing live or paused (`listGate`, with a link to Earn › Project
//   NFT), this product's AI video (the "edition" readiness, fixed here with
//   the Generate dialog on top), ownership, and for a physical edition the
//   make-and-ship note and its promises. Next waits, aria-disabled, until
//   every row passes; pressing it then goes to the first fix.
// - Sign re-reads the tracks and the market, then makes the existing wallet
//   requests in order: "Create {n} lazy NFTs" (`createEditions`) when the use
//   is new, then "Sign the listing" (`listEdition`). Each `commit` re-reads
//   and writes once, as the Create and Add to marketplace dialogs do. A
//   listing that isn't signed after the create leaves the NFTs created and
//   unlisted; opening the flow again picks up at the listing.
// - Sign also asks the ladder (Build and Earn P1-4): L3 for a virtual
//   edition, L4 (the demo identity check) for a physical one. A missing step
//   shows on the Sign step with its fix and the CTA waits; the video and
//   ownership stay Readiness's, and the wallet the requests' own connect.

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
import { currentProductsOf, readinessFactsOf, readinessOf } from "@/lib/manual/readiness";
import { canCreate, createTrack, editionChainOf, KIND_WORD, listTrack, USE_WORD, wholeNumberOf, type TrackTerms } from "@/lib/market/editions";
import { readEditions, useEditions } from "@/lib/market/editions-store";
import {
  draftOf,
  firstOpenUseOf,
  firstProblemOf,
  FLOW_KIND,
  FLOW_TITLE,
  productChoicesOf,
  SELL_STEPS,
  sellChecksOf,
  signStepsOf,
  signSummaryOf,
  STEP_LABEL,
  stepProblemOf,
  trackStateOf,
  editionUsesOf,
  type SellCtx,
  type SellDraft,
  type SellField,
  type SellFlow,
  type SellProblem,
  type SellStep,
} from "@/lib/market/sell-flow";
import type { EditionTrack, EditionUse } from "@/lib/market/types";
import { useProjectVideos } from "@/lib/video/store";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { cn } from "@/lib/utils";
import { createdLine, createRequestOf, failureCopy, TAP, writeTracks } from "../../editions/create-dialog";
import { listRequestOf, mainGateNow } from "../../editions/list-dialog";
import {
  PriceStep,
  ProductStep,
  ReadinessStep,
  SignStep,
  SupplyStep,
  TermsStep,
  UseStep,
  type Choice,
  type SignState,
} from "./sell-steps";
import { useSellTerms, writeShipPlan } from "./use-sell-terms";
import { LevelCheck, useCommitCheck } from "../ladder/level-check";
import { earnSourceOf } from "../ladder/use-earn-facts";

const LADDER_HANDLED = ["videos", "ownership", "wallet"] as const;

const INTRO: Record<SellStep, string> = {
  product: "Each product sells its own NFTs.",
  use: "What buyers may do with what they get.",
  supply: "How many NFTs to offer.",
  price: "What one NFT costs, in two tiers.",
  terms: "What buyers get, the royalties, and what you confirm.",
  readiness: "What this listing needs before you sign.",
  sign: "Check it, then sign in your demo wallet.",
};

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
  flow,
  project: given,
  view,
  productId: startProductId,
  onClose,
  onDone,
}: {
  flow: SellFlow;
  project: ManualProject;
  /** The page's one derivation: the Main listing, the mint, the products. */
  view: ProjectView;
  /** The product whose card opened the flow: the Product step's default. */
  productId: string;
  onClose: () => void;
  /** After the listing is signed: the sentence the page says, and the listed track. */
  onDone: (message: string, track: EditionTrack) => void;
}) {
  const kind = FLOW_KIND[flow];
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
  const current = React.useMemo(() => currentProductsOf(view.products), [view.products]);
  const products = React.useMemo(() => current.map((p) => ({ id: p.id, name: displayProductName(p.name) })), [current]);

  const [step, setStep] = React.useState<SellStep>("product");
  const [draft, setDraft] = React.useState<SellDraft>(() => {
    const productId = products.some((p) => p.id === startProductId) ? startProductId : (products[0]?.id ?? null);
    return draftOf({
      productId,
      kind,
      network: chain?.network ?? "baseSepolia",
      mainToken: main?.token ?? null,
      tracks,
      plan: productId ? (terms.physical[productId] ?? null) : null,
    });
  });
  const [dirty, setDirty] = React.useState(false);
  const [problem, setProblem] = React.useState<SellProblem | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [createdHere, setCreatedHere] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState<VideoTarget | null>(null);
  const [discarding, setDiscarding] = React.useState(false);
  const [fixOpen, setFixOpen] = React.useState(false);
  const ladder = useCommitCheck(kind === "physical" ? "editionPhysical" : "editionVirtual", earnSourceOf(project, view, brief), {
    handled: LADDER_HANDLED,
  });
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const fixRef = React.useRef<HTMLElement | null>(null);
  const prefix = React.useId().replace(/:/g, "");
  const reasonId = `${prefix}-reason`;

  const product = current.find((p) => p.id === draft.productId) ?? null;
  const productName = product ? displayProductName(product.name) : "";
  const facts = readinessFactsOf(project, view, brief, videos, jobs, now);
  const askOwner = !facts.ownershipConfirmed;
  const ctx: SellCtx = { kind, network: chain?.network ?? "baseSepolia", tracks, products, askOwner };
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
  const state = draft.productId && draft.use ? trackStateOf(tracks, draft.productId, kind, draft.use) : { kind: "new" as const };
  const plan = signStepsOf(state);
  const index = SELL_STEPS.indexOf(step);

  // A new step's heading takes focus, so it is said ("Step 3 of 7: Supply").
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  if (!chain) return null;

  const change = (patch: Partial<SellDraft>) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      if (patch.productId && patch.productId !== d.productId) {
        const open = editionUsesOf(tracks, patch.productId, kind).find((c) => c.use === d.use)?.open;
        if (!open) next.use = firstOpenUseOf(tracks, patch.productId, kind);
        const stored = terms.physical[patch.productId];
        if (kind === "physical" && stored) {
          next.note = stored.note;
          next.checks = { leadTime: true, refund: true, seller: true };
        }
      }
      return next;
    });
    setDirty(true);
    setProblem(null);
    setError(null);
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
    focusField(prefix, p.field);
  };

  const next = () => {
    if (step === "readiness") {
      if (!readiness.ok) {
        fixRef.current?.focus();
        return;
      }
      go("sign");
      return;
    }
    const p = stepProblemOf(step, draft, ctx);
    if (p) {
      show(p);
      return;
    }
    go(SELL_STEPS[index + 1]);
  };

  const sign = async () => {
    if (busy || !ladder.ok) return;
    const fresh = readEditions(project.id);
    const p = firstProblemOf(draft, { ...ctx, tracks: fresh }, "readiness");
    if (p) {
      show(p);
      return;
    }
    if (!readiness.ok || !draft.productId || !draft.use || !draft.token) {
      go("readiness");
      return;
    }
    const productId = draft.productId;
    const use: EditionUse = draft.use;
    const now = trackStateOf(fresh, productId, kind, use);
    setError(null);
    setBusy(true);

    const made: { track: EditionTrack | null } = { track: now.kind === "created" ? now.track : null };
    if (now.kind === "new") {
      const n = wholeNumberOf(draft.count) ?? 0;
      const result = await request(
        createRequestOf({
          projectName: project.name,
          productName,
          kind,
          use,
          n,
          network: chain.network,
          collection: chain.collection,
          doneLine: createdLine(n, use, kind),
        }),
        {
          // Nothing is created when the listing can't follow it.
          recheck: () =>
            mainGateNow(project.id, project.name) ??
            (canCreate(readEditions(project.id), productId, kind).availableUses.includes(use) ? null : `${USE_WORD[use]} is already created.`),
          commit: (proof) => {
            const track = createTrack({ projectId: project.id, productId, kind, use, count: n, now: proof.at });
            const w = writeTracks(project.id, (all) =>
              canCreate(all, productId, kind).availableUses.includes(use) ? [...all, track] : null,
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
      setCreatedHere(made.track.id);
    }
    const track = made.track;
    if (!track) {
      setBusy(false);
      return;
    }

    const listing: TrackTerms = {
      token: draft.token as TrackTerms["token"],
      regular: draft.regular.trim(),
      extended: draft.extended.trim(),
      royaltyPct: wholeNumberOf(draft.royalties) ?? 0,
    };
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
        if (kind === "physical") {
          const s = writeShipPlan(project.id, productId, note, proof.at);
          if (!s.ok) return s;
        }
        const w = writeTracks(project.id, (all) => listTrack(all, track.id, listing, proof.at));
        if (!w.ok) return { ok: false, message: w.message };
        // The box ticked in Terms is the Sell rule's ownership fix (readiness `fixedIn: "form"`).
        if (confirmOwner) setOwnerConfirmed(project.id, proof.at);
        return { ok: true };
      },
    });
    setBusy(false);
    if (result.ok) {
      onDone(req.doneLine, track);
      return;
    }
    const failed = failureCopy(result);
    if (failed) setError(failed);
  };

  // ── the step's body ──
  const stepProps = { draft, change, problem, prefix };
  const createdCount = state.kind === "created" ? state.track.supply.total : null;
  let body: React.ReactNode;
  switch (step) {
    case "product": {
      const choices: Choice<string>[] = productChoicesOf(products, tracks, view.sales, kind).map((c) => ({
        value: c.id,
        title: c.name,
        lines: c.lines,
        disabled: !c.open,
        thumb: current.find((p) => p.id === c.id)?.built?.product.conceptImageUrl || null,
      }));
      body = <ProductStep {...stepProps} choices={choices} />;
      break;
    }
    case "use": {
      const choices: Choice<EditionUse>[] = draft.productId
        ? editionUsesOf(tracks, draft.productId, kind).map((c) => ({ value: c.use, title: USE_WORD[c.use], lines: [c.sub], disabled: !c.open }))
        : [];
      body = <UseStep {...stepProps} choices={choices} />;
      break;
    }
    case "supply":
      body = <SupplyStep {...stepProps} kind={kind} created={createdCount} />;
      break;
    case "price":
      body = <PriceStep {...stepProps} network={chain.network} />;
      break;
    case "terms":
      body = <TermsStep {...stepProps} kind={kind} productName={productName} askOwner={askOwner} />;
      break;
    case "readiness":
      body = (
        <ReadinessStep
          checks={readiness.checks}
          projectNftHref={earnHref(project.id, "sell")}
          fixRef={fixRef}
          onFix={(fix) => {
            if (fix === "terms") go("terms");
            else if (product) setGenerating(videoTargetOf(project, product));
          }}
        />
      );
      break;
    case "sign": {
      const count = createdCount ?? wholeNumberOf(draft.count) ?? 0;
      const createLabel = `Create ${count} lazy NFT${count === 1 ? "" : "s"}`;
      const listLabel = `List them on Explore marketplace`;
      const signatures: { label: string; state: SignState }[] = createdHere
        ? [
            { label: createLabel, state: "done" },
            { label: listLabel, state: "next" },
          ]
        : plan.length === 2
          ? [
              { label: createLabel, state: "next" },
              { label: listLabel, state: "waiting" },
            ]
          : [{ label: listLabel, state: "next" }];
      body = (
        <SignStep
          rows={signSummaryOf({
            kind,
            productName,
            draft,
            count,
            collection: chain.collection,
            networkLabel: networkLabelOf(chain.network),
          })}
          signatures={signatures}
        />
      );
      break;
    }
  }
  if (step === "sign" && !ladder.ok) {
    body = (
      <>
        {body}
        <LevelCheck
          check={ladder}
          what={`sell ${KIND_WORD[kind]} NFTs`}
          id={`${prefix}-ladder`}
          project={project}
          brief={brief}
          onCover={setFixOpen}
        />
      </>
    );
  }

  const atSign = step === "sign";
  const cta = atSign ? (plan.length === 2 ? "Sign and list" : "Sign the listing") : "Next";
  const blocked = (step === "readiness" && !readiness.ok) || (step === "sign" && !ladder.ok);
  const reason = problem?.message ?? null;

  const footer = (
    <div className="ml-auto flex w-full flex-col items-stretch gap-3 [@media(min-width:480px)]:w-auto [@media(min-width:480px)]:items-end">
      <div className="flex flex-col-reverse gap-4 [@media(min-width:480px)]:flex-row [@media(min-width:480px)]:justify-end">
        <Button
          type="button"
          hierarchy="secondary"
          size="lg"
          disabled={busy}
          className={TAP}
          onClick={index === 0 ? requestClose : () => go(SELL_STEPS[index - 1])}
        >
          {index === 0 ? "Cancel" : "Back"}
        </Button>
        <Button
          type="button"
          hierarchy="primary"
          size="lg"
          aria-busy={busy || undefined}
          aria-disabled={blocked || undefined}
          aria-describedby={reason || blocked ? reasonId : undefined}
          className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
          onClick={() => (atSign ? void sign() : next())}
        >
          {busy && <Spinner size={16} />}
          {busy ? "Signing…" : cta}
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
            {step === "sign" ? "Finish the steps above to sign." : readiness.blocker}
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
        title={FLOW_TITLE[flow]}
        description={`${KIND_WORD[kind]} NFT · ${productName ? `${productName} · ` : ""}${project.name}`}
        footer={footer}
      >
        <div inert={busy || undefined} className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 ref={headingRef} tabIndex={-1} className="m-0 text-md font-semibold text-text-primary outline-none">
                <span className="sr-only">{`Step ${index + 1} of ${SELL_STEPS.length}: `}</span>
                {STEP_LABEL[step]}
              </h3>
              <span aria-hidden className="text-sm tabular-nums text-text-secondary">
                Step {index + 1} of {SELL_STEPS.length}
              </span>
            </div>
            <div aria-hidden className="flex gap-1">
              {SELL_STEPS.map((s, i) => (
                <span key={s} className={cn("h-[4px] flex-1 rounded-full", i <= index ? "bg-bg-brand" : "bg-border")} />
              ))}
            </div>
            <p className="m-0 text-sm leading-relaxed text-text-secondary">{INTRO[step]}</p>
          </div>
          {error && <Banner tone="error">{error}</Banner>}
          {body}
        </div>
      </ModalFrame>

      <GenerateVideoDialog
        open={generating !== null}
        target={generating}
        back={{ label: `Back to ${FLOW_TITLE[flow]}`, onBack: () => setGenerating(null) }}
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
          ? "The prices and terms entered here aren't saved. The NFTs already created stay, not listed."
          : "Nothing entered here is saved yet. Closing now throws it away."}
      </ConfirmDialog>
    </>
  );
}
