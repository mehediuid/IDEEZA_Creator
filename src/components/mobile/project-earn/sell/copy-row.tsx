"use client";

// A Physical or Virtual row of one scope (the whole project or a product) and
// its screen (mobile UX pass 2026-11-15; Figma 14, 15d, 15e–15g; the web's
// editions.tsx CopyRow and edition-block.tsx EditionTracks). The state is
// `copyRowStateOf`, first match wins, and never asks the Main listing:
// · nothing made yet — the row opens the copies sheet with the kind preset
//   (sell-copies.tsx); given, sold in full, an unknown collection or a dropped
//   product grey it with the reason as the state;
// · something made or on sale — the row pushes the copies screen: one card
//   per use ({kind} · Personal use: On the marketplace, the price large, with
//   future updates under it, Copies sold, Royalties; ⋯ Edit · Add copies ·
//   Remove listing), a made but unlisted use's "Not selling", Activity, and
//   "Nothing is minted or listed on a real blockchain."; the bottom bar's one
//   primary: Add to marketplace (a made, unlisted use) or Sell … copies too;
// · Edit (15f) and Add copies (15e) sign through the phone's wallet sheet;
//   Remove listing (15g) asks first. Each write says so in a toast.
// · its sales (EARN-4, the web item panel's): Earned · Bought by · Last sale
//   while something is listed, Recent sales (the last three, "All sales in
//   Money") once copies are made, and a sold-out use's card says "Every copy
//   is sold. Add copies to keep selling, or leave it closed."
// · signed while a video still renders or waits for review (CL-030): the row
//   says "Waiting for videos" with the price and "Goes live when its videos are
//   ready"; on the screen the made copies' card is the waiting block, Review
//   videos is the bar's primary and Cancel listing a row.

import * as React from "react";
import { Add01Icon, Delete02Icon, MoreHorizontalIcon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field } from "@/components/auth/auth-parts";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { TextInput } from "@/components/ideeza/text-input";
import { createRequestOf, EDITION_DEMO_LINE, failureCopy, writeTracks } from "@/components/projects/editions/create-dialog";
import { UPDATED_LINE } from "@/components/projects/editions/edit-dialog";
import { listRequestOf, termsOf, termsProblem, type TermsField, type TermsInput } from "@/components/projects/editions/list-dialog";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { ROYALTY_MAX, ROYALTY_MIN, TOKENS_BY_NETWORK, type Network, type Token } from "@/lib/brief/types";
import { can } from "@/lib/manual/permissions";
import {
  addToSupply,
  checkAddNfts,
  editionChainOf,
  editTrackListing,
  lockedListReason,
  trackCardOf,
  tracksOf,
  unlistTrack,
  wholeNumberOf,
} from "@/lib/market/editions";
import { FEE_LABEL, payoutOf } from "@/lib/market/fee";
import { PHONE_USES, plainUseWords, withUseWords } from "@/lib/market/phone-sell";
import { copiesSoldLineOf, copyRowStateOf, KIND_LABEL, PRICE_LABEL, trackNameOf, USE_LABEL } from "@/lib/market/sell-flow";
import { copyTileOf, SOLD_OUT_NOTE, type DeskTile } from "@/lib/market/sell-desk";
import type { EditionKind, EditionTrack, EditionUse } from "@/lib/market/types";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { ActionSheet, Sheet } from "../../kit/sheet";
import { SheetSelect } from "../../kit/sheet-select";
import { useToast } from "../../kit/toast";
import { useEarn } from "../context";
import { FactRows } from "../parts";
import { NftActivityRow } from "./nft-activity";
import { CheckRow, FullLayer, KIND_ICON, PrimaryBar, RecentSales, ROWS_CARD, SalesFacts, SellListRow, SUB, SummaryCard } from "./parts";
import { SellCopiesSheet, type CopyScope } from "./sell-copies";
import { cn } from "@/lib/utils";
import { useBackState } from "../../nav-trail";
import { T } from "../../type";
import { HeldCancelRow, HeldCard, HeldChip, ReviewVideosButton, useHeldItems } from "../video/held";
import type { HeldCopies } from "@/lib/market/held";

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

/** "Personal use · 0.03 ETH" — the waiting copies' use and price. */
function heldTrackLine(item: HeldCopies, tracks: readonly EditionTrack[]): string {
  const use = tracks.find((t) => t.id === item.trackId)?.use;
  const price = formatAmount(item.terms.regular, item.terms.token);
  return use ? `${USE_LABEL[use]} · ${price}` : price;
}
type Dialog = { kind: "edit"; track: Listed } | { kind: "add"; track: EditionTrack } | { kind: "remove"; track: EditionTrack } | null;

export function CopyRow({ kind, scope }: { kind: EditionKind; scope: CopyScope }) {
  const { project, view, viewer, brief, announce } = useEarn();
  const toast = useToast();
  const [sell, setSell] = useBackState<{ use: EditionUse | null } | null>(`copies-sell-${scope.id}-${kind}`, null);
  const [screen, setScreen] = useBackState(`copies-screen-${scope.id}-${kind}`, false);
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, view.mint.status === "legacy" && brief ? brief.state : null);
  const status = view.summary.status;
  const state = copyRowStateOf({
    productId: scope.id,
    kind,
    projectName: project.name,
    minted: status !== "draft" && view.mint.status !== "notMinted",
    given: status === "given",
    manage: can(viewer, "editions.manage", view.canCtx),
    chainKnown: chain !== null,
    dropped: scope.product !== null && scope.product.dropped !== null,
    tracks: view.editions,
    sales: view.sales,
  });
  const hasCopies = view.editions.some((t) => t.productId === scope.id && t.kind === kind);
  // This kind's sales across its uses (EARN-4, the web desk's tile): earned, buyers, last sale.
  const tile = copyTileOf({ projectId: project.id, scope: scope.id, kind, state, tracks: view.editions, sales: view.sales });
  // Signed while a video was still being made (CL-030): waiting, not for sale yet.
  const waiting = useHeldItems(project.id).find((i): i is HeldCopies => i.kind === "copies" && i.scope === scope.id && i.kindOfCopy === kind) ?? null;
  const said = (message: string) => {
    announce(message);
    toast({ title: message });
  };
  const startSell = (use: EditionUse | null) => setSell({ use });
  const name = `${KIND_LABEL[kind]} · ${scope.product ? scope.name : "Whole project"}`;

  return (
    <>
      {waiting ? (
        <SellListRow
          icon={KIND_ICON[kind]}
          title={KIND_LABEL[kind]}
          chip={<HeldChip />}
          state={[heldTrackLine(waiting, view.editions)]}
          extra="Goes live when its videos are ready"
          onClick={() => setScreen(true)}
          label={`${name}: waiting for videos`}
        />
      ) : state.kind === "manage" ? (
        <SellListRow icon={KIND_ICON[kind]} title={KIND_LABEL[kind]} state={state.lines} live onClick={() => setScreen(true)} label={`${name}: ${state.lines.join(", ")}`} />
      ) : state.kind === "sell" ? (
        <SellListRow
          icon={KIND_ICON[kind]}
          title={KIND_LABEL[kind]}
          state={[state.line]}
          onClick={() => (hasCopies ? setScreen(true) : startSell(null))}
          label={`${name}: ${state.line}. ${hasCopies ? "Open" : "Sell"}`}
        />
      ) : (
        <SellListRow icon={KIND_ICON[kind]} title={KIND_LABEL[kind]} state={[state.line]} disabled />
      )}
      {screen && chain && (
        <CopiesScreen
          kind={kind}
          scope={scope}
          chain={chain}
          more={state.kind === "manage" ? state.more : null}
          tile={tile}
          selling={state.kind === "manage"}
          waiting={waiting}
          onSell={startSell}
          onNote={said}
          onClose={() => setScreen(false)}
        />
      )}
      {sell && (
        <SellCopiesSheet
          scope={scope}
          kind={kind}
          use={sell.use}
          onClose={() => setSell(null)}
          onDone={(message) => {
            setSell(null);
            said(message);
            setScreen(true);
          }}
        />
      )}
    </>
  );
}

/** 15d · the scope's copies of this kind, one card per use, and the one thing to do next. */
function CopiesScreen({
  kind,
  scope,
  chain,
  more,
  tile,
  selling,
  waiting,
  onSell,
  onNote,
  onClose,
}: {
  kind: EditionKind;
  scope: CopyScope;
  chain: { network: Network; collection: string };
  more: EditionUse | null;
  /** The kind's sales across its uses (`copyTileOf`). */
  tile: DeskTile;
  /** Something of this kind is listed (`copyRowStateOf` manage): its numbers show. */
  selling: boolean;
  /** Its copies' listing, signed and waiting for videos (CL-030). */
  waiting: HeldCopies | null;
  onSell: (use: EditionUse) => void;
  onNote: (message: string) => void;
  onClose: () => void;
}) {
  const { project, view } = useEarn();
  const toast = useToast();
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [menu, setMenu] = React.useState<Listed | null>(null);
  const reasonId = React.useId();
  const lockReason = lockedListReason(view.lock !== null, project.name);
  const ofKind = tracksOf(scope.id, view.editions).filter((t) => t.kind === kind);
  const unlisted = ofKind.find((t) => !t.listing) ?? null;
  const open = more && !ofKind.some((t) => t.use === more) ? more : null;
  const done = (message: string) => {
    setDialog(null);
    onNote(message);
  };

  let primary: React.ReactNode = null;
  let reason: string | null = null;
  if (waiting) {
    primary = <ReviewVideosButton projectId={project.id} />;
  } else if (unlisted) {
    reason = lockReason;
    primary = (
      <Button size="xl" className="w-full" aria-haspopup="dialog" aria-disabled={lockReason ? true : undefined} aria-describedby={lockReason ? reasonId : undefined} onClick={() => !lockReason && onSell(unlisted.use)}>
        Add to marketplace
      </Button>
    );
  } else if (open) {
    primary = (
      <Button size="xl" className="w-full" aria-haspopup="dialog" onClick={() => onSell(open)}>
        {`Sell ${USE_LABEL[open].toLowerCase()} copies too`}
      </Button>
    );
  }

  return (
    <>
      <FullLayer
        title={KIND_LABEL[kind]}
        onBack={onClose}
        footer={
          primary ? (
            <PrimaryBar reason={reason} reasonId={reasonId}>
              {primary}
            </PrimaryBar>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-8 px-8 pb-12 pt-4">
          <p className={cn(T.meta, "break-words")}>{scope.product ? `Product · ${scope.name}` : `Whole project · ${project.name}`}</p>
          {PHONE_USES.map((use) => {
            const t = ofKind.find((x) => x.use === use);
            if (t && waiting?.trackId === t.id) return <HeldCard key={use} item={waiting} projectId={project.id} products={view.products} />;
            if (t) return <TrackCard key={use} track={t} onMenu={setMenu} />;
            if (open !== use) return null;
            return (
              <SummaryCard
                key={use}
                label={`${KIND_LABEL[kind]} · ${USE_LABEL[use]}`}
                overline={USE_LABEL[use]}
                chip={<Badge tone="neutral">Not selling</Badge>}
                headline="Not selling"
                amount={false}
              />
            );
          })}
          {selling && <SalesFacts tile={tile} label={`${KIND_LABEL[kind]} sales`} />}
          <ul aria-label={`${KIND_LABEL[kind]} activity`} className={ROWS_CARD}>
            {waiting && <HeldCancelRow item={waiting} onCancelled={onNote} />}
            <NftActivityRow target={{ kind, scope: scope.id }} />
          </ul>
          {ofKind.length > 0 && <RecentSales sales={tile.sales} />}
          <p className={SUB}>{EDITION_DEMO_LINE}</p>
        </div>
      </FullLayer>
      <ActionSheet
        open={menu !== null}
        onClose={() => setMenu(null)}
        title={menu ? trackNameOf(menu) : undefined}
        items={
          menu
            ? [
                { label: "Edit", icon: PencilEdit01Icon, onSelect: () => setDialog({ kind: "edit", track: menu }) },
                { label: "Add copies", icon: Add01Icon, onSelect: () => setDialog({ kind: "add", track: menu }) },
                { label: "Remove listing", icon: Delete02Icon, destructive: true, onSelect: () => setDialog({ kind: "remove", track: menu }) },
              ]
            : []
        }
      />
      {dialog?.kind === "edit" && <EditCopiesSheet track={dialog.track} scope={scope} chain={chain} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "add" && <AddCopiesSheet track={dialog.track} scope={scope} chain={chain} onClose={() => setDialog(null)} onDone={done} />}
      <ConfirmSheet
        open={dialog?.kind === "remove"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "remove" ? `Remove ${trackNameOf(dialog.track)} from the marketplace?` : ""}
        body={
          dialog?.kind === "remove"
            ? `Nobody can buy it until you list it again. The ${trackCardOf(dialog.track, view.sales).sold} already sold stay with the people who bought them.`
            : null
        }
        verb="Remove listing"
        destructive
        onConfirm={() => {
          if (dialog?.kind !== "remove") return;
          const track = dialog.track;
          const w = writeTracks(project.id, (all) => unlistTrack(all, track.id));
          if (!w.ok) {
            toast({ title: w.message, lead: "error" });
            return;
          }
          onNote(`${trackNameOf(track)} removed from the marketplace.`);
        }}
      />
    </>
  );
}

/** One use's card: listed (the price large, sold, royalties, ⋯) or made but not listed. */
function TrackCard({ track, onMenu }: { track: EditionTrack; onMenu: (t: Listed) => void }) {
  const { project, view } = useEarn();
  const card = trackCardOf(track, view.sales);
  const listing = track.listing;
  const name = trackNameOf(track);
  const sold = copiesSoldLineOf(card);
  if (!listing) {
    return (
      <SummaryCard
        label={name}
        overline={USE_LABEL[track.use]}
        chip={<Badge tone="neutral">Not selling</Badge>}
        headline="Not selling"
        amount={false}
        sub={sold}
        note={lockedListReason(view.lock !== null, project.name)}
      />
    );
  }
  const hidden = view.lock !== null;
  return (
    <SummaryCard
      label={name}
      overline={USE_LABEL[track.use]}
      chip={<Badge tone="success">On the marketplace</Badge>}
      headline={formatAmount(listing.regular, listing.token)}
      sub={`${PRICE_LABEL.extended}: ${formatAmount(listing.extended, listing.token)}`}
      aside={
        <IconButton
          hierarchy="ghost"
          size="xl"
          aria-label={`Actions for ${name}`}
          aria-haspopup="dialog"
          icon={<Icon icon={MoreHorizontalIcon} size={20} />}
          onClick={() => onMenu(track as Listed)}
          className="-mr-4 -mt-4 text-[color:var(--color-icon-default)]"
        />
      }
      facts={[
        { label: "Copies sold", value: card.soldOut ? "Sold out" : `${card.sold} of ${card.total}` },
        { label: "Royalties", value: `${listing.royaltyPct}% on resales` },
      ]}
      // Sold out (CL-028's item panel): add copies from ⋯ to keep selling, or leave it closed.
      note={hidden ? `Off Explore marketplace: ${project.name} was sold in full.` : card.soldOut ? SOLD_OUT_NOTE : null}
    />
  );
}

/** Digits and one dot. */
function decimal(raw: string): string {
  const kept = raw.replace(/[^\d.]/g, "");
  const dot = kept.indexOf(".");
  return dot === -1 ? kept : kept.slice(0, dot + 1) + kept.slice(dot + 1).replace(/\./g, "");
}

/** 15f · Edit copies: Token, Price, Price with future updates, Royalties; Update signs the new terms. */
function EditCopiesSheet({
  track,
  scope,
  chain,
  onClose,
  onDone,
}: {
  track: Listed;
  scope: CopyScope;
  chain: { network: Network; collection: string };
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { project } = useEarn();
  const { request } = useWalletRequest();
  const [input, setInput] = React.useState<TermsInput>(() => ({
    token: track.listing.token,
    regular: track.listing.regular,
    extended: track.listing.extended,
    royalties: String(track.listing.royaltyPct),
  }));
  const [problem, setProblem] = React.useState<{ field: TermsField; message: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const prefix = React.useId().replace(/:/g, "");
  const change = (patch: Partial<TermsInput>) => {
    setInput((i) => ({ ...i, ...patch }));
    setProblem(null);
    setError(null);
  };
  const err = (f: TermsField) => (problem?.field === f ? problem.message : null);

  const submit = async () => {
    if (busy) return;
    const p = termsProblem(input, { confirmed: true, askOwner: false, owner: true });
    setProblem(p);
    if (p) return;
    const terms = termsOf(input);
    setBusy(true);
    const result = await request(
      withUseWords(listRequestOf({ track, projectName: project.name, productName: scope.name, terms, network: chain.network, collection: chain.collection, editing: true })),
      {
        commit: (proof) => {
          const w = writeTracks(project.id, (tracks) => editTrackListing(tracks, track.id, terms, proof.at));
          return w.ok ? { ok: true } : { ok: false, message: w.message };
        },
      },
    );
    setBusy(false);
    if (result.ok) return onDone(UPDATED_LINE);
    const failed = failureCopy(result);
    if (failed) setError(failed);
  };

  const each = [`${FEE_LABEL} · taken from the price of each sale`];
  const ok = (s: string) => (toMicros(s.trim()) ?? BigInt(0)) > BigInt(0);
  if (input.token && ok(input.regular)) each.push(`You receive ${formatAmount(payoutOf(input.regular.trim()), input.token)} per copy`);
  if (input.token && ok(input.extended)) each.push(`You receive ${formatAmount(payoutOf(input.extended.trim()), input.token)} per copy with future updates`);

  return (
    <Sheet
      open
      onClose={() => !busy && onClose()}
      title={`Edit ${KIND_LABEL[track.kind]} listing`}
      description={`${scope.name} · ${USE_LABEL[track.use]}`}
      actions={
        <>
          <Button size="xl" className="w-full" loading={busy} onClick={() => void submit()}>
            {busy ? "Updating…" : "Update"}
          </Button>
          {problem && (
            <p role="alert" className={cn(T.meta, "text-text-error")}>
              {problem.message}
            </p>
          )}
        </>
      }
    >
      <p className={SUB}>{EDITION_DEMO_LINE}</p>
      {error && <Banner tone="error">{error}</Banner>}
      <FactRows
        rows={[
          { label: "Use", value: USE_LABEL[track.use] },
          { label: "Number of NFTs", value: String(track.supply.total) },
        ]}
      />
      <Field label="Token" htmlFor={`${prefix}-token`} error={err("token")} errorId={`${prefix}-token-err`}>
        <SheetSelect
          id={`${prefix}-token`}
          title="Token"
          placeholder="Choose a token"
          value={input.token ?? ""}
          options={TOKENS_BY_NETWORK[chain.network].map((t) => ({ value: t, label: t }))}
          invalid={!!err("token")}
          onChange={(v) => change({ token: v as Token })}
        />
      </Field>
      <Field label={PRICE_LABEL.regular} htmlFor={`${prefix}-regular`} error={err("regular")} errorId={`${prefix}-regular-err`}>
        <TextInput id={`${prefix}-regular`} size="xl" inputMode="decimal" placeholder="e.g. 0.01" value={input.regular} invalid={!!err("regular")} onValueChange={(v) => change({ regular: decimal(v) })} />
      </Field>
      <Field label={PRICE_LABEL.extended} htmlFor={`${prefix}-extended`} error={err("extended")} errorId={`${prefix}-extended-err`}>
        <TextInput id={`${prefix}-extended`} size="xl" inputMode="decimal" placeholder="e.g. 0.02" value={input.extended} invalid={!!err("extended")} onValueChange={(v) => change({ extended: decimal(v) })} />
      </Field>
      <Field label="Royalties (%)" htmlFor={`${prefix}-royalties`} error={err("royalties")} errorId={`${prefix}-royalties-err`}>
        <TextInput
          id={`${prefix}-royalties`}
          size="xl"
          inputMode="numeric"
          placeholder={`${ROYALTY_MIN} to ${ROYALTY_MAX}`}
          value={input.royalties}
          invalid={!!err("royalties")}
          onValueChange={(v) => change({ royalties: v.replace(/[^\d]/g, "").slice(0, 2) })}
        />
        {!err("royalties") && <span className={SUB}>Paid to you on every resale.</span>}
      </Field>
      <section aria-label="Each sale" className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-6">
        <span className={cn(T.label, "text-text-tertiary")}>Each sale</span>
        {each.map((r) => (
          <p key={r} className={cn(T.body, "tabular-nums")}>
            {r}
          </p>
        ))}
      </section>
    </Sheet>
  );
}

/** 15e · Add copies: how many now, how many to add (lazy), the box; Add NFTs signs for them. */
function AddCopiesSheet({
  track,
  scope,
  chain,
  onClose,
  onDone,
}: {
  track: EditionTrack;
  scope: CopyScope;
  chain: { network: Network; collection: string };
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { project } = useEarn();
  const { request } = useWalletRequest();
  const [count, setCount] = React.useState("10");
  const [confirmed, setConfirmed] = React.useState(false);
  const [reason, setReason] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const prefix = React.useId().replace(/:/g, "");
  const name = `${USE_LABEL[track.use]} ${KIND_LABEL[track.kind].replace(" NFT", "")} NFT`;

  const submit = async () => {
    if (busy) return;
    const n = wholeNumberOf(count);
    const p = checkAddNfts({ count: n, confirmed });
    setReason(p);
    setError(null);
    if (p || n === null) return;
    const doneLine = `${n} ${name}${n === 1 ? "" : "s"} added — Testnet demo`;
    setBusy(true);
    const result = await request(
      withUseWords(
        createRequestOf({ projectName: project.name, productName: scope.name, kind: track.kind, use: track.use, n, network: chain.network, collection: chain.collection, doneLine }),
      ),
      {
        commit: (proof) => {
          const w = writeTracks(project.id, (tracks) => addToSupply(tracks, track.id, n, proof.at));
          return w.ok ? { ok: true } : { ok: false, message: w.message };
        },
      },
    );
    setBusy(false);
    if (result.ok) return onDone(doneLine);
    const failed = failureCopy(result);
    if (failed) setError(failed);
  };

  const countProblem = reason?.startsWith("Enter") ? reason : null;
  const boxProblem = reason?.startsWith("Tick") ? reason : null;
  return (
    <Sheet
      open
      onClose={() => !busy && onClose()}
      title={`Add ${name}s`}
      description={`${scope.name} · ${project.name}`}
      actions={
        <>
          <Button size="xl" className="w-full" loading={busy} onClick={() => void submit()}>
            {busy ? "Adding…" : "Add NFTs"}
          </Button>
          {boxProblem && (
            <p id={`${prefix}-reason`} role="alert" className={cn(T.meta, "text-text-error")}>
              {boxProblem}
            </p>
          )}
        </>
      }
    >
      <p className={SUB}>{EDITION_DEMO_LINE}</p>
      {error && <Banner tone="error">{plainUseWords(error)}</Banner>}
      <FactRows rows={[{ label: "Number of NFTs now", value: String(track.supply.total) }]} />
      <Field label="Number to add" htmlFor={`${prefix}-count`} error={countProblem} errorId={`${prefix}-count-err`}>
        <TextInput
          id={`${prefix}-count`}
          size="xl"
          inputMode="numeric"
          value={count}
          invalid={!!countProblem}
          onValueChange={(v) => {
            setCount(v.replace(/[^\d]/g, "").slice(0, 6));
            setReason(null);
          }}
        />
        {!countProblem && <span className={SUB}>A whole number from 1 to 10,000. They&apos;re lazy minted, so nothing is charged now.</span>}
      </Field>
      <CheckRow
        checked={confirmed}
        invalid={!!boxProblem}
        describedBy={boxProblem ? `${prefix}-reason` : undefined}
        onToggle={() => {
          setConfirmed((c) => !c);
          setReason(null);
        }}
      >
        Add them to the live listing at its current prices.
      </CheckRow>
    </Sheet>
  );
}
