"use client";

// Someone else's product, as the Feed links it (`/m/projects/p1/products/
// remote`; Product Details 10h, 10x–10z read as a visitor): the web's sample
// post (`samplePostOf`) and its sample journey, on the buyer's page —
// Media first, then Overview (the Marketplace block from the post's copies,
// the Testnet demo badge, Specs) and Build (the pieces it was built with; the
// PCB, firmware and wiring come with a copy, D2 — the parts list is open).
// The header carries the product's activity (Now, Earlier). The sticky bar
// says what copies start at; a sample's copies can't be bought anywhere (the
// web's marketplace lists only this browser's own projects), so Buy a copy is
// off and says so.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { historyOf } from "@/lib/manual/journey";
import { formatDate } from "@/lib/manual/project-summary";
import { parseProductTab, phoneProductPath, productTabsOf, type ProductTab } from "@/lib/manual/phone-product";
import { offerOf, type ClipOffer } from "@/lib/innovations/clips";
import { sampleJourneyOf } from "@/lib/innovations/sample-activity";
import type { InnovationPost, PostPiece, PostProduct } from "@/lib/innovations/types";
import { ITEM_LABELS, type BuildItemKind } from "@/lib/create/history";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { ListCard } from "../kit/list";
import { MEDIA_GROUND } from "../kit/media";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { SectionHeading } from "../project/parts";
import { ActivityCardBlock } from "./activity";
import { FactCard, TABS_FIT, TABS_SCROLL } from "./parts";

/** Why a sample's Buy a copy is off: nothing sells it — said as it is. */
const SAMPLE_BUY = "This is a sample — its copies can’t be bought.";

/** Copies only: a product has no Main NFT (owner, 2026-10-12). */
function copiesOf(post: InnovationPost): ClipOffer[] {
  return (post.listing?.rows ?? []).map((r) => offerOf(r, post.license)).filter((o): o is ClipOffer => o !== null && o.kind !== "main");
}

const amountOf = (price: string) => Number.parseFloat(price);

/** The pieces a visitor may open (D2): the 3D model and the parts list. */
const OPEN: ReadonlySet<PostPiece> = new Set<PostPiece>(["3d", "parts"]);
/** A sample's piece as the build names it, so its row and its screen read the same ("3D Module", "Code"). */
const PIECE_KIND: Record<PostPiece, BuildItemKind> = { "3d": "3d", pcb: "pcb", code: "code", wiring: "wiring", parts: "parts" };

export function SampleProduct({ post, product, id }: { post: InnovationPost; product: PostProduct; id: string }) {
  const tabs = productTabsOf({ buyer: true, built: true, contributors: false });
  const [asked, setTab] = useTabParam<ProductTab | "marketplace">("tab", [...tabs.map((t) => t.id), "marketplace"], tabs[0].id);
  const tab = parseProductTab(asked, tabs) ?? "media";
  const base = phoneProductPath(id, product.id);
  const entries = React.useMemo(
    () => historyOf(sampleJourneyOf(post), post.id, { kind: "product", productId: product.id }, post.createdAt),
    [post, product.id],
  );
  const copies = copiesOf(post);
  const from = copies.length ? copies.reduce((a, o) => (amountOf(o.price) < amountOf(a.price) ? o : a), copies[0]) : null;

  return (
    <Screen
      top={<TopBar back={`/m/projects/${encodeURIComponent(id)}`} />}
      footer={
        from ? (
          <BottomBar className="gap-2 pt-6">
            <div className="flex items-center gap-6">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={T.meta}>Copies from</span>
                <span className={T.section}>{from.price}</span>
              </span>
              <Button size="xl" className="min-w-0 flex-1" disabled>
                Buy a copy
              </Button>
            </div>
            <p className={T.meta}>{SAMPLE_BUY}</p>
          </BottomBar>
        ) : undefined
      }
    >
      <header className="flex flex-col gap-6 px-8 pb-8">
        <div className="flex flex-col gap-2">
          <Link href={`/m/projects/${encodeURIComponent(id)}`} className={cn(T.meta, "self-start outline-none hover:underline focus-visible:underline")}>
            {post.title} · product
          </Link>
          <h1 className={cn(T.title, "break-words")}>{product.name}</h1>
          <p className={T.meta}>
            {[`By ${post.creator.name}`, `Shared ${formatDate(post.sharedAt)}`, `${product.pieces.length} pieces`].join(" · ")}
          </p>
        </div>
        <p className={cn(T.body, "text-text-primary")}>{product.summary}</p>
        <ActivityCardBlock name={product.name} entries={entries} />
      </header>
      <div className={cn("sticky top-0 z-10 bg-bg-page", TABS_SCROLL)}>
        <MobileTabs label="Product" idBase="pd" tabs={tabs.map((t) => ({ value: t.id, label: t.label }))} value={tab} onChange={setTab} className={TABS_FIT} />
      </div>
      <div {...tabPanelProps("pd", tab)} className="px-8 pb-12 pt-8 outline-none">
        {tab === "media" && <SampleMedia product={product} />}
        {tab === "overview" && <SampleOverview post={post} product={product} copies={copies} />}
        {tab === "build" && <SampleBuild product={product} base={base} />}
      </div>
    </Screen>
  );
}

function SampleMedia({ product }: { product: PostProduct }) {
  const v = product.video?.kind === "video" ? product.video : null;
  return (
    <div className="flex flex-col gap-12">
      {v && (
        <section aria-labelledby="sp-video" className="flex flex-col gap-4">
          <SectionHeading id="sp-video" title="Video" />
          <video src={v.src} poster={v.poster ?? undefined} controls playsInline preload="metadata" aria-label={v.alt} className={cn("aspect-video w-full rounded-md object-contain", MEDIA_GROUND)} />
          <p className={T.meta}>{v.label}</p>
        </section>
      )}
      <section aria-labelledby="sp-images" className="flex flex-col gap-4">
        <SectionHeading id="sp-images" title="Images" />
        {product.image ? (
          <figure className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- a sample post's image */}
            <img src={product.image} alt={`${product.name}: ${product.summary}`} className="aspect-[4/3] w-full rounded-md bg-bg-surface-raised object-cover" />
            <figcaption className={T.meta}>{product.name}</figcaption>
          </figure>
        ) : (
          <p className={T.body}>No images yet.</p>
        )}
      </section>
    </div>
  );
}

function SampleOverview({ post, product, copies }: { post: InnovationPost; product: PostProduct; copies: ClipOffer[] }) {
  return (
    <div className="flex flex-col gap-12">
      {copies.length > 0 && (
        <section aria-labelledby="sp-market" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 id="sp-market" className={T.section}>
              Marketplace
            </h2>
            <span className={T.body}>· {copies.length} on sale</span>
            <span className="flex-1" />
            <TestnetDemoBadge />
          </div>
          <FactCard
            label="Marketplace"
            rows={copies.map((o) => [
              [o.kind === "physical" ? "Physical NFT" : "Virtual NFT", o.use].filter(Boolean).join(" · "),
              o.sold ? `${o.price} · ${o.sold.count}/${o.sold.of} sold` : o.price,
            ])}
          />
          {(post.chain || post.license) && (
            <FactCard
              label="Collection"
              rows={[...(post.chain ? [["Blockchain", post.chain] as const] : []), ...(post.license ? [["License", post.license] as const] : [])]}
            />
          )}
        </section>
      )}
      {product.specs.length > 0 && (
        <section aria-labelledby="sp-specs" className="flex flex-col gap-4">
          <SectionHeading id="sp-specs" title="Specs" />
          <FactCard label="Specs" rows={product.specs.map((s) => [s.label, s.value])} />
        </section>
      )}
    </div>
  );
}

function SampleBuild({ product, base }: { product: PostProduct; base: string }) {
  return (
    <div className="flex flex-col gap-12">
      <ListCard label="Pieces">
        {product.pieces.map((k) => {
          const open = OPEN.has(k);
          const body = (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={T.name}>{ITEM_LABELS[PIECE_KIND[k]]}</span>
                <span className={T.meta}>
                  {k === "parts" ? `${product.parts.length} parts · bill of materials` : open ? "Enclosure and parts in 3D" : "Comes with a copy"}
                </span>
              </span>
              {open ? (
                <>
                  <Badge tone="success">Ready</Badge>
                  <span aria-hidden className="text-[color:var(--color-icon-default)]">
                    <Icon icon={ArrowRight01Icon} size={20} />
                  </span>
                </>
              ) : (
                <span aria-label="Locked" className="text-[color:var(--color-icon-secondary)]">
                  <Icon icon={SquareLock02Icon} size={20} />
                </span>
              )}
            </>
          );
          return (
            <li key={k}>
              {open ? (
                <Link href={`${base}/build/${PIECE_KIND[k]}`} className="flex items-center gap-4 p-6 outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle">
                  {body}
                </Link>
              ) : (
                <div className={cn("flex items-center gap-4 p-6")}>{body}</div>
              )}
            </li>
          );
        })}
      </ListCard>
      <section aria-labelledby="sp-downloads" className="flex flex-col gap-4">
        <SectionHeading id="sp-downloads" title="Downloads" />
        <p className={T.body}>Firmware and downloads come with a purchase.</p>
      </section>
    </div>
  );
}
