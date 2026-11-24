"use client";

// /marketplace/<feed id> for another creator's sample (sample-market.ts;
// owner, 2026-11-16: the marketplace always has the data Innovations has). The
// shop page the marketplace gives this browser's own listings (owner,
// 2026-11-15), read from the sample's Innovations post, in the SAME frame and
// order as a listing's page (owner, 2026-11-24: "every marketplace details
// page shows its information the same way — the rail most of all"):
// - the Testnet demo banner with Shopping as, then the breadcrumb;
// - the media first, then the header as ProjectHeader reads it for a buyer:
//   the title with Share at the row's end, the status chip ("Listed", or
//   "Sold" once its Main NFT is bought) and its line, "Created by {creator} ·
//   …", the description (five lines, then Show more) and Project activity
//   (the sample's journey);
// - the rail as the project page's one surface (ProjectFrame, COR-54): the
//   Marketplace box (sample-offer-box.tsx) and the Creator block lead it —
//   under the header in one column, so the price is never below the fold —
//   then On Innovations and Recent (lib/manual/sample-record.ts);
// - What's inside: the post's rows, each opening the product's marketplace
//   page (sample-product-page.tsx);
// - the story and the conversation stay on the post: "On Innovations" says
//   how many and links there, never a copy.
// Share sits at the end of the title row (owner, 2026-11-22): Share to
// Innovations while the sample is on the Marketplace, then Copy link and the
// networks (shares/share-button.tsx).

import * as React from "react";
import { PersonName } from "@/components/profile/person-name";
import { LiveRegion, usePageArrival } from "@/components/projects/details/arrival";
import { Breadcrumb } from "@/components/projects/details/breadcrumb";
import { ActivityNow } from "@/components/projects/details/activity/now-block";
import { DescriptionText } from "@/components/projects/details/description-editor";
import { ProjectFrame, RailRest } from "@/components/projects/details/frame";
import { RecentBlock } from "@/components/projects/details/rail-log";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { StatusChip } from "@/components/projects/status-chip";
import { partsLabel, productsLabel } from "@/components/innovations/post-bits";
import { PostMediaStage } from "@/components/innovations/post-media";
import { WhatsInside } from "@/components/innovations/post-page";
import { PostToastProvider } from "@/components/innovations/toast";
import { useSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { MarketShareButton } from "@/components/shares/share-button";
import { useCommentCount } from "@/lib/innovations/comments-store";
import { countsOf, useReactions } from "@/lib/innovations/reactions";
import { sampleJourneyOf } from "@/lib/innovations/sample-activity";
import { sampleSeedOf } from "@/lib/innovations/sample-posts";
import { postHref } from "@/lib/innovations/slug";
import type { InnovationPost } from "@/lib/innovations/types";
import { marketDocTitle } from "@/lib/manual/project-route";
import { formatDate } from "@/lib/manual/project-summary";
import { sampleLogLinesOf, sampleStatusOf } from "@/lib/manual/sample-record";
import { sampleProductHref, type SampleMarket } from "@/lib/market/sample-market";
import { DemoBuyerBanner } from "./demo-buyer-banner";
import type { OfferTab } from "./offer-parts";
import { OnInnovationsBlock, SampleCreatorBlock } from "./rail-blocks";
import { SampleOfferBox } from "./sample-offer-box";

export function SampleMarketPage({ market, initialTab = null }: { market: SampleMarket; initialTab?: OfferTab | null }) {
  // The toast (Link copied, Shared to Innovations) sits outside the page container, so it is the window's.
  return (
    <PostToastProvider>
      <SampleMarketBody market={market} initialTab={initialTab} />
    </PostToastProvider>
  );
}

function SampleMarketBody({ market, initialTab }: { market: SampleMarket; initialTab: OfferTab | null }) {
  const { post, feedId } = market;
  const { titleRef, live, announce } = usePageArrival(`market:${feedId}`, post.title, marketDocTitle(post.title));
  const sales = useSampleSales();
  const now = useMinuteClock();
  const status = sampleStatusOf(market, sales, now);
  const logLines = React.useMemo(() => sampleLogLinesOf(market, sales), [market, sales]);
  // As on the post page: the journey's own clock until hydrated, so the server and the browser agree.
  const journey = React.useMemo(() => sampleJourneyOf(post, now > 0 ? now : undefined), [post, now]);
  const meta = [
    status.status === "listed" ? `Listed ${formatDate(post.sharedAt)}` : null,
    post.category,
    productsLabel(post.products.length),
    post.partsCount > 0 ? partsLabel(post.partsCount) : null,
  ].filter((m): m is string => Boolean(m));

  return (
    <>
      <ProjectFrame
        banner={<DemoBuyerBanner className="mb-10" sample />}
        breadcrumb={<Breadcrumb trail={[{ label: "Explore marketplace", href: "/marketplace" }, { label: post.title }]} />}
        head={
          <div className="flex flex-col gap-10">
            <PostMediaStage post={post} mine={null} />
            <header className="flex flex-col gap-8 [container-type:inline-size]">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 max-w-full">
                    <h1
                      ref={titleRef}
                      tabIndex={-1}
                      className="min-w-0 truncate text-3xl font-semibold leading-3xl tracking-slight text-text-primary outline-none"
                    >
                      {post.title}
                    </h1>
                  </div>
                  <MarketShareButton itemId={feedId} title={post.title} className="ml-auto" />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-md text-text-secondary">
                  <StatusChip status={status.status} word={status.word} />
                </div>
                {status.line && <p className="min-w-0 text-md text-text-secondary">{status.line}</p>}
                <p className="text-sm text-text-secondary">
                  Created by{" "}
                  <PersonName id={post.creator.id} from="innovations" tone="secondary">
                    {post.creator.name}
                  </PersonName>
                  {meta.map((m) => (
                    <React.Fragment key={m}> · {m}</React.Fragment>
                  ))}
                </p>
                <DescriptionText text={post.description} />
                <ActivityNow projectId={post.id} target={{ kind: "project" }} defaultAt={post.createdAt} heading="Project activity" journey={journey} />
              </div>
            </header>
          </div>
        }
        lead={
          <div className="divide-y divide-border">
            <SampleOfferBox market={market} announce={announce} initialTab={initialTab} />
            <SampleCreatorBlock post={post} />
          </div>
        }
        main={
          post.products.length > 0 ? (
            <WhatsInside post={post} hrefOf={(productId) => sampleProductHref(feedId, productId)} />
          ) : null
        }
        rail={
          <RailRest label="Project record">
            <SampleStoryBlock post={post} />
            <RecentBlock lines={logLines} />
          </RailRest>
        }
      />
      <LiveRegion text={live} />
    </>
  );
}

/** The mirror of the post's "On Marketplace" card: its counts, and the way to the story. */
export function SampleStoryBlock({ post }: { post: InnovationPost }) {
  const { reactions } = useReactions();
  const comments = useCommentCount(post.id, sampleSeedOf(post.id)) ?? 0;
  const { appreciations } = countsOf(reactions, post.id, post.base);
  return <OnInnovationsBlock title={post.title} href={postHref(post.slug)} appreciations={appreciations} comments={comments} />;
}
