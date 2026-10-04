"use client";

// The form step — "Ready to sell" · "Give to community" · "Save as Private".
//
// One frame, three forms (P2-MINT-6): what a maker is doing with the idea
// decides what it asks for.
// - Sell IS the marketplace listing form (P2-LISTING-22): `ListingFields` in
//   its Brief mode, where Blockchain and Collection are still editable and
//   Minting type is its field 4. Then Share to Innovations, the cost box, the
//   wallet fact line and what each sale pays out.
// - Give: Blockchain, Collection, Minting type, License, the confirms, the
//   cost box and the wallet fact line.
// - Save: no Minting type — a Save is always a free lazy signature (MINT §5
//   Q1) — and no money at all, only the wallet fact line in its Lazy form.
//
// The CTA is `commitCtaLabel`'s ("Sign and list" / "Pay and give" / "Sign
// and save"), or "Continue to video ›" while the clip step is still ahead.
// It stays shut on the form's own reasons first, then on the readiness gate
// (a video still rendering never counts, C5), and it opens ONE wallet
// request (the Brief's `commit`).

import * as React from "react";
import { Checkbox, SelectMenu, TestnetDemoBadge, type SelectOption } from "@/components/ideeza";
import { ListingFields, type ListingField } from "@/components/projects/listing/listing-fields";
import { MintCostRows, WalletFactLine, useMintShortfall } from "@/components/wallet/mint-cost";
import { MintTypeField } from "@/components/wallet/mint-type-field";
import { useClipUrl } from "@/components/video-jobs/video-player";
import { BriefCard, type BriefGate } from "./brief-app";
// The model itself, not `brief-app`'s re-export of it: these are read at module
// scope (the option lists below), which only worked while some other import
// happened to evaluate `@/lib/brief/types` first.
import {
  BRIEF_FORM_LABEL,
  LICENSES,
  NETWORKS,
  TOKENS_BY_NETWORK,
  type BriefState,
  type Intent,
  type License,
  type Network,
} from "@/lib/brief/types";
import { ReviewModal } from "./review-modal";
import {
  addCollection,
  readCollections,
  type WalletCollection,
} from "@/lib/brief/wallet";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { FEE_LABEL } from "@/lib/market/fee";
import {
  listingInputFromBrief,
  listingProblems,
  listingSummaryRows,
  type ListingCtx,
  type ListingInput,
} from "@/lib/market/listing-form";
import { randomId } from "@/lib/market/sales";
import { commitCtaLabel } from "@/lib/wallet/mint";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import type { MintStatus } from "@/lib/wallet/types";

// What this form is for, in the words the rail already uses for the same step,
// then what the choice really means — a give cannot be taken back, a private
// save can still be shared later.
const SUB_BY_INTENT: Record<Intent, string> = {
  sell: "Set the listing's terms and mint — it goes on Explore marketplace as a testnet demo.",
  give:
    "Anyone can use and build on this, for free. Minting keeps your name on it — and this cannot be undone.",
  save:
    "Only you can see this. Minting keeps your name on it — you can share or sell it later.",
};

const MAX_STORY = 500;
/** The collection row that creates one instead of choosing one. */
const NEW_COLLECTION = "__new__";
/** The chain picker's placeholder — one string, all three forms. */
const BLOCKCHAIN_PLACEHOLDER = "Choose your prefer blockchain";
/** Save's one line under Choose collection (P2-MINT-6). */
const SAVE_SIGNATURE_LINE =
  "Saved with a free signature — nothing is charged. You can mint it on chain when you list it.";

/** The note under the story, when a clip is still to come after this form. */
const CLIP_NOTE = "Next you will make a short clip — Innovations posts need one.";
const OWNERSHIP_REASON = "Confirm you are the rightful owner of this idea.";
/** Amount fields show a wrong typed value at once; the rest after they're left (P2-LISTING-5). */
const AT_ONCE: ReadonlySet<ListingField> = new Set<ListingField>(["price", "minBid", "auctionBuyNow"]);

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

/** The listing form's patch, written back onto the Brief's draft fields. */
function briefPatchOf(p: Partial<ListingInput>): Partial<BriefState> {
  const out: Partial<BriefState> = {};
  if (p.network) out.network = p.network;
  if (p.collection !== undefined) out.collection = p.collection;
  if (p.type !== undefined) out.listingType = p.type;
  if (p.mintingType !== undefined) out.mintType = p.mintingType;
  if (p.token) out.token = p.token;
  if (p.price !== undefined) out.price = p.price;
  if (p.minBid !== undefined) out.minBid = p.minBid;
  if (p.auctionBuyNow !== undefined) out.auctionBuyNow = p.auctionBuyNow;
  if (p.endsAt !== undefined) out.expiresAt = p.endsAt;
  if (p.percentSelling !== undefined) out.sellingPct = p.percentSelling === null ? "" : String(p.percentSelling);
  if (p.royalties !== undefined) out.royalties = p.royalties;
  if (p.benefits !== undefined) out.benefits = p.benefits;
  if (p.confirmOwner !== undefined) out.confirmOwnership = p.confirmOwner;
  return out;
}

/** The cost box's listing row: "Listing (Buy now) · 0.05 MATIC". */
function listingCostRow(input: ListingInput): { label: string; amount: string } | undefined {
  const token = input.token;
  if (!token) return undefined;
  if (input.type === "buyNow") {
    return toMicros(input.price.trim()) ? { label: "Listing (Buy now)", amount: formatAmount(input.price, token) } : undefined;
  }
  return toMicros(input.minBid.trim())
    ? { label: "Listing (Auction)", amount: `from ${formatAmount(input.minBid, token)}` }
    : undefined;
}

/** What each sale pays out (C10) — the rate alone before a Buy-now price is typed. */
function eachSaleRows(input: ListingInput, ctx: ListingCtx) {
  const priced = (toMicros(input.price.trim()) ?? BigInt(0)) > BigInt(0);
  if (input.type === "buyNow" && !priced) return [{ label: FEE_LABEL, value: "taken from the price of each sale" }];
  return listingSummaryRows(input, ctx);
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
 * The first thing still missing, read top-down: the form's own reasons, then
 * the wallet's (an instant mint it can't pay), then — when this form is the
 * commit — the readiness gate, whose rules also carry the ownership confirm
 * and, for a Give, the license (P2-VIDEO-17). It is both what shuts the CTA
 * and what its description says.
 */
function firstMissing(
  s: BriefState,
  intent: Intent,
  f: { now: number; creatorPct: number; shortfall: string | null; last: boolean; gate: BriefGate },
): string | null {
  if (!s.collection) return "Choose a collection to mint into.";
  if (intent === "sell") {
    const first = listingProblems(listingInputFromBrief(s), { mode: "brief", now: f.now, creatorPct: f.creatorPct }).first;
    if (first) return first;
  }
  if (intent === "save" && !s.confirmOwnership) return OWNERSHIP_REASON;
  if (intent !== "save" && f.shortfall) return f.shortfall;
  if (f.last && f.gate.gated) return f.gate.readiness.blocker;
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
  mintError,
  projectId,
  projectName,
  headline,
  imageUrl,
  gate,
  mintStatus,
  mintAddress,
  creatorPct,
}: {
  state: BriefState;
  onChange: (patch: Partial<BriefState>) => void;
  onBack: () => void;
  /** Commit — mint and finish. Only ever the CTA when this form is last. */
  onMint: () => void;
  /** One step along the sequence — the preview, when it comes after the form. */
  onNext: () => void;
  /** Go to the videos' own step, wherever it sits. */
  onPreview: () => void;
  /** Is this form the last thing to answer before the mint? */
  isLastStep: boolean;
  /** The commit's wallet request is open. */
  minting: boolean;
  /** Why the last commit didn't mint. */
  mintError: string | null;
  projectId: string;
  projectName: string;
  /** The headline product, for the card that says what is being minted. */
  headline: ProjectProduct | null;
  /** Its concept image, when the project came from a build. */
  imageUrl?: string;
  gate: BriefGate;
  /** The project's mint status now: Minting type follows it (`mintTypeOptions`). */
  mintStatus: MintStatus;
  /** The on-chain wallet, named in Minting type's locked note. */
  mintAddress?: string;
  /** The maker's own share: Selling percentage can't pass it (P2-LISTING-5). */
  creatorPct: number;
}) {
  const intent = state.intent || "sell";
  const heading = BRIEF_FORM_LABEL[intent];
  const now = useMinuteClock();
  const reasonId = React.useId();
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [left, setLeft] = React.useState<ReadonlySet<ListingField>>(() => new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const { collections, reread } = useCollections(state.network);

  // A Save is always a lazy signature (MINT §5 Q1).
  const type = intent === "save" ? "lazy" : state.mintType;
  const shortfall = useMintShortfall(type, state.network);
  const missing = firstMissing(state, intent, {
    now,
    creatorPct,
    shortfall: shortfall?.missing ?? null,
    last: isLastStep,
    gate,
  });
  const canGo = !missing && !minting;
  const cta = commitCtaLabel(intent, type, { last: isLastStep, fromPreview: false, innovations: state.shareToNewsfeed });

  // The listing's own field messages: after a field is left, at once for a
  // typed amount that's wrong, and all of them after a blocked press.
  const input = listingInputFromBrief(state);
  const listingCtx: ListingCtx = { mode: "brief", now, creatorPct };
  const problems = intent === "sell" ? listingProblems(input, listingCtx) : null;
  const shown: Partial<Record<ListingField, string>> = {};
  for (const [key, message] of Object.entries(problems?.fields ?? {}) as [ListingField, string][]) {
    const typed = AT_ONCE.has(key) && String(input[key] ?? "").trim() !== "";
    if (submitted || left.has(key) || typed) shown[key] = message;
  }

  const press = () => {
    if (minting) return;
    if (missing) {
      setSubmitted(true);
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (isLastStep) onMint();
    else onNext();
  };

  const collectionField = (
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
  );
  const pickNetwork = (n: Network) => {
    reread(n);
    onChange({ network: n, token: TOKENS_BY_NETWORK[n][0], collection: "" });
  };

  // The headline's own video, when it has one: the card's way to watch it.
  const headRow = gate.readiness.products[0];
  const headTake = headRow?.video.state === "ready" ? headRow.video.take : null;
  const counts = gate.readiness.counts;

  // Shared by the two hint lines under the CTA.
  const hintClass = "text-center text-sm leading-relaxed text-text-secondary";

  return (
    <BriefCard onBack={onBack}>
      <div ref={bodyRef} className="flex flex-col gap-[20px]">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-[-0.2px] text-text-primary">
            {heading}
          </h1>
          <p className="mt-[6px] text-sm text-text-secondary">{SUB_BY_INTENT[intent]}</p>
        </div>

        <ProductCard
          state={state}
          projectName={projectName}
          imageUrl={imageUrl}
          take={headTake}
          videos={gate.gated || counts.ready > 0 ? { ready: counts.ready, total: counts.total } : null}
          onPlay={() => setReviewOpen(true)}
          onVideos={onPreview}
        />

        {intent === "sell" && (
          <div className="flex flex-col gap-[16px]">
            <ListingFields
              mode="brief"
              value={input}
              onChange={(p) => {
                if (p.network) reread(p.network);
                onChange(briefPatchOf(p));
              }}
              errors={shown}
              onLeave={(field) => setLeft((s) => (s.has(field) ? s : new Set(s).add(field)))}
              creatorPct={creatorPct}
              mintStatus={mintStatus}
              mintAddress={mintAddress}
              now={now}
              newBenefitId={() => randomId("ben_")}
              collectionField={collectionField}
            />
            <Check
              label="Share to Innovations"
              checked={state.shareToNewsfeed}
              onChange={(v) => onChange({ shareToNewsfeed: v })}
            />
            {state.shareToNewsfeed && <StoryPanel state={state} onChange={onChange} />}
          </div>
        )}

        {intent === "give" && (
          <div className="flex flex-col gap-[16px]">
            <SelectMenu
              label="Blockchain Mint"
              placeholder={BLOCKCHAIN_PLACEHOLDER}
              value={state.network}
              onChange={pickNetwork}
              options={NETWORK_OPTIONS}
            />
            {collectionField}
            <MintTypeField
              value={state.mintType}
              onChange={(mintType) => onChange({ mintType })}
              intent="give"
              network={state.network}
              current={mintStatus}
              address={mintAddress}
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
            {state.shareToNewsfeed && <StoryPanel state={state} onChange={onChange} />}
          </div>
        )}

        {intent === "save" && (
          <div className="flex flex-col gap-[16px]">
            <SelectMenu
              label="Blockchain Mint"
              placeholder={BLOCKCHAIN_PLACEHOLDER}
              value={state.network}
              onChange={pickNetwork}
              options={NETWORK_OPTIONS}
            />
            <div className="flex flex-col gap-[8px]">
              {collectionField}
              <p className="m-0 text-sm text-text-secondary">{SAVE_SIGNATURE_LINE}</p>
            </div>
            <div className="flex flex-col gap-[10px]">
              <OwnerAndShare state={state} onChange={onChange} />
            </div>
            {state.shareToNewsfeed && (
              <StoryPanel state={state} onChange={onChange} note={CLIP_NOTE} />
            )}
          </div>
        )}

        {/* Money shows for a Sell and a Give, never for a Save (v1's rule). */}
        {intent !== "save" && (
          <MintCostRows
            type={type}
            network={state.network}
            intent={intent}
            listing={intent === "sell" ? listingCostRow(input) : undefined}
          />
        )}
        <WalletFactLine type={type} network={state.network} />

        {intent === "sell" && (
          <section aria-label="Each sale" className="flex flex-col gap-2 rounded-lg border border-solid border-border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-2xs font-bold uppercase tracking-caps text-text-tertiary">Each sale</span>
              <TestnetDemoBadge />
            </div>
            {eachSaleRows(input, listingCtx).map((r, i) => (
              <p key={i} className="m-0 text-sm text-text-secondary">
                {r.label ? (
                  <>
                    <span>{r.label}</span> · <span className="font-medium tabular-nums text-text-primary">{r.value}</span>
                  </>
                ) : (
                  r.value
                )}
              </p>
            ))}
          </section>
        )}

        <button
          type="button"
          onClick={press}
          aria-disabled={!canGo || undefined}
          aria-describedby={missing ? reasonId : undefined}
          aria-busy={minting || undefined}
          // The app's primary button — the same shape and weight as every
          // other one, not a glowing pill of its own.
          className={[
            "inline-flex h-[44px] w-full items-center justify-center gap-[8px] rounded-lg border-0 px-[24px] text-md font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
            canGo
              ? "cursor-pointer bg-bg-brand text-text-on-brand"
              : "cursor-not-allowed bg-bg-subtle text-text-disabled",
          ].join(" ")}
        >
          {minting ? (
            <>
              <Spinner />
              Waiting for your wallet…
            </>
          ) : (
            <>
              {/* The wallet glyph stands for "pay" — only an instant mint does. */}
              {isLastStep && type === "instant" ? <WalletIcon /> : null}
              {cta}
            </>
          )}
        </button>

        {missing ? (
          <div id={reasonId} className={hintClass}>
            {missing}
            {isLastStep && gate.gated && missing === gate.readiness.blocker && counts.ready < counts.total ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onPreview}
                  className="inline-flex min-h-[24px] items-center border-0 bg-transparent p-0 text-sm font-semibold text-text-brand underline underline-offset-2"
                >
                  See the videos
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        {mintError && !minting ? (
          <p role="status" className={`m-0 ${hintClass} text-text-primary`}>
            {mintError}
          </p>
        ) : null}
      </div>

      <ReviewModal
        open={reviewOpen && !!headTake}
        take={headTake}
        productName={displayProductName(headline?.name ?? state.productName)}
        projectId={projectId}
        onRegenerate={() => {
          // Regenerating is the videos' step's job — that is where the forms live.
          setReviewOpen(false);
          onPreview();
        }}
        onClose={() => setReviewOpen(false)}
      />

      <style>{`
        .ix-s3-check input:focus-visible + span {
          border-color: var(--color-border-brand);
          box-shadow: 0 0 0 3px var(--color-bg-brand-subtle);
        }
      `}</style>
    </BriefCard>
  );
}

/**
 * What is being minted: the headline product's video poster (or its concept
 * image) over the project → product → one-liner the listing carries, and how
 * many of the products have their video. The poster is the way into the
 * video — a play glyph only appears when there is something to watch.
 */
function ProductCard({
  state,
  projectName,
  imageUrl,
  take,
  videos,
  onPlay,
  onVideos,
}: {
  state: BriefState;
  projectName: string;
  imageUrl?: string;
  take: { id: string } | null;
  videos: { ready: number; total: number } | null;
  onPlay: () => void;
  onVideos: () => void;
}) {
  const clip = useClipUrl(take?.id ?? null);
  const [broken, setBroken] = React.useState<string | null>(null);
  const poster = clip.state === "ready" ? clip.posterUrl : null;
  const wanted = poster ?? imageUrl ?? null;
  const src = wanted && wanted !== broken ? wanted : null;
  const thumbClass =
    "relative flex h-[54px] w-[72px] flex-none items-center justify-center overflow-hidden rounded-md bg-[image:var(--gradient-brand)] p-0";
  const inner = (
    <>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setBroken(src)} />
      ) : null}
      {take ? (
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
      {take ? (
        <button
          type="button"
          onClick={onPlay}
          aria-label="Play the product video"
          className={`${thumbClass} cursor-pointer border-0`}
        >
          {inner}
        </button>
      ) : (
        <div className={thumbClass}>{inner}</div>
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
        {videos ? (
          <button
            type="button"
            onClick={onVideos}
            className="mt-[4px] inline-flex min-h-[24px] items-center border-0 bg-transparent p-0 text-sm font-medium text-text-secondary underline underline-offset-2"
          >
            Videos · {videos.ready} of {videos.total} ready
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The two confirms a Give and a Save end on: who owns it, and where it goes. */
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
