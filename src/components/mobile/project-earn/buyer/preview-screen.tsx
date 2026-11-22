"use client";

// The owner's previews of the project page (Figma "Project Details · 2026
// update" 18, 19; the web's `?view=buyer` and `?view=contributor&as=<id>`,
// which `useProjectPageData(id, "project")` turns into the preview viewer):
// · 18 · Preview as others see it (Earn's top bar opens it): the banner and
//   Exit preview, the page with no ⋯, no Publish or Earn, no Versions and no
//   Activity tab — the Marketplace block read-only when the project is on
//   sale (the Main NFT, the whole project's copies as Use rows with their
//   prices and no Buy; Open in Explore marketplace), Project activity (Now + Earlier),
//   Products, Legal information, Holder benefits, About (Source).
// · 19 · Preview as a contributor (Earn › Money's contributor rows): "Previewing
//   as Ana Silva" and the role chip; the engineering page, read-only, with the
//   Activity tab and no owner bar; About reads Created, Parts, Team, Network.
// Exit preview goes back where the owner came from (Earn, or Earn › Money
// when this browser has no history). An address with no valid preview opens
// the owner's own page.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight01Icon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useAuctionClock } from "@/components/marketplace/bid-card";
import { contributorPreviewTitle } from "@/components/projects/details/contributor-preview-banner";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { StatusChip } from "@/components/projects/status-chip";
import { AS_PARAM, VIEW_PARAM } from "@/lib/manual/buyer-preview";
import { ROLE_WORD } from "@/lib/manual/contributors";
import { can } from "@/lib/manual/permissions";
import { phoneEarnHref, phoneMarketHref } from "@/lib/manual/phone-earn";
import { PHONE_TABS, phoneProjectHref, VIEWER_TABS, type PhoneTab } from "@/lib/manual/phone-project";
import { engineeringMetaOf, stageLineOf } from "@/lib/manual/project-header";
import { aboutRowsOf, detailsRows } from "@/lib/manual/rail-copy";
import { headerText } from "@/lib/manual/project-summary";
import { auctionStateOf } from "@/lib/market/auction";
import { PROTOCOLS } from "@/lib/network/catalog";
import { useProjectNetwork } from "@/lib/network/store";
import { ProjectProvider, type Ready } from "../../project/context";
import { ProjectRecent } from "../../project/overview";
import { ActivityTab } from "../../project/activity-tab";
import { MediaTab } from "../../project/media-tab";
import { ProductsTab } from "../../project/products-tab";
import { SectionHeading } from "../../project/parts";
import { usePhoneWriteGate } from "../../project/write-gate";
import { OfflineBanner } from "../../kit/states";
import { tabPanelProps, useTabParam } from "../../kit/tabs";
import { useGoBack } from "../../nav-trail";
import { LINK_MD } from "../sell/parts";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";
import { PhoneWalletScope } from "../phone-wallet";
import { PhoneCopies, projectCopiesLive } from "./copies";
import { AuctionCard, BuyNowCard, closedLineOf, MainActivity } from "./main-offer";
import { ProductsSection } from "./market-screen";
import { AboutRows, ClosedCard, HolderBenefits, LegalSection, PreviewBanner, ProjectActivity, ProjectTop, useScrolledPast, ViewerTabs, VIEWER_TABS_ID, type OfferRow } from "./parts";

export function PreviewScreen({ id }: { id: string }) {
  const data = useProjectPageData(id, "project");
  const router = useRouter();
  const owner = data.state === "ready" && data.viewer.kind === "local-owner";
  React.useEffect(() => {
    if (owner) router.replace(phoneProjectHref(id));
  }, [owner, router, id]);
  if (data.state === "missing") {
    return <Missing id={id} />;
  }
  if (data.state === "loading" || owner) {
    return (
      <Screen top={<TopBar back />}>
        <div role="status" aria-label="Loading the preview" className="flex flex-col gap-6 px-8 pb-8">
          <Skeleton shape="block" className="h-[96px] w-full" />
          <Skeleton shape="text" size="lg" />
          <Skeleton shape="text" size="md" />
          <Skeleton shape="block" className="h-[240px] w-full" />
        </div>
      </Screen>
    );
  }
  return (
    <PhoneWalletScope>
      <PreviewReady data={data} />
    </PhoneWalletScope>
  );
}

function Missing({ id }: { id: string }) {
  const router = useRouter();
  React.useEffect(() => {
    router.replace(phoneProjectHref(id));
  }, [router, id]);
  return <Screen top={<TopBar back="/m/projects" />}>{null}</Screen>;
}

const NO_SHEET = () => {};

function PreviewReady({ data }: { data: Ready }) {
  const { project, view, viewer } = data;
  const params = useSearchParams();
  const gate = usePhoneWriteGate(project.id);
  const ctx = { ...data, gate, open: NO_SHEET };
  const contributor = viewer.kind === "contributor-preview" ? viewer : null;
  const tabs = contributor ? PHONE_TABS : VIEWER_TABS;
  // Client-state tabs: the address follows by replaceState, keeping ?view= and ?as=.
  const [tab, goTab] = useTabParam<PhoneTab>("tab", tabs.map((t) => t.id), "overview");
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleGone = useScrolledPast(titleRef);

  const fallback = contributor ? phoneEarnHref(project.id, "money") : phoneEarnHref(project.id);
  const exit = useGoBack(fallback);

  const text = headerText(view.summary, { viewer });
  const time = engineeringMetaOf(view.summary, null)
    .map((m) => (m.kind === "time" ? m.time.text : m.text))
    .join(" · ");
  const meta = contributor ? `${stageLineOf(view.engineering, view.summary)} · ${time}` : `${text.count} · ${time}`;
  const chips = (
    <>
      <StatusChip status={view.summary.status} word={text.chip.word} />
      {contributor && (
        <Badge tone="neutral" icon={<Icon icon={UserCircleIcon} size={12} />}>
          {ROLE_WORD[contributor.role]}
        </Badge>
      )}
    </>
  );

  return (
    <ProjectProvider value={ctx}>
      <Screen top={<TopBar back={fallback} title={titleGone ? project.name : undefined} />}>
        <OfflineBanner />
        {contributor ? (
          <PreviewBanner
            title={contributorPreviewTitle(contributor)}
            body={`${contributor.role === "coOwner" ? `${ROLE_WORD.coOwner} · ${contributor.share}%` : ROLE_WORD[contributor.role]}. This is the page their role shows, and nothing can be changed in a preview. Contributors are kept in this browser, so they can't open it themselves.`}
            onExit={exit}
          />
        ) : (
          <PreviewBanner
            title="Previewing as others see it"
            body="This is your page without your editing controls. Nothing is published — it's saved only in this browser."
            onExit={exit}
          />
        )}
        <ProjectTop name={project.name} chips={chips} meta={meta} description={project.description} titleRef={titleRef} />
        <ViewerTabs tabs={tabs} tab={tab} onChange={goTab} />
        <div {...tabPanelProps(VIEWER_TABS_ID, tab)} className="px-8 pb-12 pt-8 outline-none">
          {tab === "overview" && (
            <div className="flex flex-col gap-12">
              <PreviewMarket data={data} />
              <ProjectActivity projectId={project.id} createdAt={project.createdAt} />
              <ProductsSection seeAll={`/m/projects/${encodeURIComponent(project.id)}/preview?${previewQuery(params)}&tab=products`} />
              <LegalSection legal={project.legal} />
              {!contributor && <HolderBenefits listing={view.listing} />}
              {contributor ? <ContributorAbout data={data} /> : (
                <AboutRows
                  rows={detailsRows({ source: view.summary.source, when: view.summary.when, createdAt: project.createdAt, ownerFacts: false }).map(plainRow)}
                />
              )}
              <ProjectRecent />
            </div>
          )}
          {tab === "products" && <ProductsTab />}
          {tab === "media" && <MediaTab />}
          {tab === "activity" && contributor && <ActivityTab />}
        </div>
      </Screen>
    </ProjectProvider>
  );
}

function previewQuery(params: URLSearchParams | ReturnType<typeof useSearchParams>): string {
  const q = new URLSearchParams();
  const v = params.get(VIEW_PARAM);
  const as = params.get(AS_PARAM);
  if (v) q.set(VIEW_PARAM, v);
  if (as) q.set(AS_PARAM, as);
  return q.toString();
}

function plainRow(r: { label: string; value: { kind: string; text?: string; time?: { text: string } }[] }): OfferRow {
  return { label: r.label, value: r.value.map((m) => (m.kind === "time" ? (m.time?.text ?? "") : (m.text ?? ""))).join("") };
}

/** The listing as a buyer would read it, with no button (the web's PreviewBody). */
function PreviewMarket({ data }: { data: Ready }) {
  const { project, view, viewer, now } = data;
  const listing = view.listing.kind === "none" ? null : view.listing.listing;
  const clock = useAuctionClock(listing?.type === "auction" ? listing.endsAt : undefined, now);
  if (!can(viewer, "listing.seePublic", view.canCtx)) return null;
  // The whole project's copies only: a product's own are read on its screen (CL-018).
  const copies = projectCopiesLive(view);
  if (!listing && !copies) return null;
  const live = view.listing.kind === "live";
  const auction = live && listing?.type === "auction" ? auctionStateOf(listing, view.bids, clock) : null;
  const closed = closedLineOf(view);
  return (
    <section aria-labelledby="pv-market" className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <SectionHeading id="pv-market" title="Marketplace" />
        <TestnetDemoBadge />
      </div>
      {listing &&
        (closed ? (
          <ClosedCard title={closed.title} detail={closed.detail} />
        ) : auction ? (
          <AuctionCard
            project={project}
            listing={listing}
            view={view}
            state={auction}
            clock={clock}
            buyerId={null}
            canBid={false}
            canBuy={false}
            buyBusy={false}
            onBuyNow={NO_SHEET}
            onPlaced={NO_SHEET}
            focusBid={0}
            foot={<MainActivity projectId={project.id} sales={view.sales} listedAt={listing.listedAt} />}
          />
        ) : (
          <BuyNowCard listing={listing} view={view} buyerId={null} foot={<MainActivity projectId={project.id} sales={view.sales} listedAt={listing.listedAt} />} />
        ))}
      {listing && closed && <MainActivity projectId={project.id} sales={view.sales} listedAt={listing.listedAt} />}
      <PhoneCopies project={project} view={view} viewer={viewer} buyerId={null} onBought={NO_SHEET} />
      <Link href={phoneMarketHref(project.id)} className={`-my-6 inline-flex min-h-[44px] items-center gap-2 self-start ${LINK_MD}`}>
        Open in Explore marketplace
        <Icon icon={ArrowUpRight01Icon} size={14} />
      </Link>
    </section>
  );
}

/** 19's About: Created, Parts, Team, Network — what a member of the team reads. */
function ContributorAbout({ data }: { data: Ready }) {
  const { project, view } = data;
  const { network } = useProjectNetwork(project.id);
  const built = view.products.filter((p) => p.built && !p.dropped);
  const protocol = network ? (PROTOCOLS.find((x) => x.key === network.protocol) ?? null) : null;
  const team = (project.contributors ?? []).length + 1;
  const rows = aboutRowsOf({
    createdAt: project.createdAt,
    parts: built.length ? built.reduce((n, p) => n + (p.built?.product.parts.length ?? 0), 0) : null,
    network: network ? { protocol: protocol?.radioLabel ?? protocol?.name ?? "Custom", links: network.links.length } : null,
    team: team - 1,
  })
    .filter((r) => r.key !== "stored")
    .map((r) => (r.key === "team" ? { label: r.label, value: `${team} people` } : plainRow(r)));
  const order = ["Created", "Parts", "Team", "Network"];
  return <AboutRows rows={[...rows].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))} />;
}

