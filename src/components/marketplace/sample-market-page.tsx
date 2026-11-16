"use client";

// /marketplace/<feed id> for another creator's sample (sample-market.ts;
// owner, 2026-11-16: the marketplace always has the data Innovations has). The
// shop page the marketplace gives this browser's own listings (owner,
// 2026-11-15), read from the sample's Innovations post:
// - the media first, then the title and "Created by {creator}";
// - the Marketplace box (sample-offer-box.tsx), with the Creator and "On
//   Innovations" beside it in the rail — under the title in one column, so
//   the price is never below the fold;
// - About this project and What's inside (the post's own rows, each opening
//   the product on the post);
// - the story and the conversation stay on the post: "On Innovations" says
//   how many and links there, never a copy.
// The prototype-only Testnet demo banner with Shopping as sits under the
// breadcrumb, as on every marketplace page.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, buttonVariants } from "@/components/ideeza";
import { PersonName } from "@/components/profile/person-name";
import { LiveRegion, usePageArrival } from "@/components/projects/details/arrival";
import { Breadcrumb } from "@/components/projects/details/breadcrumb";
import { CARD, partsLabel, productsLabel } from "@/components/innovations/post-bits";
import { PostMediaStage } from "@/components/innovations/post-media";
import { WhatsInside } from "@/components/innovations/post-page";
import { MakerBlock } from "@/components/innovations/post-rail";
import { NARROW_ONLY, POST_COLUMNS, POST_CONTENT, POST_PAGE, WIDE_ONLY } from "@/components/innovations/post-states";
import { useCommentCount } from "@/lib/innovations/comments-store";
import { countsOf, useReactions } from "@/lib/innovations/reactions";
import { sampleSeedOf } from "@/lib/innovations/sample-posts";
import { postHref } from "@/lib/innovations/slug";
import type { InnovationPost } from "@/lib/innovations/types";
import { marketDocTitle } from "@/lib/manual/project-route";
import type { SampleMarket } from "@/lib/market/sample-market";
import { cn } from "@/lib/utils";
import { DemoBuyerBanner } from "./demo-buyer-banner";
import type { OfferTab } from "./offer-parts";
import { SampleOfferBox } from "./sample-offer-box";

export function SampleMarketPage({ market, initialTab = null }: { market: SampleMarket; initialTab?: OfferTab | null }) {
  const { post } = market;
  const { titleRef, live, announce } = usePageArrival(`market:${market.feedId}`, post.title, marketDocTitle(post.title));
  const meta = [post.category, productsLabel(post.products.length), post.partsCount > 0 ? partsLabel(post.partsCount) : null].filter(Boolean).join(" · ");

  return (
    <div className={POST_PAGE}>
      <div className={POST_CONTENT}>
        <Breadcrumb trail={[{ label: "Explore marketplace", href: "/marketplace" }, { label: post.title }]} />
        <DemoBuyerBanner sample />

        <div className={POST_COLUMNS}>
          <div className="flex min-w-0 flex-col gap-12">
            <PostMediaStage post={post} mine={null} />

            <header className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <h1
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-4xl font-semibold leading-4xl tracking-near text-text-primary outline-none max-md:text-2xl max-md:leading-2xl max-md:tracking-normal"
                >
                  {post.title}
                </h1>
                {post.minted && (
                  <Badge tone="success" className="font-semibold">
                    Minted
                  </Badge>
                )}
              </div>
              <p className="m-0 text-md leading-md text-text-secondary">
                Created by{" "}
                <PersonName id={post.creator.id} from="innovations">
                  {post.creator.name}
                </PersonName>
                {meta && <span aria-hidden> · </span>}
                {meta}
              </p>
            </header>

            <div className={cn(NARROW_ONLY, "flex flex-col gap-8")}>
              <SampleOfferBox market={market} announce={announce} initialTab={initialTab} />
              <MakerBlock post={post} owner={false} layout="card" />
            </div>

            {post.description && (
              <section aria-labelledby={`${market.feedId}-about`} className="flex flex-col gap-4">
                <h2 id={`${market.feedId}-about`} className="text-xl font-bold leading-xl text-text-primary">
                  About this project
                </h2>
                <p className="m-0 max-w-[68ch] text-lg leading-relaxed text-text-primary">{post.description}</p>
              </section>
            )}
            {post.products.length > 0 && <WhatsInside post={post} />}
            <OnInnovations post={post} className={NARROW_ONLY} />
          </div>

          <aside aria-label="Buy and the creator" className={cn(WIDE_ONLY, "min-w-0 flex-col self-stretch")}>
            <div className="sticky top-[24px] flex flex-col gap-8">
              <SampleOfferBox market={market} announce={announce} initialTab={initialTab} />
              <MakerBlock post={post} owner={false} layout="card" />
              <OnInnovations post={post} />
            </div>
          </aside>
        </div>
      </div>
      <LiveRegion text={live} />
    </div>
  );
}

/** The mirror of the post's "On Marketplace" card: its counts, and the way to the story. */
function OnInnovations({ post, className }: { post: InnovationPost; className?: string }) {
  const id = React.useId();
  const { reactions } = useReactions();
  const comments = useCommentCount(post.id, sampleSeedOf(post.id)) ?? 0;
  const { appreciations } = countsOf(reactions, post.id, post.base);
  return (
    <section aria-labelledby={id} className={cn(CARD, "flex flex-col gap-6", className)}>
      <h2 id={id} className="text-lg font-bold leading-lg text-text-primary">
        On Innovations
      </h2>
      <p className="m-0 text-md text-text-secondary">
        <span className="tabular-nums">
          {appreciations} {appreciations === 1 ? "appreciation" : "appreciations"} · {comments} {comments === 1 ? "comment" : "comments"}
        </span>
        <br />
        The creator&apos;s story and the conversation about {post.title} are on its Innovations post.
      </p>
      <Link
        href={postHref(post.slug)}
        className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "h-[44px] w-full gap-2 hover:text-[color:var(--color-button-secondary-text)]")}
      >
        Read the story
        <Icon icon={ArrowRight01Icon} size={16} />
      </Link>
    </section>
  );
}
