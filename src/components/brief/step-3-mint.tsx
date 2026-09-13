"use client";

// Step 3 — "Ready to {sell|give|save}"
//
// Mint completes IMMEDIATELY when the form is valid. The 20-min video render
// is no longer a gate — it's kicked off in the background after Pay, tracked
// by the GlobalRenderIndicator visible on every page. So this screen is just
// a clean form + a single Pay button.

import * as React from "react";
import { SelectMenu, type SelectOption } from "@/components/ideeza";
import { C } from "@/lib/pcb/colors";
import {
  BriefCard,
  LISTING_TYPES,
  NETWORKS,
  TOKENS_BY_NETWORK,
  type BriefState,
  type Intent,
  type Network,
  type Token,
} from "./brief-app";
import { ReviewModal } from "./review-modal";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { estimateGas, formatTotal } from "@/lib/brief/gas";
import {
  addCollection,
  readCollections,
  type WalletCollection,
} from "@/lib/brief/wallet";

const HEADING_BY_INTENT: Record<Intent, string> = {
  sell: "Ready to sell",
  give: "Ready to give",
  save: "Ready to save",
};

// Give and Save still carry the old fixed lists; Sell reads the wallet's real
// per-chain collections (Plan 4 rebuilds the other two).
const COLLECTIONS: Record<"give" | "save", string[]> = {
  give: ["Discord Bots", "Open Hardware", "Community Drops"],
  save: ["My Private", "Workspace", "Default Collection"],
};

const MINT_FEE = 4;
const MAX_STORY = 500;
/** The collection row that creates one instead of choosing one. */
const NEW_COLLECTION = "__new__";

const isAmount = (v: string) => !!v.trim() && Number(v) > 0;
const decimal = (v: string) => v.replace(/[^\d.]/g, "");

/**
 * The first thing still missing, read top-down through the form — it is both
 * what shuts the Pay button and what its tooltip says.
 */
function firstMissing(s: BriefState, intent: Intent): string | null {
  if (intent === "sell") {
    if (!s.network) return "Choose the blockchain to mint on.";
    if (!s.collection) return "Choose a collection to mint into.";
    if (!s.listingType) return "Choose a listing type.";
    if (s.listingType === "auction") {
      if (!isAmount(s.minBid)) return "Set the minimum bidding price.";
      if (!s.expiresAt) return "Set the date the auction expires.";
    } else if (!isAmount(s.price)) {
      return "Set the price.";
    }
    if (!s.royalties) return "Set the royalties percentage.";
    if (!s.understandGas)
      return "Confirm you understand the network gas fee.";
    if (!s.confirmOwnership)
      return "Confirm you are the rightful owner of this idea.";
    return null;
  }
  if (intent === "give" && !s.recipientCommunity?.trim())
    return "Name the recipient community.";
  if (intent === "save" && s.blockchainMint && !s.collection)
    return "Choose a collection to mint into.";
  if (!s.confirmGasFees) return "Confirm the additional gas fees.";
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
  isLastStep,
  minting,
  projectName,
}: {
  state: BriefState;
  onChange: (patch: Partial<BriefState>) => void;
  onBack: () => void;
  /** Commit — mint and finish. Only ever the CTA when this form is last. */
  onMint: () => void;
  /** One step along the sequence — the preview, when Innovations added one. */
  onNext: () => void;
  /** Is this form the last thing to answer before the mint? */
  isLastStep: boolean;
  minting: boolean;
  projectName: string;
}) {
  const { jobs } = useVideoJobs();
  const intent = state.intent || "sell";
  const heading = HEADING_BY_INTENT[intent];
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
  const willIncurGas =
    intent === "sell" ||
    (intent === "save" && state.blockchainMint) ||
    intent === "give";

  const listingLabel =
    LISTING_TYPES.find((l) => l.id === state.listingType)?.label ?? "";
  // An auction's listing figure is what bidding opens at.
  const listingAmount =
    state.listingType === "auction" ? state.minBid : state.price;

  const missing = firstMissing(state, intent);
  const formReady = !missing;
  const canPay = formReady && !minting;
  // Sharing to Innovations puts a clip between this form and the mint, so the
  // CTA carries the form on rather than paying for something not made yet.
  const ctaLabel = !isLastStep
    ? "Continue to video ›"
    : intent === "save" && !state.blockchainMint
      ? `Pay ${MINT_FEE} IDZ and save`
      : `Pay ${MINT_FEE} IDZ and go live`;

  return (
    <BriefCard onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
              margin: 0,
              letterSpacing: -0.2,
            }}
          >
            {heading}
          </h1>
          <p style={{ fontSize: 13, color: C.body, marginTop: 6 }}>
            Confirm the details and mint.{" "}
            {willRenderVideo && "Project goes live when the video is final."}
          </p>
        </div>

        {willRenderVideo && job && <RenderInfo videoDone={videoDone} />}

        <ProductCard
          state={state}
          projectName={projectName}
          watchable={watchable}
          onOpen={() => setReviewOpen(true)}
        />

        {intent === "sell" && <SellFields state={state} onChange={onChange} />}
        {intent === "give" && <GiveFields state={state} onChange={onChange} />}
        {intent === "save" && <SaveFields state={state} onChange={onChange} />}

        {/* Sell carries its own four confirms, in the order the listing reads;
            Give and Save keep the three they had. */}
        {intent !== "sell" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Check
              label="I confirm that additional gas fees will be added"
              checked={state.confirmGasFees}
              onChange={(v) => onChange({ confirmGasFees: v })}
            />
            <Check
              label="I confirm that I'm the rightful owner of this idea"
              checked={state.confirmOwnership}
              onChange={(v) => onChange({ confirmOwnership: v })}
            />
            <Check
              label="Share to Innovations"
              checked={state.shareToNewsfeed}
              onChange={(v) => onChange({ shareToNewsfeed: v })}
            />
          </div>
        )}

        <div
          style={{
            background: "var(--color-bg-surface-raised)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <CostRow label="Mint fee" value={`${MINT_FEE} IDZ`} />
          {intent === "sell" && isAmount(listingAmount) && (
            <CostRow
              label={`Listing (${listingLabel})`}
              value={`${listingAmount} ${state.token}`}
            />
          )}
          <CostRow
            label={gas.label}
            value={
              willIncurGas ? (
                <>
                  {gas.fee} {gas.native}{" "}
                  <span style={{ color: "var(--color-text-tertiary)" }}>
                    ≈ ${gas.usd.toFixed(2)}
                  </span>
                </>
              ) : (
                "Not minted"
              )
            }
          />
          <div
            style={{
              height: 1,
              background: "var(--color-border-subtle)",
              margin: "4px 0",
            }}
          />
          <CostRow
            label="Total to pay now"
            value={willIncurGas ? formatTotal(MINT_FEE, gas) : `${MINT_FEE} IDZ`}
            bold
          />
          <div
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            Estimate at fixed reference rates — live network pricing isn&rsquo;t
            wired yet.
          </div>
        </div>

        <WalletCallout />

        {/* A disabled button takes no pointer events, so the reason has to live
            on a wrapper the cursor can still reach. */}
        <span title={missing ?? undefined} style={{ display: "flex" }}>
          <button
            onClick={isLastStep ? onMint : onNext}
            disabled={!canPay}
            title={missing ?? undefined}
            aria-describedby={missing ? reasonId : undefined}
            style={{
              width: "100%",
              padding: "16px 32px",
              background: canPay ? C.primary : "var(--color-bg-subtle)",
              color: canPay
                ? "var(--color-text-on-brand)"
                : "var(--color-text-disabled)",
              border: "none",
              borderRadius: "var(--radius-3xl)",
              fontSize: 15,
              fontWeight: 700,
              cursor: canPay ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: canPay
                ? "0 6px 24px -6px rgba(124, 45, 185, .4)"
                : "none",
              transition: "background .14s, box-shadow .2s",
            }}
          >
            {minting ? (
              <>
                <Spinner />
                Minting…
              </>
            ) : (
              <>
                {isLastStep ? <WalletIcon /> : null}
                {ctaLabel}
              </>
            )}
          </button>
        </span>

        {missing ? (
          <div
            id={reasonId}
            style={{
              fontSize: 12,
              color: C.body,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {missing}
          </div>
        ) : willRenderVideo && !minting ? (
          <div
            style={{
              fontSize: 12,
              color: C.body,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
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
          // Regenerating is Step 2's job — that is where the prompt lives.
          setReviewOpen(false);
          onBack();
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

// RenderInfo — slim info banner on Step 3 reminding the user that the project
// goes live when the in-flight render finishes. The actual render progress +
// notification opt-ins live on Step 2 (inline) and in the top-right indicator,
// so we don't duplicate them here. This banner is just signal.
function RenderInfo({ videoDone }: { videoDone: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "12px 14px",
        background: videoDone
          ? "var(--color-green-50, var(--color-bg-surface))"
          : "var(--color-bg-brand-subtle)",
        border: `var(--border-width-1) solid ${
          videoDone
            ? "var(--color-green-500)"
            : "var(--color-border-brand)"
        }`,
        borderRadius: "var(--radius-lg)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        lineHeight: 1.5,
        color: videoDone
          ? "var(--color-green-700)"
          : "var(--color-violet-700, var(--color-violet-600))",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: videoDone
            ? "var(--color-green-100)"
            : "rgba(255,255,255,.55)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 22px",
        }}
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
          <span
            className="ix-s3i-pulse"
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "var(--color-violet-600)",
            }}
          />
        )}
      </span>
      <span style={{ flex: 1 }}>
        {videoDone ? (
          <>
            <strong>Video is ready.</strong> Finish the mint setup and pay to
            go live.
          </>
        ) : (
          <>
            Your video is still rendering. Set up the mint here — your
            project will go live when the video is final. Progress lives in
            the top-right indicator.
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
  watchable,
  onOpen,
}: {
  state: BriefState;
  projectName: string;
  watchable: boolean;
  onOpen: () => void;
}) {
  const noMedia = state.mediaType === "skip";
  const thumbStyle: React.CSSProperties = {
    position: "relative",
    width: 72,
    height: 54,
    flex: "0 0 72px",
    padding: 0,
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    background: noMedia
      ? "var(--color-bg-brand-subtle)"
      : "var(--gradient-brand)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const inner = (
    <>
      {state.arClip ? (
        <video
          src={state.arClip.url}
          muted
          playsInline
          preload="metadata"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      {noMedia ? (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-violet-600)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ) : watchable ? (
        <span
          style={{
            position: "relative",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "rgba(255,255,255,.94)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-violet-600)" aria-hidden>
            <polygon points="7,4 21,12 7,20" />
          </svg>
        </span>
      ) : null}
    </>
  );

  return (
    <div
      style={{
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 14,
        display: "flex",
        gap: 14,
        alignItems: "center",
      }}
    >
      {watchable && !noMedia ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Play the product video"
          style={{ ...thumbStyle, border: "none", cursor: "pointer" }}
        >
          {inner}
        </button>
      ) : (
        <div style={thumbStyle}>{inner}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: C.primary,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: 2,
          }}
        >
          {projectName || "No project"}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {state.productName || "Untitled"}
        </div>
        <div
          style={{
            fontSize: 13,
            color: C.body,
            marginTop: 4,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {state.productDescription || "—"}
        </div>
      </div>
    </div>
  );
}

function SellFields({
  state,
  onChange,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
}) {
  // `readCollections` seeds (and writes) the wallet store on a first read, so
  // it never runs during render: once in the lazy initializer, then only from
  // the handlers that can change the answer (switching chain, adding one).
  const [collections, setCollections] = React.useState<WalletCollection[]>(() =>
    readCollections(state.network),
  );
  const [naming, setNaming] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const priceId = React.useId();
  const minBidId = React.useId();
  const buyNowId = React.useId();
  const expiryId = React.useId();
  const royaltyId = React.useId();
  const newNameId = React.useId();
  const storyId = React.useId();
  const expiryRef = React.useRef<HTMLInputElement>(null);

  const isAuction = state.listingType === "auction";

  const networkOptions: SelectOption<Network>[] = NETWORKS.map((n) => ({
    value: n.value,
    label: n.label,
  }));
  const collectionOptions: SelectOption[] = [
    ...collections.map((c) => ({ value: c.name, label: c.name })),
    { value: NEW_COLLECTION, label: "+ New collection…" },
  ];
  const listingOptions: SelectOption<BriefState["listingType"]>[] =
    LISTING_TYPES.map((l) => ({ value: l.id, label: l.label }));
  const tokenOptions: SelectOption<Token>[] = TOKENS_BY_NETWORK[
    state.network
  ].map((t) => ({ value: t, label: t }));

  // A collection belongs to one chain and a token to one chain's list, so
  // neither survives the move.
  const pickNetwork = (n: Network) => {
    setCollections(readCollections(n));
    setNaming(false);
    setNewName("");
    onChange({ network: n, token: TOKENS_BY_NETWORK[n][0], collection: "" });
  };

  const pickCollection = (v: string) => {
    if (v === NEW_COLLECTION) {
      setNaming(true);
      return;
    }
    setNaming(false);
    onChange({ collection: v });
  };

  const createCollection = () => {
    const name = newName.trim();
    if (!name) return;
    const created = addCollection(state.network, name);
    setCollections(readCollections(state.network));
    setNewName("");
    setNaming(false);
    onChange({ collection: created.name });
  };

  const openExpiryPicker = () => {
    const el = expiryRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SelectMenu
        label="Blockchain Mint"
        placeholder="Choose your prefer blockchain"
        value={state.network}
        onChange={pickNetwork}
        options={networkOptions}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SelectMenu
          label="Choose collection"
          placeholder="Select collection"
          value={state.collection || null}
          onChange={pickCollection}
          options={collectionOptions}
        />
        {naming && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              id={newNameId}
              className="ix-brief-field"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createCollection();
                }
              }}
              placeholder="Collection name"
              aria-label="New collection name"
              autoFocus
              style={{ ...inputStyle, height: 38 }}
            />
            <button
              type="button"
              onClick={createCollection}
              disabled={!newName.trim()}
              style={{
                height: 38,
                padding: "0 16px",
                flex: "0 0 auto",
                background: newName.trim()
                  ? C.primary
                  : "var(--color-bg-subtle)",
                color: newName.trim()
                  ? "var(--color-text-on-brand)"
                  : "var(--color-text-disabled)",
                border: "none",
                borderRadius: "var(--radius-lg)",
                fontSize: 13,
                fontWeight: 600,
                cursor: newName.trim() ? "pointer" : "not-allowed",
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <SelectMenu
        label="Listing type"
        placeholder="Select listing type"
        value={state.listingType}
        onChange={(v) => onChange({ listingType: v })}
        options={listingOptions}
      />

      {isAuction ? (
        <>
          <Field label="Minimum bidding price" controlId={minBidId}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                gap: 12,
              }}
            >
              <SelectMenu
                placeholder="Select token"
                value={state.token}
                onChange={(v) => onChange({ token: v })}
                options={tokenOptions}
              />
              <input
                id={minBidId}
                className="ix-brief-field"
                value={state.minBid}
                onChange={(e) => onChange({ minBid: decimal(e.target.value) })}
                placeholder="32"
                inputMode="decimal"
                style={inputStyle}
              />
            </div>
          </Field>

          <Field label="Auction Buy Now Price" controlId={buyNowId}>
            <input
              id={buyNowId}
              className="ix-brief-field"
              value={state.auctionBuyNow}
              onChange={(e) =>
                onChange({ auctionBuyNow: decimal(e.target.value) })
              }
              placeholder="0.5 for example"
              inputMode="decimal"
              style={inputStyle}
            />
          </Field>

          <Field label="Expired Date" controlId={expiryId}>
            <div style={{ position: "relative" }}>
              <input
                id={expiryId}
                ref={expiryRef}
                className="ix-brief-field ix-s3-date"
                type="datetime-local"
                value={state.expiresAt}
                onChange={(e) => onChange({ expiresAt: e.target.value })}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={openExpiryPicker}
                aria-label="Open the date picker"
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 30,
                  height: 30,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-text-tertiary)",
                  cursor: "pointer",
                }}
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
        <div
          style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}
        >
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
              className="ix-brief-field"
              value={state.price}
              onChange={(e) => onChange({ price: decimal(e.target.value) })}
              placeholder="32"
              inputMode="decimal"
              style={inputStyle}
            />
          </Field>
        </div>
      )}

      <Field label="Royalties (%)" hint="2 – 100" controlId={royaltyId}>
        <input
          id={royaltyId}
          className="ix-brief-field"
          value={state.royalties ? String(state.royalties) : ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "");
            onChange({
              royalties: digits ? Math.max(2, Math.min(100, Number(digits))) : 0,
            });
          }}
          inputMode="numeric"
          placeholder="Suggested: 2%, 2.5%, 5% Maximum is 10%"
          style={inputStyle}
        />
      </Field>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Check
          label="Instant Mint (Gas fee Applicable)"
          checked={state.instantMint}
          onChange={(v) => onChange({ instantMint: v })}
        />
        <Check
          label="I understand a network gas fee is added at mint"
          checked={state.understandGas}
          onChange={(v) => onChange({ understandGas: v })}
        />
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
      </div>

      {state.shareToNewsfeed && (
        <div
          style={{
            background: "var(--color-bg-subtle)",
            borderRadius: "var(--radius-xl)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <label
            htmlFor={storyId}
            style={{ fontSize: 13, fontWeight: 600, color: C.text }}
          >
            Write your story
          </label>
          <textarea
            id={storyId}
            className="ix-brief-field"
            value={state.story}
            maxLength={MAX_STORY}
            onChange={(e) => onChange({ story: e.target.value.slice(0, MAX_STORY) })}
            placeholder="Why did you build this? What should others do with it?"
            rows={3}
            style={{
              ...inputStyle,
              height: 76,
              resize: "vertical",
              paddingTop: 10,
              paddingBottom: 10,
              lineHeight: 1.5,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 12,
              color: "var(--color-input-helper)",
            }}
          >
            <span>Shown with your post in Innovations.</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {state.story.length}/{MAX_STORY}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function GiveFields({
  state,
  onChange,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FieldGroup label="Network">
        <div style={{ display: "flex", gap: 8 }}>
          {NETWORKS.map((n) => (
            <Pill
              key={n.value}
              selected={state.network === n.value}
              onClick={() => onChange({ network: n.value })}
            >
              {n.label}
            </Pill>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Collection">
        <SelectField
          value={state.collection}
          onChange={(v) => onChange({ collection: v })}
          options={COLLECTIONS.give}
          placeholder="Choose collection"
        />
      </FieldGroup>

      <FieldGroup label="Recipient community">
        <input
          value={state.recipientCommunity || ""}
          onChange={(e) => onChange({ recipientCommunity: e.target.value })}
          placeholder="e.g. @ideeza-makers"
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="Distribution rule">
        <SelectField
          value={state.distributionRule || "First-come-first-serve"}
          onChange={(v) => onChange({ distributionRule: v })}
          options={[
            "First-come-first-serve",
            "Random allocation",
            "Allowlist only",
          ]}
          placeholder="Choose rule"
        />
      </FieldGroup>
    </div>
  );
}

function SaveFields({
  state,
  onChange,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        onClick={() => onChange({ blockchainMint: !state.blockchainMint })}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 14,
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          cursor: "pointer",
        }}
      >
        <div>
          <div
            style={{ fontSize: 14, fontWeight: 600, color: C.text }}
          >
            Mint on blockchain?
          </div>
          <div
            style={{ fontSize: 12, color: C.body, marginTop: 2 }}
          >
            Off = stays only in your library
          </div>
        </div>
        <Toggle
          on={!!state.blockchainMint}
          onChange={(v) => onChange({ blockchainMint: v })}
        />
      </div>

      {state.blockchainMint && (
        <>
          <FieldGroup label="Network">
            <div style={{ display: "flex", gap: 8 }}>
              {NETWORKS.map((n) => (
                <Pill
                  key={n.value}
                  selected={state.network === n.value}
                  onClick={() => onChange({ network: n.value })}
                >
                  {n.label}
                </Pill>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Collection">
            <SelectField
              value={state.collection}
              onChange={(v) => onChange({ collection: v })}
              options={COLLECTIONS.save}
              placeholder="Choose collection"
            />
          </FieldGroup>
        </>
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-3)",
      }}
    >
      <label
        htmlFor={controlId}
        style={{
          width: "fit-content",
          fontSize: "var(--font-size-md)",
          color: "var(--color-input-label)",
        }}
      >
        {label}
      </label>
      {children}
      {hint ? (
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-input-helper)",
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-text-secondary)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...inputStyle,
        appearance: "none",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.4'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
        paddingRight: 36,
      }}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        background: selected
          ? "var(--color-bg-brand-subtle)"
          : "var(--color-bg-surface)",
        border: `var(--border-width-1) solid ${
          selected ? "var(--color-border-brand)" : "var(--color-border-subtle)"
        }`,
        borderRadius: 999,
        color: selected ? C.primary : C.body,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background .14s, border-color .14s",
      }}
    >
      {children}
    </button>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      style={{
        width: 34,
        height: 20,
        borderRadius: 10,
        background: on
          ? "var(--color-violet-600)"
          : "var(--color-bg-surface-raised)",
        position: "relative",
        transition: "background .14s",
        flex: "0 0 34px",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 16 : 2,
          width: 16,
          height: 16,
          background: "var(--color-bg-surface)",
          borderRadius: "50%",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
          transition: "left .14s",
        }}
      />
    </span>
  );
}

/**
 * A real checkbox under a drawn box: the input carries the role, the state and
 * the keyboard (Space toggles it, Tab reaches it); the box is only the
 * picture, and the `.ix-s3-check` rule lends it the input's focus ring.
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
      className="ix-s3-check"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontSize: 13,
        color: C.text,
        fontWeight: 500,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          margin: 0,
          padding: 0,
          opacity: 0,
        }}
      />
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `var(--border-width-1-5) solid ${
            checked ? "var(--color-violet-600)" : "var(--color-border-default)"
          }`,
          background: checked
            ? "var(--color-violet-600)"
            : "var(--color-bg-surface)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 18px",
          transition: "background .14s, border-color .14s",
        }}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-on-brand)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4 10-10" />
          </svg>
        )}
      </span>
      {label}
    </label>
  );
}

/** What the money actually does — said before the button, not after it. */
function WalletCallout() {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "12px 14px",
        background: "var(--color-bg-info-subtle)",
        border: "var(--border-width-1) solid var(--color-border-blue)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-blue)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 1 }}
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5 M12 7.6v.4" />
      </svg>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Nothing is charged until you approve in your wallet
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--color-text-secondary)",
            marginTop: 2,
            lineHeight: 1.5,
          }}
        >
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
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: bold ? 14 : 13,
        color: bold ? C.text : C.body,
        fontWeight: bold ? 700 : 500,
      }}
    >
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
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
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.45)",
        borderTopColor: "currentColor",
        animation: "ix-mint-spin .8s linear infinite",
        display: "inline-block",
      }}
    >
      <style>{`@keyframes ix-mint-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  width: "100%",
  padding: "0 14px",
  background: "var(--color-input-bg)",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-lg)",
  fontSize: 14,
  color: "var(--color-text-primary)",
  outline: "none",
  fontFamily: "inherit",
};
