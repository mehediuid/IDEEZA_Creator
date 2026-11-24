"use client";

// The buyer's Overview tab (Product Details 10, 10e, 10u, 10x, 29a, 31b) and
// the blocks the owner's object page shares with it:
// · Marketplace (the buyer's side, 10x): its copies on sale as one list —
//   a Physical or Virtual mark, "Physical NFT · Personal use", its one Price ·
//   Royalties and the sold line, and "Not on sale" for a use not listed (CL-018:
//   one price per use, no version); the collection and chain as one line; what each kind of
//   NFT is in the ⓘ (owner 2026-11-15: no tab strip inside the page's tabs).
//   One buy path: the sticky bar. In Preview as others see it, a quiet "View
//   on Explore marketplace" under it opens the live product shop (the web's
//   edition block, CL-018; BUY-15);
// · Specs: the booked facts (`productFacts`) as a grouped list, with "Worked
//   out from the parts." for a build that predates the spec and the owner's
//   part changes (29a) as its footer lines; when the project has a network
//   (CL-015) a Network row names it ("Unnamed Network" without a name) — the
//   owner's opens the project's Network screen, as the project page's About
//   row does; a preview reads it; the marketplace view has no network screen
//   on a phone, so no row. A product no build stands behind still shows Specs
//   for that row;
// · Build check: one row — the web's line, its chip at the end — that opens
//   See why (the grouped checks in a sheet, 10q, 29b, with the web's credit
//   note) while the build is a Draft.

import * as React from "react";
import { ArrowUpRight01Icon, CubeIcon, InformationCircleIcon, PackageIcon, ShareKnowledgeIcon, Shield01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { GROUP_LABEL, GROUP_ORDER } from "@/components/create/confidence-badge";
import { checkWordsOf } from "@/components/projects/product/product-facts";
import { helperLineOf } from "@/components/projects/editions/edition-block";
import { bookedSpec, specOfSource } from "@/lib/create/build-artifacts";
import {
  DRAFT_CREDIT_NOTE,
  DRAFT_PARTLY_CHECKED_MEANING,
  DRAFT_UNCHECKED_MEANING,
  TIER_MEANING,
  type ProductConfidence,
} from "@/lib/create/confidence";
import { productFacts } from "@/lib/manual/products-tab-view";
import { MARKET_VIEW, phoneProductPath } from "@/lib/manual/phone-product";
import { phoneProjectPath } from "@/lib/manual/phone-project";
import { projectTabsFor } from "@/lib/manual/project-route";
import { useProjectNetwork } from "@/lib/network/store";
import { editionChainOf, KIND_WORD, trackCardOf, tracksOf } from "@/lib/market/editions";
import { USE_LABEL } from "@/lib/market/sell-flow";
import type { EditionKind, EditionTrack, EditionUse } from "@/lib/market/types";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Chevron, LIST_ROW, ListCard, ListRow } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { T } from "../type";
import { CARD, FactCard, InfoButton, LINK, ListFooter, SectionHead } from "./parts";
import { useProduct } from "./use-product";

/** The buyer's Overview (the owner's page lays these out itself). */
export function OverviewTab() {
  const { buyer, confidence } = useProduct();
  return (
    <div className="flex flex-col gap-12">
      {buyer && <MarketplaceBlock />}
      <SpecsSection />
      {confidence && (
        <section aria-labelledby="pd-check" className="flex flex-col gap-4">
          <SectionHead id="pd-check" title="Build check" />
          <ListCard label="Build check">
            <BuildCheckRow confidence={confidence} />
          </ListCard>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────── Specs (10, 29a) ───────────────────────────

/** The project's network as the product's Specs names it (the web's `useNetworkFact`): its name,
 *  and the phone's Network screen for the owner; null with no network, on the marketplace view,
 *  or for a viewer whose project page has no Network. */
function useNetworkRow(): { name: string; href: string | null } | null {
  const { project, viewer, mode } = useProduct();
  const { network } = useProjectNetwork(mode === "market" ? null : project.id);
  if (!network || mode === "market") return null;
  if (!projectTabsFor(viewer, { networkReadable: true, contributors: project.contributors?.length ?? 0 }).includes("network")) return null;
  return { name: network.name.trim() || "Unnamed Network", href: mode === "owner" ? phoneProjectPath(project.id, "network") : null };
}

export function SpecsSection() {
  const { bp, partChanges } = useProduct();
  const network = useNetworkRow();
  const facts = bp ? productFacts(specOfSource(bp), bp.parts) : [];
  if (!facts.length && !partChanges && !network) return null;
  const title = (
    <>
      Network
      {network?.href && <span className="sr-only"> · View network</span>}
    </>
  );
  return (
    <section aria-labelledby="pd-specs" className="flex flex-col gap-4">
      <SectionHead id="pd-specs" title="Specs" />
      {facts.length > 0 && <FactCard label="Specs" inset="row" rows={facts.map((f) => [f.label, f.value])} />}
      {bp && !bookedSpec(bp) && facts.length > 0 && <ListFooter>Worked out from the parts.</ListFooter>}
      {partChanges && <ListFooter>Built with your part changes: {partChanges}</ListFooter>}
      {network && (
        <ListCard label="Network">
          {network.href ? (
            <ListRow href={network.href} icon={ShareKnowledgeIcon} title={title} value={network.name} />
          ) : (
            <ListRow icon={ShareKnowledgeIcon} title={title} value={network.name} />
          )}
        </ListCard>
      )}
    </section>
  );
}

// ─────────────────────────── Build check (10, 10q, 29a, 29b) ───────────────────────────

const CHIP_TONE: Record<"ok" | "warn" | "quiet", BadgeTone> = { ok: "success", warn: "warning", quiet: "neutral" };

/** Build check as a row of a list card: the web's line under "Build check", its chip at the end;
 *  a Draft's row opens See why. */
export function BuildCheckRow({ confidence }: { confidence: ProductConfidence }) {
  const [open, setOpen] = React.useState(false);
  const words = checkWordsOf(confidence);
  const draft = confidence.tier === "draft";
  const body = (
    <>
      <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
        <Icon icon={Shield01Icon} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.body, "text-text-primary")}>Build check</span>
        <span className={T.meta}>{words.line}</span>
      </span>
      <Badge tone={CHIP_TONE[words.tone]} className="shrink-0">
        {words.chip}
      </Badge>
      {draft && <Chevron />}
    </>
  );
  return (
    <li>
      {draft ? (
        <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={LIST_ROW}>
          {body}
          <span className="sr-only">See why</span>
        </button>
      ) : (
        <div className={cn(LIST_ROW, "hover:bg-transparent")}>{body}</div>
      )}
      {draft && <SeeWhySheet open={open} onClose={() => setOpen(false)} confidence={confidence} />}
    </li>
  );
}

const ROW_TONE = { notRun: "neutral", found: "warning", passed: "success" } as const;

export function SeeWhySheet({ open, onClose, confidence }: { open: boolean; onClose: () => void; confidence: ProductConfidence }) {
  const { chat } = useProduct();
  const words = checkWordsOf(confidence);
  const found = confidence.issues.filter((i) => !i.notRun).length;
  const meaning =
    confidence.tier === "draft" && found === 0
      ? confidence.passed.length
        ? DRAFT_PARTLY_CHECKED_MEANING
        : DRAFT_UNCHECKED_MEANING
      : TIER_MEANING[confidence.tier];
  const groups = GROUP_ORDER.map((group) => ({
    group,
    rows: [
      ...confidence.issues.filter((i) => i.group === group).map((i) => ({ text: i.text, tone: i.notRun ? ("notRun" as const) : ("found" as const) })),
      ...(group === "assembly" ? confidence.passed.map((text) => ({ text, tone: "passed" as const })) : []),
    ],
  })).filter((g) => g.rows.length > 0);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Build check"
      actions={
        chat ? (
          <Link href={`/m/ai/chat/${encodeURIComponent(chat.id)}`} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full border-solid")}>
            Open chat
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-8 pb-8">
        <div className="flex flex-col gap-3">
          <div>
            <Badge tone={CHIP_TONE[words.tone]}>{words.chip}</Badge>
          </div>
          <p className={cn(T.body, "text-text-primary")}>{meaning}</p>
        </div>
        {groups.map((g) => (
          <section key={g.group} className="flex flex-col gap-4">
            <h3 className={T.name}>{GROUP_LABEL[g.group]}</h3>
            <ul className="flex flex-col gap-4">
              {g.rows.map((r) => (
                <li key={r.text} className="flex items-start gap-4">
                  <Badge tone={ROW_TONE[r.tone]} className="mt-1 shrink-0">
                    {r.tone === "notRun" ? "Not run" : r.tone === "found" ? "Found" : "Passed"}
                  </Badge>
                  <span className={cn(T.body, "min-w-0")}>{r.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className={cn(T.meta, "flex items-start gap-3 border-t-[length:var(--border-width-1)] border-solid border-border pt-6")}>
          <span aria-hidden className="mt-[2px] shrink-0 text-[color:var(--color-icon-secondary)]">
            <Icon icon={InformationCircleIcon} size={14} />
          </span>
          {DRAFT_CREDIT_NOTE}
        </p>
      </div>
    </Sheet>
  );
}

// ─────────────────────────── Marketplace (10x) ───────────────────────────

const KINDS: EditionKind[] = ["physical", "virtual"];
const USES: EditionUse[] = ["private", "commercial"];

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

/** What buyers can see of this product: its listed copies, until the project is sold in full. */
export function useListedCopies(): Listed[] {
  const { view, product } = useProduct();
  return React.useMemo(
    () => (view.lock !== null ? [] : tracksOf(product.id, view.editions).filter((t): t is Listed => t.listing !== null)),
    [view.lock, view.editions, product.id],
  );
}

function MarketplaceBlock() {
  const { view, name, mode, project, product } = useProduct();
  const tracks = useListedCopies();
  if (!tracks.length) return null;
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  return (
    <section aria-labelledby="pd-market" className="flex flex-col gap-4">
      <SectionHead
        id="pd-market"
        title="Marketplace"
        info={
          <InfoButton label="What these NFTs are" title="Marketplace">
            {KINDS.map((k) => (
              <p key={k}>
                <span className={T.rowTitle}>{KIND_WORD[k]} NFT · </span>
                {helperLineOf(k, name)}
              </p>
            ))}
          </InfoButton>
        }
        value={`${tracks.length} on sale`}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {chain && (
          <p className={cn(T.meta, "min-w-0 flex-1")}>
            Collection {chain.collection} · {networkLabelOf(chain.network)}
          </p>
        )}
        <TestnetDemoBadge />
      </div>
      <ul aria-label="NFT editions" className={CARD}>
        {KINDS.flatMap((kind) => {
          const ofKind = tracks.filter((t) => t.kind === kind).sort((a, b) => USES.indexOf(a.use) - USES.indexOf(b.use));
          if (!ofKind.length) {
            return [
              <li key={kind} className={cn(LIST_ROW, "hover:bg-transparent")}>
                <KindMark kind={kind} />
                <span className={cn(T.body, "min-w-0 flex-1")}>{`No ${KIND_WORD[kind]} NFTs of ${name} are on sale.`}</span>
              </li>,
            ];
          }
          // Both uses, always (CL-018): a use the creator didn't list reads "Not on sale".
          return USES.map((use) => {
            const t = ofKind.find((x) => x.use === use);
            if (!t) {
              return (
                <li key={`${kind}-${use}`} aria-label={`${KIND_WORD[kind]} NFT · ${USE_LABEL[use]}: not on sale`} className={cn(LIST_ROW, "items-start opacity-60 hover:bg-transparent")}>
                  <KindMark kind={kind} />
                  <span className={cn(T.rowTitle, "min-w-0 flex-1")}>
                    {KIND_WORD[kind]} NFT · {USE_LABEL[use]}
                  </span>
                  <span className={cn(T.meta, "shrink-0 text-right")}>Not on sale</span>
                </li>
              );
            }
            const card = trackCardOf(t, view.sales);
            return (
              <li key={t.id} aria-label={`${KIND_WORD[t.kind]} NFT · ${USE_LABEL[t.use]}`} className={cn(LIST_ROW, "items-start hover:bg-transparent")}>
                <KindMark kind={t.kind} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={T.rowTitle}>
                    {KIND_WORD[t.kind]} NFT · {USE_LABEL[t.use]}
                  </span>
                  <span className={T.meta}>
                    {formatAmount(t.listing.regular, t.listing.token)} · Royalties {t.listing.royaltyPct}% on resales
                  </span>
                </span>
                <span className={cn(T.meta, "shrink-0 text-right", card.soldOut && "text-text-success")}>{card.soldLine}</span>
              </li>
            );
          });
        })}
      </ul>
      {mode === "preview" && (
        <Link href={`${phoneProductPath(project.id, product.id)}?view=${MARKET_VIEW}`} className={cn(LINK, "gap-2 self-start")}>
          View on Explore marketplace
          <Icon icon={ArrowUpRight01Icon} size={14} />
        </Link>
      )}
    </section>
  );
}

function KindMark({ kind }: { kind: EditionKind }) {
  return (
    <span aria-hidden className="mt-[2px] shrink-0 text-[color:var(--color-icon-default)]">
      <Icon icon={kind === "physical" ? PackageIcon : CubeIcon} size={24} />
    </span>
  );
}
