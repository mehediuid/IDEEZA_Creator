"use client";

// The form step — "Ready to sell" · "Give to community" · "Save as Private".
//
// One frame, three forms: what a maker is doing with the idea decides what it
// asks for. A sale needs a price, a listing type and a cost card; a give needs
// the licence it is given under; a save needs neither. All three end on the
// same two confirms and the same CTA, which either commits or carries on to
// the clip Innovations needs (`isLastStep`).
//
// Mint completes IMMEDIATELY when the form is valid. The 20-min video render
// is no longer a gate — it's kicked off in the background after the commit,
// tracked by the GlobalRenderIndicator visible on every page.

import * as React from "react";
import { Checkbox, SelectMenu, type SelectOption } from "@/components/ideeza";
import { BriefCard } from "./brief-app";
// The model itself, not `brief-app`'s re-export of it: these are read at module
// scope (the option lists below), which only worked while some other import
// happened to evaluate `@/lib/brief/types` first.
import {
  BRIEF_FORM_LABEL,
  LICENSES,
  LISTING_TYPES,
  NETWORKS,
  TOKENS_BY_NETWORK,
  stepsFor,
  type BriefState,
  type Intent,
  type License,
  type Network,
  type Token,
} from "@/lib/brief/types";
import { ReviewModal } from "./review-modal";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { estimateGas, formatTotal } from "@/lib/brief/gas";
import {
  addCollection,
  readCollections,
  type WalletCollection,
} from "@/lib/brief/wallet";

// What this form is for, in the words the rail already uses for the same step,
// then what the choice really means — a give cannot be taken back, a private
// save can still be shared later.
const SUB_BY_INTENT: Record<Intent, string> = {
  sell: "Confirm the details and mint.",
  give:
    "Anyone can use and build on this, for free. Minting keeps your name on it — and this cannot be undone.",
  save:
    "Only you can see this. Minting keeps your name on it — you can share or sell it later.",
};

const MINT_FEE = 4;
const MAX_STORY = 500;
/** The collection row that creates one instead of choosing one. */
const NEW_COLLECTION = "__new__";
/** The chain picker's placeholder — one string, all three forms. */
const BLOCKCHAIN_PLACEHOLDER = "Choose your prefer blockchain";

/**
 * What a royalty may be, in one place: the field's hint, its validation and the
 * reason under the CTA all read these, so the three can't disagree the way the
 * hint ("2 – 100"), the placeholder ("Maximum is 10%") and the clamp (100) did.
 * One decimal place, because 2.5% is a rate makers really set.
 */
const ROYALTY_MIN = 2;
const ROYALTY_MAX = 10;

/** The note under the story, when a clip is still to come after this form. */
const CLIP_NOTE = "Next you will make a short clip — Innovations posts need one.";

const NETWORK_OPTIONS: SelectOption<Network>[] = NETWORKS.map((n) => ({
  value: n.value,
  label: n.label,
}));

// Name and terms both come from the model — the ⓘ beside each row is the
// `info` line, because the names alone don't tell a maker them apart.
const LICENSE_OPTIONS: SelectOption<License>[] = LICENSES.map((l) => ({
  value: l.value,
  label: l.label,
  info: l.info,
}));

const isAmount = (v: string) => !!v.trim() && Number(v) > 0;

/**
 * Digits and at most one decimal point. A second point used to survive, so
 * "1.2.3" read as a price and parsed as NaN — which then failed the amount
 * check under a reason about the field being empty.
 */
const decimal = (v: string) => {
  const kept = v.replace(/[^\d.]/g, "");
  const dot = kept.indexOf(".");
  return dot < 0
    ? kept
    : kept.slice(0, dot + 1) + kept.slice(dot + 1).replace(/\./g, "");
};

/**
 * A percentage as it is typed: digits and at most one decimal place. It does
 * NOT correct the number — typing "1" on the way to "10" used to be clamped to
 * "2" under the cursor, so a maker aiming at 10% shipped 20%. Whether the
 * figure is in range is `firstMissing`'s answer, said out loud under the CTA.
 */
const percent = (v: string) => {
  const kept = decimal(v);
  const dot = kept.indexOf(".");
  return dot < 0 ? kept : kept.slice(0, dot + 2);
};

/** The royalty typed, or null when it isn't a number yet. */
const royaltyOf = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/**
 * `datetime-local` speaks local wall-clock time, so the earliest allowed
 * moment has to be written in that shape — an ISO/UTC string would be off by
 * the timezone.
 */
function localDateTime(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Is a `datetime-local` value a real moment still ahead of `now`? */
function isFuture(value: string, now: number): boolean {
  const t = new Date(value).getTime();
  return Number.isFinite(t) && t > now;
}

const MINUTE = 60_000;

/**
 * The wall clock, to the minute. The form has to know what "in the future"
 * means, and the clock is an external source that really moves — so it is read
 * through `useSyncExternalStore` rather than in render: the snapshot is stable
 * between ticks, and an expiry that passes while the form is open stops
 * counting as future on its own.
 */
function useMinuteClock(): number {
  const subscribe = React.useCallback((onChange: () => void) => {
    const id = window.setInterval(onChange, MINUTE);
    return () => window.clearInterval(id);
  }, []);
  return React.useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => 0,
  );
}

/**
 * The first thing still missing, read top-down through the form — it is both
 * what shuts the CTA and what its tooltip says.
 */
function firstMissing(s: BriefState, intent: Intent, now: number): string | null {
  if (intent === "sell") {
    if (!s.network) return "Choose the blockchain to mint on.";
    if (!s.collection) return "Choose a collection to mint into.";
    if (!s.listingType) return "Choose a listing type.";
    if (s.listingType === "auction") {
      if (!isAmount(s.minBid)) return "Set the minimum bidding price.";
      // Bidding that opens above the buy-now price is a listing nobody can
      // bid on — the first bid would already have bought it.
      if (isAmount(s.auctionBuyNow) && Number(s.minBid) > Number(s.auctionBuyNow))
        return "The minimum bid can't be above the buy-now price.";
      if (!s.expiresAt) return "Set the date the auction expires.";
      if (!isFuture(s.expiresAt, now)) return "Set an expiry in the future.";
    } else if (!isAmount(s.price)) {
      return "Set the price.";
    }
    const royalty = royaltyOf(s.royalties);
    if (royalty === null) return "Set the royalties percentage.";
    if (royalty < ROYALTY_MIN || royalty > ROYALTY_MAX)
      return `Royalties must be between ${ROYALTY_MIN} and ${ROYALTY_MAX}%.`;
    if (!s.understandGas)
      return "Confirm you understand the network gas fee.";
    if (!s.confirmOwnership)
      return "Confirm you are the rightful owner of this idea.";
    return null;
  }
  // Giving and saving mint the same way — a chain and a collection to land in
  // — and a give also states the terms it is given under.
  if (!s.network) return "Choose the blockchain to mint on.";
  if (!s.collection) return "Choose a collection to mint into.";
  if (intent === "give" && !s.license)
    return "Choose the license it is given under.";
  if (!s.confirmOwnership)
    return "Confirm you are the rightful owner of this idea.";
  return null;
}

export function Step3Mint({
  state,
  onChange,
  onBack,
  onMint,
  onNext,
  onPreview,
  isLastStep,
  minting,
  projectName,
  imageUrl,
}: {
  state: BriefState;
  onChange: (patch: Partial<BriefState>) => void;
  onBack: () => void;
  /** The product's own concept image, for the card that says what is being
   *  minted — when the project came from a build. */
  imageUrl?: string;
  /** Commit — mint and finish. Only ever the CTA when this form is last. */
  onMint: () => void;
  /** One step along the sequence — the preview, when Innovations added one. */
  onNext: () => void;
  /**
   * Go to the clip's own step, wherever it sits — the wizard's `setStep`, when
   * it passes one. Without it the step is worked out from the sequence below,
   * so this stays optional.
   */
  onPreview?: () => void;
  /** Is this form the last thing to answer before the mint? */
  isLastStep: boolean;
  minting: boolean;
  projectName: string;
}) {
  const { jobs } = useVideoJobs();
  const intent = state.intent || "sell";
  const heading = BRIEF_FORM_LABEL[intent];
  const now = useMinuteClock();
  const reasonId = React.useId();
  const [reviewOpen, setReviewOpen] = React.useState(false);

  // The render job was kicked off at Step 2 → Step 3 transition. Look it up
  // from the global store so we can show inline progress + opt-ins.
  const job = React.useMemo(
    () => (state.videoJobId ? jobs.find((j) => j.id === state.videoJobId) || null : null),
    [jobs, state.videoJobId],
  );
  const willRenderVideo =
    state.mediaType === "ai" && state.storyboardGenerated;
  const videoDone = job?.stage === "done";
  // Only a clip that exists can be watched: while the render is still in
  // flight the card stays a poster rather than offering a player with nothing
  // behind it.
  const watchable = !!state.arClip || videoDone;

  const gas = estimateGas(state.network);

  // Where the clip's own step sits. Selling puts the preview BEFORE this form,
  // but a give or save that posts to Innovations puts it after — so
  // regenerating can't just be "one step back", which landed on the idea.
  // `isLastStep` is belt and braces: a form that is last has nothing ahead of
  // it but the mint, and Regenerate must never pay for anything.
  const seq = stepsFor(state.intent);
  const previewIsAhead =
    !isLastStep && seq.indexOf("preview") > seq.indexOf("form");
  const goToPreview = onPreview ?? (previewIsAhead ? onNext : onBack);

  const listingLabel =
    LISTING_TYPES.find((l) => l.id === state.listingType)?.label ?? "";
  // An auction's listing figure is what bidding opens at.
  const listingAmount =
    state.listingType === "auction" ? state.minBid : state.price;

  const missing = firstMissing(state, intent, now);
  const formReady = !missing;
  const canPay = formReady && !minting;
  // Sharing to Innovations puts a clip between this form and the mint, so the
  // CTA carries the form on rather than paying for something not made yet.
  // Giving and saving name what the button does; only a sale states a price.
  const ctaLabel = !isLastStep
    ? "Continue to video ›"
    : intent === "give"
      ? "Give to the community"
      : intent === "save"
        ? "Save as Private"
        // "and mint", not "and go live": the marketplace is not open, and
        // the success screen says the listing goes on sale when it does.
        : `Pay ${MINT_FEE} IDZ and mint`;

  // Shared by the two hint lines under the CTA — the unmet-requirement reason
  // and the "you don't have to wait" note both read as a small centred aside.
  const hintClass = "text-center text-sm leading-relaxed text-text-secondary";

  return (
    <BriefCard onBack={onBack}>
      <div className="flex flex-col gap-[20px]">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-[-0.2px] text-text-primary">
            {heading}
          </h1>
          <p className="mt-[6px] text-sm text-text-secondary">
            {SUB_BY_INTENT[intent]}{" "}
            {intent === "sell" &&
              willRenderVideo &&
              "The video joins the listing when it finishes."}
          </p>
        </div>

        {willRenderVideo && job && <RenderInfo videoDone={videoDone} />}

        <ProductCard
          state={state}
          projectName={projectName}
          imageUrl={imageUrl}
          watchable={watchable}
          onOpen={() => setReviewOpen(true)}
        />

        {intent === "sell" && (
          <SellFields state={state} onChange={onChange} now={now} />
        )}
        {intent === "give" && <GiveFields state={state} onChange={onChange} />}
        {intent === "save" && <SaveFields state={state} onChange={onChange} />}

        {/* Only a sale puts a figure on this screen: giving and saving ask for
            no price, so a cost card there would be the one place money is
            mentioned, with nothing on the form to check it against. */}
        {intent === "sell" && (
          <div className="flex flex-col gap-[8px] rounded-lg bg-bg-surface-raised p-[16px]">
            <CostRow label="Mint fee" value={`${MINT_FEE} IDZ`} />
            {isAmount(listingAmount) && (
              <CostRow
                label={`Listing (${listingLabel})`}
                value={`${listingAmount} ${state.token}`}
              />
            )}
            {/* The chain the user picked, by name, and what its coin is worth:
                a testnet's is handed out by a faucet, so quoting a dollar
                figure for it would be inventing a cost. */}
            <CostRow
              label={gas.label}
              value={
                <>
                  {gas.fee} {gas.native}{" "}
                  <span className="text-text-tertiary">{gas.note}</span>
                </>
              }
            />
            {/* `--color-border-subtle` *is* this card's own ground in light
                theme (both gray-100), so the rule has to step off it. */}
            <div className="my-[4px] h-[1px] bg-[var(--color-border-strong)]" />
            <CostRow
              label="Total to pay now"
              value={formatTotal(MINT_FEE, gas)}
              bold
            />
            <div className="text-xs leading-relaxed text-text-tertiary">
              Estimate at fixed reference rates — live network pricing
              isn&rsquo;t wired yet. IDZ is IDEEZA&rsquo;s token, paid from
              your wallet; it is separate from the credits a build uses.
            </div>
          </div>
        )}

        <WalletCallout />

        {/* A disabled button takes no pointer events, so the reason has to live
            on a wrapper the cursor can still reach. */}
        <span title={missing ?? undefined} className="flex">
          <button
            onClick={isLastStep ? onMint : onNext}
            disabled={!canPay}
            title={missing ?? undefined}
            aria-describedby={missing ? reasonId : undefined}
            // The app's primary button — the same shape and weight as every
            // other one, not a glowing pill of its own.
            className={[
              "inline-flex h-[44px] w-full items-center justify-center gap-[8px] rounded-lg border-0 px-[24px] text-md font-semibold transition-colors duration-fast",
              canPay
                ? "cursor-pointer bg-bg-brand text-text-on-brand"
                : "cursor-not-allowed bg-bg-subtle text-text-disabled",
            ].join(" ")}
          >
            {minting ? (
              <>
                <Spinner />
                Minting…
              </>
            ) : (
              <>
                {/* The wallet glyph stands for "pay" — only the sale does. */}
                {isLastStep && intent === "sell" ? <WalletIcon /> : null}
                {ctaLabel}
              </>
            )}
          </button>
        </span>

        {missing ? (
          <div id={reasonId} className={hintClass}>
            {missing}
          </div>
        ) : willRenderVideo && !minting ? (
          <div className={hintClass}>
            {videoDone ? (
              <>Video is ready. Minting now publishes your listing immediately.</>
            ) : (
              <>
                You don&rsquo;t have to wait — mint now and we&rsquo;ll publish
                automatically the moment the video finishes.
                <br />
                <strong>Project stays hidden until the video is final.</strong>
              </>
            )}
          </div>
        ) : null}
      </div>

      <ReviewModal
        open={reviewOpen}
        prompt={state.videoPrompt}
        quality={state.quality}
        onApprove={() => setReviewOpen(false)}
        onRegenerate={() => {
          // Regenerating is the preview step's job — that is where the prompt
          // lives — so go there, not "one step back".
          setReviewOpen(false);
          goToPreview();
        }}
        onClose={() => setReviewOpen(false)}
      />

      <style>{`
        .ix-s3-check input:focus-visible + span {
          border-color: var(--color-border-brand);
          box-shadow: 0 0 0 3px var(--color-bg-brand-subtle);
        }
        .ix-s3-date::-webkit-calendar-picker-indicator { opacity: 0; width: 0; }
      `}</style>
    </BriefCard>
  );
}

// RenderInfo — slim info banner on Step 3 reminding the user that the video
// joins the listing when the in-flight render finishes. The actual render progress +
// notification opt-ins live on Step 2 (inline) and in the bottom-right toast,
// so we don't duplicate them here. This banner is just signal.
function RenderInfo({ videoDone }: { videoDone: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex items-center gap-[10px] rounded-lg border border-solid px-[14px] py-[12px] text-md leading-relaxed",
        videoDone
          ? "border-[var(--color-border-success)] bg-bg-success-subtle text-text-success"
          : "border-border-brand bg-bg-brand-subtle text-text-brand",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full",
          videoDone ? "bg-bg-success-subtle" : "bg-bg-surface",
        ].join(" ")}
      >
        {videoDone ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4 10-10" />
          </svg>
        ) : (
          <span className="ix-s3i-pulse h-[8px] w-[8px] rounded-full bg-bg-brand" />
        )}
      </span>
      <span className="flex-1">
        {videoDone ? (
          <>
            <strong>Video is ready.</strong> Finish the mint setup and pay to
            mint.
          </>
        ) : (
          <>
            Your video is still rendering. You can set up the mint now — the
            video joins the listing when it is final. Its progress shows in
            the bottom-right corner.
          </>
        )}
      </span>
      <style>{`
        @keyframes ix-s3i-pulse-kf { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
        .ix-s3i-pulse { animation: ix-s3i-pulse-kf 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/**
 * What is being minted: the clip's own frame (or the brand poster when there
 * is no file yet) over the project → product → one-liner the listing carries.
 * The thumbnail is the way back into the video — a poster you cannot play
 * would be decoration, so the play glyph appears only when there is something
 * to watch.
 */
function ProductCard({
  state,
  projectName,
  imageUrl,
  watchable,
  onOpen,
}: {
  state: BriefState;
  projectName: string;
  imageUrl?: string;
  watchable: boolean;
  onOpen: () => void;
}) {
  const noMedia = state.mediaType === "skip";
  const thumbClass = [
    "relative flex h-[54px] w-[72px] flex-none items-center justify-center overflow-hidden rounded-md p-0",
    noMedia ? "bg-bg-brand-subtle" : "bg-[image:var(--gradient-brand)]",
  ].join(" ");

  // The product itself where there is a picture of it — the violet gradient
  // stood in for a product that has a concept image already.
  const inner = (
    <>
      {imageUrl && !state.arClip ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {state.arClip ? (
        <video
          src={state.arClip.url}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {noMedia ? (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-brand)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ) : watchable ? (
        <span className="relative inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-bg-surface">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-text-brand)" aria-hidden>
            <polygon points="7,4 21,12 7,20" />
          </svg>
        </span>
      ) : null}
    </>
  );

  return (
    <div className="flex items-center gap-[14px] rounded-lg border border-solid border-border-subtle bg-bg-surface p-[14px]">
      {watchable && !noMedia ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Play the product video"
          className={`${thumbClass} cursor-pointer border-0`}
         
        >
          {inner}
        </button>
      ) : (
        <div className={thumbClass}>
          {inner}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-[2px] text-sm font-medium text-text-tertiary">
          {projectName || "No project"}
        </div>
        <div className="truncate text-lg font-bold text-text-primary">
          {state.productName || "Untitled"}
        </div>
        <div className="mt-[4px] line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {state.productDescription || "—"}
        </div>
      </div>
    </div>
  );
}

function SellFields({
  state,
  onChange,
  now,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
  /** The clock the expiry is measured against — the parent's, so the field's
   *  floor and the reason under the button can't disagree. */
  now: number;
}) {
  const { collections, reread } = useCollections(state.network);
  const priceId = React.useId();
  const minBidId = React.useId();
  const buyNowId = React.useId();
  const expiryId = React.useId();
  const royaltyId = React.useId();
  const expiryRef = React.useRef<HTMLInputElement>(null);
  /** The earliest expiry the picker will offer. */
  const earliestExpiry = localDateTime(now);

  const isAuction = state.listingType === "auction";

  // `sub` says what each listing type does — the model carries it, and the
  // option builder used to drop it on the floor.
  const listingOptions: SelectOption<BriefState["listingType"]>[] =
    LISTING_TYPES.map((l) => ({ value: l.id, label: l.label, sub: l.sub }));
  const tokenOptions: SelectOption<Token>[] = TOKENS_BY_NETWORK[
    state.network
  ].map((t) => ({ value: t, label: t }));

  // A collection belongs to one chain and a token to one chain's list, so
  // neither survives the move.
  const pickNetwork = (n: Network) => {
    reread(n);
    onChange({ network: n, token: TOKENS_BY_NETWORK[n][0], collection: "" });
  };

  const openExpiryPicker = () => {
    const el = expiryRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <SelectMenu
        label="Blockchain Mint"
        placeholder={BLOCKCHAIN_PLACEHOLDER}
        value={state.network}
        onChange={pickNetwork}
        options={NETWORK_OPTIONS}
      />

      <CollectionField
        key={state.network}
        network={state.network}
        value={state.collection}
        collections={collections}
        onPick={(name) => onChange({ collection: name })}
        onCreate={(name) => {
          reread(state.network);
          onChange({ collection: name });
        }}
      />

      <SelectMenu
        label="Listing type"
        placeholder="Select listing type"
        value={state.listingType}
        onChange={(v) => onChange({ listingType: v })}
        options={listingOptions}
      />

      {isAuction ? (
        <>
          {/* The token select carries its own label, like the Buy-now row's:
              a `SelectMenu` with none is named by its value, so it announced
              as "ETH" with nothing saying what ETH is for. */}
          <div className="grid grid-cols-[160px_1fr] gap-[12px]">
            <SelectMenu
              label="Token"
              placeholder="Select token"
              value={state.token}
              onChange={(v) => onChange({ token: v })}
              options={tokenOptions}
            />
            <Field label="Minimum bidding price" controlId={minBidId}>
              <input
                id={minBidId}
                className={`ix-brief-field ${FIELD_BASE} h-[44px] px-[14px]`}
                value={state.minBid}
                onChange={(e) => onChange({ minBid: decimal(e.target.value) })}
                placeholder="0.00"
                inputMode="decimal"
              />
            </Field>
          </div>

          <Field label="Auction Buy Now Price" controlId={buyNowId}>
            <input
              id={buyNowId}
              className={`ix-brief-field ${FIELD_BASE} h-[44px] px-[14px]`}
              value={state.auctionBuyNow}
              onChange={(e) =>
                onChange({ auctionBuyNow: decimal(e.target.value) })
              }
              placeholder="0.5 for example"
              inputMode="decimal"
            />
          </Field>

          <Field label="Expired Date" controlId={expiryId}>
            <div className="relative">
              <input
                id={expiryId}
                ref={expiryRef}
                className={`ix-brief-field ix-s3-date ${FIELD_BASE} h-[44px] pl-[14px] pr-[40px]`}
                type="datetime-local"
                value={state.expiresAt}
                // An auction that expired before it opened isn't a listing —
                // the picker can't reach one, and `firstMissing` says so for
                // a date typed in by hand.
                min={earliestExpiry}
                onChange={(e) => onChange({ expiresAt: e.target.value })}
              />
              <button
                type="button"
                onClick={openExpiryPicker}
                aria-label="Open the date picker"
                className="absolute right-[6px] top-1/2 inline-flex h-[30px] w-[30px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18 M8 3v4 M16 3v4" />
                </svg>
              </button>
            </div>
          </Field>
        </>
      ) : (
        <div className="grid grid-cols-[160px_1fr] gap-[12px]">
          <SelectMenu
            label="Token"
            placeholder="Select token"
            value={state.token}
            onChange={(v) => onChange({ token: v })}
            options={tokenOptions}
          />
          <Field label="Price" controlId={priceId}>
            <input
              id={priceId}
              className={`ix-brief-field ${FIELD_BASE} h-[44px] px-[14px]`}
              value={state.price}
              onChange={(e) => onChange({ price: decimal(e.target.value) })}
              placeholder="0.00"
              inputMode="decimal"
            />
          </Field>
        </div>
      )}

      <Field
        label="Royalties (%)"
        hint={`Between ${ROYALTY_MIN} and ${ROYALTY_MAX}% — one decimal place.`}
        controlId={royaltyId}
      >
        <input
          id={royaltyId}
          className={`ix-brief-field ${FIELD_BASE} h-[44px] px-[14px]`}
          value={state.royalties}
          onChange={(e) => onChange({ royalties: percent(e.target.value) })}
          inputMode="decimal"
          placeholder="Suggested: 2%, 2.5%, 5% Maximum is 10%"
        />
      </Field>

      <div className="flex flex-col gap-[10px]">
        <Check
          label="I understand a network gas fee is added at mint"
          checked={state.understandGas}
          onChange={(v) => onChange({ understandGas: v })}
        />
        <OwnerAndShare state={state} onChange={onChange} />
      </div>

      {state.shareToNewsfeed && <StoryPanel state={state} onChange={onChange} />}
    </div>
  );
}

/**
 * Giving it away: the chain it is minted on, the collection it lands in, and
 * the licence whoever picks it up is bound by. No price, so no cost card —
 * what this form asks for is the terms, not a figure.
 */
function GiveFields({
  state,
  onChange,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
}) {
  const { collections, reread } = useCollections(state.network);

  return (
    <div className="flex flex-col gap-[16px]">
      <SelectMenu
        label="Blockchain Mint"
        placeholder={BLOCKCHAIN_PLACEHOLDER}
        value={state.network}
        onChange={(n) => {
          reread(n);
          onChange({ network: n, collection: "" });
        }}
        options={NETWORK_OPTIONS}
      />

      <CollectionField
        key={state.network}
        network={state.network}
        value={state.collection}
        collections={collections}
        onPick={(name) => onChange({ collection: name })}
        onCreate={(name) => {
          reread(state.network);
          onChange({ collection: name });
        }}
      />

      <SelectMenu
        label="License"
        placeholder="Select a license"
        value={state.license}
        onChange={(v) => onChange({ license: v })}
        options={LICENSE_OPTIONS}
      />

      <div className="flex flex-col gap-[10px]">
        <OwnerAndShare state={state} onChange={onChange} />
      </div>

      {state.shareToNewsfeed && (
        <StoryPanel state={state} onChange={onChange} note={CLIP_NOTE} />
      )}
    </div>
  );
}

/**
 * Keeping it: the same mint, without terms for anyone else — nobody but the
 * maker can see it until they choose to share or sell it.
 */
function SaveFields({
  state,
  onChange,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
}) {
  const { collections, reread } = useCollections(state.network);

  return (
    <div className="flex flex-col gap-[16px]">
      <SelectMenu
        label="Blockchain Mint"
        placeholder={BLOCKCHAIN_PLACEHOLDER}
        value={state.network}
        onChange={(n) => {
          reread(n);
          onChange({ network: n, collection: "" });
        }}
        options={NETWORK_OPTIONS}
      />

      <CollectionField
        key={state.network}
        network={state.network}
        value={state.collection}
        collections={collections}
        onPick={(name) => onChange({ collection: name })}
        onCreate={(name) => {
          reread(state.network);
          onChange({ collection: name });
        }}
      />

      <div className="flex flex-col gap-[10px]">
        <OwnerAndShare state={state} onChange={onChange} />
      </div>

      {state.shareToNewsfeed && (
        <StoryPanel state={state} onChange={onChange} note={CLIP_NOTE} />
      )}
    </div>
  );
}

/** The two confirms every intent ends on: who owns it, and where it goes. */
function OwnerAndShare({
  state,
  onChange,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
}) {
  return (
    <>
      <Check
        label="I confirm I am the rightful owner of this idea"
        checked={state.confirmOwnership}
        onChange={(v) => onChange({ confirmOwnership: v })}
      />
      <Check
        label="Share to Innovations"
        checked={state.shareToNewsfeed}
        onChange={(v) => onChange({ shareToNewsfeed: v })}
      />
    </>
  );
}

/**
 * What the post says, when there is going to be one. `note` is the line that
 * only holds where a clip still has to be made after this form — on a sale the
 * preview is already behind you.
 */
function StoryPanel({
  state,
  onChange,
  note,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
  note?: string;
}) {
  const storyId = React.useId();
  return (
    <div className="flex flex-col gap-[8px] rounded-xl bg-bg-subtle p-[14px]">
      <label htmlFor={storyId} className="text-md font-semibold text-text-primary">
        Write your story
      </label>
      <textarea
        id={storyId}
        className={`ix-brief-field ${FIELD_BASE} h-[76px] resize-y px-[14px] py-[10px] leading-relaxed`}
        value={state.story}
        maxLength={MAX_STORY}
        onChange={(e) => onChange({ story: e.target.value.slice(0, MAX_STORY) })}
        placeholder="Why did you build this? What should others do with it?"
        rows={3}
      />
      <div className="flex justify-between gap-[12px] text-sm text-[var(--color-input-helper)]">
        <span>Shown with your post in Innovations.</span>
        <span className="tabular-nums">
          {state.story.length}/{MAX_STORY}
        </span>
      </div>
      {note ? (
        <div className="text-sm leading-relaxed text-text-brand">{note}</div>
      ) : null}
    </div>
  );
}

/**
 * The wallet's collections for a chain. `readCollections` seeds (and writes)
 * the store on a first read, so it runs once per mount in the lazy
 * initializer and then only from the handlers that can change the answer —
 * switching chain, or adding one.
 */
function useCollections(network: Network) {
  const [collections, setCollections] = React.useState<WalletCollection[]>(() =>
    readCollections(network),
  );
  const reread = React.useCallback(
    (n: Network) => setCollections(readCollections(n)),
    [],
  );
  return { collections, reread };
}

/**
 * Choose the collection this mints into, or name a new one without leaving the
 * form. The namer is a step you can back out of — Escape or Cancel closes it,
 * so picking the row by accident isn't a dead end.
 */
function CollectionField({
  network,
  value,
  collections,
  onPick,
  onCreate,
}: {
  network: Network;
  value: string;
  collections: WalletCollection[];
  onPick: (name: string) => void;
  /** The collection is already written to the wallet store by this point. */
  onCreate: (name: string) => void;
}) {
  const [naming, setNaming] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const newNameId = React.useId();

  const options: SelectOption[] = [
    ...collections.map((c) => ({ value: c.name, label: c.name })),
    { value: NEW_COLLECTION, label: "+ New collection…" },
  ];

  const cancel = () => {
    setNaming(false);
    setNewName("");
  };

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const created = addCollection(network, name);
    cancel();
    onCreate(created.name);
  };

  return (
    <div className="flex flex-col gap-[8px]">
      <SelectMenu
        label="Choose collection"
        placeholder="Select collection"
        value={value || null}
        onChange={(v) => {
          if (v === NEW_COLLECTION) {
            setNaming(true);
            return;
          }
          cancel();
          onPick(v);
        }}
        options={options}
      />
      {naming && (
        <div className="flex items-center gap-[8px]">
          <input
            id={newNameId}
            className={`ix-brief-field ${FIELD_BASE} h-[38px] px-[14px]`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            placeholder="Collection name"
            aria-label="New collection name"
            autoFocus
          />
          <button
            type="button"
            onClick={create}
            disabled={!newName.trim()}
            className={[
              "h-[38px] flex-none rounded-lg border-0 px-[16px] text-sm font-semibold",
              newName.trim()
                ? "cursor-pointer bg-bg-brand text-text-on-brand"
                : "cursor-not-allowed bg-bg-subtle text-text-disabled",
            ].join(" ")}
          >
            Add
          </button>
          <button
            type="button"
            onClick={cancel}
            className="h-[38px] flex-none cursor-pointer rounded-lg border-0 bg-transparent px-[12px] text-sm font-semibold text-text-secondary"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Label above, control, hint below — the same three-part stack `SelectMenu`
 * draws, so a field and a select sitting next to each other line up. The label
 * points at its control by id rather than wrapping it, so a field can carry a
 * button (the date picker) beside the input.
 */
function Field({
  label,
  hint,
  controlId,
  children,
}: {
  label: string;
  hint?: string;
  controlId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[var(--spacing-3)]">
      <label
        htmlFor={controlId}
        className="w-fit text-md text-[var(--color-input-label)]"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <span className="text-sm text-[var(--color-input-helper)]">{hint}</span>
      ) : null}
    </div>
  );
}

/**
 * A real checkbox under the design system's box: the input carries the role,
 * the state and the keyboard (Space toggles it, Tab reaches it), so the box is
 * only the picture — `decorative`, or it would announce a second checkbox
 * around the first. The `.ix-s3-check` rule lends it the input's focus ring.
 */
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="ix-s3-check relative inline-flex cursor-pointer items-center gap-[10px] text-md font-medium text-text-primary"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="absolute m-0 h-[1px] w-[1px] p-0 opacity-0"
      />
      <Checkbox checked={checked} decorative />
      {label}
    </label>
  );
}

/** What the money actually does — said before the button, not after it. */
function WalletCallout() {
  return (
    <div className="flex gap-[10px] rounded-lg border border-solid border-[var(--color-border-blue)] bg-bg-info-subtle px-[14px] py-[12px]">
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-blue)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-[1px] shrink-0"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5 M12 7.6v.4" />
      </svg>
      <div className="min-w-0">
        <div className="text-md font-semibold text-text-primary">
          Nothing is charged until you approve in your wallet
        </div>
        <div className="mt-[2px] text-sm leading-relaxed text-text-secondary">
          Gas is an estimate at current network rates. Minting records that you
          made this first — it does not stop someone copying the design.
        </div>
      </div>
    </div>
  );
}

function CostRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div
      className={[
        "flex justify-between",
        bold
          ? "text-md font-bold text-text-primary"
          : "text-sm font-medium text-text-secondary",
      ].join(" ")}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function WalletIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2" />
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M16.5 13.5h1.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-[14px] w-[14px] animate-[ix-mint-spin_.8s_linear_infinite] rounded-full border-2 border-solid border-l-[color-mix(in_srgb,currentColor_35%,transparent)] border-r-[color-mix(in_srgb,currentColor_35%,transparent)] border-b-[color-mix(in_srgb,currentColor_35%,transparent)] border-t-current">
      <style>{`@keyframes ix-mint-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

/**
 * The shared shape every text field in this form draws — background, border,
 * radius, text colour. Height and padding are left out here and added per
 * call site: two utility classes that both set the same CSS property (say,
 * two different heights) race for the winning rule in the compiled
 * stylesheet, not for the order they're written in a `className` string, so
 * the properties an instance overrides (height, padding) never live in this
 * shared base.
 */
const FIELD_BASE =
  "w-full border border-solid border-border bg-[var(--color-input-bg)] rounded-lg text-md text-text-primary outline-none";
