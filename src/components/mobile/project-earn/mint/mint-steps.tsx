"use client";

// The mint's steps on the phone (Figma 13, 13b, 13d, 13e, 13f–13l, 08d), each
// the web step's words and rules (components/brief/step-*.tsx); mobile UX pass
// 2026-11-15: the same four steps as the web (Choose · Details · Review and
// sign · Done), never more, laid out as phone screens:
// · MintIntro — a segmented progress bar, "Step n of m · {step}", the step's
//   title with ⓘ (its line in a sheet);
// · MintChoose — Keep private · Give to the community · Sell;
// · MintDetails — Sell: the shared listing terms, the license, Share to Feed
//   and its story; Give: the chain, the collection, Minting type, the license,
//   the owner confirm and Share to Feed; Keep private: the chain, the
//   collection, the owner confirm and Share to Feed — the web's Share to
//   Innovations after every intent. A gift or a private mint lists nothing,
//   so its post is on your Timeline and joins the Feed once something of it is
//   for sale (SOC-6; the Feed shows only what is). Messages show once a field is left, at once for a typed amount,
//   all of them once Continue was pressed (13h). An instant mint the wallet
//   can't pay says so under Minting type (13g);
// · MintReview — a reject or a failure first (13l); then, while a video the
//   gate needs hasn't started, "Generate your videos" leads the screen (owner
//   2026-11-24: the videos are the step's most important job and sat last,
//   under facts shown louder; then "no coloured card, no box in a box"): a
//   plain section with how many have started, then
//   Product videos (a row per product) and Project video (the project's row),
//   each with Generate video opening its maker; the foot stays the next step's
//   name (Sign and list), off with its reason until every video has started
//   (the web's rule, owner 2026-11-24); videos still rendering in the same place; the ladder's missing steps as a
//   state card; then ONE closed row, Listing details (Mint details), whose line
//   is the gist ("car · Buy now 1 USDC · 100% of the project · nothing to pay
//   now") — inside: the products and every term in one list, the share-sale
//   note, ready or optional videos, and one card with the cost, the wallet's
//   line and Each sale (owner 2026-11-24: on a phone only what needs acting on
//   stays open; the maker set the rest in the steps before);
// · MintDone — Mint complete (13d) / Given to the community (08d): the
//   success head with its date, the ownership proof as a receipt (All details
//   closed), the listing or what others can do, the videos, then View on
//   marketplace and Open Earn as rows;
// · MintShare — Share to Feed from Done, after any intent (the web's success
//   step offers Share after all three; SOC-6: with nothing for sale the post is
//   on your Timeline until it is).
// CL-030: Review's videos line says what hasn't started ("Start every video
// first: …"), or that the listing waits ("… You don't have to wait. …"); Done
// reads "Minted · listing waits for videos" with the waiting block for each
// thing it signed; a share from Done while a video is still being made waits
// off the Feed too.

import * as React from "react";
import Link from "next/link";
import { AlertCircleIcon, ArrowDown01Icon, CheckmarkCircle01Icon, Coins01Icon, CircleIcon, Store01Icon, Tick02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { INTENTS } from "@/components/brief/step-choose";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Checkbox, Radio } from "@/components/ideeza/checkbox";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { Toggle } from "@/components/ideeza/toggle";
import type { ListingField } from "@/components/projects/listing/listing-fields";
import { dialogBlockerOf } from "@/components/projects/details/readiness-dialog";
import { useCommitCheck } from "@/components/projects/earn/ladder/level-check";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { MINT_STEPS, MINT_STEP_LABEL, briefStateOf, type MintState, type MintStepId } from "@/lib/brief/mint-flow";
import { LICENSES, NETWORKS, TOKENS_BY_NETWORK, type Intent, type License, type Network } from "@/lib/brief/types";
import { addCollection, readCollections, type WalletCollection } from "@/lib/brief/wallet";
import { LISTED_LINE, liveSubline, pendingCardLine, pendingSubline } from "@/lib/brief/success-copy";
import { royaltyText, SHARE_SALE_NOTE } from "@/lib/commerce/share-copy";
import type { Readiness } from "@/lib/manual/p2-types";
import { forSaleNowOf, phoneEarnHref, phoneMarketHref, phoneProductVideoHref, shareOffFeedLineOf } from "@/lib/manual/phone-earn";
import { phoneProjectPath } from "@/lib/manual/phone-project";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { formatDate } from "@/lib/manual/project-summary";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { videoCountOf, videosBlockerOf, videosNotStartedOf, videosStartBlockerOf } from "@/lib/manual/readiness";
import { hold, heldId } from "@/lib/market/held";
import { STORY_MAX, sharePostBlocker } from "@/lib/manual/share-post";
import { FEE_LABEL } from "@/lib/market/fee";
import { listingViewOf } from "@/lib/market/listing";
import { listingInputFromBrief, listingProblems, listingSummaryRows, type ListingCtx, type ListingInput } from "@/lib/market/listing-form";
import { useMarket } from "@/lib/market/market-store";
import { randomId } from "@/lib/market/sales";
import type { ListingMetadata } from "@/lib/market/types";
import { productVideoStatus } from "@/lib/video/product-video";
import { useProjectVideos } from "@/lib/video/store";
import { PROJECT_VIDEO_KEY } from "@/lib/video/types";
import { actionLabel, heldNoteOf, projectActionLabel, projectRowCopy, statusCopy } from "@/lib/video/video-copy";
import { mintCostRows, mintProofRows } from "@/lib/wallet/mint";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import { walletFactLineOf } from "@/lib/wallet/request-view";
import type { MintStatus, MintType } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { SheetSelect } from "../../kit/sheet-select";
import { Sheet } from "../../kit/sheet";
import { useToast } from "../../kit/toast";
import { ListCard } from "../../kit/list";
import { Eyebrow } from "../../kit/eyebrow";
import { useRouter } from "next/navigation";
import { useEarn } from "../context";
import { ListingFields, MintTypeCards } from "../listing-fields";
import { FactRows } from "../parts";
import { InfoButton, StepsCard, SummaryCard, useLiveReadiness } from "../sell/parts";
import { LIST_CARD, LIST_ROW, Chevron } from "../../kit/list";
import { PRESSED } from "../../kit/press";
import { T } from "../../type";
import { HeldCard, useHeldItems } from "../video/held";

export type MintGate = {
  /** Every current product's video state, and — when `gated` — whether the commit may go ahead. */
  readiness: Readiness;
  /** This commit runs the gate (Sell, Give). */
  gated: boolean;
};

/** A section heading inside the flow. */
const H3 = T.section;
const NOTE = T.meta;

// ─────────────────────────── the intro ───────────────────────────

const DETAILS_TITLE: Record<Intent, string> = { sell: "Set the listing terms", give: "Give to the community", save: "Keep it private" };
const DETAILS_LINE: Record<Intent, string> = {
  sell: "Set the listing's terms — it goes on Explore marketplace as a testnet demo once you sign.",
  give: "Anyone can use and build on this, for free. Minting keeps your name on it — and this cannot be undone.",
  save: "Only you can see this. Minting keeps your name on it — you can share or sell it later.",
};
const REVIEW_LINE: Record<Intent, string> = {
  sell: "Check what goes on the marketplace, then sign once in your wallet.",
  give: "Check what you're giving, then sign once in your wallet. A gift can't be taken back.",
  save: "Check what you're keeping, then sign once in your wallet — it's free.",
};

/** "Step 2 of 3 · Details · Review and sign · Done" — the steps the flow walks. */
export function stepLineOf(step: MintStepId, skipChoose: boolean): string {
  const steps = skipChoose ? MINT_STEPS.filter((s) => s !== "choose") : MINT_STEPS;
  return [`Step ${steps.indexOf(step) + 1} of ${steps.length}`, ...steps.map((s) => MINT_STEP_LABEL[s])].join(" · ");
}

export function MintIntro({ step, intent, skipChoose }: { step: MintStepId; intent: Intent | null; skipChoose: boolean }) {
  const i = intent ?? "sell";
  const steps = skipChoose ? MINT_STEPS.filter((s) => s !== "choose") : MINT_STEPS;
  const at = steps.indexOf(step);
  const [title, line] =
    step === "choose"
      ? ["Mint your project", "Minting records that you made it first. Choose how it goes out — you can still list a private project later."]
      : step === "details"
        ? [DETAILS_TITLE[i], DETAILS_LINE[i]]
        : ["Review and sign", REVIEW_LINE[i]];
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col gap-3">
        <div aria-hidden className="flex gap-2">
          {steps.map((s, n) => (
            <span key={s} className={cn("h-[4px] flex-1 rounded-full", n <= at ? "bg-bg-brand" : "bg-bg-subtle")} />
          ))}
        </div>
        <p className={T.meta} title={stepLineOf(step, skipChoose)}>{`Step ${at + 1} of ${steps.length} · ${MINT_STEP_LABEL[step]}`}</p>
      </div>
      <div className="flex min-h-[44px] items-center gap-2">
        <h2 className={cn(T.title, "min-w-0 break-words")}>{title}</h2>
        <InfoButton label={`About this step: ${title}`} title={title}>
          <p className={T.body}>{line}</p>
        </InfoButton>
      </div>
    </div>
  );
}

// ─────────────────────────── choose ───────────────────────────

export function MintChoose({ intent, onPick }: { intent: Intent | null; onPick: (i: Intent) => void }) {
  return (
    <div role="radiogroup" aria-label="How it goes out" className="flex flex-col gap-4">
      {INTENTS.map((it) => {
        const on = intent === it.id;
        return (
          <label
            key={it.id}
            className={cn(
              "relative flex cursor-pointer items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid p-6",
              on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface",
            )}
          >
            <input type="radio" name="m-mint-intent" className="sr-only" checked={on} onChange={() => onPick(it.id)} />
            <Radio checked={on} decorative className="mt-1" />
            <span className="flex flex-col gap-1">
              <span className={T.rowTitle}>{it.label}</span>
              <span className={NOTE}>{it.sub}</span>
              <span className={NOTE}>{it.requirement}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ─────────────────────────── details ───────────────────────────

const NETWORK_OPTIONS = NETWORKS.map((n) => ({ value: n.value, label: n.label }));
// Each licence's ⓘ line under its name (EARN-17, the web's step-details.tsx): the names alone don't
// tell a maker them apart. The pick-one sheet draws `helper` as the row's line.
const LICENSE_OPTIONS = LICENSES.map((l) => ({ value: l.value, label: l.label, helper: l.info }));
const NEW_COLLECTION = "__new__";
const SAVE_SIGNATURE_LINE = "Saved with a free signature — nothing is charged. You can mint it on chain when you list it.";
/** The web's note on a private mint's post while a video is missing (step-details.tsx). */
const SHOWCASE_NOTE = "It's shared once every product has a video — the mint doesn't wait for them, and you can make them after.";
/** Amount fields show a wrong typed value at once; the rest after they're left. */
const AT_ONCE: ReadonlySet<ListingField> = new Set<ListingField>(["price", "minBid", "auctionBuyNow"]);

function draftPatchOf(p: Partial<ListingInput>): Partial<MintState> {
  const out: Partial<MintState> = {};
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

export function MintDetails({
  state,
  onChange,
  now,
  creatorPct,
  mintStatus,
  mintAddress,
  shortfall,
  tried,
  videosReady = true,
}: {
  state: MintState;
  onChange: (patch: Partial<MintState>) => void;
  now: number;
  creatorPct: number;
  mintStatus: MintStatus;
  mintAddress?: string;
  /** Every product has a video (the gate's): a private mint's post says when it's shared otherwise. */
  videosReady?: boolean;
  /** An instant mint the wallet can't pay: why (13g). */
  shortfall: string | null;
  tried: boolean;
}) {
  const intent: Intent = state.intent ?? "sell";
  const [left, setLeft] = React.useState<ReadonlySet<ListingField>>(() => new Set());
  const [collections, setCollections] = React.useState<WalletCollection[]>(() => readCollections(state.network));
  const reread = (n: Network) => setCollections(readCollections(n));
  const ids = useFieldIds(["network", "license", "story"] as const);

  const input = listingInputFromBrief(briefStateOf(state));
  const problems = intent === "sell" ? listingProblems(input, { mode: "brief", now, creatorPct }) : null;
  const shown: Partial<Record<ListingField, string>> = {};
  for (const [key, message] of Object.entries(problems?.fields ?? {}) as [ListingField, string][]) {
    const typed = AT_ONCE.has(key) && String(input[key] ?? "").trim() !== "";
    if (tried || left.has(key) || typed) shown[key] = message;
  }
  const collectionMissing = tried && !state.collection ? "Choose a collection to mint into." : undefined;
  const licenseMissing = tried && intent !== "save" && !state.license ? (intent === "sell" ? "Choose the license it's sold under." : "Choose a license.") : undefined;

  const collectionField = (
    <CollectionField
      key={state.network}
      network={state.network}
      value={state.collection}
      collections={collections}
      error={collectionMissing}
      onPick={(name) => onChange({ collection: name })}
      onCreate={(name) => {
        reread(state.network);
        onChange({ collection: name });
      }}
    />
  );
  const blockchain = (
    <Field label="Blockchain" htmlFor={ids.network.id}>
      <SheetSelect
        id={ids.network.id}
        title="Blockchain"
        placeholder="Choose a blockchain"
        value={state.network}
        options={NETWORK_OPTIONS}
        onChange={(v) => {
          const n = v as Network;
          reread(n);
          onChange({ network: n, token: TOKENS_BY_NETWORK[n][0], collection: "" });
        }}
      />
    </Field>
  );
  const license = (
    <Field label="License" htmlFor={ids.license.id} error={licenseMissing} errorId={ids.license.errorId}>
      <SheetSelect
        id={ids.license.id}
        title="License"
        placeholder="Select a license"
        value={state.license ?? ""}
        options={LICENSE_OPTIONS}
        invalid={!!licenseMissing}
        onChange={(v) => onChange({ license: v as License })}
      />
    </Field>
  );
  // Share to Feed after every intent, as the web's Share to Innovations (SOC-6): a Sell is for sale,
  // so its post is on the Feed; a gift or a private mint lists nothing, so the toggle says where it goes.
  const share = (
    <ShareToggle checked={state.shareToNewsfeed} onChange={(v) => onChange({ shareToNewsfeed: v })} line={intent === "sell" ? null : shareOffFeedLineOf(intent === "give")} />
  );
  const story = state.shareToNewsfeed && (
    <StoryPanel
      id={ids.story.id}
      value={state.story}
      onChange={(story) => onChange({ story })}
      where={intent === "sell" ? "in Feed" : "on your Timeline"}
      // A private mint never waits for videos (the web's SHOWCASE_NOTE): it's shared once they're there.
      note={intent === "save" && !videosReady ? SHOWCASE_NOTE : undefined}
    />
  );
  const lowFunds = shortfall && <Banner tone="attention">{shortfall}</Banner>;

  if (intent === "sell") {
    return (
      <div className="flex flex-col gap-8">
        <ListingFields
          mode="brief"
          value={input}
          onChange={(p) => {
            if (p.network) reread(p.network);
            onChange(draftPatchOf(p));
          }}
          errors={shown}
          onLeave={(field) => setLeft((s) => (s.has(field) ? s : new Set(s).add(field)))}
          creatorPct={creatorPct}
          mintStatus={mintStatus}
          mintAddress={mintAddress}
          now={now}
          newBenefitId={() => randomId("ben_")}
          collectionField={collectionField}
          beforeConfirm={
            <>
              {lowFunds}
              {license}
            </>
          }
        />
        {share}
        {story}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      {blockchain}
      {collectionField}
      {intent === "save" && <p className={NOTE}>{SAVE_SIGNATURE_LINE}</p>}
      {intent === "give" && (
        <MintTypeCards intent="give" value={state.mintType} onChange={(mintType) => onChange({ mintType })} network={state.network} current={mintStatus} address={mintAddress} />
      )}
      {intent === "give" && lowFunds}
      {intent === "give" && license}
      <OwnerCheck checked={state.confirmOwnership} onChange={(v) => onChange({ confirmOwnership: v })} error={tried && !state.confirmOwnership ? "Confirm you are the rightful owner of this idea." : undefined} />
      {share}
      {story}
    </div>
  );
}

function OwnerCheck({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  const errId = React.useId();
  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex min-h-[44px] cursor-pointer items-center gap-6">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <Checkbox checked={checked} decorative />
        <span className={cn(T.body, "text-text-primary")}>I confirm I am the rightful owner of this idea</span>
      </label>
      {error && (
        <span id={errId} className={cn(T.meta, "text-text-error")}>
          {error}
        </span>
      )}
    </div>
  );
}

function ShareToggle({ checked, onChange, line }: { checked: boolean; onChange: (v: boolean) => void; line?: string | null }) {
  const id = React.useId();
  const lineId = React.useId();
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-1">
        <span id={id} className={cn(T.body, "text-text-primary")}>
          Share to Feed
        </span>
        {line && (
          <span id={lineId} className={NOTE}>
            {line}
          </span>
        )}
      </span>
      <Toggle checked={checked} onChange={() => onChange(!checked)} aria-label="Share to Feed" aria-describedby={line ? lineId : undefined} />
    </div>
  );
}

function StoryPanel({ id, value, onChange, note, where = "in Feed" }: { id: string; value: string; onChange: (v: string) => void; note?: string; where?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-bg-subtle p-6">
      <label htmlFor={id} className={T.label}>
        Write your story
      </label>
      <Textarea
        id={id}
        value={value}
        rows={3}
        maxLength={STORY_MAX}
        onValueChange={(v) => onChange(v.slice(0, STORY_MAX))}
        placeholder="Why did you build this? What should others do with it?"
      />
      <div className={cn(T.meta, "flex justify-between gap-6")}>
        <span>{`Shown with your post ${where}.`}</span>
        <span className="tabular-nums">
          {value.length}/{STORY_MAX}
        </span>
      </div>
      {note && <p className={NOTE}>{note}</p>}
    </div>
  );
}

/** Choose the collection this mints into, or name a new one without leaving the form. */
function CollectionField({
  network,
  value,
  collections,
  error,
  onPick,
  onCreate,
}: {
  network: Network;
  value: string;
  collections: WalletCollection[];
  error?: string;
  onPick: (name: string) => void;
  onCreate: (name: string) => void;
}) {
  const ids = useFieldIds(["pick", "name"] as const);
  const [naming, setNaming] = React.useState(false);
  const [name, setName] = React.useState("");
  const cancel = () => {
    setNaming(false);
    setName("");
  };
  const create = () => {
    const n = name.trim();
    if (!n) return;
    const made = addCollection(network, n);
    cancel();
    onCreate(made.name);
  };
  return (
    <div className="flex flex-col gap-4">
      <Field label="Choose collection" htmlFor={ids.pick.id} error={error} errorId={ids.pick.errorId}>
        <SheetSelect
          id={ids.pick.id}
          title="Choose collection"
          placeholder="Select collection"
          value={value}
          invalid={!!error}
          options={[...collections.map((c) => ({ value: c.name, label: c.name })), { value: NEW_COLLECTION, label: "+ New collection…" }]}
          onChange={(v) => {
            if (v === NEW_COLLECTION) return setNaming(true);
            cancel();
            onPick(v);
          }}
        />
        {!error && <span className={NOTE}>Choose a collection to mint into.</span>}
      </Field>
      {naming && (
        <div className="flex flex-col gap-4">
          <Field label="New collection name" htmlFor={ids.name.id}>
            <TextInput
              id={ids.name.id}
              size="xl"
              value={name}
              onValueChange={setName}
              autoFocus
              placeholder="Collection name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
            />
          </Field>
          <div className="flex gap-6">
            <Button hierarchy="secondary" size="xl" className="min-w-0 flex-1" onClick={cancel}>
              Cancel
            </Button>
            <Button size="xl" className="min-w-0 flex-1" disabled={!name.trim()} onClick={create}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── review ───────────────────────────

const SHARED_AS: Record<Intent, string> = { sell: "Listed for sale", give: "Given to the community", save: "Kept private" };
const VIDEOS_OPTIONAL = "Videos are optional when you keep it private.";
const VIDEOS_READY = "Every video is ready.";
const MINT_HANDLED = ["ownership", "videos"] as const;
const LIST_HANDLED = ["ownership", "videos", "license", "minted"] as const;
const COPY_NOTE = "Minting records that you made this first — it does not stop someone copying the design.";

function listingCostRow(input: ListingInput): { label: string; amount: string } | undefined {
  const token = input.token;
  if (!token) return undefined;
  if (input.type === "buyNow") return toMicros(input.price.trim()) ? { label: "Listing (Buy now)", amount: formatAmount(input.price, token) } : undefined;
  return toMicros(input.minBid.trim()) ? { label: "Listing (Auction)", amount: `from ${formatAmount(input.minBid, token)}` } : undefined;
}

function termsOf(s: MintState, intent: Intent, type: MintType, input: ListingInput): { label: string; value: string }[] {
  const rows = [
    { label: "Shared as", value: SHARED_AS[intent] },
    { label: "Blockchain", value: NETWORKS.find((n) => n.value === s.network)?.label ?? s.network },
    { label: "Collection", value: s.collection || "Not chosen" },
    { label: "Minting", value: type === "instant" ? "Instant — on chain now" : "Lazy — a free signature" },
  ];
  if (intent === "give" || intent === "sell") rows.push({ label: "License", value: LICENSES.find((l) => l.value === s.license)?.label ?? "Not chosen" });
  if (intent === "sell") {
    const cost = listingCostRow(input);
    rows.push({ label: input.type === "auction" ? "Auction" : "Buy now", value: cost?.amount ?? "No price yet" });
    if (input.percentSelling !== null) rows.push({ label: "Selling", value: `${input.percentSelling}% of the project` });
    if (input.royalties.trim()) rows.push({ label: "Royalties", value: royaltyText(input.royalties.trim()) });
  }
  return rows;
}

/** The terms a Sell's summary card shows large; the Terms list keeps the rest (and Shared as is its overline). */
const SUMMARY_TERMS = new Set(["Shared as", "Buy now", "Auction", "Selling", "Royalties"]);

export function MintReview({
  state,
  project,
  products,
  gate,
  type,
  now,
  creatorPct,
  mintError,
}: {
  state: MintState;
  project: ManualProject;
  products: ProjectProduct[];
  gate: MintGate;
  type: MintType;
  now: number;
  creatorPct: number;
  mintError: string | null;
}) {
  const intent: Intent = state.intent ?? "sell";
  const selling = intent === "sell";
  const input = listingInputFromBrief(briefStateOf(state));
  const ctx: ListingCtx = { mode: "brief", now, creatorPct };
  const ladder = useCommitCheck(
    selling ? "list" : "mint",
    { products: gate.readiness.products.map(() => ({ dropped: null })), sell: gate.readiness, commercial: "none", license: state.license },
    { handled: selling ? LIST_HANDLED : MINT_HANDLED },
  );
  const names = products.map((p) => displayProductName(p.name));
  const priced = (toMicros(input.price.trim()) ?? BigInt(0)) > BigInt(0);
  const eachSale = input.type === "buyNow" && !priced ? [{ label: FEE_LABEL, value: "taken from the price of each sale" }] : listingSummaryRows(input, ctx);
  const terms = termsOf(state, intent, type, input);
  const summary = selling ? terms.filter((r) => SUMMARY_TERMS.has(r.label) && r.label !== "Shared as") : [];
  const rest = terms.filter((r) => r.label !== "Shared as" && !(selling && SUMMARY_TERMS.has(r.label)));
  // Only what the maker has to act on stays open (owner 2026-11-24: "it's a mobile app — show the
  // needed content; this much confuses the user"): videos still to generate or still rendering, and
  // the ladder's missing steps. Everything they already set (what is minted, the terms, the cost,
  // each sale, ready videos) folds into one closed row whose line says the gist.
  const videoSpot = gate.gated && videosNotStartedOf(gate.readiness).length > 0 ? "first" : gate.gated && videosBlockerOf(gate.readiness) ? "next" : "last";
  const videos = <VideosBlock projectId={project.id} projectName={project.name} readiness={gate.readiness} gated={gate.gated} selling={selling} first={videoSpot === "first"} />;
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const detailsId = React.useId();
  const price = summary.find((r) => r.label === "Buy now" || r.label === "Auction");
  const share = summary.find((r) => r.label === "Selling");
  const gist = [
    project.name,
    ...(selling ? [price ? `${price.label} ${price.value}` : null, share ? share.value : null] : [SHARED_AS[intent]]),
    type === "instant" ? "you pay on chain now" : "nothing to pay now",
  ]
    .filter(Boolean)
    .join(" · ");
  const detailRows = [{ label: "Products", value: names.join(", ") || "None yet" }, ...summary, ...rest];

  return (
    <div className="flex flex-col gap-8">
      {mintError && <Banner tone="error">{mintError}</Banner>}
      {videoSpot !== "last" && videos}

      <StepsCard check={ladder} what={selling ? "mint and list" : "mint"} projectId={project.id} license={state.license} />

      <section aria-labelledby={detailsId} className="flex flex-col gap-6">
        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-controls={`${detailsId}-panel`}
          onClick={() => setDetailsOpen((o) => !o)}
          className="-my-3 flex min-h-[44px] w-full items-center gap-4 text-left outline-none focus-visible:underline"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span id={detailsId} className={T.rowTitle}>
              {selling ? "Listing details" : "Mint details"}
            </span>
            {!detailsOpen && <span className={cn(NOTE, "line-clamp-2 break-words")}>{gist}</span>}
          </span>
          <span aria-hidden className={cn("inline-flex shrink-0 text-[color:var(--color-icon-default)] transition-transform duration-fast motion-reduce:transition-none", detailsOpen && "rotate-180")}>
            <Icon icon={ArrowDown01Icon} size={20} />
          </span>
        </button>
        <div id={`${detailsId}-panel`} hidden={!detailsOpen} className={cn("flex-col gap-8", detailsOpen ? "flex" : "hidden")}>
          <FactRows rows={detailRows} label={selling ? "Listing details" : "Mint details"} />
          {selling && <p className={NOTE}>{SHARE_SALE_NOTE}</p>}
          {videoSpot === "last" && videos}
          <section aria-label="Cost" className={cn(LIST_CARD, "gap-6 p-8")}>
            {intent !== "save" && <CostCard type={type} network={state.network} intent={intent} listing={selling ? listingCostRow(input) : undefined} />}
            <WalletLine type={type} network={state.network} badge={intent === "save"} ruled={intent !== "save"} />
            {selling && (
              <div aria-label="Each sale" className="flex flex-col gap-2 border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border pt-6">
                <h3 className={H3}>Each sale</h3>
                {eachSale.map((r, i) => (
                  <p key={i} className={NOTE}>
                    {r.label ? `${r.label} · ${r.value}` : r.value}
                  </p>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

/** Product videos (and the project video) as the gate reads them; what's missing opens where it's made.
 *  `first`: some haven't started — the screen's lead card, with how many have. */
function VideosBlock({
  projectId,
  projectName,
  readiness,
  gated,
  selling,
  first = false,
}: {
  projectId: string;
  projectName: string;
  readiness: Readiness;
  gated: boolean;
  selling: boolean;
  first?: boolean;
}) {
  const router = useRouter();
  const headingId = React.useId();
  const blocker = videosBlockerOf(readiness);
  // Every video started first (CL-030); one still rendering or waiting for review doesn't stop the
  // signature — a Sell's listing waits for it.
  const startBlocker = gated ? videosStartBlockerOf(readiness) : null;
  const line = !gated
    ? VIDEOS_OPTIONAL
    : (startBlocker ?? (blocker ? (selling ? `${blocker} ${heldNoteOf("Explore marketplace", videoCountOf(readiness).total)}` : blocker) : VIDEOS_READY));
  const ok = gated && !blocker;
  const pv = readiness.project;
  const pvCopy = pv ? projectRowCopy(pv) : null;
  const pvAction = pvCopy ? projectActionLabel(pvCopy.action) : null;
  const pvNotStarted = !!pv && (pv.state === "make" || pv.state === "failed" || pv.state === "waiting" || pv.state === "outdated");
  const waiting = readiness.products.filter((p) => p.video.state !== "ready");
  const productRow = (p: Readiness["products"][number], lead: boolean) => {
    const copy = statusCopy(p.video);
    const notStarted = p.video.state === "none" || p.video.state === "failed";
    return (
      <VideoFixRow
        key={p.productId}
        title={displayProductName(p.name)}
        line={lead && p.video.state === "none" ? "No video yet" : copy.text}
        action={lead && notStarted ? GENERATE : actionLabel(copy.action)}
        onOpen={() => router.push(phoneProductVideoHref(projectId, p.productId))}
      />
    );
  };
  const openProjectVideo = () => router.push(phoneProjectPath(projectId, "video"));
  const rows = gated && blocker && (
    <ListCard label="Videos">
      {waiting.map((p) => productRow(p, false))}
      {pv && pvCopy && !pv.ok && <VideoFixRow title="Project video" line={pvCopy.text} action={pvAction} onOpen={openProjectVideo} />}
    </ListCard>
  );
  if (first) {
    const total = videoCountOf(readiness).total;
    const started = total - videosNotStartedOf(readiness).length;
    // Plain like the screen's other sections (owner 2026-11-24: no coloured card, no box in a box),
    // and it says which is which (owner: "which is a product video, which the project video? and
    // Start what? — the videos have to be generated"): Product videos, a row per product, and
    // Project video, the project's one row, each with Generate video. Its place at the top carries it;
    // the foot stays Sign and list, off until every video has started (the web's rule).
    return (
      <section aria-labelledby={headingId} className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h3 id={headingId} className={H3}>
            Generate your videos
          </h3>
          <span className={NOTE}>{`${started} of ${total} started`}</span>
        </div>
        <p className={NOTE}>
          {selling
            ? "Each product needs its own video, and the project one video of them all. Generate every one before you sign: they keep rendering after, and the listing goes live once all are ready."
            : "Each product needs its own video, and the project one video of them all. Generate every one before you sign: they keep rendering after."}
        </p>
        {waiting.length > 0 && (
          <div className="flex flex-col gap-3">
            <Eyebrow tone="tertiary">{waiting.length === 1 && readiness.products.length === 1 ? "Product video" : "Product videos"}</Eyebrow>
            <ListCard label="Product videos">{waiting.map((p) => productRow(p, true))}</ListCard>
          </div>
        )}
        {pv && pvCopy && !pv.ok && (
          <div className="flex flex-col gap-3">
            <Eyebrow tone="tertiary">Project video</Eyebrow>
            <ListCard label="Project video">
              <VideoFixRow
                title={projectName}
                line={pv.state === "make" ? "All its products in one video · not made yet" : pvCopy.text}
                action={pvNotStarted ? GENERATE : pvAction}
                onOpen={openProjectVideo}
              />
            </ListCard>
          </div>
        )}
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className={H3}>Product videos</h3>
        <span className={NOTE}>{`${readiness.counts.ready} of ${readiness.counts.total} ready`}</span>
      </div>
      <p className={cn(T.body, "flex items-start gap-4 text-text-primary")}>
        {ok && (
          <span aria-hidden className="text-text-success">
            <Icon icon={CheckmarkCircle01Icon} size={20} />
          </span>
        )}
        {line}
      </p>
      {rows}
    </section>
  );
}

/** What a video not started yet offers in the lead list: it is generated (owner 2026-11-24). */
const GENERATE = "Generate video";

/** A missing video as a row: what, its state, and its action as the row's value; the row opens its maker. */
function VideoFixRow({ title, line, action, onOpen }: { title: string; line: string; action: string | null; onOpen: () => void }) {
  if (!action)
    return (
      <li className={cn(LIST_ROW, "hover:bg-transparent")}>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={T.rowTitle}>{title}</span>
          <span className={NOTE}>{line}</span>
        </span>
      </li>
    );
  return (
    <li>
      <button type="button" onClick={onOpen} className={cn(LIST_ROW, PRESSED)} aria-label={`${title}: ${line}. ${action}`}>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={T.rowTitle}>{title}</span>
          <span className={NOTE}>{line}</span>
        </span>
        <span className={cn(T.rowTitle, "shrink-0 text-text-brand")}>{action}</span>
        <Chevron />
      </button>
    </li>
  );
}

const GIVE_LAZY_NOTE = "The first time someone takes it, their claim pays the network fee.";
const ESTIMATE_NOTE =
  "Estimate at fixed reference rates — live network pricing isn't wired yet. IDZ is IDEEZA's token, paid from your wallet; it is separate from the credits a build uses.";

/** The web's Cost box (MintCostRows) on the phone. */
export function CostCard({ type, network, intent, listing }: { type: MintType; network: Network; intent: Intent; listing?: { label: string; amount: string } }) {
  const rows = mintCostRows(type, network, intent === "sell" ? listing : undefined);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className={H3}>Cost</h3>
        <TestnetDemoBadge />
      </div>
      {rows.map((r, i) =>
        !r.label && r.note ? (
          <p key={`n${i}`} className={NOTE}>
            {intent === "give" && type === "lazy" ? GIVE_LAZY_NOTE : r.note}
          </p>
        ) : (
          <div
            key={`${r.label}-${i}`}
            className={cn(
              "flex flex-wrap justify-between gap-x-6",
              r.bold ? cn(T.name, "border-t-[length:var(--border-width-1)] border-solid border-border-strong pt-3") : T.body,
            )}
          >
            <span>{r.label}</span>
            <span className="tabular-nums">
              {r.value}
              {r.note && <span className="text-text-tertiary"> {r.note}</span>}
            </span>
          </div>
        ),
      )}
      {type === "instant" && <p className={NOTE}>{ESTIMATE_NOTE}</p>}
    </div>
  );
}

/** The web's wallet line (WalletFactLine): who signs, and whether it can pay — inside the Cost card. */
export function WalletLine({ type, network, badge, ruled }: { type: MintType; network: Network; badge: boolean; ruled: boolean }) {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const clock = useMinuteClock();
  const fact = walletFactLineOf(wallet, { type, network }, { market, now: clock });
  const warn = fact.tone === "warning";
  return (
    <div className={cn("flex flex-col gap-2", ruled && "border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border pt-6")}>
      <p className={cn(T.rowTitle, "flex items-start gap-3", warn && "text-text-warning")}>
        <span aria-hidden className={cn("mt-[2px] shrink-0", warn ? "text-[color:var(--color-icon-warning)]" : "text-[color:var(--color-icon-secondary)]")}>
          <Icon icon={warn ? AlertCircleIcon : Wallet01Icon} size={16} />
        </span>
        {fact.heading}
      </p>
      {wallet && <p className={NOTE}>{fact.line}</p>}
      <p className={NOTE}>{COPY_NOTE}</p>
      {badge && (
        <span>
          <TestnetDemoBadge />
        </span>
      )}
    </div>
  );
}

// ─────────────────────────── done ───────────────────────────

const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };
const DONE_BADGE: Record<Intent, string | null> = { sell: "Listed on the marketplace", give: null, save: "Saved" };

export function MintDone({
  state,
  project,
  products,
  warning,
}: {
  state: MintState;
  project: ManualProject;
  products: ProjectProduct[];
  warning: string | null;
}) {
  const { jobs, now } = useVideoJobs();
  const { record: videos } = useProjectVideos(project.id);
  const { data: market } = useMarket();
  const clock = useMinuteClock();
  const intent: Intent = state.intent ?? "sell";
  const rows = products.map((p) => productVideoStatus(videos?.products[p.id], jobs, now));
  const rendering = rows.filter((r) => r.state === "rendering").length;
  const ready = rows.filter((r) => r.state === "ready").length;
  // A project video only with two or more products (owner, 2026-11-17).
  const own = products.length >= 2 ? productVideoStatus(videos?.products[PROJECT_VIDEO_KEY], jobs, now) : { state: "none" as const };
  const live = rendering === 0;
  const listing = intent === "sell" ? listingViewOf(project.id, { ...market, now: clock, current: NO_METADATA }) : null;
  const listed = listing && listing.kind !== "none" ? listing.listing : null;
  const onMarket = listing?.kind === "live" || listing?.kind === "paused";
  // A Sell signed while its videos still render or wait for review (CL-030): minted, and the listing
  // waits off the marketplace — never "Listed" until it is.
  const waiting = useHeldItems(project.id);
  const toast = useToast();
  const waitingSale = intent === "sell" && waiting.some((i) => i.kind === "main");
  const badge = live && !waitingSale ? DONE_BADGE[intent] : null;
  const title = waitingSale ? "Minted · listing waits for videos" : intent === "give" ? "Given to the community" : "Mint complete";
  const subline = waitingSale
    ? "It goes on Explore marketplace by itself when every video is ready — we'll tell you."
    : live
      ? intent === "sell"
        ? LISTED_LINE
        : liveSubline(intent, ready > 0 || own.state === "ready")
      : pendingSubline();
  const licenseLabel = LICENSES.find((l) => l.value === state.license)?.label;

  const proof = project.mint ? mintProofRows(project.mint, { owner: true }, intent) : [];
  const valueOf = (r: (typeof proof)[number]) => r.value.map((v) => (v.kind === "text" ? v.text : v.time.text)).join(" · ");
  const mintRow = proof.find((r) => r.key === "mint") ?? null;
  const allVideos = ready === products.length && products.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {warning && <Banner tone="attention">{warning}</Banner>}
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <span aria-hidden className="inline-flex size-[56px] items-center justify-center rounded-full bg-bg-success-subtle text-text-success">
          <Icon icon={Tick02Icon} size={28} />
        </span>
        <h2 className={T.title}>{title}</h2>
        {badge && <Badge tone="success">{badge}</Badge>}
        <p className={NOTE}>{subline}</p>
        {state.mintedAt && <p className={T.meta}>{`Done · ${formatDate(state.mintedAt)}`}</p>}
      </div>

      {project.mint && mintRow && (
        <SummaryCard
          label="Ownership proof"
          overline="Ownership proof"
          chip={<TestnetDemoBadge />}
          headline={valueOf(mintRow)}
          amount={false}
          sub={mintRow.note}
          facts={proof.filter((r) => r.key === "token").map((r) => ({ label: r.label, value: valueOf(r) }))}
          details={proof.map((r) => ({ label: r.label, value: valueOf(r) }))}
        />
      )}

      {listed && (
        <SummaryCard
          label="Listing"
          overline={listed.type === "auction" ? "Auction" : "Buy now"}
          headline={listed.type === "auction" ? formatAmount(listed.minBid ?? "0", listed.token) : formatAmount(listed.price ?? "0", listed.token)}
          sub={listed.type === "auction" ? "Minimum bid" : "Price"}
          facts={[
            { label: "Selling", value: `${listed.percentSelling}%` },
            { label: "Royalties", value: `${listed.royaltiesPct}%` },
          ]}
          note="Change the price or remove the listing in Earn › Sell."
        />
      )}

      {intent === "give" && (
        <section className="flex flex-col gap-4">
          <h3 className={H3}>What others can do</h3>
          <FactRows
            label="What others can do"
            rows={[
              { label: "License", value: licenseLabel ?? "Free for anyone to use and build on" },
              { label: "Price", value: "Free" },
              { label: "Ownership", value: "Stays yours — your name is on it" },
              { label: "Selling", value: "Off · a gift can't be sold" },
            ]}
          />
        </section>
      )}

      {waiting.length > 0 && (
        <section aria-label="Waiting for videos" className="flex flex-col gap-4">
          {waiting.map((item) => (
            <HeldCard key={item.id} item={item} projectId={project.id} products={products} actions="inline" onCancelled={(title) => toast({ title })} />
          ))}
        </section>
      )}

      {!live && waiting.length === 0 && <Banner tone="info">{pendingCardLine(rendering)}</Banner>}

      <ul aria-label="Next" className={cn(LIST_CARD, "[&>*+*]:border-t-[length:var(--border-width-1)] [&>*+*]:border-solid [&>*+*]:border-border")}>
        <li className={cn(LIST_ROW, "hover:bg-transparent")}>
          <span aria-hidden className={allVideos ? "text-text-success" : "text-[color:var(--color-icon-secondary)]"}>
            <Icon icon={allVideos ? CheckmarkCircle01Icon : CircleIcon} size={24} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={cn(T.body, "text-text-primary")}>Videos</span>
            <span className={NOTE}>{allVideos ? VIDEOS_READY : `${ready} of ${products.length} product videos ready.`}</span>
          </span>
        </li>
        {onMarket && <DoneRow href={phoneMarketHref(project.id)} icon={Store01Icon} title="View on marketplace" />}
        <DoneRow href={phoneEarnHref(project.id)} icon={Coins01Icon} title="Open Earn" />
      </ul>
    </div>
  );
}

function DoneRow({ href, icon, title }: { href: string; icon: typeof Store01Icon; title: string }) {
  return (
    <li>
      <Link href={href} className={cn(LIST_ROW, PRESSED)}>
        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
          <Icon icon={icon} size={24} />
        </span>
        <span className={cn(T.body, "min-w-0 flex-1 text-text-primary")}>{title}</span>
        <Chevron />
      </Link>
    </li>
  );
}

// ─────────────────────────── Share to Feed (from Done) ───────────────────────────

export function MintShare() {
  const { project: given, view, brief } = useEarn();
  const { projects, setShowcase } = useManualProjects();
  const project = projects.find((p) => p.id === given.id) ?? given;
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const readiness = useLiveReadiness("showcase");
  const [story, setStory] = React.useState(() => project.post?.story ?? brief?.state.story ?? "");
  const storyId = React.useId();
  const waitingShare = useHeldItems(project.id).some((i) => i.kind === "share");
  // Nothing of it for sale (a gift, a private mint, a listing still waiting for videos): the post is
  // on your Timeline, and joins the Feed once something of it is for sale (SOC-6).
  const onFeed = forSaleNowOf(view);
  // One product has no project video (CL-025): the post shows that product's video.
  const only = readiness.products.length === 1 ? readiness.products[0] : null;
  const shows = only
    ? `Your post shows ${displayProductName(only.name)}'s video, with your story.`
    : "Your post shows the project video and each product's video, with your story.";
  // Already waiting for its videos: Done's waiting block shows it.
  if (waitingShare) return null;
  if (project.showcasedAt) {
    return (
      <Link href={onFeed ? "/m" : "/m/profile"} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "min-w-0 flex-1")}>
        {onFeed ? "View in Feed" : "View on Timeline"}
      </Link>
    );
  }
  const blocker = dialogBlockerOf(readiness) ?? sharePostBlocker({ story });
  const share = () => {
    if (blocker) return;
    // A video still being made (CL-030): the post waits off the Feed, then goes live by itself.
    if (videosBlockerOf(readiness)) {
      hold({ id: heldId(), projectId: project.id, kind: "share", at: Date.now(), story: story.trim() });
      toast({ title: onFeed ? "Your post goes on Feed when every video is ready." : "Your post goes on your Timeline when every video is ready." });
    } else {
      setShowcase(project.id, true, undefined, { story: story.trim() });
      toast({ title: onFeed ? "Shared to Feed" : "Shared to your Timeline" });
    }
    setOpen(false);
  };
  return (
    <>
      <Button hierarchy="secondary" size="xl" className="min-w-0 flex-1" onClick={() => setOpen(true)}>
        Share to Feed
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Share to Feed"
        description={shows}
        actions={
          <>
            <Button size="xl" className="w-full" disabled={!!blocker} onClick={share}>
              Share
            </Button>
            {blocker && <p className={NOTE}>{blocker}</p>}
          </>
        }
      >
        {!onFeed && <p className={NOTE}>{shareOffFeedLineOf(view.commerce.outcome === "given")}</p>}
        <p className={NOTE}>{`${readiness.counts.ready} of ${readiness.counts.total} product videos ready`}</p>
        <Field label="The post" htmlFor={storyId}>
          <Textarea id={storyId} rows={4} value={story} maxLength={STORY_MAX} onValueChange={(v) => setStory(v.slice(0, STORY_MAX))} placeholder="Why did you build this? What should others do with it?" />
          <span className={cn(NOTE, "text-right tabular-nums")}>
            {story.length}/{STORY_MAX}
          </span>
        </Field>
      </Sheet>
    </>
  );
}
