"use client";

// One project's purchases, as the active demo creator holds them: the project unlocked (owner, 2026-11-19: "what
// will I see for the Physical and Virtual NFTs I buy? plan it with our other details pages"; plan
// 6rPKBgwzQ6r6woYmjfE6Td, D1–D6). It keeps the marketplace page's frame, so a buyer sees what they bought in the
// shape they bought it in, and answers five questions in order:
// 1. What do I own? — the Your NFTs box in the rail (under the header on a phone): a tab per kind held, as the
//    marketplace box has, its copies by number and use, NFT details (the Purchased Summary's facts) and Buy another;
// 2. What may I do with it? — What you can do: You can / You can't for each use held (one copy is one licence);
// 3. How do I get and use it? — Your files: what each kind unlocks (a Physical NFT the PCB, firmware and wiring that
//    are locked on Innovations, the enclosure and the assembly guide; a Virtual NFT the 3D model and renders; the
//    whole project all of it), and What you'll build: each product, its specs and parts, its 3D model;
// 4. Where is the proof? — the box's NFT details and the Receipts;
// 5. Who helps, can I get more? — the Creator block and Buy another.
// The media, the products and the creator come from the project's Innovations post (a sample's own post, or this
// browser's project read as one), so this page and the post never disagree.

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Download04Icon,
  File01Icon,
  ImageNotFound01Icon,
  ShoppingBag01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { ModelViewer } from "@/components/3d/model-viewer";
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
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { useCreateHistory } from "@/lib/create/history";
import { minePostOf } from "@/lib/innovations/mine-post";
import type { InnovationPost, PostProduct } from "@/lib/innovations/types";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import { useMarket } from "@/lib/market/market-store";
import {
  FILES_OF,
  KIND_NAME,
  LICENCE,
  lineTitleOf,
  mainLicenceOf,
  type Licence,
  type PurchaseKind,
  type PurchaseLine,
  type PurchasedProject,
} from "@/lib/market/purchases";
import { sampleMarketOf } from "@/lib/market/sample-market";
import { useMe } from "@/lib/people/profile-store";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { addAmounts, formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { Amount } from "@/lib/wallet/types";
import type { DemoBuyer } from "@/lib/wallet/identities";
import type { Token } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { usePurchased } from "./use-purchased";

const H2 = "text-xl font-bold leading-xl text-text-primary";
const H3 = "text-lg font-semibold leading-lg text-text-primary";
const SECONDARY_LINK = cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "h-[44px] gap-2 hover:text-[color:var(--color-button-secondary-text)]");
const QUIET_BUTTON =
  "self-start rounded-sm text-md font-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";
const KINDS: PurchaseKind[] = ["main", "physical", "virtual"];
/** Rows a group shows before "Show all". */
const FIRST_ROWS = 3;
const FIRST_PARTS = 6;

export function PurchasedPage({ id, initialTab = null }: { id: string; initialTab?: OfferTab | null }) {
  const { ready, buyer, purchases } = usePurchased();
  if (!ready) return <ProjectSkeleton />;
  const p = purchases.find((x) => x.id === id);
  if (!p) return <NothingBought buyerName={buyer.name} />;
  return p.source === "sample" ? <SampleBody p={p} buyer={buyer} initialTab={initialTab} /> : <OwnBody p={p} buyer={buyer} initialTab={initialTab} />;
}

type BodyProps = { p: PurchasedProject; buyer: DemoBuyer; initialTab: OfferTab | null };

function SampleBody(props: BodyProps) {
  const m = sampleMarketOf(props.p.id);
  if (!m) return <NothingBought buyerName={props.buyer.name} />;
  return <PurchasedBody {...props} post={m.post} mine={null} />;
}

/** This browser's own project, read as its Innovations post (as the post page reads it). */
function OwnBody(props: BodyProps) {
  const data = useProjectPageData(props.p.id, "project");
  const me = useMe();
  const post = React.useMemo(() => {
    if (data.state !== "ready") return null;
    const read = minePostOf(data.project, data.view);
    return { ...read, creator: { ...read.creator, name: me.name, initials: me.initials } };
  }, [data, me]);
  if (data.state === "missing") return <NothingBought buyerName={props.buyer.name} />;
  if (data.state !== "ready" || !post) return <ProjectSkeleton />;
  return <PurchasedBody {...props} post={post} mine={{ project: data.project, view: data.view, brief: data.brief }} />;
}

function PurchasedBody({ p, buyer, initialTab, post, mine }: BodyProps & { post: InnovationPost; mine: MinePostFacts | null }) {
  const { titleRef, live } = usePageArrival(`purchased:${p.id}`, p.name, `${p.name} · Purchased · IDEEZA`);
  const held = KINDS.filter((k) => p.lines.some((l) => l.kind === k));
  const [tab, setTab] = React.useState<PurchaseKind>(initialTab && held.includes(initialTab) ? initialTab : held[0]);
  const box = <YourNftsBox p={p} buyer={buyer} held={held} tab={tab} onTab={setTab} />;
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
              {box}
              {creator}
            </div>
            <WhatYouCanDo p={p} />
            <YourFiles held={held} />
            <WhatYoullBuild p={p} post={post} held={held} />
            <Receipts p={p} />
            {post.shared && <OnInnovations post={post} className={NARROW_ONLY} />}
          </div>

          <aside aria-label="Your NFTs and the creator" className={cn(WIDE_ONLY, "min-w-0 flex-col self-stretch")}>
            <div className="sticky top-[24px] flex flex-col gap-8">
              {box}
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
  const counts = (["physical", "virtual"] as const)
    .map((k) => [k, p.lines.filter((l) => l.kind === k).reduce((n, l) => n + l.copies.length, 0)] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k === "physical" ? "Physical" : "Virtual"} ×${n}`);
  const main = p.lines.find((l) => l.kind === "main");
  const what = [main ? lineTitleOf(main) : null, ...counts].filter(Boolean).join(" · ");
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
      <p className="m-0 text-lg font-semibold leading-lg text-text-primary">
        You own {p.count} {p.count === 1 ? "NFT" : "NFTs"}
        <span className="font-regular text-text-secondary">
          {" "}
          · {what} · last bought {formatDate(p.lastAt)}
        </span>
      </p>
      <p className="m-0 flex flex-wrap items-center gap-3 text-md leading-md text-text-secondary">
        Bought as {buyer.name} (demo creator) <TestnetDemoBadge />
      </p>
      {p.soldInFullTo && (
        <p className="m-0 rounded-lg bg-bg-subtle px-6 py-4 text-md leading-md text-text-primary">
          The project was sold in full to {p.soldInFullTo}. Your copies stay yours.
        </p>
      )}
    </header>
  );
}

// ─────────────────────────────── 1 · what you own ───────────────────────────────

function YourNftsBox({
  p,
  buyer,
  held,
  tab,
  onTab,
}: {
  p: PurchasedProject;
  buyer: DemoBuyer;
  held: PurchaseKind[];
  tab: PurchaseKind;
  onTab: (k: PurchaseKind) => void;
}) {
  const id = React.useId();
  const lines = p.lines.filter((l) => l.kind === tab);
  return (
    <section aria-labelledby={id} className={cn(CARD, "flex flex-col gap-6")}>
      <h2 id={id} className={H2}>
        Your NFTs
      </h2>
      <OfferTabs tabs={held} active={tab} onSelect={onTab} label="Your NFTs">
        {tab === "main" ? <MainPanel p={p} line={lines[0]} /> : <CopiesPanel p={p} kind={tab} lines={lines} />}
      </OfferTabs>
      <p className="m-0 flex flex-wrap items-center gap-3 text-sm leading-sm text-text-secondary">
        In {buyer.name}&apos;s demo wallet · <span className="font-mono">{shortAddress(p.lines[0].copies[0].buyerAddress)}</span>
        <TestnetDemoBadge />
      </p>
    </section>
  );
}

function MainPanel({ p, line }: { p: PurchasedProject; line: PurchaseLine }) {
  const last = line.copies[line.copies.length - 1];
  const share = line.sharePct ?? 0;
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-secondary">{share >= 100 ? "The whole project" : `${share}% of the project`}</span>
        <span className="text-2xl font-semibold leading-2xl tabular-nums text-text-primary">{share}%</span>
      </div>
      <FactGrid facts={facts} />
      <p className="m-0 text-sm text-text-tertiary">Minted when you bought it.</p>
    </div>
  );
}

function CopiesPanel({ p, kind, lines }: { p: PurchasedProject; kind: Exclude<PurchaseKind, "main">; lines: PurchaseLine[] }) {
  const copies = lines.flatMap((l) => l.copies);
  const uses = [...new Set(lines.map((l) => l.use).filter(Boolean))];
  const first = copies[0];
  const facts: Fact[] = [
    { label: "Collection", value: first.collection || "—" },
    { label: "Blockchain", value: networkLabelOf(first.network) },
    { label: "NFT type", value: KIND_NAME[kind] },
    { label: "Copies", value: String(copies.length) },
    { label: "Paid", value: paidOf(lines) },
    { label: "Purchased from", value: p.creator },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-secondary">{[KIND_NAME[kind], ...uses].join(" · ")}</span>
        <span className="text-2xl font-semibold leading-2xl tabular-nums text-text-primary">
          {copies.length} {copies.length === 1 ? "copy" : "copies"}
        </span>
      </div>
      {lines.map((l) => (
        <CopyGroup key={`${l.use}|${l.product}`} line={l} />
      ))}
      {p.buyable.includes(kind) && (
        <Link href={`${p.marketHref}?nft=${kind}`} className={cn(SECONDARY_LINK, "w-full")}>
          Buy another
          <Icon icon={ArrowRight01Icon} size={16} />
        </Link>
      )}
      <MoreFacts>
        <FactGrid facts={facts} />
        <p className="m-0 text-sm text-text-tertiary">Each copy is one licence. Minted when you bought it.</p>
      </MoreFacts>
    </div>
  );
}

/** One use's copies, by number: three, then Show all. */
function CopyGroup({ line }: { line: PurchaseLine }) {
  const [all, setAll] = React.useState(false);
  const shown = all ? line.copies : line.copies.slice(0, FIRST_ROWS);
  const title = [line.use, line.product].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-2">
      <span className="text-md font-semibold leading-md text-text-primary">{title}</span>
      <ul role="list" aria-label={title} className="m-0 flex list-none flex-col p-0">
        {shown.map((c) => (
          <li key={c.id} className="flex items-baseline justify-between gap-4 border-x-0 border-b-0 border-t border-solid border-border py-3 text-md leading-md">
            <span className="font-mono tabular-nums text-text-primary">{c.serial !== null ? `#${c.serial}${c.of !== null ? ` of ${c.of}` : ""}` : "—"}</span>
            <span className="flex items-baseline gap-4 text-text-secondary">
              <span className="tabular-nums">{formatAmount(c.price, c.token)}</span>
              <time dateTime={new Date(c.at).toISOString()} className="text-sm text-text-tertiary">
                {formatDate(c.at)}
              </time>
            </span>
          </li>
        ))}
      </ul>
      {line.copies.length > FIRST_ROWS && (
        <button type="button" onClick={() => setAll((a) => !a)} aria-expanded={all} className={QUIET_BUTTON}>
          {all ? "Show fewer" : `Show all ${line.copies.length}`}
        </button>
      )}
    </div>
  );
}

/** What was paid over these lines, per token: "0.08 ETH", "0.1 ETH + 5 USDC". */
function paidOf(lines: PurchaseLine[]): string {
  const byToken = new Map<Token, Amount>();
  for (const l of lines) for (const x of l.paid) byToken.set(x.token, byToken.has(x.token) ? addAmounts(byToken.get(x.token) as Amount, x.amount) : x.amount);
  return [...byToken].map(([token, amount]) => formatAmount(amount, token)).join(" + ");
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

// ─────────────────────────────── 2 · what you can do ───────────────────────────────

function WhatYouCanDo({ p }: { p: PurchasedProject }) {
  const id = React.useId();
  const rights = p.lines.filter((l, i, all) => all.findIndex((x) => x.kind === l.kind && x.use === l.use) === i);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id={id} className={H2}>
          What you can do
        </h2>
        <p className="m-0 text-md leading-md text-text-secondary">Each copy is one licence, for the use it was bought for.</p>
      </div>
      <ul role="list" className="m-0 grid list-none grid-cols-1 gap-6 p-0 [@container(min-width:720px)]:grid-cols-2">
        {rights.map((l) => {
          const licence: Licence = l.kind === "main" ? mainLicenceOf(l.sharePct ?? 0) : LICENCE[l.kind][l.use ?? "Personal use"];
          const title = l.kind === "main" ? lineTitleOf(l) : `${KIND_NAME[l.kind]} · ${l.use}`;
          return (
            <li key={`${l.kind}|${l.use}`} className={cn(CARD, "flex flex-col gap-5")}>
              <h3 className={H3}>{title}</h3>
              <div className="flex flex-col gap-5">
                <RuleList tone="can" items={licence.can} />
                {licence.cant.length > 0 && <RuleList tone="cant" items={licence.cant} />}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RuleList({ tone, items }: { tone: "can" | "cant"; items: string[] }) {
  const can = tone === "can";
  return (
    <div className="flex flex-col gap-3">
      <span className={cn("text-sm font-semibold", can ? "text-text-success" : "text-text-error")}>{can ? "You can" : "You can't"}</span>
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

// ─────────────────────────────── 3 · your files, what you'll build ───────────────────────────────

const WITH: Record<PurchaseKind, string> = {
  main: "With the whole project",
  physical: "With your Physical NFT",
  virtual: "With your Virtual NFT",
};

function YourFiles({ held }: { held: PurchaseKind[] }) {
  const id = React.useId();
  const noteId = React.useId();
  // The whole project holds every file, so it stands alone.
  const groups: PurchaseKind[] = held.includes("main") ? ["main"] : held;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id={id} className={H2}>
          Your files
        </h2>
        <p id={noteId} className="m-0 text-md leading-md text-text-secondary">
          On the real marketplace these come with the NFT. This testnet demo has no files to download.
        </p>
      </div>
      {groups.map((k) => (
        <div key={k} className="flex flex-col gap-4">
          <h3 className={H3}>{WITH[k]}</h3>
          <ul role="list" className="m-0 flex list-none flex-col rounded-xl border border-solid border-border bg-bg-surface p-0">
            {FILES_OF[k].map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-x-0 border-b-0 border-t border-solid border-border px-8 py-6 first:border-t-0 max-md:px-6"
              >
                <div className="flex min-w-0 flex-1 items-start gap-5">
                  <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-text-secondary">
                    <Icon icon={File01Icon} size={20} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-2">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="text-md font-semibold leading-md text-text-primary">{f.name}</span>
                      <Badge tone="neutral">{f.format}</Badge>
                    </span>
                    <ul role="list" className="m-0 flex list-none flex-col gap-1 p-0 text-sm leading-sm text-text-secondary">
                      {f.includes.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  type="button"
                  hierarchy="tonal"
                  size="md"
                  disabled
                  aria-describedby={noteId}
                  iconLeading={<Icon icon={Download04Icon} size={16} />}
                  className="max-md:min-h-[var(--touch-min)]"
                >
                  Download
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function WhatYoullBuild({ p, post, held }: { p: PurchasedProject; post: InnovationPost; held: PurchaseKind[] }) {
  const id = React.useId();
  const builds = held.includes("main") || held.includes("physical");
  const twin = held.includes("main") || held.includes("virtual");
  // A product's own copies cover that product; the whole project's copies cover every product.
  const scoped = p.lines.every((l) => l.kind !== "main" && l.product !== null);
  const names = new Set(p.lines.map((l) => l.product));
  const covered = scoped ? post.products.filter((x) => names.has(x.name)) : post.products;
  const products = covered.length ? covered : post.products;
  if (!products.length) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id={id} className={H2}>
          {builds ? "What you'll build" : "The digital twin"}
        </h2>
        <p className="m-0 text-md leading-md text-text-secondary">
          {builds
            ? `${products.length === 1 ? "The product" : `The ${products.length} products`} your NFTs cover: its specs, its parts${twin ? " and its 3D model" : ""}.`
            : "The 3D model your Virtual NFT licenses, and the product it shows."}
        </p>
      </div>
      <ul role="list" className="m-0 flex list-none flex-col gap-8 p-0">
        {products.map((prod) => (
          <li key={prod.id}>
            <ProductCard product={prod} showModel={twin} showParts={builds} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductCard({ product, showModel, showParts }: { product: PostProduct; showModel: boolean; showParts: boolean }) {
  const { builds } = useCreateHistory();
  const glb = product.build ? (builds.find((b) => b.id === product.build?.buildId)?.modelGlbUrl ?? null) : null;
  const [modelOk, setModelOk] = React.useState(true);
  const [allParts, setAllParts] = React.useState(false);
  const model = showModel && glb !== null && modelOk;
  const parts = allParts ? product.parts : product.parts.slice(0, FIRST_PARTS);
  return (
    <article className={cn(CARD, "flex flex-col gap-8")}>
      <div className="grid grid-cols-1 gap-8 [@container(min-width:720px)]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <figure className="m-0 flex flex-col gap-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-bg-surface-raised">
            {model ? (
              <ModelViewer url={glb} onError={() => setModelOk(false)} />
            ) : product.image ? (
              <PostImg src={product.image} alt={`${product.name}, a render`} className="absolute inset-0 h-full w-full object-cover" fallback={<Gone />} />
            ) : (
              <Gone />
            )}
          </div>
          <figcaption className="text-sm text-text-tertiary">{model ? "3D model · drag to turn it" : "Render"}</figcaption>
        </figure>
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className={H3}>{product.name}</h3>
            {product.summary && <p className="m-0 text-md leading-md text-text-secondary">{product.summary}</p>}
          </div>
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
        </div>
      </div>
      {showParts && product.parts.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-md font-semibold leading-md text-text-primary">Parts · {product.parts.length}</span>
          <ul role="list" className="m-0 flex list-none flex-col p-0">
            {parts.map((x) => (
              <li key={x.name} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-x-0 border-b-0 border-t border-solid border-border py-3">
                <span className="text-md leading-md text-text-primary">
                  {x.name}
                  {x.qty > 1 && <span className="tabular-nums text-text-secondary"> × {x.qty}</span>}
                </span>
                <span className="text-sm leading-sm text-text-secondary">{x.use}</span>
              </li>
            ))}
          </ul>
          {product.parts.length > FIRST_PARTS && (
            <button type="button" onClick={() => setAllParts((a) => !a)} aria-expanded={allParts} className={QUIET_BUTTON}>
              {allParts ? "Show fewer" : `Show all ${product.parts.length} parts`}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function Gone() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
      <Icon icon={ImageNotFound01Icon} size={20} strokeWidth={1.4} />
    </div>
  );
}

// ─────────────────────────────── 4 · receipts ───────────────────────────────

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
