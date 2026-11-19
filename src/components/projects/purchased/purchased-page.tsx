"use client";

// One project's purchases, as the active demo creator holds them: the project unlocked (owner, 2026-11-19; plan
// 6rPKBgwzQ6r6woYmjfE6Td). The marketplace page's frame — media first, then the header — and then everything about
// one kind of NFT in one place (v2: "the information drifts apart"):
// - Your NFTs, a tab per kind held (as the marketplace box has):
//   · Physical / Virtual: the copies by use, each use with what it allows and doesn't; each copy with its number,
//     price and date, a Physical copy's units (allowance, made, left; units.ts), Send to manufacturing and Sell
//     this copy (their flows come next: the buttons wait, and say what a sale would hand over); then the products
//     the copies cover, one at a time, each in full: its overview and specs, and the pieces this kind unlocks in
//     the project's own panels (Physical: 3D model, PCB, firmware, wiring, assembly, parts; Virtual: the 3D model
//     and parts); then NFT details;
//   · Main: the whole project is the buyer's, so it opens as their own project (owner: "full control, browse it
//     like my private project, no downloads"): Open the project, its products, and the ownership facts;
// - Receipts;
// - the rail: a Summary of what is held, the creator, On Innovations.
// The media, the products and the creator come from the project's Innovations post (a sample's own post, or this
// browser's project read as one); every product's pieces come from a build (this browser's, or the sample's).

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, Cancel01Icon, ImageNotFound01Icon, ShoppingBag01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, StateCard, TestnetDemoBadge, buttonVariants } from "@/components/ideeza";
import { CARD, PostImg } from "@/components/innovations/post-bits";
import { PostMediaStage } from "@/components/innovations/post-media";
import { MakerBlock } from "@/components/innovations/post-rail";
import { NARROW_ONLY, POST_COLUMNS, POST_CONTENT, POST_PAGE, WIDE_ONLY } from "@/components/innovations/post-states";
import type { MinePostFacts } from "@/components/innovations/use-post";
import { AskCreator } from "@/components/marketplace/buyer-rail";
import { DemoBuyerBanner } from "@/components/marketplace/demo-buyer-banner";
import { FactGrid, MoreFacts, OfferTabs, type Fact, type OfferTab } from "@/components/marketplace/offer-parts";
import { OnInnovations } from "@/components/marketplace/sample-market-page";
import { LiveRegion, usePageArrival } from "@/components/projects/details/arrival";
import { Breadcrumb } from "@/components/projects/details/breadcrumb";
import { ProjectSkeleton } from "@/components/projects/details/page-states";
import { TabStrip, type TabDef } from "@/components/projects/details/tab-strip";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { DeliverablesAccess, ProductPiecePanel } from "@/components/projects/product/product-deliverables";
import { productsOf, useCreateHistory, type BuildItemKind, type BuildJob, type BuildProduct } from "@/lib/create/history";
import { acquiredIdOf, sampleBuildsOf } from "@/lib/demo/acquired-projects";
import { minePostOf } from "@/lib/innovations/mine-post";
import type { InnovationPost, PostProduct } from "@/lib/innovations/types";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import { useMarket } from "@/lib/market/market-store";
import {
  GIVES,
  KIND_NAME,
  LICENCE,
  lineTitleOf,
  mainLicenceOf,
  type Licence,
  type PurchaseCopy,
  type PurchaseKind,
  type PurchaseLine,
  type PurchasedProject,
} from "@/lib/market/purchases";
import { sampleMarketOf } from "@/lib/market/sample-market";
import { copyUnitsOf, unitsLineOf, unitsOnResale, type CopyUnits, type UnitsEntry } from "@/lib/market/units";
import { useMe } from "@/lib/people/profile-store";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { addAmounts, formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { Amount } from "@/lib/wallet/types";
import type { DemoBuyer } from "@/lib/wallet/identities";
import type { Token } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { useUnitsLog } from "./units-store";
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
  return p.source === "sample" ? <SampleBody p={p} buyer={buyer} initialTab={initialTab} /> : <OwnBody p={p} buyer={buyer} initialTab={initialTab} />;
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
  const held = KINDS.filter((k) => p.lines.some((l) => l.kind === k));
  const [tab, setTab] = React.useState<PurchaseKind>(initialTab && held.includes(initialTab) ? initialTab : held[0]);
  const log = useUnitsLog();
  const summary = <SummaryBlock p={p} buyer={buyer} held={held} />;
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
            <div className={cn(NARROW_ONLY, "flex flex-col gap-8")}>
              {summary}
              {creator}
            </div>

            <section aria-labelledby="your-nfts" className="flex flex-col gap-8">
              <h2 id="your-nfts" className={H2}>
                Your NFTs
              </h2>
              <OfferTabs tabs={held} active={tab} onSelect={setTab} label="Your NFTs">
                {tab === "main" ? (
                  <MainPanel p={p} post={post} buildOf={buildOf} />
                ) : (
                  <KindPanel p={p} kind={tab} post={post} buildOf={buildOf} buyer={buyer} log={log} />
                )}
              </OfferTabs>
            </section>

            <Receipts p={p} />
            {post.shared && <OnInnovations post={post} className={NARROW_ONLY} />}
          </div>

          <aside aria-label="Summary and the creator" className={cn(WIDE_ONLY, "min-w-0 flex-col self-stretch")}>
            <div className="sticky top-[24px] flex flex-col gap-8">
              {summary}
              {creator}
              {post.shared && <OnInnovations post={post} />}
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
      {p.soldInFullTo && (
        <p className="m-0 rounded-lg bg-bg-subtle px-6 py-4 text-md leading-md text-text-primary">
          The project was sold in full to {p.soldInFullTo}. Your copies stay yours, with their units and files.
        </p>
      )}
    </header>
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
        <div className="flex items-baseline justify-between gap-4 border-x-0 border-b-0 border-t border-solid border-border py-3">
          <dt className="text-md text-text-secondary">Paid in all</dt>
          <dd className="m-0 text-md font-semibold tabular-nums text-text-primary">{paidOf(p.lines)}</dd>
        </div>
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
        In {buyer.name}&apos;s demo wallet · <span className="font-mono">{shortAddress(p.lines[0].copies[0].buyerAddress)}</span>
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

// ─────────────────────────────── Main: the project is yours ───────────────────────────────

function MainPanel({ p, post, buildOf }: { p: PurchasedProject; post: InnovationPost; buildOf: (i: number) => ProductBuild }) {
  const line = p.lines.find((l) => l.kind === "main") as PurchaseLine;
  const last = line.copies[line.copies.length - 1];
  const share = line.sharePct ?? 0;
  const whole = share >= 100;
  const projectId = p.source === "sample" ? acquiredIdOf(p.id) : p.id;
  const licence = mainLicenceOf(share);
  const facts: Fact[] = [
    { label: "Collection", value: last.collection || "—" },
    { label: "Blockchain", value: networkLabelOf(last.network) },
    { label: "NFT type", value: "Main NFT" },
    { label: "Token ID", value: last.tokenId !== null ? `#${last.tokenId}` : "Not assigned" },
    { label: "Your share", value: `${share}%` },
    { label: "Price paid", value: paidOf([line]) },
    { label: "Purchased from", value: p.creator },
    { label: "Transaction", value: last.txHash ? shortAddress(last.txHash) : "—" },
    { label: "Purchased", value: formatDate(last.at) },
  ];
  return (
    <div className="flex flex-col gap-8">
      <div className={cn(CARD, "flex flex-col gap-6")}>
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-semibold leading-2xl text-text-primary">{whole ? "The whole project is yours" : `${share}% of the project is yours`}</h3>
          <p className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">
            {whole
              ? "You hold its Main NFT, so it is one of your projects now: open its products, its editors and its builds as you open your own, and list it again from Earn when you want to."
              : "You hold a share of its Main NFT: its sales and royalties are split with you."}
          </p>
        </div>
        {whole && (
          // A full load: a project bought this session is made when the app starts (acquired-projects.ts).
          <a href={`/projects/${encodeURIComponent(projectId)}`} className={cn(PRIMARY_LINK, "self-start")}>
            Open the project
            <Icon icon={ArrowRight01Icon} size={16} />
          </a>
        )}
        <RuleColumns licence={licence} />
      </div>

      {whole && post.products.length > 0 && (
        <ProductsView
          kind="main"
          post={post}
          covered={post.products.map((x, i) => ({ x, i }))}
          buildOf={buildOf}
          productHref={(i) =>
            `/projects/${encodeURIComponent(projectId)}/products/${encodeURIComponent(p.source === "sample" ? `prd_bought_${p.id}_${i + 1}` : (post.products[i].build?.productId ?? post.products[i].id))}`
          }
        />
      )}

      <MoreFacts>
        <FactGrid facts={facts} />
        <p className="m-0 text-sm text-text-tertiary">Minted when you bought it.</p>
      </MoreFacts>
    </div>
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
      <GivesBlock kind={kind} />
      {lines.map((l) => (
        <UseGroup
          key={`${l.use}|${l.product}`}
          line={l}
          buyer={buyer}
          log={log}
          setOf={l.product === null && post.products.length > 1 ? post.products.map((x) => x.name) : null}
        />
      ))}
      {covered.length > 0 && <ProductsView kind={kind} post={post} covered={covered} buildOf={buildOf} />}
      <MoreFacts>
        <FactGrid facts={facts} />
        <p className="m-0 text-sm text-text-tertiary">Each copy is one licence. Minted when you bought it.</p>
      </MoreFacts>
    </div>
  );
}

/** One use's copies with what that use allows: the licence beside the copies it covers. */
function UseGroup({ line, buyer, log, setOf }: { line: PurchaseLine; buyer: DemoBuyer; log: readonly UnitsEntry[]; setOf: string[] | null }) {
  const noteId = React.useId();
  const kind = line.kind as Exclude<PurchaseKind, "main">;
  const licence = LICENCE[kind][line.use ?? "Personal use"];
  const title = [line.use, line.product].filter(Boolean).join(" · ");
  const n = line.copies.length;
  return (
    <section aria-label={`${KIND_NAME[kind]} · ${title}`} className={cn(CARD, "flex flex-col gap-8")}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h3 className={H3}>{title}</h3>
        <span className="text-md tabular-nums text-text-secondary">
          {n} {n === 1 ? "copy" : "copies"}
          {line.unitsPerCopy !== null && ` · ${line.unitsPerCopy} ${line.unitsPerCopy === 1 ? "unit" : "units"} per copy`}
        </span>
      </div>
      {setOf && (
        <p className="m-0 rounded-lg bg-bg-subtle px-6 py-4 text-md leading-md text-text-primary">
          These copies cover the whole project, so {kind === "physical" ? `each unit is one set: ${andList(setOf)}` : `each covers every product: ${andList(setOf)}`}.
        </p>
      )}
      <RuleColumns licence={licence} />
      <ul role="list" className="m-0 flex list-none flex-col p-0">
        {line.copies.map((c) => (
          <CopyRow
            key={c.id}
            copy={c}
            units={line.unitsPerCopy !== null ? copyUnitsOf(c.key, line.unitsPerCopy, buyer.id, log) : null}
            noteId={noteId}
          />
        ))}
      </ul>
      <p id={noteId} className="m-0 text-sm leading-sm text-text-tertiary">
        {kind === "physical"
          ? "Sending a copy to manufacturing and selling it on come in the next step of the prototype. A sale hands the buyer the copy's units left; the units you made stay yours."
          : "Selling a copy on comes in the next step of the prototype. A sale hands the buyer the copy and its licence."}
      </p>
    </section>
  );
}

function CopyRow({ copy: c, units, noteId }: { copy: PurchaseCopy; units: CopyUnits | null; noteId: string }) {
  const number = c.serial !== null ? `#${c.serial}${c.of !== null ? ` of ${c.of}` : ""}` : "—";
  const resale = units ? unitsOnResale(units) : null;
  return (
    <li className="flex flex-col gap-4 border-x-0 border-b-0 border-t border-solid border-border py-6 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span className="font-mono text-lg tabular-nums text-text-primary">{number}</span>
        <span className="flex items-baseline gap-4 text-md text-text-secondary">
          <span className="tabular-nums">{formatAmount(c.price, c.token)}</span>
          <time dateTime={new Date(c.at).toISOString()} className="text-sm text-text-tertiary">
            Bought {formatDate(c.at)}
          </time>
        </span>
      </div>
      {units && (
        <div className="flex flex-col gap-2">
          <div
            role="meter"
            aria-label={`Units made with ${number}`}
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
              If you sell {number.split(" ")[0]}, the buyer gets {resale.buyerGets === 0 ? "no units" : `the ${resale.buyerGets} ${resale.buyerGets === 1 ? "unit" : "units"}`} left
              {resale.sellerKeeps > 0 ? `; the ${resale.sellerKeeps} you made stay yours.` : "."}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-4">
        {units && (
          <Button type="button" hierarchy="secondary" size="md" disabled aria-describedby={noteId} className="max-md:min-h-[var(--touch-min)]">
            Send to manufacturing
          </Button>
        )}
        <Button type="button" hierarchy="secondary" size="md" disabled aria-describedby={noteId} className="max-md:min-h-[var(--touch-min)]">
          Sell this copy
        </Button>
      </div>
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
            <p className="m-0 text-sm leading-sm text-text-secondary">
              {kind === "main"
                ? "It's yours: every piece is in the tabs above, and its editors open in your project."
                : kind === "physical"
                  ? `Your copy opens ${pieces.filter((t) => t.id !== "parts" && t.id !== "3d").map((t) => t.label).join(", ") || "the build"} for this product, with its 3D model and parts.`
                  : "Your copy licenses this product's 3D model; its parts are open to everyone."}
            </p>
          </div>
        </div>
      ) : build ? (
        // A holder takes the files this kind unlocks, as the maker does (the panel's own downloads).
        <DeliverablesAccess.Provider value>
          <ProductPiecePanel job={build.job} product={build.bp} kind={tab} chatHref={null} />
        </DeliverablesAccess.Provider>
      ) : null}
    </article>
  );
}

/** "A and B", "A, B and C". */
function andList(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** What this kind gives its holder and what it doesn't, said first (owner: "how much a Physical NFT shows, how
 *  much a Virtual NFT shows"). */
function GivesBlock({ kind }: { kind: Exclude<PurchaseKind, "main"> }) {
  const g = GIVES[kind];
  return (
    <section aria-label={`What your ${KIND_NAME[kind]} gives you`} className={cn(CARD, "flex flex-col gap-6")}>
      <h3 className={H3}>What your {KIND_NAME[kind]} gives you</h3>
      <div className="grid grid-cols-1 gap-6 [@container(min-width:560px)]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RuleList tone="can" items={g.gets} label="Included" />
        {g.not.length > 0 && <RuleList tone="cant" items={g.not} label="Not included" />}
      </div>
    </section>
  );
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
  const receipts = p.lines.flatMap((l) => l.copies.map((c) => ({ line: l, copy: c }))).sort((a, b) => b.copy.at - a.copy.at);
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
            {receipts.map(({ line, copy }) => (
              <tr key={copy.id} className="border-x-0 border-b-0 border-t border-solid border-border">
                <td className="py-4 pr-6 text-text-secondary">
                  <time dateTime={new Date(copy.at).toISOString()}>{formatDateTime(copy.at)}</time>
                </td>
                <td className="py-4 pr-6 text-text-primary">{lineTitleOf(line)}</td>
                <td className="py-4 pr-6 tabular-nums text-text-secondary">
                  {copy.serial !== null ? `#${copy.serial}${copy.of !== null ? ` of ${copy.of}` : ""}` : "—"}
                </td>
                <td className="py-4 pr-6 text-right tabular-nums text-text-primary">{formatAmount(copy.price, copy.token)}</td>
                <td className="py-4 font-mono text-sm text-text-secondary" title={copy.txHash}>
                  {copy.txHash ? shortAddress(copy.txHash) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NothingBought({ buyerName }: { buyerName: string }) {
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
