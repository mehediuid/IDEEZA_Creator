"use client";

// One project's purchases, as the active demo creator holds them: the project unlocked (owner, 2026-11-19; plan
// 6rPKBgwzQ6r6woYmjfE6Td). The marketplace page's frame — media first, then the header — and then everything about
// one kind of NFT in one place (v2: "the information drifts apart"), in the order a buyer needs it once the NFT is
// theirs (v4, owner: "what should a user see first, what lower?"): what they bought, then what they can do with
// each copy, then the rules and the token facts folded away, for when they look them up:
// - Your NFTs, a tab per kind held (as the marketplace box has):
//   · Physical / Virtual: the products the copies cover, one at a time, each in full: its overview and specs, and
//     the pieces this kind unlocks in the project's own panels (Physical: 3D model, PCB, firmware, wiring,
//     assembly, parts; Virtual: the 3D model and parts — the tabs say what the kind gives); then the copies, one
//     row each with its use, number, price and date, a Physical copy's units (allowance, made, left; units.ts),
//     Send to manufacturing and Sell this copy (their flows come next: the buttons wait, and say what a sale would
//     hand over); then, folded, what each use allows, and NFT details;
//   · No Main tab: a whole project bought is the buyer's own project and opens as one, its purchase shown on its
//     page (owner, 2026-11-19: "no purchase view, then Open project"); an old link here goes straight there;
// - Receipts;
// - the rail: a Summary of what is held and the creator (questions about what was bought). No Innovations stats:
//   a buyer's page is about what they own (owner).
// The media, the products and the creator come from the project's Innovations post (a sample's own post, or this
// browser's project read as one); every product's pieces come from a build (this browser's, or the sample's).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight01Icon, Cancel01Icon, Coins01Icon, Download04Icon, ImageNotFound01Icon, ShoppingBag01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { copyZipName, useCopyDownload, type CopyProduct } from "./nft-download";
import { appendUnits } from "./units-store";
import { InfoTip } from "@/components/projects/editions/create-dialog";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, ConfirmDialog, StateCard, TestnetDemoBadge, buttonVariants } from "@/components/ideeza";
import { CARD, PostImg } from "@/components/innovations/post-bits";
import { PostMediaStage } from "@/components/innovations/post-media";
import { MakerBlock } from "@/components/innovations/post-rail";
import { NARROW_ONLY, POST_COLUMNS, POST_CONTENT, POST_PAGE, WIDE_ONLY } from "@/components/innovations/post-states";
import type { MinePostFacts } from "@/components/innovations/use-post";
import { AskCreator } from "@/components/marketplace/buyer-rail";
import { DemoBuyerBanner } from "@/components/marketplace/demo-buyer-banner";
import { FactGrid, MoreFacts, OfferTabs, type Fact, type OfferTab } from "@/components/marketplace/offer-parts";
import { LiveRegion, usePageArrival } from "@/components/projects/details/arrival";
import { Breadcrumb } from "@/components/projects/details/breadcrumb";
import { ProjectSkeleton } from "@/components/projects/details/page-states";
import { TabStrip, type TabDef } from "@/components/projects/details/tab-strip";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { DeliverablesAccess, PieceDownloads, ProductPiecePanel } from "@/components/projects/product/product-deliverables";
import { productsOf, useCreateHistory, type BuildItemKind, type BuildJob, type BuildProduct } from "@/lib/create/history";
import { sampleBuildsOf } from "@/lib/demo/acquired-projects";
import { minePostOf } from "@/lib/innovations/mine-post";
import type { InnovationPost, PostProduct } from "@/lib/innovations/types";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import { useMarket } from "@/lib/market/market-store";
import {
  KIND_NAME,
  LICENCE,
  copyNumberHelpOf,
  copyTitleOf,
  lineTitleOf,
  purchaseHrefOf,
  wholeProjectIdOf,
  wholeProjectOnly,
  type Licence,
  type PurchaseCopy,
  type PurchaseKind,
  type PurchaseLine,
  type PurchasedProject,
} from "@/lib/market/purchases";
import { sampleMarketOf } from "@/lib/market/sample-market";
import { copyUnitsOf, unitsLineOf, unitsOnResale, type CopyUnits, type UnitsEntry } from "@/lib/market/units";
import { useMe } from "@/lib/people/profile-store";
import { demoAddress, shortAddress } from "@/lib/wallet/demo-wallet";
import { addAmounts, formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { Amount } from "@/lib/wallet/types";
import type { DemoBuyer } from "@/lib/wallet/identities";
import type { DemoBuyerId } from "@/lib/wallet/types";
import type { Token } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { useUnitsLog } from "./units-store";
import { purchasedEarnHref } from "./earn/href";
import { perTokenText } from "@/lib/market/resale-desk";
import { usePurchased } from "./use-purchased";

const H2 = "text-xl font-bold leading-xl text-text-primary";
const H3 = "text-lg font-semibold leading-lg text-text-primary";
const PRIMARY_LINK = cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "h-[44px] gap-2 hover:text-[color:var(--color-button-primary-text)]");
const QUIET_LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-md font-semibold text-text-brand outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";
const KINDS: PurchaseKind[] = ["main", "physical", "virtual"];

/** What each kind unlocks of a product, as the project's own piece panels (plan D2). */
const PHYSICAL_PIECES: { id: BuildItemKind; label: string }[] = [
  { id: "3d", label: "3D model" },
  { id: "pcb", label: "PCB" },
  { id: "code", label: "Firmware" },
  { id: "wiring", label: "Wiring" },
  { id: "assembly", label: "Assembly" },
  { id: "parts", label: "Parts" },
];
const PIECES_OF: Record<PurchaseKind, { id: BuildItemKind; label: string }[]> = {
  main: PHYSICAL_PIECES,
  physical: [
    { id: "3d", label: "3D model" },
    { id: "pcb", label: "PCB" },
    { id: "code", label: "Firmware" },
    { id: "wiring", label: "Wiring" },
    { id: "assembly", label: "Assembly" },
    { id: "parts", label: "Parts" },
  ],
  virtual: [
    { id: "3d", label: "3D model" },
    { id: "parts", label: "Parts" },
  ],
};

export function PurchasedPage({ id, initialTab = null }: { id: string; initialTab?: OfferTab | null }) {
  const { ready, buyer, purchases } = usePurchased();
  if (!ready) return <ProjectSkeleton />;
  const p = purchases.find((x) => x.id === id);
  if (!p) return <NothingBought buyerName={buyer.name} />;
  // A whole project bought is the buyer's own project: an old link here opens it, as every link to it now does.
  if (wholeProjectOnly(p)) return <OpensAsProject href={purchaseHrefOf(p)} />;
  return p.source === "sample" ? <SampleBody p={p} buyer={buyer} initialTab={initialTab} /> : <OwnBody p={p} buyer={buyer} initialTab={initialTab} />;
}

function OpensAsProject({ href }: { href: string }) {
  const router = useRouter();
  React.useEffect(() => router.replace(href), [router, href]);
  return <ProjectSkeleton />;
}

type BodyProps = { p: PurchasedProject; buyer: DemoBuyer; initialTab: OfferTab | null };
type ProductBuild = { job: BuildJob; bp: BuildProduct } | null;

function SampleBody(props: BodyProps) {
  const m = sampleMarketOf(props.p.id);
  const jobs = React.useMemo(() => (m ? sampleBuildsOf(m) : []), [m]);
  if (!m) return <NothingBought buyerName={props.buyer.name} />;
  const buildOf = (i: number): ProductBuild => {
    const job = jobs[i];
    const bp = job ? productsOf(job)[0] : undefined;
    return job && bp ? { job, bp } : null;
  };
  return <PurchasedBody {...props} post={m.post} mine={null} buildOf={buildOf} />;
}

/** This browser's own project, read as its Innovations post (as the post page reads it), with its own builds. */
function OwnBody(props: BodyProps) {
  const data = useProjectPageData(props.p.id, "project");
  const me = useMe();
  const { builds } = useCreateHistory();
  const post = React.useMemo(() => {
    if (data.state !== "ready") return null;
    const read = minePostOf(data.project, data.view);
    return { ...read, creator: { ...read.creator, name: me.name, initials: me.initials } };
  }, [data, me]);
  if (data.state === "missing") return <NothingBought buyerName={props.buyer.name} />;
  if (data.state !== "ready" || !post) return <ProjectSkeleton />;
  const buildOf = (i: number): ProductBuild => {
    const ref = post.products[i]?.build;
    const job = ref ? builds.find((b) => b.id === ref.buildId) : undefined;
    const bp = job ? productsOf(job).find((x) => x.id === ref?.productId) : undefined;
    return job && bp ? { job, bp } : null;
  };
  return <PurchasedBody {...props} post={post} mine={{ project: data.project, view: data.view, brief: data.brief }} buildOf={buildOf} />;
}

function PurchasedBody({
  p,
  buyer,
  initialTab,
  post,
  mine,
  buildOf,
}: BodyProps & { post: InnovationPost; mine: MinePostFacts | null; buildOf: (i: number) => ProductBuild }) {
  const { titleRef, live } = usePageArrival(`purchased:${p.id}`, p.name, `${p.name} · Purchased · IDEEZA`);
  // Copies only: a whole project held is the buyer's own project, opened from its own page.
  const held = KINDS.filter((k) => k !== "main" && p.lines.some((l) => l.kind === k));
  const wholeToo = p.lines.some((l) => l.kind === "main" && (l.sharePct ?? 0) >= 100);
  const [tab, setTab] = React.useState<PurchaseKind | undefined>(initialTab && held.includes(initialTab) ? initialTab : held[0]);
  const log = useUnitsLog();
  // You own counts every NFT held, the whole project too, so its rows do.
  const owned = KINDS.filter((k) => p.lines.some((l) => l.kind === k));
  const summary = <SummaryBlock p={p} buyer={buyer} held={owned} />;
  const creator = <CreatorBlock p={p} post={post} buyer={buyer} />;
  return (
    <div className={POST_PAGE}>
      <div className={POST_CONTENT}>
        <Breadcrumb trail={[{ label: "My projects", href: "/projects" }, { label: "Purchased", href: "/projects?tab=purchased" }, { label: p.name }]} />
        <DemoBuyerBanner />

        <div className={POST_COLUMNS}>
          <div className="flex min-w-0 flex-col gap-12">
            <PostMediaStage post={post} mine={mine} />
            <Header p={p} post={post} buyer={buyer} titleRef={titleRef} />
            <div className={NARROW_ONLY}>{summary}</div>

            <section aria-labelledby="your-nfts" className="flex flex-col gap-8">
              <h2 id="your-nfts" className={H2}>
                Your NFTs
              </h2>
              {wholeToo && (
                <div className={cn(CARD, "flex flex-wrap items-center justify-between gap-4")}>
                  <p className="m-0 text-md leading-md text-text-primary">The whole project is yours too: it opens as one of your projects.</p>
                  <a href={`/projects/${encodeURIComponent(wholeProjectIdOf(p))}`} className={cn(PRIMARY_LINK, "self-start")}>
                    Open the project
                    <Icon icon={ArrowRight01Icon} size={16} />
                  </a>
                </div>
              )}
              {tab === undefined || tab === "main" ? (
                <SoldEvery p={p} />
              ) : (
                <OfferTabs tabs={held} active={tab} onSelect={setTab} label="Your NFTs">
                  <KindPanel p={p} kind={tab} post={post} buildOf={buildOf} buyer={buyer} log={log} />
                </OfferTabs>
              )}
            </section>

            <Receipts p={p} />
            <div className={NARROW_ONLY}>{creator}</div>
          </div>

          <aside aria-label="Summary and the creator" className={cn(WIDE_ONLY, "min-w-0 flex-col self-stretch")}>
            <div className="sticky top-[24px] flex flex-col gap-8">
              {summary}
              {creator}
            </div>
          </aside>
        </div>
      </div>
      <LiveRegion text={live} />
    </div>
  );
}

function Header({
  p,
  post,
  buyer,
  titleRef,
}: {
  p: PurchasedProject;
  post: InnovationPost;
  buyer: DemoBuyer;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const meta = [post.products.length === 1 ? "1 product" : `${post.products.length} products`, post.category].filter(Boolean).join(" · ");
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="text-4xl font-semibold leading-4xl tracking-near text-text-primary outline-none max-md:text-2xl max-md:leading-2xl max-md:tracking-normal"
        >
          {p.name}
        </h1>
        <Badge tone="brand" className="font-semibold">
          Purchased
        </Badge>
      </div>
      <p className="m-0 text-md leading-md text-text-secondary">
        By {p.creator}
        {meta && <span aria-hidden> · </span>}
        {meta}
      </p>
      <p className="m-0 flex flex-wrap items-center gap-3 text-md leading-md text-text-secondary">
        Bought as {buyer.name} (demo creator) · last bought {formatDate(p.lastAt)} <TestnetDemoBadge />
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
        <Link
          href={purchasedEarnHref(p.id)}
          className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "gap-3 hover:text-[color:var(--color-button-secondary-text)] max-md:min-h-[var(--touch-min)]")}
        >
          <Icon icon={Coins01Icon} size={16} />
          Earn
        </Link>
        <span className="text-md leading-md text-text-secondary">{earnLineOf(p)}</span>
      </div>
      {p.soldInFullTo && (
        <p className="m-0 rounded-lg bg-bg-subtle px-6 py-4 text-md leading-md text-text-primary">
          The project was sold in full to {p.soldInFullTo}. Your copies stay yours, with their units and files.
        </p>
      )}
    </header>
  );
}

/** Earn's one line under the header: what is for sale and what selling on paid. */
function earnLineOf(p: PurchasedProject): string {
  const earned = perTokenText(p.sold.map((s) => ({ amount: s.payout, token: s.token })));
  const parts = [
    p.forSale > 0 ? `${p.forSale === 1 ? "1 copy" : `${p.forSale} copies`} for sale` : null,
    earned ? `${earned} earned from ${p.sold.length} sold` : null,
  ].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return p.count > 0 && p.lines.some((l) => l.kind !== "main") ? "Sell a copy on, set its price, see what it earned" : "The whole project sells from its own Earn";
}

/** Every copy sold on: the project stays here with what it earned. */
function SoldEvery({ p }: { p: PurchasedProject }) {
  return (
    <div className={cn(CARD, "flex flex-col gap-4")}>
      <h3 className={H3}>You sold every copy</h3>
      <p className="m-0 text-md leading-md text-text-secondary">
        {p.sold.length === 1 ? "Your copy is" : `All ${p.sold.length} copies are`} someone else&apos;s now, with their licence. What they paid you is in Earn, and each sale is in the receipts below.
      </p>
      <Link href={purchasedEarnHref(p.id)} className={cn(PRIMARY_LINK, "self-start")}>
        See what they earned
        <Icon icon={ArrowRight01Icon} size={16} />
      </Link>
    </div>
  );
}

// ─────────────────────────────── the rail ───────────────────────────────

function SummaryBlock({ p, buyer, held }: { p: PurchasedProject; buyer: DemoBuyer; held: PurchaseKind[] }) {
  const id = React.useId();
  const rows = held.map((k) => {
    const lines = p.lines.filter((l) => l.kind === k);
    if (k === "main") return { k, label: KIND_NAME.main, value: `${lines[0].sharePct ?? 0}%` };
    const n = lines.reduce((x, l) => x + l.copies.length, 0);
    return { k, label: KIND_NAME[k], value: `${n} ${n === 1 ? "copy" : "copies"}` };
  });
  return (
    <section aria-labelledby={id} className={cn(CARD, "flex flex-col gap-6")}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-md font-medium leading-md text-text-secondary">
          You own
        </h2>
        <span className="text-2xl font-semibold leading-2xl tabular-nums text-text-primary">
          {p.count} {p.count === 1 ? "NFT" : "NFTs"}
        </span>
      </div>
      <dl className="m-0 flex flex-col">
        {rows.map((r) => (
          <div key={r.k} className="flex items-baseline justify-between gap-4 border-x-0 border-b-0 border-t border-solid border-border py-3">
            <dt className="text-md text-text-secondary">{r.label}</dt>
            <dd className="m-0 text-md font-semibold tabular-nums text-text-primary">{r.value}</dd>
          </div>
        ))}
        {p.lines.length > 0 && (
          <div className="flex items-baseline justify-between gap-4 border-x-0 border-b-0 border-t border-solid border-border py-3">
            <dt className="text-md text-text-secondary">Paid in all</dt>
            <dd className="m-0 text-md font-semibold tabular-nums text-text-primary">{paidOf(p.lines)}</dd>
          </div>
        )}
        {p.forSale > 0 && (
          <div className="flex items-baseline justify-between gap-4 border-x-0 border-b-0 border-t border-solid border-border py-3">
            <dt className="text-md text-text-secondary">For sale</dt>
            <dd className="m-0 text-md font-semibold tabular-nums text-text-primary">{p.forSale === 1 ? "1 copy" : `${p.forSale} copies`}</dd>
          </div>
        )}
        {p.sold.length > 0 && (
          <div className="flex items-baseline justify-between gap-4 border-x-0 border-b-0 border-t border-solid border-border py-3">
            <dt className="text-md text-text-secondary">Earned selling on</dt>
            <dd className="m-0 text-md font-semibold tabular-nums text-text-success">{perTokenText(p.sold.map((s) => ({ amount: s.payout, token: s.token })))}</dd>
          </div>
        )}
      </dl>
      {p.buyable.length > 0 && (
        <div className="flex flex-col gap-2">
          {p.buyable.map((k) => (
            <Link key={k} href={`${p.marketHref}?nft=${k}`} className={QUIET_LINK}>
              Buy another {KIND_NAME[k]}
              <Icon icon={ArrowRight01Icon} size={16} />
            </Link>
          ))}
        </div>
      )}
      <p className="m-0 flex flex-wrap items-center gap-3 text-sm leading-sm text-text-secondary">
        In {buyer.name}&apos;s demo wallet · <span className="font-mono">{shortAddress(p.lines[0]?.copies[0]?.buyerAddress ?? demoAddress(buyer.id))}</span>
        <TestnetDemoBadge />
      </p>
    </section>
  );
}

function CreatorBlock({ p, post, buyer }: { p: PurchasedProject; post: InnovationPost; buyer: DemoBuyer }) {
  const { data } = useMarket();
  const id = React.useId();
  if (p.source === "sample") return <MakerBlock post={post} owner={false} layout="card" />;
  return (
    <section aria-labelledby={id} className={cn(CARD, "flex flex-col gap-6")}>
      <h2 id={id} className={H2}>
        Creator
      </h2>
      <p className="m-0 text-md leading-md text-text-secondary">Questions about what you bought go to {p.creator}.</p>
      <AskCreator projectId={p.id} sales={data.sales.filter((s) => s.projectId === p.id)} buyerId={buyer.id} />
    </section>
  );
}

// ─────────────────────────────── Physical / Virtual ───────────────────────────────

function KindPanel({
  p,
  kind,
  post,
  buildOf,
  buyer,
  log,
}: {
  p: PurchasedProject;
  kind: Exclude<PurchaseKind, "main">;
  post: InnovationPost;
  buildOf: (i: number) => ProductBuild;
  buyer: DemoBuyer;
  log: readonly UnitsEntry[];
}) {
  const lines = p.lines.filter((l) => l.kind === kind);
  const copies = lines.flatMap((l) => l.copies);
  const first = copies[0];
  // A product's own copies cover that product; the whole project's copies cover every product.
  const scoped = lines.every((l) => l.product !== null);
  const names = new Set(lines.map((l) => l.product));
  const covered = post.products.map((x, i) => ({ x, i })).filter(({ x }) => !scoped || names.has(x.name));
  const facts: Fact[] = [
    { label: "Collection", value: first.collection || "—" },
    { label: "Blockchain", value: networkLabelOf(first.network) },
    { label: "NFT type", value: KIND_NAME[kind] },
    { label: "Copies", value: String(copies.length) },
    { label: "Paid", value: paidOf(lines) },
    { label: "Purchased from", value: p.creator },
  ];
  return (
    <div className="flex flex-col gap-10">
      {covered.length > 0 && <ProductsView kind={kind} post={post} covered={covered} buildOf={buildOf} />}
      <YourCopies
        projectId={p.id}
        projectName={p.name}
        kind={kind}
        lines={lines}
        buyer={buyer}
        log={log}
        setOf={!scoped && post.products.length > 1 ? post.products.map((x) => x.name) : null}
        // A product's own copy covers that product; a whole-project copy covers each one (its files, each in a folder).
        productsOf={(l) =>
          (l.product ? covered.filter(({ x }) => x.name === l.product) : covered).map(({ x, i }) => ({ name: x.name, image: x.image, build: buildOf(i) }))
        }
      />
      <div className="flex flex-col">
        <MoreFacts title="What you can and can't do">
          {lines.map((l) => (
            <div key={`${l.use}|${l.product}`} className="flex flex-col gap-4">
              {lines.length > 1 && <h4 className="text-md font-semibold leading-md text-text-primary">{[l.use, l.product].filter(Boolean).join(" · ")}</h4>}
              <RuleColumns licence={LICENCE[kind][l.use ?? "Personal use"]} />
            </div>
          ))}
        </MoreFacts>
        <MoreFacts>
          <FactGrid facts={facts} />
          <p className="m-0 text-sm text-text-tertiary">Each copy is one licence. Minted when you bought it.</p>
        </MoreFacts>
      </div>
    </div>
  );
}

/** Every copy of this kind, one row each with its use: what the buyer acts on (make units, sell a copy). What
 *  each use allows sits folded below, for when they look it up. */
function YourCopies({
  projectId,
  projectName,
  kind,
  lines,
  buyer,
  log,
  setOf,
  productsOf,
}: {
  projectId: string;
  projectName: string;
  kind: Exclude<PurchaseKind, "main">;
  lines: PurchaseLine[];
  buyer: DemoBuyer;
  log: readonly UnitsEntry[];
  /** The products one whole-project copy covers, when there are several. */
  setOf: string[] | null;
  /** What a line's copies cover, for their Download files. */
  productsOf: (l: PurchaseLine) => CopyProduct[];
}) {
  const noteId = React.useId();
  const headId = React.useId();
  const n = lines.reduce((x, l) => x + l.copies.length, 0);
  return (
    <section aria-labelledby={headId} className={cn(CARD, "flex flex-col gap-6")}>
      <div className="flex flex-col gap-2">
        <h3 id={headId} className={H3}>
          {n === 1 ? "Your copy" : `Your copies · ${n}`}
        </h3>
        {setOf && (
          <p className="m-0 text-md leading-md text-text-secondary">
            {kind === "physical"
              ? `Each copy covers the whole project, so one unit is one set: ${andList(setOf)}.`
              : `Each copy covers the whole project: ${andList(setOf)}.`}
          </p>
        )}
      </div>
      <ul role="list" className="m-0 flex list-none flex-col p-0">
        {lines.flatMap((l) =>
          l.copies.map((c) => (
            <CopyRow
              key={c.id}
              copy={c}
              kind={kind}
              use={[l.use, l.product].filter(Boolean).join(" · ")}
              helpUse={l.use}
              units={l.unitsPerCopy !== null ? copyUnitsOf(c.key, l.unitsPerCopy, buyer.id, log) : null}
              noteId={noteId}
              sellHref={purchasedEarnHref(projectId, "sell", c.key)}
              products={productsOf(l)}
              zipName={copyZipName(projectName, c.serial, kind)}
              buyerId={buyer.id}
            />
          )),
        )}
      </ul>
      {kind === "physical" && (
        <p id={noteId} className="m-0 text-sm leading-sm text-text-tertiary">
          Sending a copy to manufacturing comes in the next step of the prototype. No units are made with a copy while it&apos;s for sale.
        </p>
      )}
    </section>
  );
}

/** Why a Physical copy's files can't be downloaded now (each download takes one of its units). */
const NO_UNITS_LEFT = "No units left on this copy, so its files can't be downloaded again.";
const ON_SALE = "Take the copy off sale first: no units are used while it's for sale.";

function CopyRow({
  copy: c,
  kind,
  use,
  helpUse,
  units,
  noteId,
  sellHref,
  products,
  zipName,
  buyerId,
}: {
  copy: PurchaseCopy;
  kind: Exclude<PurchaseKind, "main">;
  use: string;
  /** The use alone, for the number's help ("Business use"). */
  helpUse: string | null;
  units: CopyUnits | null;
  noteId: string;
  sellHref: string;
  /** What the copy covers: its files come in one .zip. */
  products: CopyProduct[];
  zipName: string;
  buyerId: DemoBuyerId;
}) {
  const title = copyTitleOf(c.serial, c.of);
  const short = c.serial !== null ? `copy #${c.serial}` : "this copy";
  const resale = units ? unitsOnResale(units) : null;
  const download = useCopyDownload(kind, products, zipName);
  const [asking, setAsking] = React.useState(false);
  const reasonId = React.useId();
  // A Physical copy's download takes one of its units (owner, 2026-11-25): none left, or listed, and it waits.
  const blocked = units ? (c.listing ? ON_SALE : units.left === 0 ? NO_UNITS_LEFT : null) : null;
  const take = () =>
    download.run(
      units
        ? () => {
            appendUnits({ id: `dl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, copyKey: c.key, holder: buyerId, units: 1, at: Date.now() });
          }
        : undefined,
    );
  const left = units ? units.left - 1 : 0;
  return (
    <li className="flex flex-col gap-4 border-x-0 border-b-0 border-t border-solid border-border py-6 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-2">
            <span className="text-lg font-semibold leading-lg tabular-nums text-text-primary">{title}</span>
            <InfoTip label={`What ${title} means`} text={copyNumberHelpOf(c.serial, c.of, kind, helpUse)} wrap />
          </span>
          {use && <Badge tone="neutral">{use}</Badge>}
          {c.listing && <Badge tone="brand" className="font-semibold">For sale · {formatAmount(c.listing.price, c.listing.token)}</Badge>}
        </span>
        <span className="flex items-baseline gap-4 text-md text-text-secondary">
          <span className="tabular-nums">{formatAmount(c.price, c.token)}</span>
          <time dateTime={new Date(c.at).toISOString()} className="text-sm text-text-tertiary">
            Bought {c.from ? `from ${c.from} ` : ""}
            {formatDate(c.at)}
          </time>
        </span>
      </div>
      {units && (
        <div className="flex flex-col gap-2">
          <div
            role="meter"
            aria-label={`Units made with ${title}`}
            aria-valuemin={0}
            aria-valuemax={units.allowance}
            aria-valuenow={units.made}
            className="h-[6px] w-full overflow-hidden rounded-full bg-bg-subtle"
          >
            <div className="h-full rounded-full bg-[color:var(--color-violet-500)]" style={{ width: `${units.allowance ? (units.made / units.allowance) * 100 : 0}%` }} />
          </div>
          <span className="text-md tabular-nums text-text-primary">{unitsLineOf(units)}</span>
          {resale && (
            <span className="text-sm leading-sm text-text-secondary">
              If you sell {short}, the buyer gets {resale.buyerGets === 0 ? "no units" : `the ${resale.buyerGets} ${resale.buyerGets === 1 ? "unit" : "units"}`} left
              {resale.sellerKeeps > 0 ? `; the ${resale.sellerKeeps} you made stay yours.` : "."}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-4">
        {download.what && (
          <Button
            type="button"
            hierarchy="secondary"
            size="md"
            iconLeading={<Icon icon={Download04Icon} size={16} />}
            loading={download.state === "busy"}
            aria-disabled={blocked ? true : undefined}
            aria-describedby={blocked ? reasonId : undefined}
            onClick={() => {
              if (blocked || download.state === "busy") return;
              if (units) setAsking(true);
              else take();
            }}
            className={cn("max-md:min-h-[var(--touch-min)]", blocked && "cursor-not-allowed opacity-60")}
          >
            Download files
          </Button>
        )}
        {units && (
          <Button type="button" hierarchy="secondary" size="md" disabled aria-describedby={noteId} className="max-md:min-h-[var(--touch-min)]">
            Send to manufacturing
          </Button>
        )}
        <Link
          href={sellHref}
          className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "hover:text-[color:var(--color-button-secondary-text)] max-md:min-h-[var(--touch-min)]")}
        >
          {c.listing ? "Manage the listing" : "Sell this copy"}
        </Link>
      </div>
      {download.what && (
        <p id={blocked ? reasonId : undefined} aria-live="polite" className={cn("m-0 text-sm leading-sm", download.state === "failed" ? "text-text-error" : "text-text-secondary")}>
          {blocked ?? (download.note || `${download.what}, in one .zip${units ? " · each download uses 1 unit" : ""}`)}
        </p>
      )}
      {units && (
        <ConfirmDialog
          open={asking}
          tone="primary"
          icon={Download04Icon}
          title="Download the files for 1 unit?"
          confirmLabel="Download"
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            take();
          }}
        >
          {`${title} has ${units.left} ${units.left === 1 ? "unit" : "units"} left. Downloading its files uses 1, so ${
            left === 0 ? "none will be left" : `${left} will be left`
          }. A unit used doesn't come back.`}
        </ConfirmDialog>
      )}
    </li>
  );
}

/** The products the copies cover, one at a time, each in full with the pieces this kind unlocks. */
function ProductsView({
  kind,
  post,
  covered,
  buildOf,
  productHref,
}: {
  kind: PurchaseKind;
  post: InnovationPost;
  covered: { x: PostProduct; i: number }[];
  buildOf: (i: number) => ProductBuild;
  /** A Main NFT's products are the buyer's: each opens in their project. */
  productHref?: (i: number) => string;
}) {
  const [at, setAt] = React.useState(0);
  const cur = covered[Math.min(at, covered.length - 1)];
  return (
    <section aria-labelledby="your-products" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 id="your-products" className={H3}>
          {kind === "main" ? (covered.length === 1 ? "Its product" : `Its products · ${covered.length}`) : covered.length === 1 ? "Your product" : `Your products · ${covered.length}`}
        </h3>
        {covered.length > 1 && (
          <div role="group" aria-label="Products" className="inline-flex max-w-full overflow-x-auto rounded-lg border border-solid border-border">
            {covered.map(({ x }, j) => {
              const on = j === at;
              return (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAt(j)}
                  className={cn(
                    "inline-flex min-h-[36px] items-center whitespace-nowrap px-7 text-md font-semibold leading-md outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus motion-reduce:transition-none max-md:min-h-[var(--touch-min)]",
                    j > 0 && "border-x-0 border-y-0 border-l border-solid border-border",
                    on ? "bg-bg-brand-subtle text-text-brand" : "bg-bg-surface text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                  )}
                >
                  {x.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <ProductDetail
        key={`${kind}:${cur.x.id}`}
        kind={kind}
        product={cur.x}
        build={buildOf(cur.i)}
        postTitle={post.title}
        href={productHref ? productHref(cur.i) : null}
      />
    </section>
  );
}

type DetailTab = "overview" | BuildItemKind;

function ProductDetail({
  kind,
  product,
  build,
  postTitle,
  href,
}: {
  kind: PurchaseKind;
  product: PostProduct;
  build: ProductBuild;
  postTitle: string;
  href: string | null;
}) {
  const pieces = build ? PIECES_OF[kind].filter((t) => build.bp.items.some((it) => it.kind === t.id)) : [];
  const tabs: TabDef<DetailTab>[] = [{ id: "overview", label: "Overview" }, ...pieces.map((t) => ({ id: t.id as DetailTab, label: t.label }))];
  const [tab, setTab] = React.useState<DetailTab>("overview");
  return (
    <article className={cn(CARD, "flex flex-col gap-8")} aria-label={product.name}>
      <TabStrip groups={[tabs]} active={tab} onSelect={(t) => setTab(t as DetailTab)} label={`${product.name}: what your ${KIND_NAME[kind]} unlocks`} />
      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-8 [@container(min-width:720px)]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-bg-surface-raised">
            {product.image ? (
              <PostImg src={product.image} alt={`${product.name}, from ${postTitle}`} className="absolute inset-0 h-full w-full object-cover" fallback={<Gone />} />
            ) : (
              <Gone />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h4 className={H3}>{product.name}</h4>
              {product.summary && <p className="m-0 text-md leading-md text-text-secondary">{product.summary}</p>}
            </div>
            {href && (
              // A full load: a project bought this session is made when the app starts.
              <a href={href} className={cn(PRIMARY_LINK, "self-start")}>
                Open in your project
                <Icon icon={ArrowRight01Icon} size={16} />
              </a>
            )}
            {product.specs.length > 0 && (
              <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4">
                {product.specs.map((s) => (
                  <div key={s.label} className="flex min-w-0 flex-col gap-1">
                    <dt className="text-sm text-text-tertiary">{s.label}</dt>
                    <dd className="m-0 break-words text-md text-text-primary">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {kind === "virtual" && (
              // The tabs above say what a kind opens; only a Virtual copy leaves pieces out, so it says which.
              <p className="m-0 text-sm leading-sm text-text-secondary">
                Your copy licenses this product&apos;s 3D model and renders; its parts are open to everyone. Its PCB, firmware, wiring and assembly, and
                making units, come with a Physical NFT.
              </p>
            )}
          </div>
        </div>
      ) : build ? (
        // A holder takes the files this kind unlocks, as the maker does (the panel's own downloads).
        <DeliverablesAccess.Provider value>
          {/* The files come from each copy's Download files, which takes a unit (owner, 2026-11-25): no piece download here. */}
          <PieceDownloads.Provider value={false}>
            <ProductPiecePanel job={build.job} product={build.bp} kind={tab} chatHref={null} />
          </PieceDownloads.Provider>
        </DeliverablesAccess.Provider>
      ) : null}
    </article>
  );
}

/** "A and B", "A, B and C". */
function andList(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function RuleColumns({ licence }: { licence: Licence }) {
  return (
    <div className="grid grid-cols-1 gap-6 [@container(min-width:560px)]:grid-cols-2">
      <RuleList tone="can" items={licence.can} />
      {licence.cant.length > 0 && <RuleList tone="cant" items={licence.cant} />}
    </div>
  );
}

function RuleList({ tone, items, label }: { tone: "can" | "cant"; items: string[]; label?: string }) {
  const can = tone === "can";
  return (
    <div className="flex flex-col gap-3">
      <span className={cn("text-sm font-semibold", can ? "text-text-success" : "text-text-error")}>{label ?? (can ? "You can" : "You can't")}</span>
      <ul role="list" className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-3 text-md leading-md text-text-primary">
            <span aria-hidden className={cn("mt-[2px] inline-flex shrink-0", can ? "text-text-success" : "text-text-error")}>
              <Icon icon={can ? Tick02Icon : Cancel01Icon} size={16} />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What was paid over these lines, per token: "0.08 ETH", "0.1 ETH + 5 USDC". */
function paidOf(lines: PurchaseLine[]): string {
  const byToken = new Map<Token, Amount>();
  for (const l of lines) for (const x of l.paid) byToken.set(x.token, byToken.has(x.token) ? addAmounts(byToken.get(x.token) as Amount, x.amount) : x.amount);
  return [...byToken].map(([token, amount]) => formatAmount(amount, token)).join(" + ");
}

function Gone() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
      <Icon icon={ImageNotFound01Icon} size={20} strokeWidth={1.4} />
    </div>
  );
}

// ─────────────────────────────── receipts ───────────────────────────────

function Receipts({ p }: { p: PurchasedProject }) {
  const id = React.useId();
  type Row = { id: string; at: number; item: string; number: string; price: string; tx: string; sold: boolean };
  const num = (serial: number | null, of: number | null) => (serial !== null ? `#${serial}${of !== null ? ` of ${of}` : ""}` : "—");
  const receipts: Row[] = [
    ...p.lines.flatMap((l) =>
      l.copies.map((c) => ({
        id: c.id,
        at: c.at,
        item: `${lineTitleOf(l)}${c.from ? ` · from ${c.from}` : ""}`,
        number: num(c.serial, c.of),
        price: formatAmount(c.price, c.token),
        tx: c.txHash,
        sold: false,
      })),
    ),
    ...p.sold.map((s) => ({
      id: s.id,
      at: s.at,
      item: `Sold to ${s.to} · ${[KIND_NAME[s.kind], s.use, s.product].filter(Boolean).join(" · ")}`,
      number: num(s.serial, s.of),
      price: formatAmount(s.price, s.token),
      tx: s.txHash,
      sold: true,
    })),
  ].sort((a, b) => b.at - a.at);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <h2 id={id} className={H2}>
        Receipts
      </h2>
      <div className={cn(CARD, "overflow-x-auto")}>
        <table className="w-full min-w-[560px] border-collapse text-left text-md leading-md">
          <thead>
            <tr className="text-sm text-text-tertiary">
              <th scope="col" className="pb-3 pr-6 font-medium">Date</th>
              <th scope="col" className="pb-3 pr-6 font-medium">Item</th>
              <th scope="col" className="pb-3 pr-6 font-medium">Copy</th>
              <th scope="col" className="pb-3 pr-6 text-right font-medium">Price</th>
              <th scope="col" className="pb-3 font-medium">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id} className="border-x-0 border-b-0 border-t border-solid border-border">
                <td className="py-4 pr-6 text-text-secondary">
                  <time dateTime={new Date(r.at).toISOString()}>{formatDateTime(r.at)}</time>
                </td>
                <td className="py-4 pr-6 text-text-primary">{r.item}</td>
                <td className="whitespace-nowrap py-4 pr-6 tabular-nums text-text-secondary">{r.number}</td>
                <td className={cn("whitespace-nowrap py-4 pr-6 text-right tabular-nums", r.sold ? "text-text-success" : "text-text-primary")}>
                  {r.sold ? "+" : ""}
                  {r.price}
                </td>
                <td className="whitespace-nowrap py-4 font-mono text-sm text-text-secondary" title={r.tx}>
                  {r.tx ? shortAddress(r.tx) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function NothingBought({ buyerName }: { buyerName: string }) {
  return (
    <div className={POST_PAGE}>
      <div className="flex justify-center px-8 py-40">
        <StateCard
          tone="empty"
          titleAs="h1"
          icon={<Icon icon={ShoppingBag01Icon} size={32} />}
          title={`${buyerName} hasn't bought anything of this project`}
          body="Purchases show under My projects › Purchased for the demo creator you shop as. Switch Shopping as on Explore marketplace to see another's."
          action={
            <Link href="/projects?tab=purchased" className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "hover:text-[color:var(--color-button-primary-text)]")}>
              Back to Purchased
            </Link>
          }
        />
      </div>
    </div>
  );
}
