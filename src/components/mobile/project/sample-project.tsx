"use client";

// Someone else's project, as a viewer sees it (Figma 18 / 18b, read-only):
// the Feed links each shared sample project here by its feed id
// (`/m/projects/p1`), and the page reads the web's sample post for it
// (`samplePostOf`). No owner control shows.
//
// Laid out as a product page (owner 2026-11-12, after the Feed's pill opened
// a wall of tables): the project's video on top — the clip the Feed played,
// muted and looping (still with Data saver or reduced motion; a tap pauses or
// plays) — then the name with its chip and the creator line, the
// marketplace's buy box and copies when it is listed
// (project-earn/buyer/sample-shop.tsx; the Feed's `?tab=marketplace` opens
// the page as it is, the box already in view), the description, and the tabs
// Overview · Products · Media: the project's activity, the products, About.
// Buying is a testnet demo by the active demo creator; the bottom bar buys
// the Main NFT, and Ask the creator opens a conversation about the post.

import * as React from "react";
import Link from "next/link";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { CATALOGUES } from "@/lib/manual/journey";
import { formatDate } from "@/lib/manual/project-summary";
import { VIEWER_TABS, type PhoneTab } from "@/lib/manual/phone-project";
import { startHref } from "@/lib/messages/links";
import { feedPersonId } from "@/lib/messages/people";
import { ME } from "@/lib/messages/types";
import { profileHrefOf } from "@/lib/people/ids";
import { PIECE_LABEL, type InnovationPost, type PostMedia } from "@/lib/innovations/types";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { MEDIA_CHIP, MEDIA_GROUND, MEDIA_INK } from "../kit/media";
import { Sheet } from "../kit/sheet";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useShareAction } from "../feed/share-action";
import { SampleMarketSection, SampleShop, SampleShopBar } from "../project-earn/buyer/sample-shop";
import { InfoRow, LIST_CARD, ListCard, PhoneStatusChip, ProductRow, SectionHeading, SubLine } from "./parts";
import { Description } from "./project-screen";

const enc = encodeURIComponent;
const TAB_IDS = VIEWER_TABS.map((t) => t.id);
const TABS = VIEWER_TABS.map((t) => ({ value: t.id, label: t.label }));

/** The creator's profile on the phone, when they have one. */
function creatorHrefOf(post: InnovationPost): string | null {
  const href = profileHrefOf(post.creator.id, "innovations");
  return href ? `/m${href}` : null;
}

export function SampleProject({ post, id }: { post: InnovationPost; id: string }) {
  // `marketplace` (the Feed's buy link) and anything else a viewer has no tab for is the Overview.
  const [tab, setTab] = useTabParam<PhoneTab>("tab", TAB_IDS, "overview");
  const status = post.listing ? "listed" : post.minted ? "minted" : null;
  const ask = `/m${startHref({ kind: "post", to: feedPersonId(post.creator.id), slug: post.slug }, ME)}`;
  const creator = creatorHrefOf(post);
  const facts = [post.category, `Shared ${formatDate(post.sharedAt)}`].filter(Boolean).join(" · ");
  // Share (owner 2026-11-22): anyone may share it while it is on the Marketplace.
  const share = useShareAction(id);

  // An in-page link to a tab ("See all" → Products) switches it in place.
  const onTabLink = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const url = new URL(a.href, window.location.href);
    if (url.pathname !== window.location.pathname) return;
    const next = url.searchParams.get("tab") ?? "overview";
    if (!(TAB_IDS as readonly string[]).includes(next)) return;
    e.preventDefault();
    setTab(next as PhoneTab);
  };

  return (
    <SampleShop post={post} id={id}>
    <Screen top={<TopBar back actions={share.action ? [share.action] : []} />} footer={<SampleShopBar ask={ask} />}>
      <ProjectHero post={post} />
      <header className="flex flex-col gap-2 px-8 pb-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className={cn(T.title, "min-w-0 break-words")}>{post.title}</h1>
          {status && <PhoneStatusChip status={status} word={status === "listed" ? "Listed" : "Minted"} />}
        </div>
        <p className={T.meta}>
          Created by{" "}
          {creator ? (
            <Link href={creator} className="text-text-brand outline-none hover:underline focus-visible:underline">
              {post.creator.name}
            </Link>
          ) : (
            post.creator.name
          )}
          {facts ? ` · ${facts}` : ""}
        </p>
      </header>
      <SampleMarketSection />
      <div className="px-8 pb-8">
        <Description text={post.description ?? ""} />
      </div>
      <div className="sticky top-0 z-10 bg-bg-page">
        <MobileTabs label="Project" idBase="viewer-project" tabs={TABS} value={tab} onChange={setTab} />
      </div>
      <div {...tabPanelProps("viewer-project", tab)} onClick={onTabLink} className="px-8 pb-12 pt-8 outline-none">
        {tab === "overview" && <SampleOverview post={post} id={id} />}
        {tab === "products" && <SampleProducts post={post} id={id} />}
        {tab === "media" && <SampleMedia post={post} />}
      </div>
      {share.sheets}
    </Screen>
    </SampleShop>
  );
}

/** The project's video, the clip the Feed played (the first product's, lib/innovations/clips.ts). */
function ProjectHero({ post }: { post: InnovationPost }) {
  const lead = post.products[0]?.video;
  const video = lead?.kind === "video" ? lead : (post.media.find((m): m is VideoMedia => m.kind === "video") ?? null);
  return <MediaHero video={video} picture={video?.poster ?? post.products[0]?.image ?? null} name={post.title} />;
}

type VideoMedia = Extract<PostMedia, { kind: "video" }>;

/** A page's video on top, as the Feed played it: muted and looping, still under Data saver or
 *  reduced motion; the chip pauses or plays it. With no video, the picture. */
export function MediaHero({ video, picture, name }: { video: { src: string; alt: string } | null; picture: string | null; name: string }) {
  const first = video;
  const src = video?.src;
  const dataSaver = useSettings().appearance.dataSaver;
  const player = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  React.useEffect(() => {
    const v = player.current;
    if (!v || dataSaver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.play().catch(() => setPlaying(false));
  }, [dataSaver, src]);
  if (!first && !picture) return null;
  const toggle = () => {
    const v = player.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };
  return (
    <div className="px-8 pb-6">
      <div className={cn(MEDIA_GROUND, "relative aspect-video w-full overflow-hidden rounded-xl")}>
        {first ? (
          <video
            ref={player}
            src={first.src}
            poster={picture ?? undefined}
            muted
            loop
            playsInline
            preload={dataSaver ? "none" : "metadata"}
            aria-label={first.alt}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a sample post's picture
          <img src={picture ?? ""} alt={`${name}, its picture`} className="absolute inset-0 size-full object-cover" />
        )}
        {first && (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause the video" : "Play the video"}
            className={cn(MEDIA_CHIP, "absolute bottom-4 right-4 min-h-[32px] gap-2 px-4 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
          >
            <Icon icon={playing ? PauseIcon : PlayIcon} size={14} />
            {playing ? "Pause" : "Play"}
          </button>
        )}
      </div>
    </div>
  );
}

function stageLabel(stage: string | null): string | null {
  if (!stage) return null;
  return CATALOGUES.project.find((t) => t.id === stage)?.label ?? null;
}

function SampleOverview({ post, id }: { post: InnovationPost; id: string }) {
  const stage = stageLabel(post.stage);
  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="sv-activity" className="flex flex-col gap-4">
        <SectionHeading id="sv-activity" title="Project activity" />
        {/* A sample post carries one stage (no earlier entries); with neither a stage nor a story
            it says so, as the visitor's page does (18i). */}
        {!stage && !post.story ? (
          <p className={T.body}>No journey shared yet.</p>
        ) : (
          <div className={cn(LIST_CARD, "gap-3 px-8 py-6")}>
            <span className="flex flex-wrap items-center gap-4">
              <span className={T.meta}>Now</span>
              <Badge tone="brand-outline">{stage ?? "Shared"}</Badge>
              <span className={T.body}>{formatDate(post.updatedAt)}</span>
            </span>
            {post.story && <span className={cn(T.body, "line-clamp-3 text-text-primary")}>{post.story}</span>}
          </div>
        )}
      </section>
      <SampleProducts post={post} id={id} heading />
      <section aria-labelledby="sv-about" className="flex flex-col gap-4">
        <SectionHeading id="sv-about" title="About" />
        <ListCard label="About">
          <InfoRow label="Creator" value={post.creator.name} href={creatorHrefOf(post) ?? undefined} />
          {post.category && <InfoRow label="Category" value={post.category} />}
          <InfoRow label="Parts" value={`${post.partsCount} ${post.partsCount === 1 ? "part" : "parts"}`} />
          <InfoRow label="Network" value={post.network ?? "Not added"} />
          {post.license && <InfoRow label="License" value={post.license} />}
          {post.chain && <InfoRow label="Blockchain" value={post.chain} />}
        </ListCard>
      </section>
    </div>
  );
}

function SampleProducts({ post, id, heading = false }: { post: InnovationPost; id: string; heading?: boolean }) {
  const rows = (
    <ListCard label="Products">
      {post.products.map((p) => (
        <ProductRow
          key={p.id}
          href={`/m/projects/${enc(id)}/products/${enc(p.id)}`}
          thumb={p.image}
          name={p.name}
          meta={p.summary}
          facts={p.pieces.map((k) => PIECE_LABEL[k]).join(" · ")}
        />
      ))}
    </ListCard>
  );
  const line = `${post.products.length} ${post.products.length === 1 ? "product" : "products"} · ${post.partsCount} parts`;
  if (!heading)
    return (
      <div className="flex flex-col gap-6">
        <SubLine>{line}</SubLine>
        {rows}
      </div>
    );
  return (
    <section aria-labelledby="sv-products" className="flex flex-col gap-4">
      <SectionHeading id="sv-products" title="Products" link={{ href: `/m/projects/${enc(id)}?tab=products`, label: "See all", aria: "See all products" }} />
      <SubLine>{line}</SubLine>
      {rows}
    </section>
  );
}

function SampleMedia({ post }: { post: InnovationPost }) {
  const [open, setOpen] = React.useState<PostMedia | null>(null);
  const shown = post.media.filter((m) => m.kind !== "clip");
  if (shown.length === 0) return <p className={T.body}>No media shared yet.</p>;
  return (
    <>
      <ul className="grid grid-cols-3 gap-4">
        {shown.map((m, i) => (
          <li key={i}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Open ${m.label}`}
              onClick={() => setOpen(m)}
              className="flex w-full flex-col gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-bg-surface-raised">
                {(m.kind === "image" ? m.src : m.kind === "video" ? m.poster : null) && (
                  // eslint-disable-next-line @next/next/no-img-element -- a sample post's image
                  <img src={(m.kind === "image" ? m.src : m.kind === "video" ? m.poster : "") ?? ""} alt="" className="absolute inset-0 size-full object-cover" />
                )}
                {m.kind === "video" && (
                  <span aria-hidden className={cn(MEDIA_GROUND, MEDIA_INK, "relative inline-flex size-[28px] items-center justify-center rounded-full")}>
                    <Icon icon={PlayIcon} size={16} />
                  </span>
                )}
              </span>
              <span className={cn(T.meta, "line-clamp-2")}>{m.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={open !== null} onClose={() => setOpen(null)} title={open?.label ?? ""}>
        {open?.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- a sample post's image
          <img src={open.src} alt={open.alt} className={cn(MEDIA_GROUND, "mb-8 max-h-[60vh] w-full rounded-md object-contain")} />
        )}
        {open?.kind === "video" && (
          <video src={open.src} poster={open.poster ?? undefined} controls playsInline aria-label={open.alt} className={cn(MEDIA_GROUND, "mb-8 max-h-[60vh] w-full rounded-md")} />
        )}
      </Sheet>
    </>
  );
}
