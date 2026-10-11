"use client";

// A product's Physical NFT and Virtual NFT editions (Figma 41505:137261,
// 138307, 139690…141777; P2-TABS-24…27 as changed in spec §4.9), in two
// parts since Build and Earn:
//
// - `EditionTracks` — the owner's tracks of one kind and one scope (the whole
//   project, or one product), under a Physical or Virtual row's Manage in
//   Earn › Sell (earn/editions.tsx). A track card, in the maker's words
//   (sell-flow.ts): "Copies sold {s} of {t}" (or "Sold out"), its use pill
//   ("Personal use", "Business use"), "Price" and "Price with future
//   updates", "+{n} new" after Add copies until the next sale, and either Add
//   to marketplace or the listed prices with Edit · Remove listing · Add
//   copies. Add to marketplace asks the scope's readiness first: one
//   product's video ("edition", errata 16), or every product's for the whole
//   project ("sell"). The Main listing is never asked (owner, 2026-10-11).
//   Creating a track is the row's Sell flow (P1-3); the row also says why
//   when a gate (Draft, Given, sold in full, an unknown collection) stops it,
//   so the cards are absent then. Every button is quiet (C16).
// - `EditionBlock` — the product page's rail block "Marketplace" for anyone
//   else (a preview, a demo buyer): the Testnet demo badge, a tablist
//   "Physical NFT · Virtual NFT", and only the tracks buyers can see,
//   read-only, with a link to the project on Explore marketplace. Absent
//   when there are none, once the project is sold in full, and for the owner,
//   who manages editions in Earn.
//
// Every fact is the page's derivation (`view`); every write is a dialog's,
// re-read and written once. What changed is said in the page's live region
// and shown above the rows, and focus moves to the card's next control.

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, ConfirmDialog, TestnetDemoBadge } from "@/components/ideeza";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useProjectBrief } from "@/lib/brief/project-brief";
import type { Network } from "@/lib/brief/types";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { readinessFactsOf, readinessOf } from "@/lib/manual/readiness";
import {
  editionChainOf,
  editionGate,
  KIND_WORD,
  lockedListReason,
  trackCardOf,
  tracksOf,
  unlistTrack,
  USE_WORD,
} from "@/lib/market/editions";
import { copiesSoldLineOf, KIND_LABEL, PRICE_LABEL, trackNameOf, USE_LABEL } from "@/lib/market/sell-flow";
import type { EditionKind, EditionTrack, EditionUse, Listing } from "@/lib/market/types";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { moveTab } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";
import { dialogBlockerOf, ReadinessDialog } from "../details/readiness-dialog";
import { RailBlock, RailFact, RailFacts } from "../details/rail-block";
import type { ProjectProduct } from "@/lib/manual/project-read";
import type { ProductSlotProps } from "../product/product-slots";
import { AddNftsDialog } from "./add-nfts-dialog";
import { focusSoon } from "../listing/listing-dialog";
import { TAP, writeTracks } from "./create-dialog";
import { EditDialog } from "./edit-dialog";
import { ListDialog } from "./list-dialog";

const KINDS: EditionKind[] = ["physical", "virtual"];
const USES: EditionUse[] = ["private", "commercial"];

const TAB =
  "inline-flex h-[32px] shrink-0 items-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-6 text-sm font-semibold outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:h-[var(--touch-min)] max-md:h-[var(--touch-min)]";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";
const LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-sm font-semibold text-text-link underline-offset-2 outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };
type Dialog = { kind: "gate" | "list" | "edit" | "add" | "remove"; track: EditionTrack } | null;

/** Whose copies: one product, or the whole project (`id` = `PROJECT_SCOPE`, `product` null). */
export type CopyScope = { id: string; name: string; product: ProjectProduct | null };

export function helperLineOf(kind: EditionKind, product: string): string {
  return kind === "physical"
    ? `A licence to build ${product} — buyers get its fabrication files.`
    : `A licence to ${product}'s digital twin — buyers get the 3D model and preview.`;
}

const firstControlId = (trackId: string) => `edition-${trackId}`;

export function EditionBlock(props: ProductSlotProps) {
  const { view, product, viewer } = props;
  const owner = can(viewer, "facts.seeOwnerOnly");
  const hidden = view.lock !== null;
  // What buyers can see: listed, whatever the Main listing's state, until the project is sold in full.
  const publicTracks = React.useMemo(
    () => (hidden ? [] : tracksOf(product.id, view.editions).filter((t) => t.listing !== null)),
    [hidden, product.id, view.editions],
  );
  if (owner || publicTracks.length === 0) return null;
  return (
    <RailBlock title="Marketplace" meta={`${publicTracks.length} on sale`}>
      <PublicBody {...props} tracks={publicTracks} />
    </RailBlock>
  );
}

/** The block's tablist and the one panel under it. */
function KindTabs({
  active,
  onSelect,
  children,
}: {
  active: EditionKind;
  onSelect: (k: EditionKind) => void;
  children: React.ReactNode;
}) {
  const base = React.useId().replace(/:/g, "");
  const tabId = (k: EditionKind) => `${base}-tab-${k}`;
  const panelId = `${base}-panel`;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-solid border-border">
        <div
          role="tablist"
          aria-label="NFT editions"
          onKeyDown={(e) => moveTab(e, KINDS, active, onSelect)}
          className="flex flex-nowrap items-end gap-2"
        >
          {KINDS.map((k) => {
            const on = k === active;
            return (
              <button
                key={k}
                id={tabId(k)}
                type="button"
                role="tab"
                data-tab={k}
                aria-selected={on}
                aria-controls={on ? panelId : undefined}
                tabIndex={on ? 0 : -1}
                onClick={() => onSelect(k)}
                className={cn(TAB, on ? TAB_ON : TAB_OFF)}
              >
                {KIND_WORD[k]} NFT
              </button>
            );
          })}
        </div>
        <TestnetDemoBadge className="mb-3" />
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(active)} className="flex flex-col gap-6">
        {children}
      </div>
    </>
  );
}

function ChainFacts({ chain }: { chain: { network: Network; collection: string } }) {
  return (
    <RailFacts>
      <RailFact label="Collection">{chain.collection}</RailFact>
      <RailFact label="Blockchain">{networkLabelOf(chain.network)}</RailFact>
    </RailFacts>
  );
}

/** The owner's tracks of one kind for one scope, with their dialogs (Earn › Sell, a row's Manage). */
export function EditionTracks({
  kind,
  scope,
  project,
  view,
  viewer,
  announce,
}: Omit<ProductSlotProps, "version" | "product"> & { kind: EditionKind; scope: CopyScope }) {
  const brief = useProjectBrief(project.id) ?? null;
  const { jobs, now } = useVideoJobs();
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [removeError, setRemoveError] = React.useState<string | null>(null);
  const product = scope.product;
  const name = scope.name;
  const main: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, view.mint.status === "legacy" && brief ? brief.state : null);

  const status = view.summary.status;
  const gate = editionGate({
    minted: status !== "draft" && view.mint.status !== "notMinted",
    intent: status === "given" ? "give" : null,
    projectName: project.name,
  });
  const blocked = gate.kind === "blocked" || !can(viewer, "editions.manage", view.canCtx) || !chain;
  const lockReason = lockedListReason(view.lock !== null, project.name);

  const done = (message: string, focusId?: string) => {
    setDialog(null);
    setNote(message);
    announce(message);
    if (focusId) focusSoon(focusId);
  };
  const open = (d: Dialog) => {
    setNote(null);
    setRemoveError(null);
    setDialog(d);
  };

  // The scope's readiness: one product's video, or every product's for the whole project.
  const readiness = () => {
    const facts = readinessFactsOf(project, view, brief, view.videos.record, jobs, now);
    return product ? readinessOf({ ...facts, product }, "edition") : readinessOf(facts, "sell");
  };
  const startListing = (track: EditionTrack) => open({ kind: dialogBlockerOf(readiness()) ? "gate" : "list", track });
  const ownershipAsked = () => readiness().rules.some((r) => r.id === "ownership" && !r.ok);

  const ofKind = tracksOf(scope.id, view.editions)
    .filter((t) => t.kind === kind)
    .sort((a, b) => USES.indexOf(a.use) - USES.indexOf(b.use));

  const confirmRemove = (track: EditionTrack) => {
    const w = writeTracks(project.id, (all) => unlistTrack(all, track.id));
    if (!w.ok) {
      setRemoveError(w.message);
      return;
    }
    done(`${trackNameOf(track)} removed from the marketplace.`, `${firstControlId(track.id)}-list`);
  };

  if (blocked || ofKind.length === 0) return null;
  const d = dialog;
  return (
    <>
      <div className="flex flex-col gap-6">
        {note && (
          <p className="m-0 flex items-start gap-2 text-sm font-medium text-text-success">
            <span aria-hidden className="mt-[2px] inline-flex">
              <Icon icon={CheckmarkCircle02Icon} size={14} />
            </span>
            {note}
          </p>
        )}
        <ul role="list" aria-label={`${KIND_LABEL[kind]} of ${name}`} className="m-0 flex list-none flex-col gap-6 p-0">
          {ofKind.map((t) => (
            <li key={t.id}>
              <TrackCard
                track={t}
                view={view}
                projectName={project.name}
                listBlocked={lockReason}
                hidden={t.listing !== null && view.lock !== null}
                onList={() => startListing(t)}
                onEdit={() => open({ kind: "edit", track: t })}
                onRemove={() => open({ kind: "remove", track: t })}
                onAdd={() => open({ kind: "add", track: t })}
              />
            </li>
          ))}
        </ul>
      </div>

      {d?.kind === "gate" && (
        <ReadinessDialog
          purpose={product ? "edition" : "sell"}
          project={project}
          view={view}
          brief={brief}
          product={product ?? undefined}
          onPass={() => setDialog({ kind: "list", track: d.track })}
          onClose={() => setDialog(null)}
        />
      )}
      {d?.kind === "list" && chain && (
        <ListDialog
          project={project}
          productName={name}
          track={d.track}
          chain={chain}
          main={main}
          askOwner={ownershipAsked()}
          onClose={() => setDialog(null)}
          onDone={(m) => done(m, `${firstControlId(d.track.id)}-edit`)}
        />
      )}
      {d?.kind === "edit" && chain && d.track.listing && (
        <EditDialog
          projectId={project.id}
          projectName={project.name}
          productName={name}
          track={d.track as Listed}
          chain={chain}
          onClose={() => setDialog(null)}
          onDone={(m) => done(m, `${firstControlId(d.track.id)}-edit`)}
        />
      )}
      {d?.kind === "add" && chain && (
        <AddNftsDialog
          projectId={project.id}
          projectName={project.name}
          productName={name}
          track={d.track}
          chain={chain}
          onClose={() => setDialog(null)}
          onDone={(m) => done(m, `${firstControlId(d.track.id)}-add`)}
        />
      )}
      {d?.kind === "remove" && (
        <ConfirmDialog
          open
          title={`Remove ${trackNameOf(d.track)} from the marketplace?`}
          confirmLabel="Remove listing"
          onCancel={() => setDialog(null)}
          onConfirm={() => confirmRemove(d.track)}
        >
          <div className="flex flex-col gap-6">
            <p>
              Buyers can&apos;t buy it until you list it again. The {trackCardOf(d.track, view.sales).sold} already sold stay with
              their buyers.
            </p>
            {removeError && <Banner tone="error">{removeError}</Banner>}
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}

/** `plain`: the owner's card in the maker's words (Personal use, Copies sold 3 of 30); a buyer's keeps editions.ts's. */
function TrackHead({ track, view, plain = false }: { track: EditionTrack; view: ProductSlotProps["view"]; plain?: boolean }) {
  const card = trackCardOf(track, view.sales);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Badge tone="neutral">{plain ? USE_LABEL[track.use] : USE_WORD[track.use]}</Badge>
      <span className={cn("text-md font-semibold tabular-nums", card.soldOut ? "text-text-success" : "text-text-primary")}>
        {plain ? copiesSoldLineOf(card) : card.soldLine}
      </span>
      {card.newBadge && <Badge tone="info">{card.newBadge}</Badge>}
    </div>
  );
}

function Prices({ listing, plain = false }: { listing: NonNullable<EditionTrack["listing"]>; plain?: boolean }) {
  return (
    <RailFacts>
      <RailFact label={plain ? PRICE_LABEL.regular : "Regular price"}>
        <span className="tabular-nums">{formatAmount(listing.regular, listing.token)}</span>
      </RailFact>
      <RailFact label={plain ? PRICE_LABEL.extended : "Extended price"}>
        <span className="tabular-nums">{formatAmount(listing.extended, listing.token)}</span>
      </RailFact>
      <RailFact label="Royalties">{listing.royaltyPct}% on resales</RailFact>
    </RailFacts>
  );
}

function TrackCard({
  track,
  view,
  projectName,
  listBlocked,
  hidden,
  onList,
  onEdit,
  onRemove,
  onAdd,
}: {
  track: EditionTrack;
  view: ProductSlotProps["view"];
  projectName: string;
  listBlocked: string | null;
  hidden: boolean;
  onList: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onAdd: () => void;
}) {
  const id = firstControlId(track.id);
  const hiddenLine = `Off Explore marketplace: ${projectName} was sold in full.`;
  return (
    <section aria-label={trackNameOf(track)} className="flex flex-col gap-5 rounded-lg border border-solid border-border p-6">
      <TrackHead track={track} view={view} plain />
      {track.listing ? (
        <>
          <Prices listing={track.listing} plain />
          {hidden && <p className="m-0 text-sm text-text-secondary">{hiddenLine}</p>}
          <div className="flex flex-wrap gap-4">
            <Button id={`${id}-edit`} type="button" hierarchy="secondary" size="md" className={TAP} onClick={onEdit}>
              Edit
            </Button>
            <Button type="button" hierarchy="secondary" size="md" className={cn(TAP, "text-text-error")} onClick={onRemove}>
              Remove listing
            </Button>
            <Button id={`${id}-add`} type="button" hierarchy="secondary" size="md" className={TAP} onClick={onAdd}>
              Add copies
            </Button>
          </div>
        </>
      ) : listBlocked ? (
        <p className="m-0 text-sm leading-relaxed text-text-secondary">{listBlocked}</p>
      ) : (
        <Button
          id={`${id}-list`}
          type="button"
          hierarchy="secondary"
          size="md"
          className={cn("self-start", TAP)}
          onClick={onList}
        >
          Add to marketplace
        </Button>
      )}
    </section>
  );
}

/** A preview or a demo buyer: the tracks buyers can see, read-only (P2-TABS-24 "Who"). */
function PublicBody({ project, view, product, viewer, tracks }: ProductSlotProps & { tracks: EditionTrack[] }) {
  const firstKind = KINDS.find((k) => tracks.some((t) => t.kind === k)) ?? "physical";
  const [kind, setKind] = React.useState<EditionKind>(firstKind);
  const name = displayProductName(product.name);
  const main: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  const ofKind = tracks.filter((t) => t.kind === kind).sort((a, b) => USES.indexOf(a.use) - USES.indexOf(b.use));
  return (
    <>
      <KindTabs active={kind} onSelect={setKind}>
        <p className="m-0 text-sm leading-relaxed text-text-secondary">{helperLineOf(kind, name)}</p>
        {chain && <ChainFacts chain={chain} />}
        {ofKind.length ? (
          <ul role="list" className="m-0 flex list-none flex-col gap-6 p-0">
            {ofKind.map((t) => (
              <li key={t.id}>
                <section
                  aria-label={`${USE_WORD[t.use]} ${KIND_WORD[t.kind]} NFT`}
                  className="flex flex-col gap-5 rounded-lg border border-solid border-border p-6"
                >
                  <TrackHead track={t} view={view} />
                  {t.listing && <Prices listing={t.listing} />}
                </section>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-text-secondary">{`No ${KIND_WORD[kind]} NFTs of ${name} are on sale.`}</p>
        )}
      </KindTabs>
      <Link href={`/marketplace/${project.id}`} className={LINK}>
        {viewer.kind === "demo-buyer" ? `Buy on ${project.name}'s page` : "View on Explore marketplace"}
        <Icon icon={ArrowUpRight01Icon} size={14} />
      </Link>
    </>
  );
}
