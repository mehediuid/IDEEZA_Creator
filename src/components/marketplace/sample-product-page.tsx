"use client";

// /marketplace/<feed id>/products/<product id> — one product of another
// creator's sample, inside Explore marketplace (owner, 2026-11-24: "every
// marketplace details page the same"). A sample's What's inside used to open
// the product on its Innovations post, which left the shop for a page with a
// card per rail block; it now opens here, in the frame and the rail a
// listing's product page has (product-page.tsx in its "market" context):
// - the Testnet demo banner, then "Explore marketplace › {project} › {product}";
// - the header: the product's picture, its name with Share, "Part of {project}
//   · Created by {creator}", its summary and its Activity (the sample's
//   journey);
// - the tabs the post shows (PostProductTabs): Media, 3D model and Parts open
//   to everyone; PCB, Firmware and Wiring come with a copy, and say how to get
//   one;
// - the rail on one surface: Creator → On Innovations → Specs. A sample sells
//   copies of the whole project, never of one product, so — as on a listing's
//   product with no copies of its own (owner, 2026-11-15) — there is no
//   Marketplace block; the project's page sells them.

import * as React from "react";
import Link from "next/link";
import { CpuIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { PersonName } from "@/components/profile/person-name";
import { LiveRegion, usePageArrival } from "@/components/projects/details/arrival";
import { Breadcrumb } from "@/components/projects/details/breadcrumb";
import { ProjectFrame, RAIL_SURFACE } from "@/components/projects/details/frame";
import { RailBlock, RailFact, RailFacts } from "@/components/projects/details/rail-block";
import { ClampedText } from "@/components/projects/product/product-identity";
import { ImageGone, PostImg } from "@/components/innovations/post-bits";
import { PostProductTabs, SampleProductActivity } from "@/components/innovations/post-product-page";
import { PostMissing } from "@/components/innovations/post-states";
import { PostToastProvider } from "@/components/innovations/toast";
import { MarketShareButton } from "@/components/shares/share-button";
import { shareItemId } from "@/lib/innovations/share-items";
import type { PostProduct } from "@/lib/innovations/types";
import type { SampleMarket } from "@/lib/market/sample-market";
import { cn } from "@/lib/utils";
import { productReportIdOf } from "@/lib/data/reports";
import { DemoBuyerBanner } from "./demo-buyer-banner";
import { MarketReportMenu } from "./report-menu";
import { SampleCreatorBlock } from "./rail-blocks";
import { SampleStoryBlock } from "./sample-market-page";

const PROJECT_LINK =
  "rounded-sm font-medium text-text-brand outline-none hover:text-text-brand-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

export function SampleProductPage({ market, productId }: { market: SampleMarket; productId: string }) {
  const product = market.post.products.find((p) => p.id === productId);
  if (!product) {
    return (
      <PostMissing
        title="We couldn't find this product"
        body="The link may be wrong, or the product is no longer in this project."
        back={{ label: "Back to the project", href: `/marketplace/${market.feedId}` }}
      />
    );
  }
  return (
    <PostToastProvider>
      <SampleProductBody key={`${market.feedId}:${product.id}`} market={market} product={product} />
    </PostToastProvider>
  );
}

function SampleProductBody({ market, product }: { market: SampleMarket; product: PostProduct }) {
  const { post, feedId } = market;
  const projectHref = `/marketplace/${feedId}`;
  const { titleRef, live } = usePageArrival(`market:${feedId}:${product.id}`, product.name, `${product.name} · ${post.title} · IDEEZA`);

  return (
    <>
      <ProjectFrame
        banner={<DemoBuyerBanner className="mb-10" sample />}
        breadcrumb={
          <Breadcrumb
            trail={[
              { label: "Explore marketplace", href: "/marketplace" },
              { label: post.title, href: projectHref },
              { label: product.name },
            ]}
          />
        }
        main={
          <div className="flex flex-col gap-10">
            <header className="flex flex-col gap-6 [container-type:inline-size]">
              <div className="flex min-w-0 flex-1 items-start gap-6">
                <span className="relative hidden size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-solid border-border bg-bg-surface-raised text-text-tertiary [@container(min-width:480px)]:flex">
                  {product.image ? (
                    <PostImg src={product.image} className="absolute inset-0 h-full w-full object-cover" fallback={<ImageGone />} />
                  ) : (
                    <Icon icon={CpuIcon} size={24} />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex min-w-0 items-start justify-between gap-6">
                    <h1
                      ref={titleRef}
                      tabIndex={-1}
                      className="min-w-0 break-words text-3xl font-semibold leading-3xl tracking-slight text-text-primary outline-none"
                    >
                      {product.name}
                    </h1>
                    <div className="flex shrink-0 items-center gap-4">
                      <MarketShareButton itemId={shareItemId("sample", feedId, product.id)} title={product.name} />
                      <MarketReportMenu reportId={productReportIdOf(post.id, product.id)} target="product" />
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Part of{" "}
                    <Link href={projectHref} className={PROJECT_LINK}>
                      {post.title}
                    </Link>
                    {" · "}Created by{" "}
                    <PersonName id={post.creator.id} from="innovations" tone="secondary">
                      {post.creator.name}
                    </PersonName>
                  </p>
                  {product.summary && <ClampedText text={product.summary} />}
                  <SampleProductActivity post={post} productId={product.id} name={product.name} />
                </div>
              </div>
            </header>
            <div className="flex min-w-0 flex-col gap-8">
              <PostProductTabs post={post} product={product} mine={null} />
            </div>
          </div>
        }
        rail={
          <aside aria-label="Product record" className={cn(RAIL_SURFACE, "empty:hidden")}>
            <SampleCreatorBlock post={post} />
            <SampleStoryBlock post={post} />
            {product.specs.length > 0 && (
              <RailBlock title="Specs">
                <RailFacts>
                  {product.specs.map((s) => (
                    <RailFact key={s.label} label={s.label}>
                      <span className="block break-words">{s.value}</span>
                    </RailFact>
                  ))}
                </RailFacts>
              </RailBlock>
            )}
          </aside>
        }
      />
      <LiveRegion text={live} />
    </>
  );
}
