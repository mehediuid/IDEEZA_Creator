"use client";

// "Add {Use} {Kind} NFT to the marketplace" (Figma 41505:138424, 139900;
// P2-TABS-26 as changed in spec §4.9). The track card opens it only once the
// project's Main listing is live or paused (`listGate`) and this product's
// video passes the strict "edition" readiness (the block runs both first).
//
// - Use and Number of NFTs are locked. Token comes from the project's chain,
//   then the Regular and Extended prices, each with its "?", and Royalties
//   (2–10 %). The Sell rule's ownership box shows only while this project's
//   ownership isn't confirmed (readiness `fixedIn: "form"`, errata 16).
// - "Each sale" says IDEEZA's fee and what the maker receives per NFT.
// - Add to marketplace validates on press (`checkEditionListing`): the first
//   problem shows under its field and under the button, and focus goes there.
//   Then ONE wallet request, the maker's free signature (§3.9 "List edition");
//   its `commit` re-reads the tracks and the Main listing, then writes once.
//
// `EditionTermsFields` is also Edit's (edit-dialog.tsx), so the two can't drift.

import * as React from "react";
import { Banner, ModalFrame, SelectMenu, TestnetDemoBadge, TextInput, type SelectOption } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { ROYALTY_MAX, ROYALTY_MIN, TOKENS_BY_NETWORK, type Network, type Token } from "@/lib/brief/types";
import { useManualProjects } from "@/lib/manual/projects";
import {
  checkEditionListing,
  KIND_WORD,
  listGate,
  listTrack,
  TIER_HELP,
  USE_WORD,
  wholeNumberOf,
  type TrackTerms,
} from "@/lib/market/editions";
import { FEE_LABEL, payoutOf } from "@/lib/market/fee";
import { listingViewOf } from "@/lib/market/listing";
import { readMarketNow } from "@/lib/market/market-store";
import type { EditionTrack, Listing } from "@/lib/market/types";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { WalletRequest } from "@/lib/wallet/types";
import {
  CheckRow,
  DemoLine,
  DialogFooter,
  ERROR,
  failureCopy,
  HINT,
  InfoTip,
  LABEL,
  ReadOnlyField,
  writeTracks,
} from "./create-dialog";

export type TermsInput = { token: Token | null; regular: string; extended: string; royalties: string };
export type TermsField = "token" | "regular" | "extended" | "royalties" | "confirm" | "owner";

const OWNER_REASON = "Confirm you're the rightful owner of this project.";
const NO_METADATA = { name: "", description: "", products: [], cover: null, at: 0 };

/** Digits and one dot. */
function decimal(raw: string): string {
  const kept = raw.replace(/[^\d.]/g, "");
  const dot = kept.indexOf(".");
  return dot === -1 ? kept : kept.slice(0, dot + 1) + kept.slice(dot + 1).replace(/\./g, "");
}

const positive = (s: string) => {
  const m = toMicros(s.trim());
  return m !== null && m > BigInt(0);
};
const places = (s: string) => {
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.trim().length - i - 1;
};

/** The first problem, and the field it belongs to (P2-TABS-26's copy, `checkEditionListing`). */
export function termsProblem(
  input: TermsInput,
  opts: { confirmed: boolean; askOwner: boolean; owner: boolean },
): { field: TermsField; message: string } | null {
  if (!input.token) return { field: "token", message: "Choose a token." };
  const message = checkEditionListing({
    regular: input.regular,
    extended: input.extended,
    royaltiesPct: wholeNumberOf(input.royalties) ?? Number.NaN,
    confirmed: opts.confirmed,
  });
  if (message) {
    const field: TermsField =
      message === "Enter a price above 0."
        ? positive(input.regular)
          ? "extended"
          : "regular"
        : message === "Use at most 6 decimal places."
          ? places(input.regular) > 6
            ? "regular"
            : "extended"
          : message === "Extended can't cost less than Regular."
            ? "extended"
            : message.startsWith("Royalties")
              ? "royalties"
              : "confirm";
    return { field, message };
  }
  if (opts.askOwner && !opts.owner) return { field: "owner", message: OWNER_REASON };
  return null;
}

export function termsOf(input: TermsInput): TrackTerms {
  return {
    token: input.token as TrackTerms["token"],
    regular: input.regular.trim(),
    extended: input.extended.trim(),
    royaltyPct: wholeNumberOf(input.royalties) ?? 0,
  };
}

/** "Each sale": IDEEZA's fee, then what the maker receives per NFT (C10). */
export function EachSale({ input }: { input: TermsInput }) {
  const token = input.token;
  const rows: string[] = [`${FEE_LABEL} · taken from the price of each sale`];
  if (token && positive(input.regular) && places(input.regular) <= 6) {
    rows.push(`You receive ${formatAmount(payoutOf(input.regular.trim()), token)} per NFT (Regular)`);
  }
  if (token && positive(input.extended) && places(input.extended) <= 6) {
    rows.push(`You receive ${formatAmount(payoutOf(input.extended.trim()), token)} per NFT (Extended)`);
  }
  return (
    <section aria-label="Each sale" className="flex flex-col gap-2 rounded-lg border border-solid border-border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-2xs font-bold uppercase tracking-caps text-text-tertiary">Each sale</span>
        <TestnetDemoBadge />
      </div>
      {rows.map((r) => (
        <p key={r} className="text-sm tabular-nums text-text-secondary">
          {r}
        </p>
      ))}
    </section>
  );
}

function PriceField({
  label,
  help,
  value,
  onChange,
  error,
  id,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  id: string;
}) {
  const errId = `${id}-err`;
  return (
    <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
      <span className="flex items-center gap-2">
        <label htmlFor={id} className={LABEL}>
          {label}
        </label>
        <InfoTip label={`About ${label.toLowerCase()}`} text={help} />
      </span>
      <TextInput
        id={id}
        size="xl"
        value={value}
        onValueChange={(v) => onChange(decimal(v))}
        inputMode="decimal"
        placeholder="e.g. 0.01"
        invalid={!!error}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errId : undefined}
      />
      {error && (
        <span id={errId} className={ERROR}>
          {error}
        </span>
      )}
    </div>
  );
}

/** Token, Regular price, Extended price and Royalties — Add's and Edit's editable terms. */
export function EditionTermsFields({
  network,
  value,
  onChange,
  problem,
  idPrefix,
}: {
  network: Network;
  value: TermsInput;
  onChange: (patch: Partial<TermsInput>) => void;
  problem: { field: TermsField; message: string } | null;
  /** Ids are `${idPrefix}-{field}`, so a caller can focus the field a problem names. */
  idPrefix: string;
}) {
  const tokens: SelectOption<Token>[] = TOKENS_BY_NETWORK[network].map((t) => ({ value: t, label: t }));
  const err = (f: TermsField) => (problem?.field === f ? problem.message : null);
  const royaltiesId = `${idPrefix}-royalties`;
  return (
    <>
      <SelectMenu
        id={`${idPrefix}-token`}
        label="Token"
        placeholder="Choose a token"
        value={value.token}
        onChange={(token) => onChange({ token })}
        options={tokens}
        error={err("token") ?? undefined}
      />
      <div className="grid grid-cols-1 gap-8 [@media(min-width:480px)]:grid-cols-2 [@media(min-width:480px)]:gap-6">
        <PriceField
          id={`${idPrefix}-regular`}
          label="Regular price"
          help={TIER_HELP.regular}
          value={value.regular}
          onChange={(regular) => onChange({ regular })}
          error={err("regular")}
        />
        <PriceField
          id={`${idPrefix}-extended`}
          label="Extended price"
          help={TIER_HELP.extended}
          value={value.extended}
          onChange={(extended) => onChange({ extended })}
          error={err("extended")}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
        <label htmlFor={royaltiesId} className={LABEL}>
          Royalties (%)
        </label>
        <TextInput
          id={royaltiesId}
          size="xl"
          value={value.royalties}
          onValueChange={(v) => onChange({ royalties: v.replace(/[^\d]/g, "").slice(0, 2) })}
          inputMode="numeric"
          placeholder={`${ROYALTY_MIN} to ${ROYALTY_MAX}`}
          invalid={!!err("royalties")}
          aria-invalid={!!err("royalties") || undefined}
          aria-describedby={`${royaltiesId}-note`}
        />
        <span id={`${royaltiesId}-note`} className={err("royalties") ? ERROR : HINT}>
          {err("royalties") ?? "Paid to you on every resale."}
        </span>
      </div>
    </>
  );
}

/** Where a problem sends focus. */
export function focusProblem(idPrefix: string, field: TermsField) {
  requestAnimationFrame(() => {
    const el = document.getElementById(`${idPrefix}-${field}`);
    const target = el?.matches("input, button") ? el : el?.querySelector<HTMLElement>("input, button");
    target?.focus();
  });
}

/** The maker's free signature for a listing's terms (§3.9 "List edition"). */
export function listRequestOf(f: {
  track: EditionTrack;
  projectName: string;
  productName: string;
  terms: TrackTerms;
  network: Network;
  collection: string;
  editing: boolean;
}): WalletRequest {
  const { track, terms } = f;
  return {
    kind: "signature",
    purpose: "listEdition",
    identity: "maker",
    network: f.network,
    title: f.editing ? "Sign the listing change — no fee" : "Sign the listing — no fee",
    summary: [
      { label: "Product", value: `${f.productName} · ${f.projectName}` },
      { label: "NFT", value: `${KIND_WORD[track.kind]} NFT · ${USE_WORD[track.use]} · ${track.supply.total} NFTs` },
      { label: "Regular price", value: formatAmount(terms.regular, terms.token) },
      { label: "Extended price", value: formatAmount(terms.extended, terms.token) },
      { label: "Royalties", value: `${terms.royaltyPct}% on resales` },
      { label: "Collection", value: f.collection },
      { label: "Network", value: networkLabelOf(f.network) },
    ],
    note: f.editing
      ? "You're signing the new terms. Nothing is charged."
      : "You're signing the listing's terms. Nothing is charged.",
    doneLine: f.editing
      ? "Listing updated."
      : `${USE_WORD[track.use]} ${KIND_WORD[track.kind]} NFTs are listed on Explore marketplace.`,
  };
}

/** The Main listing as the market holds it now: edition listings need it live or paused. */
export function mainGateNow(projectId: string, projectName: string): string | null {
  const m = readMarketNow();
  const view = listingViewOf(projectId, {
    listings: m.listings,
    sales: m.sales,
    bids: m.bids,
    now: Date.now(),
    current: NO_METADATA,
  });
  const gate = listGate(view, projectName);
  return gate.kind === "blocked" ? gate.reason : null;
}

export function ListDialog({
  projectId,
  projectName,
  productName,
  track,
  chain,
  main,
  askOwner,
  onClose,
  onDone,
}: {
  projectId: string;
  projectName: string;
  productName: string;
  track: EditionTrack;
  chain: { network: Network; collection: string };
  /** The live Main listing: its token is the default. */
  main: Listing | null;
  /** The project's ownership isn't confirmed yet: the Sell rule's box is part of this form. */
  askOwner: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { request } = useWalletRequest();
  const { setOwnerConfirmed } = useManualProjects();
  const tokens = TOKENS_BY_NETWORK[chain.network];
  const [input, setInput] = React.useState<TermsInput>(() => ({
    token: main && tokens.includes(main.token) ? main.token : tokens[0],
    regular: "",
    extended: "",
    royalties: "",
  }));
  const [confirmed, setConfirmed] = React.useState(false);
  const [owner, setOwner] = React.useState(false);
  const [problem, setProblem] = React.useState<{ field: TermsField; message: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const titleRef = React.useRef<HTMLSpanElement>(null);
  const prefix = React.useId().replace(/:/g, "");
  const reasonId = `${prefix}-reason`;
  const what = `${USE_WORD[track.use]} ${KIND_WORD[track.kind]} NFT`;

  const change = (patch: Partial<TermsInput>) => {
    setInput((i) => ({ ...i, ...patch }));
    setProblem(null);
    setError(null);
  };
  const close = () => {
    if (!busy) onClose();
  };

  const submit = async () => {
    if (busy) return;
    const p = termsProblem(input, { confirmed, askOwner, owner });
    setProblem(p);
    setError(null);
    if (p) {
      focusProblem(prefix, p.field);
      return;
    }
    const terms = termsOf(input);
    const req = listRequestOf({
      track,
      projectName,
      productName,
      terms,
      network: chain.network,
      collection: chain.collection,
      editing: false,
    });
    setBusy(true);
    const result = await request(req, {
      recheck: () => mainGateNow(projectId, projectName),
      commit: (proof) => {
        const gate = mainGateNow(projectId, projectName);
        if (gate) return { ok: false, message: gate };
        const w = writeTracks(projectId, (tracks) => listTrack(tracks, track.id, terms, proof.at));
        if (!w.ok) return { ok: false, message: w.message };
        // The box ticked here is the Sell rule's ownership fix (readiness `fixedIn: "form"`).
        if (askOwner) setOwnerConfirmed(projectId, proof.at);
        return { ok: true };
      },
    });
    setBusy(false);
    if (result.ok) {
      onDone(req.doneLine);
      return;
    }
    const failed = failureCopy(result);
    if (failed) setError(failed);
  };

  return (
    <ModalFrame
      open
      onClose={close}
      covered={busy}
      size="sm"
      initialFocus={titleRef}
      title={
        <span ref={titleRef} tabIndex={-1} className="outline-none">
          {`Add ${what} to the marketplace`}
        </span>
      }
      description={`${productName} · ${projectName}`}
      footer={
        <DialogFooter
          cta="Add to marketplace"
          busyCta="Listing…"
          busy={busy}
          reason={problem?.message ?? null}
          reasonId={reasonId}
          onCancel={close}
          onSubmit={() => void submit()}
        />
      }
    >
      <div inert={busy || undefined} className="flex flex-col gap-8">
        <DemoLine />
        {error && <Banner tone="error">{error}</Banner>}
        <div className="grid grid-cols-1 gap-8 [@media(min-width:480px)]:grid-cols-2 [@media(min-width:480px)]:gap-6">
          <ReadOnlyField label="Use" value={USE_WORD[track.use]} />
          <ReadOnlyField label="Number of NFTs" value={String(track.supply.total)} />
        </div>
        <EditionTermsFields network={chain.network} value={input} onChange={change} problem={problem} idPrefix={prefix} />
        <EachSale input={input} />
        {askOwner && (
          <CheckRow
            id={`${prefix}-owner`}
            checked={owner}
            invalid={problem?.field === "owner"}
            describedBy={problem?.field === "owner" ? reasonId : undefined}
            onToggle={() => {
              setOwner((o) => !o);
              setProblem(null);
            }}
          >
            I confirm I&apos;m the rightful owner of this project, virtually and physically, and I take responsibility for any
            legal or intellectual-property issue it raises.
          </CheckRow>
        )}
        <CheckRow
          id={`${prefix}-confirm`}
          checked={confirmed}
          invalid={problem?.field === "confirm"}
          describedBy={problem?.field === "confirm" ? reasonId : undefined}
          onToggle={() => {
            setConfirmed((c) => !c);
            setProblem(null);
          }}
        >
          I confirm these NFTs are listed lazy minted.
        </CheckRow>
      </div>
    </ModalFrame>
  );
}
