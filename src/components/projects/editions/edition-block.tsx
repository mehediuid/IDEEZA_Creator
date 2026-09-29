"use client";

// The product page's rail block "Marketplace": this product's Physical NFT and
// Virtual NFT editions (Figma 41505:137261, 138307, 139690…141777; P2-TABS-24
// …27 as changed in spec §4.9). It is the one home of every edition control
// (§2.7); the project page shows a read-only summary (edition-summary.tsx).
//
// - The Testnet demo badge, then a tablist "Physical NFT · Virtual NFT"
//   (neutral selected style, Physical first). Each tab: its helper line, the
//   project's Collection and Blockchain (the mint record's), then the tracks.
// - The owner's gates, first match wins, each replacing the tracks with no
//   disabled buttons: Draft → Given → sold in full (locked) → the tracks.
// - A track card: "NFTs sold {s}/{t}" (or "Sold out"), its use pill, "+{n}
//   new" after Add NFTs until the next sale, and either Add to marketplace or
//   the listed prices with Edit · Remove listing · Add NFTs. Add to
//   marketplace asks `listGate` (the Main listing live or paused) and then
//   the strict "edition" readiness of this product only (errata 16) before
//   the listing dialog opens. While Main is paused or removed, a listed card
//   says it's hidden on Explore marketplace.
// - Create {Kind} NFT stays while one of the kind's two uses is uncreated.
// - Every button is quiet (C16): Open in editor is the page's one violet.
// - Anyone else (a preview, a demo buyer): only the tracks buyers can see,
//   read-only, and a link to the project on Explore marketplace; the block
//   is absent when there are none.
//
// Every fact is the page's derivation (`view`); every write is a dialog's,
// re-read and written once. What changed is said in the page's live region
// and shown in the block, and focus moves to the card's next control.

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
  canCreate,
  editionChainOf,
  editionGate,
  editionsHiddenWith,
  KIND_WORD,
  listGate,
  trackCardOf,
  tracksOf,
  unlistTrack,
  USE_WORD,
} from "@/lib/market/editions";
import type { EditionKind, EditionTrack, EditionUse, Listing } from "@/lib/market/types";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { moveTab } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";
import { dialogBlockerOf, ReadinessDialog } from "../details/readiness-dialog";
import { RailBlock, RailFact, RailFacts } from "../details/rail-block";
import type { ProductSlotProps } from "../product/product-slots";
import { AddNftsDialog } from "./add-nfts-dialog";
import { focusSoon } from "../listing/listing-dialog";
import { CreateDialog, TAP, writeTracks } from "./create-dialog";
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
type Dialog =
  { kind: "create"; edition: EditionKind } | { kind: "gate" | "list" | "edit" | "add" | "remove"; track: EditionTrack } | null;

export function helperLineOf(kind: EditionKind, product: string): string {
  return kind === "physical"
    ? `A licence to build ${product} — buyers get its fabrication files.`
    : `A licence to ${product}'s digital twin — buyers get the 3D model and preview.`;
}

const firstControlId = (trackId: string) => `edition-${trackId}`;

export function EditionBlock(props: ProductSlotProps) {
  const { view, product, viewer } = props;
  const owner = can(viewer, "facts.seeOwnerOnly");
  const mine = React.useMemo(() => tracksOf(product.id, view.editions), [product.id, view.editions]);
  const hidden = editionsHiddenWith(view.listing, view.lock !== null);
  // What buyers can see: listed, and not hidden by a paused or removed Main listing.
  const publicTracks = React.useMemo(() => (hidden ? [] : mine.filter((t) => t.listing !== null)), [hidden, mine]);

  if (!owner && publicTracks.length === 0) return null;
  const listed = mine.filter((t) => t.listing).length;
  const meta = owner ? (listed ? `${listed} listed` : undefined) : `${publicTracks.length} on sale`;
  return (
    <RailBlock title="Marketplace" meta={meta}>
      {owner ? <OwnerBody {...props} tracks={mine} /> : <PublicBody {...props} tracks={publicTracks} />}
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

function OwnerBody({ project, view, product, viewer, announce, tracks }: ProductSlotProps & { tracks: EditionTrack[] }) {
  const brief = useProjectBrief(project.id) ?? null;
  const { jobs, now } = useVideoJobs();
  const [kind, setKind] = React.useState<EditionKind>("physical");
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [removeError, setRemoveError] = React.useState<string | null>(null);
  const name = displayProductName(product.name);
  const main: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, view.mint.status === "legacy" && brief ? brief.state : null);

  const status = view.summary.status;
  const gate = editionGate({
    minted: status !== "draft" && view.mint.status !== "notMinted",
    intent: status === "given" ? "give" : null,
    projectName: project.name,
  });
  const manage = can(viewer, "editions.manage", view.canCtx);
  const blocked =
    gate.kind === "blocked"
      ? gate.reason
      : !manage
        ? `${project.name} was sold in full — its NFTs can't be changed.`
        : !chain
          ? "This mint's collection isn't known, so its NFTs can't be created. Check it in the Brief."
          : null;
  const listing = listGate(view.listing, project.name);

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

  // Add to marketplace: the list gate is shown on the card; then this product's video.
  const startListing = (track: EditionTrack) => {
    const facts = readinessFactsOf(project, view, brief, view.videos.record, jobs, now);
    const readiness = readinessOf({ ...facts, product }, "edition");
    open({ kind: dialogBlockerOf(readiness) ? "gate" : "list", track });
  };
  const ownershipAsked = () => {
    const facts = readinessFactsOf(project, view, brief, view.videos.record, jobs, now);
    return readinessOf({ ...facts, product }, "edition").rules.some((r) => r.id === "ownership" && !r.ok);
  };

  const ofKind = tracks.filter((t) => t.kind === kind).sort((a, b) => USES.indexOf(a.use) - USES.indexOf(b.use));
  const create = canCreate(tracks, product.id, kind);

  const confirmRemove = (track: EditionTrack) => {
    const w = writeTracks(project.id, (all) => unlistTrack(all, track.id));
    if (!w.ok) {
      setRemoveError(w.message);
      return;
    }
    done(`${USE_WORD[track.use]} ${KIND_WORD[track.kind]} NFT removed from the marketplace.`, `${firstControlId(track.id)}-list`);
  };

  const d = dialog;
  return (
    <>
      <KindTabs active={kind} onSelect={setKind}>
        <p className="m-0 text-sm leading-relaxed text-text-secondary">{helperLineOf(kind, name)}</p>
        {blocked ? (
          <p className="m-0 text-md leading-relaxed text-text-primary">{blocked}</p>
        ) : (
          <>
            {chain && <ChainFacts chain={chain} />}
            {note && (
              <p className="m-0 flex items-start gap-2 text-sm font-medium text-text-success">
                <span aria-hidden className="mt-[2px] inline-flex">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
                {note}
              </p>
            )}
            {ofKind.length > 0 && (
              <ul role="list" className="m-0 flex list-none flex-col gap-6 p-0">
                {ofKind.map((t) => (
                  <li key={t.id}>
                    <TrackCard
                      track={t}
                      view={view}
                      projectName={project.name}
                      listBlocked={listing.kind === "blocked" ? listing.reason : null}
                      hidden={t.listing !== null && editionsHiddenWith(view.listing, view.lock !== null)}
                      onList={() => startListing(t)}
                      onEdit={() => open({ kind: "edit", track: t })}
                      onRemove={() => open({ kind: "remove", track: t })}
                      onAdd={() => open({ kind: "add", track: t })}
                    />
                  </li>
                ))}
              </ul>
            )}
            {create.bothCreated ? (
              <p className="m-0 text-sm text-text-secondary">Both Private use and Commercial use are created.</p>
            ) : (
              <Button
                type="button"
                hierarchy="secondary"
                size="md"
                className={cn("self-start", TAP)}
                onClick={() => open({ kind: "create", edition: kind })}
              >
                {`Create ${KIND_WORD[kind]} NFT`}
              </Button>
            )}
          </>
        )}
      </KindTabs>

      {d?.kind === "create" && chain && (
        <CreateDialog
          projectId={project.id}
          projectName={project.name}
          productId={product.id}
          productName={name}
          kind={d.edition}
          chain={chain}
          tracks={view.editions}
          onClose={() => setDialog(null)}
          onDone={(track, message) => done(message, `${firstControlId(track.id)}-list`)}
        />
      )}
      {d?.kind === "gate" && (
        <ReadinessDialog
          purpose="edition"
          project={project}
          view={view}
          brief={brief}
          product={product}
          onPass={() => setDialog({ kind: "list", track: d.track })}
          onClose={() => setDialog(null)}
        />
      )}
      {d?.kind === "list" && chain && (
        <ListDialog
          projectId={project.id}
          projectName={project.name}
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
          title={`Remove ${USE_WORD[d.track.use]} ${KIND_WORD[d.track.kind]} NFT from the marketplace?`}
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

function TrackHead({ track, view }: { track: EditionTrack; view: ProductSlotProps["view"] }) {
  const card = trackCardOf(track, view.sales);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Badge tone="neutral">{USE_WORD[track.use]}</Badge>
      <span className={cn("text-md font-semibold tabular-nums", card.soldOut ? "text-text-success" : "text-text-primary")}>
        {card.soldLine}
      </span>
      {card.newBadge && <Badge tone="info">{card.newBadge}</Badge>}
    </div>
  );
}

function Prices({ listing }: { listing: NonNullable<EditionTrack["listing"]> }) {
  return (
    <RailFacts>
      <RailFact label="Regular price">
        <span className="tabular-nums">{formatAmount(listing.regular, listing.token)}</span>
      </RailFact>
      <RailFact label="Extended price">
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
  const hiddenLine = view.lock
    ? `Off Explore marketplace: ${projectName} was sold in full.`
    : view.listing.kind === "paused"
      ? `Hidden on Explore marketplace while ${projectName}'s listing is paused.`
      : `Hidden on Explore marketplace until ${projectName} is listed again.`;
  return (
    <section
      aria-label={`${USE_WORD[track.use]} ${KIND_WORD[track.kind]} NFT`}
      className="flex flex-col gap-5 rounded-lg border border-solid border-border p-6"
    >
      <TrackHead track={track} view={view} />
      {track.listing ? (
        <>
          <Prices listing={track.listing} />
          {hidden && <p className="m-0 text-sm text-text-secondary">{hiddenLine}</p>}
          <div className="flex flex-wrap gap-4">
            <Button id={`${id}-edit`} type="button" hierarchy="secondary" size="md" className={TAP} onClick={onEdit}>
              Edit
            </Button>
            <Button type="button" hierarchy="secondary" size="md" className={cn(TAP, "text-text-error")} onClick={onRemove}>
              Remove listing
            </Button>
            <Button id={`${id}-add`} type="button" hierarchy="secondary" size="md" className={TAP} onClick={onAdd}>
              Add NFTs
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
