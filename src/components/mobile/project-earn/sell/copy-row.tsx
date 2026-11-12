"use client";

// A Physical or Virtual row of one scope (the whole project or a product) and
// its Manage (Figma 14, 15d, 15e–15g; the web's editions.tsx CopyRow and
// edition-block.tsx EditionTracks). The state is `copyRowStateOf`, first match
// wins, and never asks the Main listing:
// · Sell opens the copies sheet with the kind preset (sell-copies.tsx);
//   given, sold in full, an unknown collection or a dropped product grey it
//   with the reason as the state;
// · Manage opens the scope's uses under the row: a listed use's card
//   ({kind} · Personal use, On the marketplace, Copies sold, Price / Price with
//   future updates / Royalties, Edit · Add copies · Remove listing), a made
//   but unlisted one's Add to marketplace, and the other use's "Not selling"
//   with Sell … copies too; "Nothing is minted or listed on a real blockchain.";
// · Edit (15f) and Add copies (15e) sign through the phone's wallet sheet;
//   Remove listing (15g) asks first.
// The NFT activity line sits in the row once the scope has copies.

import * as React from "react";
import { Add01Icon, Delete02Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field } from "@/components/auth/auth-parts";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
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
import type { EditionKind, EditionTrack, EditionUse } from "@/lib/market/types";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { Sheet } from "../../kit/sheet";
import { SheetSelect } from "../../kit/sheet-select";
import { useToast } from "../../kit/toast";
import { useEarn } from "../context";
import { FactRows } from "../parts";
import { NftActivityLine } from "./nft-activity";
import { CheckRow, DoneNote, RowButton, SellRow, StateLines, SUB } from "./parts";
import { SellCopiesSheet, type CopyScope } from "./sell-copies";
import { cn } from "@/lib/utils";
import { T } from "../../type";

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };
type Dialog = { kind: "edit"; track: Listed } | { kind: "add"; track: EditionTrack } | { kind: "remove"; track: EditionTrack } | null;

export function CopyRow({ kind, scope }: { kind: EditionKind; scope: CopyScope }) {
  const { project, view, viewer, brief, announce } = useEarn();
  const [sell, setSell] = React.useState<{ use: EditionUse | null } | null>(null);
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const base = `${scope.id}-${kind}`;
  const stateId = `state-${base}`;
  const panelId = `manage-${base}`;
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

  const startSell = (use: EditionUse | null) => {
    setNote(null);
    setSell({ use });
  };

  const action =
    state.kind === "manage" ? (
      <RowButton label="Manage" expanded={open} controls={panelId} onClick={() => setOpen((o) => !o)} />
    ) : state.kind === "sell" ? (
      <RowButton label="Sell" onClick={() => startSell(null)} />
    ) : (
      <RowButton label="Sell" disabled describedBy={stateId} />
    );
  const hasCopies = view.editions.some((t) => t.productId === scope.id && t.kind === kind);

  return (
    <SellRow
      label={KIND_LABEL[kind]}
      stateId={stateId}
      state={
        <div className="flex flex-col gap-1">
          {state.kind === "manage" ? <StateLines lines={state.lines} live /> : <StateLines lines={[state.line]} />}
          {hasCopies && <NftActivityLine target={{ kind, scope: scope.id }} />}
        </div>
      }
      action={action}
    >
      {note && (
        <div className="px-8 pb-6">
          <DoneNote note={note} />
        </div>
      )}
      {state.kind === "manage" && open && chain && (
        <div id={panelId} className="flex flex-col gap-8 border-t-[length:var(--border-width-1)] border-solid border-border px-8 py-6">
          <Tracks kind={kind} scope={scope} chain={chain} more={state.more} onSell={startSell} onNote={(m) => {
            setNote(m);
            announce(m);
          }} />
          <p className={SUB}>{EDITION_DEMO_LINE}</p>
        </div>
      )}
      {sell && (
        <SellCopiesSheet
          scope={scope}
          kind={kind}
          use={sell.use}
          onClose={() => setSell(null)}
          onDone={(message) => {
            setSell(null);
            setNote(message);
            announce(message);
            setOpen(true);
          }}
        />
      )}
    </SellRow>
  );
}

/** 15d · each use of this kind for the scope. */
function Tracks({
  kind,
  scope,
  chain,
  more,
  onSell,
  onNote,
}: {
  kind: EditionKind;
  scope: CopyScope;
  chain: { network: Network; collection: string };
  more: EditionUse | null;
  onSell: (use: EditionUse) => void;
  onNote: (message: string) => void;
}) {
  const { project, view } = useEarn();
  const toast = useToast();
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const lockReason = lockedListReason(view.lock !== null, project.name);
  const ofKind = tracksOf(scope.id, view.editions).filter((t) => t.kind === kind);
  const done = (message: string) => {
    setDialog(null);
    onNote(message);
  };
  return (
    <>
      {PHONE_USES.map((use, i) => {
        const t = ofKind.find((x) => x.use === use);
        const name = `${KIND_LABEL[kind]} · ${USE_LABEL[use]}`;
        if (!t && more !== use) return null;
        return (
          <section key={use} aria-label={name} className={i > 0 ? "flex flex-col gap-4 border-t-[length:var(--border-width-1)] border-solid border-border pt-8" : "flex flex-col gap-4"}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h4 className={T.rowTitle}>{name}</h4>
              <Badge tone={t?.listing ? "success" : "neutral"}>{t?.listing ? "On the marketplace" : "Not selling"}</Badge>
            </div>
            {t ? (
              <TrackBody track={t} listBlocked={lockReason} hidden={t.listing !== null && view.lock !== null} onList={() => onSell(use)} onDialog={setDialog} />
            ) : (
              <Button hierarchy="secondary" size="xl" className="self-start" aria-haspopup="dialog" onClick={() => onSell(use)}>
                {`Sell ${USE_LABEL[use].toLowerCase()} copies too`}
              </Button>
            )}
          </section>
        );
      })}

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

function TrackBody({
  track,
  listBlocked,
  hidden,
  onList,
  onDialog,
}: {
  track: EditionTrack;
  listBlocked: string | null;
  hidden: boolean;
  onList: () => void;
  onDialog: (d: Dialog) => void;
}) {
  const { project, view } = useEarn();
  const card = trackCardOf(track, view.sales);
  const listing = track.listing;
  return (
    <>
      <p className={card.soldOut ? cn(T.meta, "text-text-success") : SUB}>{copiesSoldLineOf(card)}</p>
      {listing ? (
        <>
          <FactRows
            label={trackNameOf(track)}
            rows={[
              { label: PRICE_LABEL.regular, value: formatAmount(listing.regular, listing.token) },
              { label: PRICE_LABEL.extended, value: formatAmount(listing.extended, listing.token) },
              { label: "Royalties", value: `${listing.royaltyPct}% on resales` },
            ]}
          />
          {hidden && <p className={SUB}>{`Off Explore marketplace: ${project.name} was sold in full.`}</p>}
          <div className="flex flex-wrap gap-4">
            <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={PencilEdit01Icon} size={20} />} onClick={() => onDialog({ kind: "edit", track: track as Listed })}>
              Edit
            </Button>
            <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={Add01Icon} size={20} />} onClick={() => onDialog({ kind: "add", track })}>
              Add copies
            </Button>
            <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={Delete02Icon} size={20} />} onClick={() => onDialog({ kind: "remove", track })}>
              Remove listing
            </Button>
          </div>
        </>
      ) : listBlocked ? (
        <p className={SUB}>{listBlocked}</p>
      ) : (
        <Button hierarchy="secondary" size="xl" className="self-start" aria-haspopup="dialog" onClick={onList}>
          Add to marketplace
        </Button>
      )}
    </>
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
          <Button hierarchy="secondary" size="xl" className="w-full" disabled={busy} onClick={onClose}>
            Cancel
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
          <Button hierarchy="secondary" size="xl" className="w-full" disabled={busy} onClick={onClose}>
            Cancel
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
