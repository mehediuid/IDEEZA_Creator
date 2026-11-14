"use client";

// The mint's steps on the phone (Figma 13, 13b, 13d, 13e, 13f–13l, 08d), each
// the web step's words and rules (components/brief/step-*.tsx):
// · MintIntro — the step's title and line, "Step n of m · Details · Review and
//   sign · Done";
// · MintChoose — Keep private · Give to the community · Sell;
// · MintDetails — Sell: the shared listing terms, the license, Share to Feed
//   and its story; Give: the chain, the collection, Minting type, the license
//   and the two confirms; Keep private: the chain, the collection and the
//   confirms. Only Sell offers Share to Feed: the Feed shows only what is for
//   sale (owner 2026-11-12), and a gift or a private mint lists nothing. Messages show once a field is left, at once for a typed amount,
//   all of them once Continue was pressed (13h). An instant mint the wallet
//   can't pay says so under Minting type (13g);
// · MintReview — What is minted, Product videos (the gate's), Shared as, the
//   cost, the wallet's line, Each sale, and the ladder's missing steps; a
//   reject or a failure leads the screen (13l);
// · MintDone — Mint complete (13d) / Given to the community (08d): the
//   ownership proof, the listing or what others can do, the videos;
// · MintShare — Share to Feed from Done, after a Sell (the flow mounts it then).

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle01Icon, CircleIcon, Tick02Icon } from "@hugeicons/core-free-icons";
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
import { phoneEarnHref, phoneMarketHref, phoneProductVideoHref } from "@/lib/manual/phone-earn";
import { phoneProjectPath } from "@/lib/manual/phone-project";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { formatDate } from "@/lib/manual/project-summary";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { videosBlockerOf } from "@/lib/manual/readiness";
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
import { actionLabel, projectActionLabel, projectRowCopy, statusCopy } from "@/lib/video/video-copy";
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
import { useEarn } from "../context";
import { ListingFields, MintTypeCards } from "../listing-fields";
import { FactRows, LevelCheck } from "../parts";
import { useLiveReadiness } from "../sell/parts";
import { T } from "../../type";

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
  const [title, line] =
    step === "choose"
      ? ["Mint your project", "Minting records that you made it first. Choose how it goes out — you can still list a private project later."]
      : step === "details"
        ? [DETAILS_TITLE[i], DETAILS_LINE[i]]
        : ["Review and sign", REVIEW_LINE[i]];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className={T.section}>{title}</h2>
        <p className={T.body}>{line}</p>
      </div>
      <p className={T.meta}>{stepLineOf(step, skipChoose)}</p>
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
const LICENSE_OPTIONS = LICENSES.map((l) => ({ value: l.value, label: l.label }));
const NEW_COLLECTION = "__new__";
const SAVE_SIGNATURE_LINE = "Saved with a free signature — nothing is charged. You can mint it on chain when you list it.";
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
}: {
  state: MintState;
  onChange: (patch: Partial<MintState>) => void;
  now: number;
  creatorPct: number;
  mintStatus: MintStatus;
  mintAddress?: string;
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
  const share = <ShareToggle checked={state.shareToNewsfeed} onChange={(v) => onChange({ shareToNewsfeed: v })} />;
  const story = state.shareToNewsfeed && (
    <StoryPanel id={ids.story.id} value={state.story} onChange={(story) => onChange({ story })} />
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
        />
        {lowFunds}
        {license}
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

function ShareToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const id = React.useId();
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-4">
      <span id={id} className={cn(T.body, "text-text-primary")}>
        Share to Feed
      </span>
      <Toggle checked={checked} onChange={() => onChange(!checked)} aria-label="Share to Feed" />
    </div>
  );
}

function StoryPanel({ id, value, onChange, note }: { id: string; value: string; onChange: (v: string) => void; note?: string }) {
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
        <span>Shown with your post in Feed.</span>
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
  const detail = `${names.length} ${names.length === 1 ? "product" : "products"}${names.length ? ` · ${names.join(", ")}` : ""}`;
  const priced = (toMicros(input.price.trim()) ?? BigInt(0)) > BigInt(0);
  const eachSale = input.type === "buyNow" && !priced ? [{ label: FEE_LABEL, value: "taken from the price of each sale" }] : listingSummaryRows(input, ctx);

  return (
    <div className="flex flex-col gap-8">
      {mintError && <Banner tone="error">{mintError}</Banner>}

      <section className="flex flex-col gap-4">
        <h3 className={H3}>What is minted</h3>
        <div className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-8">
          <p className={T.name}>{project.name}</p>
          <p className={cn(T.meta, "line-clamp-3")}>{project.description.trim() || "No description yet."}</p>
          <p className={NOTE}>{detail}</p>
        </div>
      </section>

      <VideosBlock projectId={project.id} readiness={gate.readiness} gated={gate.gated} />

      <section className="flex flex-col gap-4">
        <h3 className={H3}>Terms</h3>
        <FactRows rows={termsOf(state, intent, type, input)} label="Terms" />
        {selling && <p className={NOTE}>{SHARE_SALE_NOTE}</p>}
      </section>

      {intent !== "save" && <CostCard type={type} network={state.network} intent={intent} listing={selling ? listingCostRow(input) : undefined} />}
      <WalletLine type={type} network={state.network} badge={intent === "save"} />

      {selling && (
        <section aria-label="Each sale" className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-8">
          <h3 className={H3}>Each sale</h3>
          {eachSale.map((r, i) => (
            <p key={i} className={NOTE}>
              {r.label ? `${r.label} · ${r.value}` : r.value}
            </p>
          ))}
        </section>
      )}

      <LevelCheck check={ladder} what={selling ? "mint and list" : "mint"} projectId={project.id} license={state.license} />
    </div>
  );
}

/** Product videos (and the project video) as the gate reads them; what's missing opens where it's made. */
function VideosBlock({ projectId, readiness, gated }: { projectId: string; readiness: Readiness; gated: boolean }) {
  const blocker = videosBlockerOf(readiness);
  const line = !gated ? VIDEOS_OPTIONAL : (blocker ?? VIDEOS_READY);
  const ok = gated && !blocker;
  const pv = readiness.project;
  const pvCopy = pv ? projectRowCopy(pv) : null;
  const pvAction = pvCopy ? projectActionLabel(pvCopy.action) : null;
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
      {gated && blocker && (
        <ListCard label="Videos">
          {readiness.products
            .filter((p) => p.video.state !== "ready")
            .map((p) => {
              const copy = statusCopy(p.video);
              const label = actionLabel(copy.action);
              return (
                <li key={p.productId} className="flex flex-col gap-3 p-6">
                  <span className={T.rowTitle}>{displayProductName(p.name)}</span>
                  <span className={NOTE}>{copy.text}</span>
                  {label && (
                    <Link href={phoneProductVideoHref(projectId, p.productId)} className={cn(T.rowTitle, "self-start hover:underline text-text-brand")}>
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          {pv && pvCopy && !pv.ok && (
            <li className="flex flex-col gap-3 p-6">
              <span className={T.rowTitle}>Project video</span>
              <span className={NOTE}>{pvCopy.text}</span>
              {pvAction && (
                <Link href={phoneProjectPath(projectId, "video")} className={cn(T.rowTitle, "self-start hover:underline text-text-brand")}>
                  {pvAction}
                </Link>
              )}
            </li>
          )}
        </ListCard>
      )}
    </section>
  );
}

const GIVE_LAZY_NOTE = "The first time someone takes it, their claim pays the network fee.";
const ESTIMATE_NOTE =
  "Estimate at fixed reference rates — live network pricing isn't wired yet. IDZ is IDEEZA's token, paid from your wallet; it is separate from the credits a build uses.";

/** The web's Cost box (MintCostRows) on the phone. */
function CostCard({ type, network, intent, listing }: { type: MintType; network: Network; intent: Intent; listing?: { label: string; amount: string } }) {
  const rows = mintCostRows(type, network, intent === "sell" ? listing : undefined);
  return (
    <section aria-label="Cost" className="flex flex-col gap-3 rounded-xl bg-bg-surface-raised p-8">
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
    </section>
  );
}

/** The web's wallet line (WalletFactLine): who signs, and whether it can pay. */
function WalletLine({ type, network, badge }: { type: MintType; network: Network; badge: boolean }) {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const clock = useMinuteClock();
  const fact = walletFactLineOf(wallet, { type, network }, { market, now: clock });
  return (
    <Banner tone={fact.tone === "warning" ? "attention" : "info"} title={fact.heading}>
      <span className="flex flex-col gap-2">
        {wallet && <span>{fact.line}</span>}
        <span>{COPY_NOTE}</span>
        {badge && (
          <span>
            <TestnetDemoBadge />
          </span>
        )}
      </span>
    </Banner>
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
  const own = productVideoStatus(videos?.products[PROJECT_VIDEO_KEY], jobs, now);
  const live = rendering === 0;
  const listing = intent === "sell" ? listingViewOf(project.id, { ...market, now: clock, current: NO_METADATA }) : null;
  const listed = listing && listing.kind !== "none" ? listing.listing : null;
  const onMarket = listing?.kind === "live" || listing?.kind === "paused";
  const badge = live ? DONE_BADGE[intent] : null;
  const title = intent === "give" ? "Given to the community" : "Mint complete";
  const subline = live ? (intent === "sell" ? LISTED_LINE : liveSubline(intent, ready > 0 || own.state === "ready")) : pendingSubline();
  const licenseLabel = LICENSES.find((l) => l.value === state.license)?.label;

  return (
    <div className="flex flex-col gap-8">
      {warning && <Banner tone="attention">{warning}</Banner>}
      <div className="flex flex-col items-center gap-4 pt-4 text-center">
        <span aria-hidden className="inline-flex size-[56px] items-center justify-center rounded-full bg-bg-success-subtle text-text-success">
          <Icon icon={Tick02Icon} size={28} />
        </span>
        <h2 className={T.section}>{title}</h2>
        {badge && <Badge tone="success">{badge}</Badge>}
        <p className={NOTE}>{subline}</p>
      </div>
      {state.mintedAt && <p className={T.meta}>{`Done · ${formatDate(state.mintedAt)}`}</p>}

      {project.mint && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h3 className={H3}>Ownership proof</h3>
            <TestnetDemoBadge />
          </div>
          <FactRows
            label="Ownership proof"
            rows={mintProofRows(project.mint, { owner: true }, intent).map((r) => ({
              label: r.label,
              value: r.value.map((v) => (v.kind === "text" ? v.text : v.time.text)).join(" · "),
            }))}
          />
        </section>
      )}

      {listed && (
        <section className="flex flex-col gap-4">
          <h3 className={H3}>Listing</h3>
          <FactRows
            label="Listing"
            rows={[
              { label: "Listing type", value: listed.type === "auction" ? "Auction" : "Buy now" },
              listed.type === "auction"
                ? { label: "Minimum bid", value: formatAmount(listed.minBid ?? "0", listed.token) }
                : { label: "Price", value: formatAmount(listed.price ?? "0", listed.token) },
              { label: "Selling", value: `${listed.percentSelling}%` },
              { label: "Royalties", value: `${listed.royaltiesPct}%` },
            ]}
          />
          <p className={NOTE}>Change the price or remove the listing in Earn › Sell.</p>
          {onMarket && (
            <Link href={phoneMarketHref(project.id)} className={cn(T.rowTitle, "self-start hover:underline text-text-brand")}>
              View on marketplace
            </Link>
          )}
        </section>
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

      {!live && <Banner tone="info">{pendingCardLine(rendering)}</Banner>}

      <section className="flex flex-col gap-4">
        <h3 className={H3}>Videos</h3>
        <p className={cn(T.body, "flex items-start gap-4 text-text-primary")}>
          <span aria-hidden className={ready === products.length && products.length > 0 ? "text-text-success" : "text-[color:var(--color-icon-secondary)]"}>
            <Icon icon={ready === products.length && products.length > 0 ? CheckmarkCircle01Icon : CircleIcon} size={20} />
          </span>
          {ready === products.length && products.length > 0 ? VIDEOS_READY : `${ready} of ${products.length} product videos ready.`}
        </p>
      </section>
      <Link href={phoneEarnHref(project.id)} className={cn(T.rowTitle, "self-start hover:underline text-text-brand")}>
        Open Earn
      </Link>
    </div>
  );
}

// ─────────────────────────── Share to Feed (from Done) ───────────────────────────

export function MintShare() {
  const { project: given, brief } = useEarn();
  const { projects, setShowcase } = useManualProjects();
  const project = projects.find((p) => p.id === given.id) ?? given;
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const readiness = useLiveReadiness("showcase");
  const [story, setStory] = React.useState(() => project.post?.story ?? brief?.state.story ?? "");
  const storyId = React.useId();
  if (project.showcasedAt) {
    return (
      <Link href="/m" className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "min-w-0 flex-1")}>
        View in Feed
      </Link>
    );
  }
  const blocker = dialogBlockerOf(readiness) ?? sharePostBlocker({ story });
  const share = () => {
    if (blocker) return;
    setShowcase(project.id, true, undefined, { story: story.trim() });
    toast({ title: "Shared to Feed" });
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
        description="Your post shows the project video and each product's video, with your story."
        actions={
          <>
            <Button size="xl" className="w-full" disabled={!!blocker} onClick={share}>
              Share
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {blocker && <p className={NOTE}>{blocker}</p>}
          </>
        }
      >
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
