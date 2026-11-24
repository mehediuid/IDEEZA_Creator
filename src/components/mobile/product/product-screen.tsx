"use client";

// The phone's product page (Figma "Product Details · 2026 update" 10–10f,
// 10h, 10n, 10t–10wb, 10x–10z, 23d, 28, 31a–32b). The same product as the
// web's /projects/[id]/products/[productId], read through the web's one
// derivation, laid out as a native object page (owner 2026-11-15):
// · the top bar: Back and the owner's ⋯ (menu.tsx, 10c, CL-015: Edit name and
//   description, Open chat, the previews, Delete product… with the web's
//   rules); the name comes into the bar once the title scrolls away;
// · the media on top (hero.tsx): the take in use, else the concept image of
//   the version on screen;
// · one header: the name, one meta line ("{project} · AI build · {date}", or
//   the line of a product no build stands behind; a buyer's "Part of
//   {project} · Created by {creator}", the project opening its shop, BUY-3),
//   the lock line once sold in
//   full (10u), the description (3 lines, Show more) — the maker's words on
//   the current version, the build's on an older one — or, for the owner
//   with none, Add a description (CL-015), and the version notice while an
//   older version is on screen (10e, 28a–28c); a buyer reads the product's
//   activity here (10h);
// · the owner (and a contributor preview) then reads one scroll of sections —
//   Build, Media and Sales, Activity, Specs (owner-page.tsx); the pieces line,
//   Add the rest, the version pick and the computer note live there now; the
//   owner's Bottom action bar holds Earn with its copies line (CL-031,
//   earn-bar.tsx);
// · a buyer who holds copies reads "You own copy #n" with its kind and use
//   and See your files › right under the header (buy.tsx OwnedCopiesRow, D6
//   of 2026-11-22: the bar keeps selling to a holder too); a buyer keeps the
//   tabs pinned under the top bar (`?tab=`, the kit's MobileTabs: a tap makes
//   no request, so it works offline): Media · Overview · Build · Contributors,
//   and the sticky bar (D1): Copies from · Buy a copy while any copy is on
//   sale, else, for a holder, You own copy · See your files.
// The marketplace's "Testnet demo · shopping as Mira" (10h) sits under the
// header, not over the name; the previews' "Previewing as …" with Exit preview
// stays pinned under the top bar (31a, 31b). A Feed sample's product is
// someone else's: the sample viewer reads it (sample-product.tsx).

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Add01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Banner } from "@/components/ideeza/banner";
import { can } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { ROLE_WORD, initialsOf, teamOf } from "@/lib/manual/contributors";
import { madeByHand, parseProductTab, productTabsOf, type ProductTab } from "@/lib/manual/phone-product";
import { offMarketNow, phoneProjectHref, sampleProjectOf } from "@/lib/manual/phone-project";
import { phoneMarketHref, phonePreviewHref } from "@/lib/manual/phone-earn";
import { useCreatorName } from "@/components/marketplace/use-creator-name";
import { productRowsOf } from "@/lib/manual/project-read";
import { useMe } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";
import { OfflineBanner } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { Screen } from "../screen";
import { MORE_ICON, TopBar } from "../top-bar";
import { useShareAction } from "../feed/share-action";
import { shareItemId } from "@/lib/innovations/share-items";
import { T } from "../type";
import { usePhoneWriteGate } from "../project/write-gate";
import { HeaderActivity } from "./activity";
import { BuildTab } from "./build-tab";
import { BuyBar, BuyCopy, DemoBuyerBanner, OwnedCopiesRow } from "./buy";
import { MediaTab } from "./media-tab";
import { DeleteProductSheet } from "./delete-sheet";
import { ProductEarnBar } from "./earn-bar";
import { EditDetailsSheet, ProductMenu, useCanEditDetails } from "./menu";
import { OverviewTab } from "./overview";
import { SampleProduct } from "./sample-product";
import { OffMarket, ProductLoading, ProductMissing, ProjectMissing } from "./states";
import { ProductProvider, useProduct, useProductData, type ProductCtx } from "./use-product";
import { ProductHero } from "./hero";
import { OwnerSections } from "./owner-page";
import { BANNER_LINK, LinkButton, replaceQuery, TABS_FIT, TABS_SCROLL } from "./parts";
import { UNBUILT } from "@/components/projects/product/product-states";

export function ProductScreen({ id, productId }: { id: string; productId: string }) {
  const data = useProductData(id, productId);
  if (data.state === "loading") return <ProductLoading />;
  if (data.state === "missing") {
    if (data.market) return <OffMarket paused={false} />;
    // Not one of the viewer's own: another creator's shared product, as the Feed links it.
    const sample = sampleProjectOf(id);
    if (!sample) return <ProjectMissing />;
    const product = sample.products.find((p) => p.id === productId);
    return product ? <SampleProduct post={sample} product={product} id={id} /> : <ProductMissing projectName={sample.title} back={`/m/projects/${encodeURIComponent(id)}`} />;
  }
  if (data.state === "no-product") return <ProductMissing projectName={data.projectName} back={phoneProjectHref(data.projectId, "products")} />;
  return (
    <ProductProvider value={data.ctx}>
      <MarketGate ctx={data.ctx} />
    </ProductProvider>
  );
}

/** 32b: on the marketplace, a project its creator paused is off it for now — the pause alone decides, as on the
 *  web (OffMarketGate, BUY-4) — unless the buyer already holds part of it. */
function MarketGate({ ctx }: { ctx: ProductCtx }) {
  if (ctx.mode === "market" && offMarketNow({ listing: ctx.view.listing.kind, projectId: ctx.project.id, sales: ctx.view.sales, buyerId: ctx.buyerId })) {
    return <OffMarket paused />;
  }
  return <ProductReady />;
}

function ProductReady() {
  const ctx = useProduct();
  const { project, viewer, bp, mode, buyer, name } = ctx;
  const params = useSearchParams();
  const gate = usePhoneWriteGate(project.id);
  const [sheet, setSheet] = React.useState<"menu" | "edit" | "delete" | "buy" | null>(() => (params.get("buy") === "1" && buyer ? "buy" : null));
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleGone = useScrolledPast(titleRef, scrollRef);
  // Share (owner 2026-11-22): the product can be shared to your Feed while it is on the Marketplace
  // (not from a preview of it).
  const share = useShareAction(mode === "preview" || mode === "contributor" ? null : shareItemId("mine", project.id, ctx.product.id));

  // An old link's `?buy=1` opens Buy a copy once: the address drops it, so a reload or Back doesn't reopen it.
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).has("buy")) replaceQuery({ buy: null });
  }, []);

  const contributors = (project.contributors ?? []).length;
  // The buyer's tabs; the owner's page is one scroll (productTabsOf gives a buyer Media first).
  const tabs = buyer
    ? productTabsOf({
        buyer,
        built: bp !== null,
        contributors: can(viewer, "people.seeRoster") || (can(viewer, "people.seeTeam") && contributors > 0),
      })
    : [];
  // `?tab=marketplace` is the Feed's name for the Overview (parseProductTab).
  const [asked, setTab] = useTabParam<ProductTab | "marketplace">("tab", [...tabs.map((t) => t.id), "marketplace"], tabs[0]?.id ?? "overview");
  const tab = parseProductTab(asked, tabs);
  const goTab = (t: ProductTab) => {
    const scroller = scrollRef.current;
    const strip = tabsRef.current;
    if (scroller && strip && scroller.scrollTop > strip.offsetTop) scroller.scrollTop = strip.offsetTop;
    setTab(t);
  };
  const owner = mode === "owner";
  const toFiles = () => goTab("build");
  const preview = mode === "preview" || mode === "contributor";

  return (
    <>
      <Screen
        top={
          <>
            <TopBar
              back={phoneProjectHref(project.id, "products")}
              title={titleGone ? name : undefined}
              titleAs="p"
              actions={[
                ...(share.action ? [share.action] : []),
                ...(owner ? [{ icon: MORE_ICON, label: "Product actions", onClick: () => setSheet("menu") }] : []),
              ]}
            />
            {preview && (
              <div className="shrink-0 px-8 pb-4">
                <PreviewBanner />
              </div>
            )}
          </>
        }
        footer={buyer ? <BuyBar onBuy={() => setSheet("buy")} onFiles={toFiles} /> : owner ? <ProductEarnBar /> : undefined}
      >
        <ScrollHost scrollRef={scrollRef}>
          <OfflineBanner />
          <ProductHero />
          <ProductHeader titleRef={titleRef} onEdit={() => setSheet("edit")} />
          {buyer && <OwnedCopiesRow onFiles={toFiles} />}
          {mode === "market" && (
            <div className="px-8 pb-8">
              <DemoBuyerBanner />
            </div>
          )}
          {!buyer ? (
            <OwnerSections scrollRef={scrollRef} />
          ) : (
            <>
              {tab && (
                <div ref={tabsRef} className={cn("sticky top-0 z-10 bg-bg-page", TABS_SCROLL)}>
                  <MobileTabs
                    label="Product"
                    idBase="pd"
                    tabs={tabs.map((t) => ({ value: t.id, label: t.label }))}
                    value={tab}
                    onChange={goTab}
                    className={TABS_FIT}
                  />
                </div>
              )}
              <div {...(tab ? tabPanelProps("pd", tab) : {})} className="px-8 pb-12 pt-8 outline-none">
                {tab === "overview" && <OverviewTab />}
                {tab === "build" && <BuildTab />}
                {tab === "media" && <MediaTab />}
                {tab === "contributors" && <ContributorsTab />}
              </div>
            </>
          )}
        </ScrollHost>
      </Screen>
      {owner && (
        <ProductMenu open={sheet === "menu"} onClose={() => setSheet(null)} onEdit={() => setSheet("edit")} onDelete={() => setSheet("delete")} />
      )}
      {owner && sheet === "edit" && <EditDetailsSheet onClose={() => setSheet(null)} gate={gate} />}
      {owner && sheet === "delete" && <DeleteProductSheet onClose={() => setSheet(null)} />}
      {buyer && <BuyCopy open={sheet === "buy"} onClose={() => setSheet(null)} onFiles={toFiles} />}
      {share.sheets}
      {gate.sheet}
    </>
  );
}

/** Screen's content is the scroller; this finds it so the page can read and set its scroll. */
function ScrollHost({ scrollRef, children }: { scrollRef: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const scroller = ref.current?.parentElement as HTMLDivElement | null;
    if (scroller) scrollRef.current = scroller;
  }, [scrollRef]);
  return <div ref={ref}>{children}</div>;
}

function useScrolledPast(target: React.RefObject<HTMLElement | null>, root: React.RefObject<HTMLElement | null>): boolean {
  const [gone, setGone] = React.useState(false);
  React.useEffect(() => {
    const el = target.current;
    const scroller = root.current;
    if (!el || !scroller) return;
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), { root: scroller });
    io.observe(el);
    return () => io.disconnect();
  }, [target, root]);
  return gone;
}

// ─────────────────────────── banners (10h, 31a, 31b) ───────────────────────────

/** 31a, 31b: the web's two preview banners, in the web's sentences; it stays under the top bar
 *  while the page scrolls, so Exit preview is always at hand. */
function PreviewBanner() {
  const { viewer, project, product } = useProduct();
  const exit = `/m/projects/${encodeURIComponent(project.id)}/products/${encodeURIComponent(product.id)}`;
  const contributor = viewer.kind === "contributor-preview" ? viewer : null;
  return (
    <Banner
      tone="info"
      title={contributor ? `Previewing as ${contributor.name}` : "Previewing as others see it"}
      action={
        <Link href={exit} replace className={BANNER_LINK}>
          Exit preview
        </Link>
      }
    >
      {contributor
        ? `${ROLE_WORD[contributor.role]} · ${contributor.share}%. This is the page their role shows, and nothing can be changed in a preview. Contributors are kept in this browser, so they can’t open it themselves.`
        : "This is your page without your editing controls. Nothing is published — it’s saved only in this browser."}
    </Banner>
  );
}

// ─────────────────────────── the header ───────────────────────────

function ProductHeader({ titleRef, onEdit }: { titleRef: React.RefObject<HTMLHeadingElement | null>; onEdit: () => void }) {
  const { project, view, product, name, mode, buyer, job, bp, version } = useProduct();
  const owner = mode === "owner";
  const canEditDetails = useCanEditDetails();
  const home = version?.home ?? 1;
  // The maker's words on the version the product is at (an edit writes them there); an older
  // version keeps its build's (the web's H-7).
  const kept = product.description.trim();
  const description = (version?.shown ?? home) === home ? kept : bp?.description?.trim() || kept;
  const lockLine = owner ? (view.lock?.line ?? null) : null;
  // A version is picked in place, like a tab: no request, so it works offline.
  const showVersion = (n: number) => replaceQuery({ v: n === home ? null : String(n) });
  const unbuilt =
    product.state === "built" ? null : madeByHand(product.state, productRowsOf(project).find((r) => r.id === product.id)) ? UNBUILT.hand : UNBUILT[product.state];
  // One meta line: whose product, and how it was made (the pieces' state is the Build section's).
  const meta = job ? `${project.name} · AI build · ${formatDate(job.endedAt ?? job.createdAt)}` : unbuilt ? `${project.name} · ${unbuilt}` : project.name;

  return (
    <header className="flex flex-col gap-4 px-8 pb-8">
      <div className="flex flex-col gap-1">
        <h1 ref={titleRef} className={cn(T.title, "min-w-0 break-words")}>
          {name}
        </h1>
        {mode === "market" || mode === "preview" ? <PartOfLine /> : <p className={T.meta}>{meta}</p>}
      </div>

      {lockLine && (
        <p className={cn(T.body, "flex items-start gap-3 text-text-primary")}>
          <span aria-hidden className="mt-[2px] text-[color:var(--color-icon-secondary)]">
            <Icon icon={LockIcon} size={16} />
          </span>
          {lockLine}
        </p>
      )}

      {description ? (
        <Description text={description} />
      ) : canEditDetails ? (
        <div>
          <LinkButton onClick={onEdit} className="gap-2">
            <Icon icon={Add01Icon} size={16} />
            Add a description
          </LinkButton>
        </div>
      ) : null}

      {owner && version?.notice && <VersionNotice onShow={showVersion} />}

      {buyer && <HeaderActivity />}
    </header>
  );
}

/** BUY-3 · the buyer's line (the web's product page on Explore marketplace, CL-018): "Part of {project} · Created by
 *  {creator}" — what the product belongs to and who made it; how it was built is the maker's. "Part of {project}"
 *  opens the project's shop, where its offers are (a product with no copies of its own sells none); in Preview as
 *  others see it, the preview's project page. The creator is named as a buyer knows them, never "you". */
function PartOfLine() {
  const { project, mode } = useProduct();
  const creator = useCreatorName();
  const href = mode === "preview" ? phonePreviewHref(project.id, "buyer") : phoneMarketHref(project.id);
  return (
    <p className={cn(T.meta, "break-words")}>
      <Link href={href} className="-my-[13px] inline-flex min-h-[44px] items-center rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus">
        <span>
          Part of <span className="font-medium text-text-brand">{project.name}</span>
        </span>
      </Link>
      {` · Created by ${creator}`}
    </p>
  );
}

/** 10e, 28a–28c: the web's version notice (product-version.tsx), its link under it. */
function VersionNotice({ onShow }: { onShow: (n: number) => void }) {
  const { version, name } = useProduct();
  const notice = version?.notice;
  if (!notice || !version) return null;
  let title: string | undefined;
  let body: string;
  let link: { n: number; label: string } | null = null;
  switch (notice.kind) {
    case "older":
      body = `You’re viewing version ${notice.n}${notice.at !== null ? ` (${formatDate(notice.at)})` : ""}. The project now uses version ${notice.latest}.`;
      link = { n: version.home, label: "Back to latest" };
      break;
    case "dropped":
      body = `Version ${notice.latest} doesn’t include ${name} — this is version ${notice.n}, the last one that did.`;
      break;
    case "absent":
      title = `Not in version ${notice.n}`;
      body = `${name} isn’t part of version ${notice.n} of this project.`;
      link = { n: notice.nearest, label: `Open version ${notice.nearest}` };
      break;
    case "gone":
      title = `Version ${notice.n} isn’t in this browser`;
      body = "Its build isn’t stored here any more, so nothing of it can be shown.";
      link = { n: notice.nearest, label: `Open version ${notice.nearest}` };
      break;
  }
  return (
    <Banner
      tone="info"
      title={title}
      action={
        link ? (
          <button type="button" onClick={() => onShow(link.n)} className={BANNER_LINK}>
            {link.label}
          </button>
        ) : undefined
      }
    >
      {body}
    </Banner>
  );
}

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const [clamps, setClamps] = React.useState(false);
  const ref = React.useRef<HTMLParagraphElement>(null);
  const id = React.useId();
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setClamps(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);
  return (
    <div className="flex flex-col gap-2">
      <p ref={ref} id={id} className={cn(T.body, "whitespace-pre-line break-words text-text-primary", !expanded && "line-clamp-3")}>
        {text}
      </p>
      {(clamps || expanded) && (
        <div>
          <LinkButton aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show less" : "Show more"}
          </LinkButton>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Contributors (10z) ───────────────────────────

/** 10z: the creator first (the web roster's maker row), then the team. */
function ContributorsTab() {
  const { project } = useProduct();
  const me = useMe();
  const rows = [{ id: "creator", name: me.name, role: "Creator" }, ...teamOf(project.contributors ?? [])];
  return (
    <section aria-labelledby="pd-team" className="flex flex-col gap-6">
      <h2 id="pd-team" className={T.section}>
        Contributors
      </h2>
      <ul className="flex flex-col gap-6">
        {rows.map((t) => (
          <li key={t.id} className="flex items-center gap-4">
            <Avatar phone size="md" initials={initialsOf(t.name)} />
            <span className={cn(T.body, "min-w-0 break-words text-text-primary")}>
              {t.name} <span className="text-text-secondary">· {t.role}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
