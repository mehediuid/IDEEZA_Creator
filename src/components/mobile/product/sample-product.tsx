"use client";

// Someone else's product, as the Feed links it (`/m/projects/p1/products/
// remote`; Product Details 10h, 10x–10z read as a visitor): the web's sample
// post (`samplePostOf`) and its sample journey, on the buyer's page.
//
// Laid out as a product page (owner 2026-11-12: the Feed's pill opened a page
// with no picture, a table and a Buy a copy that was off — "can't be
// bought" — after the Feed had shown its price): the product's video on top
// (the Feed's clip, muted and looping), "Part of {project}", the name and its
// line, the summary, then the product's activity. Tabs: Media, Overview (the
// collection's chain and license, Specs) and Build (the pieces it was built
// with; the PCB, firmware and wiring come with a copy, D2 — the parts list is
// open). A sample's copies are the whole project's, so they are sold on the
// project's screen, never on a product's (CL-018: "A product with no copies of
// its own has no box. 'Part of {project}' leads to the project's offers."):
// the bar says what they start at, and Buy a copy opens them there
// (project-earn/buyer/sample-shop.tsx `SampleCopiesBar`).

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { historyOf } from "@/lib/manual/journey";
import { formatDate } from "@/lib/manual/project-summary";
import { parseProductTab, phoneProductPath, productTabsOf, type ProductTab } from "@/lib/manual/phone-product";
import { sampleJourneyOf } from "@/lib/innovations/sample-activity";
import type { InnovationPost, PostPiece, PostProduct } from "@/lib/innovations/types";
import { ITEM_LABELS, type BuildItemKind } from "@/lib/create/history";
import { shareItemId } from "@/lib/innovations/share-items";
import { cn } from "@/lib/utils";
import { ListCard } from "../kit/list";
import { useShareAction } from "../feed/share-action";
import { SampleCopiesBar } from "../project-earn/buyer/sample-shop";
import { MediaHero } from "../project/sample-project";
import { MEDIA_GROUND } from "../kit/media";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { SectionHeading } from "../project/parts";
import { ActivityCardBlock } from "./activity";
import { FactCard, TABS_FIT, TABS_SCROLL } from "./parts";

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
  const video = product.video?.kind === "video" ? product.video : null;
  // Share (owner 2026-11-22): anyone may share a product while it is on the Marketplace.
  const share = useShareAction(shareItemId("sample", id, product.id));

  return (
    <Screen
      top={<TopBar back={`/m/projects/${encodeURIComponent(id)}`} actions={share.action ? [share.action] : []} />}
      footer={<SampleCopiesBar post={post} id={id} />}
    >
      <MediaHero video={video} picture={video?.poster ?? product.image} name={product.name} />
      <header className="flex flex-col gap-6 px-8 pb-8">
        <div className="flex flex-col gap-2">
          <Link href={`/m/projects/${encodeURIComponent(id)}`} className={cn(T.meta, "self-start outline-none hover:underline focus-visible:underline")}>
            Part of {post.title}
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
        {tab === "overview" && <SampleOverview post={post} product={product} />}
        {tab === "build" && <SampleBuild product={product} base={base} />}
      </div>
      {share.sheets}
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

function SampleOverview({ post, product }: { post: InnovationPost; product: PostProduct }) {
  return (
    <div className="flex flex-col gap-12">
      {(post.chain || post.license) && (
        <section aria-labelledby="sp-collection" className="flex flex-col gap-4">
          <SectionHeading id="sp-collection" title="Collection" />
          <FactCard
            label="Collection"
            rows={[...(post.chain ? [["Blockchain", post.chain] as const] : []), ...(post.license ? [["License", post.license] as const] : [])]}
          />
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
