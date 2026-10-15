"use client";

// Details — the terms, one form per choice (P2-MINT-6), as the Brief's form
// step asked for them:
// - Sell IS the marketplace listing form (P2-LISTING-22): the ONE shared
//   `ListingFields` in its Brief mode — chain, collection, listing type,
//   minting type, price, % selling, royalties, benefits and the ownership
//   box — then the license buyers get it under (a listing needs one, the
//   ladder's L3) and Share to Innovations.
// - Give: chain, collection, minting type, license, the two confirms.
// - Keep private: chain and collection — always a free lazy signature (MINT
//   §5 Q1), so no minting type — and the two confirms.
// Continue shuts on `detailsMissing`: the form's own reasons and the gate's
// form rules (the ownership confirm, a Give's license), and a Sell's license.
// The videos, the cost and the signature are the review's.

import * as React from "react";
import { Checkbox, SelectMenu, type SelectOption } from "@/components/ideeza";
import { ListingFields, type ListingField } from "@/components/projects/listing/listing-fields";
import { MintTypeField } from "@/components/wallet/mint-type-field";
import { addCollection, readCollections, type WalletCollection } from "@/lib/brief/wallet";
import { briefStateOf, type MintState } from "@/lib/brief/mint-flow";
import { LICENSES, NETWORKS, TOKENS_BY_NETWORK, type Intent, type License, type Network } from "@/lib/brief/types";
import { listingInputFromBrief, listingProblems, type ListingCtx, type ListingInput } from "@/lib/market/listing-form";
import { randomId } from "@/lib/market/sales";
import type { MintStatus } from "@/lib/wallet/types";
import { BriefCard, FIELD_BASE, TAP, primaryCta } from "./brief-card";

const HEADING: Record<Intent, string> = {
  sell: "Set the listing terms",
  give: "Give to the community",
  save: "Keep it private",
};

// What the choice really means — a give cannot be taken back, a private
// save can still be shared later.
const SUB_BY_INTENT: Record<Intent, string> = {
  sell: "Set the listing's terms — it goes on Explore marketplace as a testnet demo once you sign.",
  give: "Anyone can use and build on this, for free. Minting keeps your name on it — and this cannot be undone.",
  save: "Only you can see this. Minting keeps your name on it — you can share or sell it later.",
};

const MAX_STORY = 500;
/** The collection row that creates one instead of choosing one. */
const NEW_COLLECTION = "__new__";
/** The chain picker's placeholder — one string, all three forms. */
const BLOCKCHAIN_PLACEHOLDER = "Choose your prefer blockchain";
/** Keep private's one line under Choose collection (P2-MINT-6). */
const SAVE_SIGNATURE_LINE =
  "Saved with a free signature — nothing is charged. You can mint it on chain when you list it.";
/** Under the story of a private mint posted to Innovations: the post needs its videos. */
const SHOWCASE_NOTE =
  "It's shared once every product has a video — the mint doesn't wait for them, and you can make them after.";
/** Amount fields show a wrong typed value at once; the rest after they're left (P2-LISTING-5). */
const AT_ONCE: ReadonlySet<ListingField> = new Set<ListingField>(["price", "minBid", "auctionBuyNow"]);

const NETWORK_OPTIONS: SelectOption<Network>[] = NETWORKS.map((n) => ({ value: n.value, label: n.label }));

// Name and terms both come from the model — the ⓘ beside each row is the
// `info` line, because the names alone don't tell a maker them apart.
const LICENSE_OPTIONS: SelectOption<License>[] = LICENSES.map((l) => ({ value: l.value, label: l.label, info: l.info }));

/** The listing form's patch, written back onto the draft's fields. */
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

export function StepDetails({
  state,
  onChange,
  onBack,
  onContinue,
  missing,
  now,
  creatorPct,
  mintStatus,
  mintAddress,
  videosReady = true,
}: {
  /** Every current product has a ready video: Share to Innovations then shares at the mint. */
  videosReady?: boolean;
  state: MintState;
  onChange: (patch: Partial<MintState>) => void;
  onBack: () => void;
  onContinue: () => void;
  /** `detailsMissing`: the first thing still missing, or null. */
  missing: string | null;
  /** The minute clock the auction end is checked against. */
  now: number;
  /** The maker's own share: Selling percentage can't pass it (P2-LISTING-5). */
  creatorPct: number;
  /** The project's mint status now: Minting type follows it (`mintTypeOptions`). */
  mintStatus: MintStatus;
  /** The on-chain wallet, named in Minting type's locked note. */
  mintAddress?: string;
}) {
  const intent: Intent = state.intent ?? "sell";
  const reasonId = React.useId();
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [left, setLeft] = React.useState<ReadonlySet<ListingField>>(() => new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const { collections, reread } = useCollections(state.network);

  // The listing's own field messages: after a field is left, at once for a
  // typed amount that's wrong, and all of them after a blocked press.
  const input = listingInputFromBrief(briefStateOf(state));
  const listingCtx: ListingCtx = { mode: "brief", now, creatorPct };
  const problems = intent === "sell" ? listingProblems(input, listingCtx) : null;
  const shown: Partial<Record<ListingField, string>> = {};
  for (const [key, message] of Object.entries(problems?.fields ?? {}) as [ListingField, string][]) {
    const typed = AT_ONCE.has(key) && String(input[key] ?? "").trim() !== "";
    if (submitted || left.has(key) || typed) shown[key] = message;
  }

  const press = () => {
    if (missing) {
      setSubmitted(true);
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onContinue();
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

  return (
    <BriefCard title={HEADING[intent]} description={SUB_BY_INTENT[intent]} onBack={onBack}>
      <div ref={bodyRef} className="flex flex-col gap-[20px]">
        {intent === "sell" && (
          <div className="flex flex-col gap-[16px]">
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
            <SelectMenu
              label="License"
              placeholder="Select a license"
              value={state.license}
              onChange={(v) => onChange({ license: v })}
              options={LICENSE_OPTIONS}
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
              <p className="m-0 text-md text-text-secondary">{SAVE_SIGNATURE_LINE}</p>
            </div>
            <div className="flex flex-col gap-[10px]">
              <OwnerAndShare state={state} onChange={onChange} />
            </div>
            {state.shareToNewsfeed && (
              <StoryPanel state={state} onChange={onChange} note={videosReady ? undefined : SHOWCASE_NOTE} />
            )}
          </div>
        )}

        <div className="flex flex-col gap-[8px]">
          <button
            type="button"
            onClick={press}
            aria-disabled={missing ? true : undefined}
            aria-describedby={missing ? reasonId : undefined}
            className={primaryCta(!missing)}
          >
            Continue to review
          </button>
          {missing ? (
            <p id={reasonId} className="m-0 text-center text-md leading-relaxed text-text-secondary">
              {missing}
            </p>
          ) : null}
        </div>
      </div>

      <style>{`
        .ix-s3-check input:focus-visible + span {
          border-color: var(--color-border-brand);
          box-shadow: 0 0 0 3px var(--color-bg-brand-subtle);
        }
      `}</style>
    </BriefCard>
  );
}

/** The two confirms a Give and a private mint end on: who owns it, and where it goes. */
function OwnerAndShare({ state, onChange }: { state: MintState; onChange: (p: Partial<MintState>) => void }) {
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

/** What the post says, when there is going to be one. */
function StoryPanel({
  state,
  onChange,
  note,
}: {
  state: MintState;
  onChange: (p: Partial<MintState>) => void;
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
        className={`${FIELD_BASE} h-[76px] resize-y px-[14px] py-[10px] leading-relaxed`}
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
      {note ? <div className="text-md leading-relaxed text-text-secondary">{note}</div> : null}
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
  const [collections, setCollections] = React.useState<WalletCollection[]>(() => readCollections(network));
  const reread = React.useCallback((n: Network) => setCollections(readCollections(n)), []);
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
        <div className="flex flex-wrap items-center gap-[8px]">
          <input
            className={`${FIELD_BASE} h-[44px] min-w-0 flex-1 basis-[180px] px-[14px]`}
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
              "h-[44px] flex-none rounded-lg border border-solid border-border bg-bg-surface px-[16px] text-md font-semibold",
              newName.trim() ? "cursor-pointer text-text-primary" : "cursor-not-allowed text-text-disabled",
            ].join(" ")}
          >
            Add
          </button>
          <button
            type="button"
            onClick={cancel}
            className="h-[44px] flex-none cursor-pointer rounded-lg border-0 bg-transparent px-[12px] text-md font-semibold text-text-secondary"
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
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`ix-s3-check relative inline-flex cursor-pointer items-center gap-[10px] text-md font-medium text-text-primary ${TAP}`}
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
