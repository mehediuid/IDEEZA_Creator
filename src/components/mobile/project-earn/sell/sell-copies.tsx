"use client";

// 15 / 15b / 15c / 15h / 15i · Sell {virtual|physical} copies of {the whole
// project|a product}: the web's two-step copies flow (sell-flow-dialog.tsx,
// sell-steps.tsx, lib/market/sell-flow.ts) as one bottom sheet.
// · Step 1 of 2: Copies and price — Copies (only for a new track), Token,
//   Price with "You get … per copy after the 2.5% fee"; physical adds How
//   you'll make and ship it (1,000) and the three promises; More options
//   (closed) holds Price with future updates, Use (Personal / Business, the
//   first open one) and Royalties.
// · Step 2 of 2: Review — what, copies, price, network; the checks with
//   their fixes (a product's AI video, the project video, back to step 1);
//   the ladder's missing steps; the ownership box while unconfirmed, the
//   lazy-mint box and the no-income line; Sign and sell makes the lazy
//   copies (when new) then signs the listing, each through the phone's
//   wallet sheet. Closing with anything entered asks first.
// The foot: Next on Step 1 (✕, a swipe and the scrim close the sheet — no
// Cancel that only closes, the kit's rule); Sign and sell with Back on Review.
// EARN-5: a video fix on Review leaves for the video screen; Back brings the
// sheet back on the same step with everything entered (useBackState), as the
// web's Generate video dialog opens over the Sell copies dialog.
// CL-030: Sign and sell stays off only while a video it needs hasn't started
// ("Start every video first: …"; copies of one product need only that
// product's video). Once every one has, a video still rendering or waiting for
// review doesn't stop it: "You don't have to wait. …", the copies are made now
// and their listing waits off Explore marketplace (lib/market/held.ts) until
// the videos are ready, then goes live by itself.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown01Icon, CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field } from "@/components/auth/auth-parts";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { createdLine, createRequestOf, failureCopy, writeTracks } from "@/components/projects/editions/create-dialog";
import { listRequestOf, lockGateNow } from "@/components/projects/editions/list-dialog";
import { useCommitCheck } from "@/components/projects/earn/ladder/level-check";
import { earnSourceOf } from "@/components/projects/earn/ladder/use-earn-facts";
import { useSellTerms, writeShipPlan } from "@/components/projects/earn/sell/use-sell-terms";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { ROYALTY_MAX, ROYALTY_MIN, TOKENS_BY_NETWORK, type Token } from "@/lib/brief/types";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { useManualProjects } from "@/lib/manual/projects";
import { readinessFactsOf, readinessOf, videoCountOf, videosBlockerOf, videosStartBlockerOf } from "@/lib/manual/readiness";
import { hold, heldId } from "@/lib/market/held";
import { heldNoteOf } from "@/lib/video/video-copy";
import { phoneProductVideoHref } from "@/lib/manual/phone-earn";
import { phoneProjectPath } from "@/lib/manual/phone-project";
import { canCreate, createTrack, editionChainOf, listTrack, wholeNumberOf, type TrackTerms } from "@/lib/market/editions";
import { readEditions, useEditions } from "@/lib/market/editions-store";
import { feePercentText, payoutOf } from "@/lib/market/fee";
import {
  ALREADY_ON_SALE,
  draftOf,
  editionUsesOf,
  effectiveTermsOf,
  firstProblemOf,
  KIND_LABEL,
  MORE_FIELDS,
  NO_INCOME_LINE,
  NOTE_MAX,
  reviewSummaryOf,
  ROYALTY_HINT,
  SELL_STEPS,
  sellChecksOf,
  sellVideoOf,
  STEP_LABEL,
  stepProblemOf,
  trackStateOf,
  USE_LABEL,
  type SellCheck,
  type SellCtx,
  type SellDraft,
  type SellField,
  type SellProblem,
  type SellStep,
} from "@/lib/market/sell-flow";
import type { EditionKind, EditionTrack, EditionUse } from "@/lib/market/types";
import { withUseWords } from "@/lib/market/phone-sell";
import { readProjectVideos, useProjectVideos } from "@/lib/video/store";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { useBackState } from "../../nav-trail";
import { Sheet } from "../../kit/sheet";
import { SheetSelect } from "../../kit/sheet-select";
import { useEarn } from "../context";
import { LevelCheck } from "../parts";
import { CheckRow, SUB } from "./parts";
import { T } from "../../type";

/** Whose copies: the whole project (`PROJECT_SCOPE`), or one product. */
export type CopyScope = { id: string; name: string; product: ProjectProduct | null };

/** The sheet's form: its step, what was entered, More options open, and whether copies were made here. */
type SellForm = { step: SellStep; draft: SellDraft; dirty: boolean; more: boolean; created: boolean };

const LADDER_HANDLED = ["videos", "ownership", "wallet"] as const;
const LADDER_WHAT: Record<EditionKind, string> = { virtual: "sell virtual copies", physical: "sell physical copies" };
const PROMISES: { field: "leadTime" | "refund" | "seller"; text: string }[] = [
  { field: "leadTime", text: "Lead time: I'll tell everyone who orders when to expect it, and ship within that time." },
  { field: "refund", text: "Refund promise: if I can't make or ship an order, I'll refund the order in full." },
  { field: "seller", text: "I'm the seller: I make, ship and support each one myself. IDEEZA doesn't make or ship it." },
];
const FIX_LABEL: Record<NonNullable<SellCheck["fix"]>, string> = { video: "Generate AI video", videos: "Make videos", price: "Back to step 1" };

/** Digits and one dot. */
function decimal(raw: string): string {
  const kept = raw.replace(/[^\d.]/g, "");
  const dot = kept.indexOf(".");
  return dot === -1 ? kept : kept.slice(0, dot + 1) + kept.slice(dot + 1).replace(/\./g, "");
}

function payoutLineOf(price: string, token: Token | null): string | null {
  const micros = toMicros(price.trim());
  if (!token || micros === null || micros <= BigInt(0)) return null;
  return `You get ${formatAmount(payoutOf(price.trim()), token)} per copy after the ${feePercentText()} IDEEZA fee.`;
}

export function SellCopiesSheet({
  scope,
  kind,
  use,
  onClose,
  onDone,
}: {
  scope: CopyScope;
  kind: EditionKind;
  /** Manage's "Sell … copies too", or a made track's listing: the use to start on. */
  use: EditionUse | null;
  onClose: () => void;
  /** After the listing is signed: the sentence, and the listed track. */
  onDone: (message: string, track: EditionTrack) => void;
}) {
  const { project: given, view, brief } = useEarn();
  const router = useRouter();
  const { request } = useWalletRequest();
  const { projects, setOwnerConfirmed } = useManualProjects();
  const project = projects.find((p) => p.id === given.id) ?? given;
  const { record: videos } = useProjectVideos(project.id);
  const { jobs, now } = useVideoJobs();
  const { record: tracks } = useEditions(project.id);
  const terms = useSellTerms(project.id);
  const latestJobs = React.useRef(jobs);
  React.useEffect(() => {
    latestJobs.current = jobs;
  }, [jobs]);

  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, view.mint.status === "legacy" && brief ? brief.state : null);
  const productId = scope.id;
  const product = scope.product;
  const productName = product ? displayProductName(product.name) : scope.name;
  const what = product ? productName : "the whole project";

  // What the maker has entered — the step, the fields, More options open, copies already made — is
  // kept across a trip away and Back (EARN-5): Review's "Generate AI video" / "Make videos" leave for
  // the video screen, and the sheet comes back as it was, as the web's video dialog opens over it.
  const [fresh] = React.useState<SellForm>(() => ({
    step: "price",
    draft: draftOf({
      productId,
      kind,
      use,
      network: chain?.network ?? "baseSepolia",
      mainToken: main?.token ?? null,
      tracks,
      plan: terms.physical[productId] ?? null,
    }),
    dirty: false,
    more: false,
    created: false,
  }));
  const [kept, keep] = useBackState<SellForm | null>(`copies-form-${scope.id}-${kind}`, null);
  const form = kept ?? fresh;
  const { step, draft, dirty, more: moreOpen, created: createdHere } = form;
  // The last form written, so two changes before the next render (taps in a row) both land.
  const written = React.useRef<SellForm | null>(null);
  const update = (patch: Partial<SellForm>) => {
    const next = { ...(written.current ?? form), ...patch };
    written.current = next;
    keep(next);
  };
  const [problem, setProblem] = React.useState<SellProblem | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [discarding, setDiscarding] = React.useState(false);
  const ladder = useCommitCheck(kind === "physical" ? "editionPhysical" : "editionVirtual", earnSourceOf(project, view, brief), { handled: LADDER_HANDLED });
  const prefix = React.useId().replace(/:/g, "");
  const bodyRef = React.useRef<HTMLDivElement>(null);
  // A new step starts at its top.
  React.useEffect(() => {
    bodyRef.current?.parentElement?.scrollTo({ top: 0 });
  }, [step]);

  const facts = readinessFactsOf(project, view, brief, videos, jobs, now);
  const askOwner = !facts.ownershipConfirmed;
  const ctx: SellCtx = { productId, network: chain?.network ?? "baseSepolia", tracks, askOwner };
  const scopeReadiness = product ? readinessOf({ ...facts, product }, "edition") : readinessOf(facts, "sell");
  const readiness = sellChecksOf({
    kind,
    videoSubject: product ? productName : "Each product",
    video: sellVideoOf(scopeReadiness),
    ownershipConfirmed: facts.ownershipConfirmed,
    draft,
    holdVideos: true,
    notStarted: videosStartBlockerOf(scopeReadiness),
  });
  const state = draft.use ? trackStateOf(tracks, productId, kind, draft.use) : { kind: "new" as const };
  const index = SELL_STEPS.indexOf(step);

  if (!chain) return null;

  const change = (patch: Partial<SellDraft>) => {
    update({ draft: { ...(written.current ?? form).draft, ...patch }, dirty: true });
    setProblem(null);
    setError(null);
  };
  const go = (to: SellStep) => {
    setProblem(null);
    setError(null);
    update({ step: to });
  };
  /** Leaving for good (closed, discarded, signed): nothing is kept to come back to. */
  const leave = () => {
    written.current = null;
    keep(null);
  };
  const requestClose = () => {
    if (busy) return;
    if (dirty || index > 0) setDiscarding(true);
    else {
      leave();
      onClose();
    }
  };
  const show = (p: SellProblem) => {
    setProblem(p);
    const opens = MORE_FIELDS.includes(p.field) && !moreOpen;
    if (p.step !== step || opens) update({ step: p.step, ...(opens ? { more: true } : null) });
    requestAnimationFrame(() => {
      const el = document.getElementById(`${prefix}-${p.field}`);
      const target = el?.matches("input, textarea, button") ? el : el?.querySelector<HTMLElement>("input, textarea, button");
      target?.focus();
    });
  };
  const next = () => {
    const p = stepProblemOf(step, draft, ctx);
    if (p) return show(p);
    go(SELL_STEPS[index + 1]);
  };

  const sign = async () => {
    if (busy) return;
    const fresh = readEditions(project.id);
    const p = firstProblemOf(draft, { ...ctx, tracks: fresh });
    if (p) return show(p);
    if (!readiness.ok || !ladder.ok || !draft.use || !draft.token) return;
    const sellKind = draft.kind;
    const chosen: EditionUse = draft.use;
    const at = trackStateOf(fresh, productId, sellKind, chosen);
    setError(null);
    setBusy(true);

    const made: { track: EditionTrack | null } = { track: at.kind === "created" ? at.track : null };
    if (at.kind === "new") {
      const n = wholeNumberOf(draft.count) ?? 0;
      const result = await request(
        withUseWords(createRequestOf({ projectName: project.name, productName, kind: sellKind, use: chosen, n, network: chain.network, collection: chain.collection, doneLine: createdLine(n, chosen, sellKind) })),
        {
          recheck: () =>
            lockGateNow(project) ?? (canCreate(readEditions(project.id), productId, sellKind).availableUses.includes(chosen) ? null : `${USE_LABEL[chosen]} is already created.`),
          commit: (proof) => {
            const track = createTrack({ projectId: project.id, productId, kind: sellKind, use: chosen, count: n, now: proof.at });
            const w = writeTracks(project.id, (all) => (canCreate(all, productId, sellKind).availableUses.includes(chosen) ? [...all, track] : null));
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
      update({ created: true });
    }
    const track = made.track;
    if (!track) return setBusy(false);

    const t = effectiveTermsOf(draft);
    const listing: TrackTerms = { token: draft.token as TrackTerms["token"], regular: t.regular, extended: t.extended, royaltyPct: t.royaltyPct };
    const confirmOwner = askOwner && draft.owner;
    const note = draft.note;
    const built = withUseWords(listRequestOf({ track, projectName: project.name, productName, terms: listing, network: chain.network, collection: chain.collection, editing: false }));
    // A video still being made: the copies' listing waits, and the wallet says so (CL-030).
    const req = readiness.videosWait ? { ...built, doneLine: "Signed. These copies go on Explore marketplace when every video is ready." } : built;
    let heldCopies = false;
    const result = await request(req, {
      recheck: () => lockGateNow(project),
      commit: (proof) => {
        const gate = lockGateNow(project);
        if (gate) return { ok: false, message: gate };
        if (sellKind === "physical") {
          const s = writeShipPlan(project.id, productId, note, proof.at);
          if (!s.ok) return s;
        }
        // A video still being made: the copies are made now and their listing waits off Explore
        // marketplace until it's ready, then goes live by itself.
        const fresh = readinessFactsOf(project, view, brief, readProjectVideos(project.id), latestJobs.current, proof.at);
        const waitFor = videosBlockerOf(product ? readinessOf({ ...fresh, product }, "edition") : readinessOf(fresh, "sell"));
        if (waitFor) {
          const h = hold({ id: heldId(), projectId: project.id, kind: "copies", at: proof.at, trackId: track.id, scope: productId, kindOfCopy: sellKind, terms: listing });
          if (!h.ok) return { ok: false, message: "This browser's storage is full — nothing was saved." };
          heldCopies = true;
        } else {
          const w = writeTracks(project.id, (all) => listTrack(all, track.id, listing, proof.at));
          if (!w.ok) return { ok: false, message: w.message };
        }
        if (confirmOwner) setOwnerConfirmed(project.id, proof.at);
        return { ok: true };
      },
    });
    setBusy(false);
    if (result.ok) {
      const n = track.supply.total;
      leave();
      onDone(
        heldCopies
          ? `Signed: ${n} ${KIND_LABEL[sellKind]} ${n === 1 ? "copy" : "copies"} of ${what}. They go on Explore marketplace when every video is ready.`
          : `On sale: ${n} ${KIND_LABEL[sellKind]} ${n === 1 ? "copy" : "copies"} of ${what} at ${formatAmount(listing.regular, listing.token)}.`,
        track,
      );
      return;
    }
    const failed = failureCopy(result);
    if (failed) setError(failed);
  };

  const err = (f: SellField) => (problem?.field === f ? problem.message : null);
  const atReview = step === "review";
  const blocked = atReview && (!readiness.ok || !ladder.ok);
  const reasonId = `${prefix}-reason`;
  const reason = problem?.message ?? null;
  const tokens = TOKENS_BY_NETWORK[chain.network].map((t) => ({ value: t, label: t }));
  const physical = draft.kind === "physical";
  const uses = editionUsesOf(tracks, productId, kind);

  const onFix = (fix: NonNullable<SellCheck["fix"]>) => {
    if (fix === "price") {
      const p = stepProblemOf("price", draft, ctx);
      return p ? show(p) : go("price");
    }
    if (fix === "videos") return router.push(phoneProjectPath(project.id, "video"));
    const missing = scopeReadiness.products.find((p) => p.video.state !== "ready");
    const target = product?.id ?? missing?.productId;
    if (target) router.push(phoneProductVideoHref(project.id, target));
  };

  return (
    <>
      <Sheet
        open
        onClose={requestClose}
        title={`Sell ${KIND_LABEL[kind].replace(" NFT", "").toLowerCase()} copies of ${what}`}
        description={product ? `Product · ${productName}` : `Whole project · ${project.name}`}
        actions={
          <>
            <Button size="xl" className="w-full" loading={busy} aria-disabled={blocked || undefined} aria-describedby={reason || blocked ? reasonId : undefined} onClick={() => (atReview ? void sign() : next())}>
              {busy ? "Signing…" : atReview ? "Sign and sell" : "Next"}
            </Button>
            {index > 0 && (
              <Button hierarchy="secondary" size="xl" className="w-full" disabled={busy} onClick={() => go(SELL_STEPS[index - 1])}>
                Back
              </Button>
            )}
            {reason ? (
              <p id={reasonId} role="alert" className={cn(T.meta, "text-text-error")}>
                {reason}
              </p>
            ) : (
              blocked && (
                <p id={reasonId} className={SUB}>
                  {readiness.blocker ?? "Finish the steps above to sell."}
                </p>
              )
            )}
          </>
        }
      >
        <div ref={bodyRef} inert={busy || undefined} className="flex flex-col gap-6">
          <p className={T.meta}>{`Step ${index + 1} of ${SELL_STEPS.length} · ${STEP_LABEL[step]}`}</p>
          {error && <Banner tone="error">{error}</Banner>}
          {step === "price" ? (
            <>
              {state.kind === "new" && (
                <Field label="Copies" htmlFor={`${prefix}-count`} error={err("count")} errorId={`${prefix}-count-err`}>
                  <TextInput
                    id={`${prefix}-count`}
                    size="xl"
                    value={draft.count}
                    inputMode="numeric"
                    invalid={!!err("count")}
                    aria-describedby={`${prefix}-count-err`}
                    onValueChange={(v) => change({ count: v.replace(/[^\d]/g, "").slice(0, 6) })}
                  />
                  {!err("count") && (
                    <span className={SUB}>
                      {physical ? "List only as many as you can make and ship. A whole number from 1 to 10,000." : "Each copy is one license. A whole number from 1 to 10,000."}
                    </span>
                  )}
                </Field>
              )}
              <Field label="Token" htmlFor={`${prefix}-token`} error={err("token")} errorId={`${prefix}-token-err`}>
                <SheetSelect id={`${prefix}-token`} title="Token" placeholder="Choose a token" value={draft.token ?? ""} options={tokens} invalid={!!err("token")} onChange={(v) => change({ token: v as Token })} />
              </Field>
              <Field label="Price" htmlFor={`${prefix}-regular`} error={err("regular")} errorId={`${prefix}-regular-err`}>
                <TextInput
                  id={`${prefix}-regular`}
                  size="xl"
                  value={draft.regular}
                  inputMode="decimal"
                  placeholder="e.g. 0.01"
                  invalid={!!err("regular")}
                  aria-describedby={`${prefix}-regular-err`}
                  onValueChange={(v) => change({ regular: decimal(v) })}
                />
                {!err("regular") && payoutLineOf(draft.regular, draft.token) && <span className={SUB}>{payoutLineOf(draft.regular, draft.token)}</span>}
              </Field>
              {physical && (
                <>
                  <Field label="How you'll make and ship it" htmlFor={`${prefix}-note`} error={err("note")} errorId={`${prefix}-note-err`}>
                    <Textarea
                      id={`${prefix}-note`}
                      rows={4}
                      value={draft.note}
                      maxLength={NOTE_MAX}
                      invalid={!!err("note")}
                      aria-required
                      aria-describedby={`${prefix}-note-err ${prefix}-note-count`}
                      placeholder="e.g. I print the case and assemble each one in my workshop, then post it tracked."
                      onValueChange={(note) => change({ note })}
                    />
                    <span id={`${prefix}-note-count`} className={cn("flex justify-between gap-4", SUB)}>
                      <span>{err("note") ? "" : "Where it's made, how it's shipped and how long that takes."}</span>
                      <span className="tabular-nums">
                        {draft.note.length}/{NOTE_MAX.toLocaleString("en-US")}
                      </span>
                    </span>
                  </Field>
                  <fieldset className="flex flex-col gap-2">
                    <legend className={cn(T.label, "pb-2")}>Your promises</legend>
                    {PROMISES.map((p) => (
                      <CheckRow
                        key={p.field}
                        id={`${prefix}-${p.field}`}
                        invalid={problem?.field === p.field}
                        describedBy={problem?.field === p.field ? reasonId : undefined}
                        checked={draft.checks[p.field]}
                        onToggle={() => {
                          const checks = (written.current ?? form).draft.checks;
                          change({ checks: { ...checks, [p.field]: !checks[p.field] } });
                        }}
                      >
                        {p.text}
                      </CheckRow>
                    ))}
                  </fieldset>
                </>
              )}
              <div className="flex flex-col gap-6">
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  onClick={() => update({ more: !(written.current ?? form).more })}
                  className={cn(T.rowTitle, "-my-3 inline-flex min-h-[44px] items-center gap-2 self-start outline-none focus-visible:underline")}
                >
                  More options
                  <span aria-hidden className={cn("inline-flex transition-transform duration-normal", moreOpen && "rotate-180")}>
                    <Icon icon={ArrowDown01Icon} size={16} />
                  </span>
                </button>
                {moreOpen && (
                  <>
                    <Field label="Price with future updates" htmlFor={`${prefix}-extended`} error={err("extended")} errorId={`${prefix}-extended-err`}>
                      <TextInput
                        id={`${prefix}-extended`}
                        size="xl"
                        value={draft.extended}
                        inputMode="decimal"
                        placeholder={draft.regular.trim() || "e.g. 0.02"}
                        invalid={!!err("extended")}
                        aria-describedby={`${prefix}-extended-err`}
                        onValueChange={(v) => change({ extended: decimal(v) })}
                      />
                      {!err("extended") && <span className={SUB}>Left empty, it&apos;s the same as the price.</span>}
                    </Field>
                    <fieldset id={`${prefix}-use`} className="flex flex-col gap-3">
                      <legend className={cn(T.label, "pb-3")}>Use</legend>
                      <div role="radiogroup" aria-label="Use" className="flex flex-col gap-3">
                        {uses.map((c) => {
                          const on = draft.use === c.use && c.open;
                          return (
                            <label
                              key={c.use}
                              className={cn(
                                "relative flex min-h-[44px] items-center gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid px-6 py-3",
                                !c.open ? "cursor-not-allowed border-border bg-bg-surface-raised" : on ? "cursor-pointer border-border-brand bg-bg-brand-subtle" : "cursor-pointer border-border",
                              )}
                            >
                              <input type="radio" name={`${prefix}-use`} className="sr-only" checked={on} disabled={!c.open} onChange={() => change({ use: c.use })} />
                              <Radio checked={on} disabled={!c.open} decorative />
                              <span className="flex flex-col">
                                <span className={cn(T.rowTitle, c.open ? "text-text-primary" : "text-text-secondary")}>{USE_LABEL[c.use]}</span>
                                {!c.open && <span className={SUB}>{ALREADY_ON_SALE}</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {err("use") && <p className={cn(T.meta, "text-text-error")}>{err("use")}</p>}
                    </fieldset>
                    <Field label="Royalties (%)" htmlFor={`${prefix}-royalties`} error={err("royalties")} errorId={`${prefix}-royalties-err`}>
                      <TextInput
                        id={`${prefix}-royalties`}
                        size="xl"
                        value={draft.royalties}
                        inputMode="numeric"
                        placeholder={`${ROYALTY_MIN} to ${ROYALTY_MAX}`}
                        invalid={!!err("royalties")}
                        aria-describedby={`${prefix}-royalties-err`}
                        onValueChange={(v) => change({ royalties: v.replace(/[^\d]/g, "").slice(0, 2) })}
                      />
                      {!err("royalties") && <span className={SUB}>{ROYALTY_HINT}</span>}
                    </Field>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <dl className="flex flex-col overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border">
                {reviewSummaryOf({
                  draft,
                  what,
                  count: state.kind === "new" ? (wholeNumberOf(draft.count) ?? 0) : state.track.supply.total,
                  networkLabel: networkLabelOf(chain.network),
                }).map((r) => (
                  <div key={r.label} className="flex flex-col gap-1 border-b-[length:var(--border-width-1)] border-solid border-border px-6 py-4 last:border-b-0">
                    <dt className={SUB}>{r.label}</dt>
                    <dd className={cn(T.rowTitle, "break-words")}>{r.value}</dd>
                  </div>
                ))}
              </dl>
              <ul aria-label="Before you sell" className="flex flex-col gap-6">
                {readiness.checks.map((c) => {
                  const fix = c.ok ? null : c.fix;
                  return (
                    <li key={c.id} className="flex items-start gap-4">
                      <span aria-hidden className={cn("inline-flex pt-px", c.ok ? "text-text-success" : "text-text-tertiary")}>
                        <Icon icon={c.ok ? CheckmarkCircle02Icon : CircleIcon} size={20} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className={cn(T.rowTitle, "break-words")}>
                          {c.title}
                          <span className="sr-only">{c.ok ? ", ready" : ", not ready yet"}</span>
                        </span>
                        {c.detail && <span className={SUB}>{c.detail}</span>}
                        {fix && (
                          <Button hierarchy="secondary" size="xl" className="mt-2 self-start" onClick={() => onFix(fix)}>
                            {FIX_LABEL[fix]}
                          </Button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {readiness.videosWait && (
                <p className={cn(T.body, "rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand bg-bg-brand-subtle p-6 text-text-primary")}>
                  {heldNoteOf("Explore marketplace", videoCountOf(scopeReadiness).total)}
                </p>
              )}
              {!ladder.ok && <LevelCheck check={ladder} what={LADDER_WHAT[kind]} projectId={project.id} license={brief?.state.license ?? null} />}
              <div className="flex flex-col gap-2">
                {askOwner && (
                  <CheckRow id={`${prefix}-owner`} invalid={problem?.field === "owner"} describedBy={problem?.field === "owner" ? reasonId : undefined} checked={draft.owner} onToggle={() => change({ owner: !draft.owner })}>
                    I confirm I&apos;m the rightful owner of this project, virtually and physically, and I take responsibility for any legal or intellectual-property issue it raises.
                  </CheckRow>
                )}
                <CheckRow id={`${prefix}-lazy`} invalid={problem?.field === "lazy"} describedBy={problem?.field === "lazy" ? reasonId : undefined} checked={draft.lazy} onToggle={() => change({ lazy: !draft.lazy })}>
                  I understand each copy is minted only when it&apos;s bought, so nothing is charged now.
                </CheckRow>
              </div>
              <p className={T.body}>{NO_INCOME_LINE}</p>
            </>
          )}
        </div>
      </Sheet>
      <ConfirmSheet
        open={discarding}
        onClose={() => setDiscarding(false)}
        title="Discard this listing?"
        body={
          createdHere
            ? "The price and options entered here aren't saved. The copies already made stay, not on sale."
            : "Nothing entered here is saved yet. Closing now throws it away."
        }
        verb="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          leave();
          onClose();
        }}
      />
    </>
  );
}
