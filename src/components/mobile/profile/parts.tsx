"use client";

// The pieces of a creator profile on the phone ("People · 2026 update" PR-02,
// PR-10): the cover with the photo over its lower edge, the identity block
// (name, headline, where and since when, how they are tied to you, what they
// are open to), the four counts, About with Show more, Mobile / Info rows,
// the M14 line tabs (Timeline · Projects · Activity), the Mobile / Project card,
// the reactions row, the More projects grid and the Activity rows. Layout and
// spacing from those frames; every fact comes from
// the web's profile logic (use-profile.ts).

import * as React from "react";
import Link from "next/link";
import { Bookmark02Icon, Comment01Icon, CpuIcon, FavouriteIcon, MoreHorizontalIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { IconButton } from "@/components/ideeza/icon-button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { cn } from "@/lib/utils";
import { clipHref, postItemIdOf } from "@/lib/innovations/clips";
import { useCommentCount } from "@/lib/innovations/comments-store";
import { countsOf, useReactions } from "@/lib/innovations/reactions";
import { sampleSeedOf } from "@/lib/innovations/sample-posts";
import type { MadeItem } from "@/lib/people/made";
import { ageOf, compactCount, phoneProjectHref, shortDateOf, videoLengthOf, type Stat } from "@/lib/people/phone-profile";
import { featuredOf, stageToneOf, type ActivityItem, type StageTone } from "@/lib/people/portfolio";
import { Chevron } from "../kit/list";
import { MEDIA_CHIP } from "../kit/media";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { cardFactsOf } from "./use-profile";

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

// ─────────────────────────── cover, identity, counts ───────────────────────────

/** Cover + avatar (PR-02 "Cover + avatar"): a 140 band, the 64 photo 108 down, a Change cover
 *  action 8 above the band's foot. With no picture at all (PR-04) there is no band. */
export function CoverAndAvatar({
  cover,
  action,
  avatar,
}: {
  /** The picture; null for the quiet brand tint; undefined for no band. */
  cover: string | null | undefined;
  action?: React.ReactNode;
  avatar: { initials: string; color: string | null; src: string | null; label: string };
}) {
  const photo = (
    <Avatar
      size="xl"
      phone
      initials={avatar.initials}
      color={avatar.color ?? undefined}
      src={avatar.src ?? undefined}
      label={avatar.label}
      className="ring-4 ring-bg-page"
    />
  );
  if (cover === undefined) return <div className="px-8 pt-2">{photo}</div>;
  return (
    <div className="relative h-[172px] shrink-0">
      <div className="absolute inset-x-0 top-0 h-[140px] overflow-hidden bg-bg-brand-subtle">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      {action && <div className="absolute right-8 top-[100px]">{action}</div>}
      <div className="absolute left-8 top-[108px]">{photo}</div>
    </div>
  );
}

const TONE: Record<StageTone, BadgeTone> = { neutral: "neutral", blue: "info", warning: "warning", success: "success" };

export function Identity({
  titleRef,
  name,
  latinName,
  demo,
  headline,
  meta,
  relation,
  openTo,
}: {
  titleRef?: React.Ref<HTMLHeadingElement>;
  name: string;
  latinName: string | null;
  /** A sample person: every profile but yours is a demo creator until there are accounts. */
  demo: boolean;
  /** Their headline, or on your own empty profile the prompt that opens Edit profile. */
  headline: React.ReactNode;
  /** One line: where they are and their local time (else since when they build on IDEEZA). */
  meta: string | null;
  /** How they are tied to you; only you see it. */
  relation: string | null;
  openTo: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <h1 ref={titleRef} tabIndex={-1} className={cn(T.title, "min-w-0 break-words outline-none")}>
            {name}
          </h1>
          {demo && <Badge tone="neutral">Demo creator</Badge>}
        </div>
        {latinName && <p className={cn(T.meta, "text-text-tertiary")}>{latinName}</p>}
        {headline && <div className={cn(T.body, "text-text-primary")}>{headline}</div>}
        {meta && <p className={T.meta}>{meta}</p>}
      </div>
      {(openTo || relation) && (
        <div className="flex flex-wrap gap-2">
          {openTo && (
            <Badge tone="success" className="whitespace-normal text-left">
              {openTo}
            </Badge>
          )}
          {relation && (
            <Badge tone="brand" className="whitespace-normal text-left">
              {relation}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/** The prompt in place of an empty field on your own profile ("+ Add what you build"). */
export function Prompt({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(T.body, "-my-6 inline-flex min-h-[44px] items-center text-text-brand hover:underline", FOCUS)}>
      + {children}
    </button>
  );
}

/** The counts from shared work: the figure over its label, centred, four across (two by two on
 *  the narrowest phones), so a label that takes two lines still reads as one row. */
export function Stats({ stats }: { stats: readonly Stat[] }) {
  if (!stats.length) return null;
  return (
    <dl className={cn("m-0 grid gap-x-4 gap-y-6 py-2", stats.length === 3 ? "grid-cols-3" : "grid-cols-2 min-[360px]:grid-cols-4")}>
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col-reverse items-center justify-end gap-1 text-center">
          <dt className={T.meta}>{s.label}</dt>
          <dd className={cn(T.section, "m-0 tabular-nums")}>{compactCount(s.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** About: three lines, then Show more when there is more. */
export function About({ text, prompt }: { text: string; prompt?: React.ReactNode }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = React.useState(false);
  const [clipped, setClipped] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);
  if (!text && !prompt) return null;
  return (
    <section aria-label="About" className="flex flex-col gap-2">
      {text && <h2 className={T.section}>About</h2>}
      {text ? (
        <>
          <p ref={ref} className={cn(T.body, "whitespace-pre-line", !open && "line-clamp-3")}>
            {text}
          </p>
          {(clipped || open) && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={cn(T.rowTitle, "-my-6 inline-flex min-h-[44px] items-center self-start text-text-brand hover:underline", FOCUS)}
            >
              {open ? "Show less" : "Show more"}
            </button>
          )}
        </>
      ) : (
        <div>{prompt}</div>
      )}
    </section>
  );
}

const INFO_ROW = cn("flex h-[44px] w-full items-center gap-4 rounded-md p-6 text-left transition-colors duration-fast hover:bg-bg-subtle", FOCUS);

/** Mobile / Info row: a label, a value on the right, the chevron. */
export function InfoRow({ label, value, href, onClick }: { label: string; value?: string; href?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className={cn(T.body, "min-w-0 shrink truncate")}>{label}</span>
      <span className={cn(T.body, "min-w-0 flex-1 truncate text-right text-text-primary")}>{value}</span>
      <Chevron />
    </>
  );
  if (href) {
    return (
      <Link href={href} className={INFO_ROW}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={INFO_ROW}>
      {body}
    </button>
  );
}

// ─────────────────────────── the work ───────────────────────────

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function CoverImage({ item, className, children }: { item: MadeItem; className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("relative flex items-center justify-center overflow-hidden rounded-lg bg-bg-subtle text-[color:var(--color-icon-default)]", className)}>
      {item.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <Icon icon={CpuIcon} size={32} />
      )}
      {children}
    </span>
  );
}

export type Maker = { name: string; initials: string; color: string | null; src: string | null; /** On a paid plan: the Pro badge beside the name. */ pro?: boolean };

/** Mobile / Project card (10646:3): the 4:3 cover with Minted and the video's length, the title
 *  and its stage, the maker with the product count, then Appreciate · Comments · Views · Save —
 *  the Feed's own stores, so the card, the Feed and the web agree. */
export function ProjectCard({ item, maker, onMore }: { item: MadeItem; maker: Maker; onMore?: () => void }) {
  const facts = React.useMemo(() => cardFactsOf(item), [item]);
  const href = phoneProjectHref(item);
  return (
    <article aria-label={item.title} className="flex flex-col gap-4">
      <Link href={href} className={cn("rounded-lg", FOCUS)} aria-label={`Open ${item.title}`}>
        <CoverImage item={item} className="aspect-[4/3] w-full">
          {facts.minted && (
            <span className="absolute left-4 top-4">
              <Badge tone="success">Minted</Badge>
            </span>
          )}
          {facts.videoMs !== null && (
            <span className={cn(MEDIA_CHIP, "absolute bottom-4 right-4")}>
              <span className="sr-only">Video, </span>▶ {videoLengthOf(facts.videoMs)}
            </span>
          )}
        </CoverImage>
      </Link>
      <div className="flex flex-col gap-2">
        <Link href={href} className={cn(T.section, "self-start rounded-xs", FOCUS)}>
          {item.title}
        </Link>
        <div className="flex flex-wrap gap-2">
          {item.stage && <Badge tone={TONE[stageToneOf(item.stageId)]}>{item.stage}</Badge>}
          {item.sale && <Badge tone="blue">{item.sale === "whole" ? "For sale" : "Copies for sale"}</Badge>}
        </div>
        {item.summary && <p className={cn(T.body, "line-clamp-2")}>{item.summary}</p>}
      </div>
      <div className="flex items-center gap-4">
        <Avatar size="xs" initials={maker.initials} color={maker.color ?? undefined} src={maker.src ?? undefined} />
        <span className={cn(T.meta, "truncate text-text-primary")}>{maker.name}</span>
        {maker.pro && <Badge tone="brand">Pro</Badge>}
        {item.products > 0 && <span className={cn(T.meta, "shrink-0 text-text-tertiary")}>· {plural(item.products, "product", "products")}</span>}
      </div>
      <p className={cn(T.meta, "text-text-tertiary")}>updated {shortDateOf(item.changedAt, true)}</p>
      <ReactionRow
        postId={facts.postId}
        base={facts.base}
        // The post's comments: on its clip while it plays on the Feed; else the clip's address leads to
        // the post's comments on the Timeline, or to the details when it was never shared (SOC-3).
        commentsHref={`${clipHref(facts.clipId ?? postItemIdOf(facts.postId))}?comment=`}
        onMore={onMore}
        moreLabel={`Actions for ${item.title}`}
      />
    </article>
  );
}

/** Appreciate · Comments · Views · (⋯) · Save under a post or a project card — the Feed's own stores,
 *  keyed by the post, so the card, the Timeline, the Feed and the web agree. */
export function ReactionRow({
  postId,
  base,
  commentsHref,
  onComments,
  views = true,
  onMore,
  moreLabel,
}: {
  postId: string;
  base: { appreciations: number; views: number };
  /** Where Comments opens: a page (a post's clip), or `onComments` opens its sheet here (a share). */
  commentsHref: string | null;
  onComments?: () => void;
  /** Views are a post's (the Feed counts them); a share shows none. */
  views?: boolean;
  onMore?: () => void;
  moreLabel?: string;
}) {
  const toast = useToast();
  const { reactions, toggle, hydrated } = useReactions();
  const counts = countsOf(reactions, postId, base);
  // A sample post has its sample comments; yours start with none.
  const seed = React.useMemo(() => (postId.startsWith("sample:") ? sampleSeedOf(postId) : () => []), [postId]);
  const comments = useCommentCount(postId, seed);
  const failed = () => toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
  return (
    <div className="flex items-center">
      <IconButton
        hierarchy="ghost"
        size="xl"
        aria-label={counts.appreciated ? "Remove appreciation" : "Appreciate"}
        aria-pressed={counts.appreciated}
        disabled={!hydrated}
        className={counts.appreciated ? "text-text-brand" : undefined}
        icon={<Icon icon={FavouriteIcon} size={22} />}
        onClick={() => {
          if (!toggle("appreciated", postId)) failed();
        }}
      />
      <span className={cn(T.meta, "tabular-nums")}>{compactCount(counts.appreciations)}</span>
      {onComments ? (
        <button
          type="button"
          onClick={onComments}
          aria-label={`Comments${comments !== null ? `, ${comments}` : ""}`}
          className={cn("ml-2 inline-flex size-[44px] items-center justify-center rounded-xl text-[color:var(--color-icon-default)] hover:bg-bg-subtle", FOCUS)}
        >
          <Icon icon={Comment01Icon} size={22} />
        </button>
      ) : (
        commentsHref !== null && (
          <Link
            href={commentsHref}
            aria-label={`Comments${comments !== null ? `, ${comments}` : ""}`}
            className={cn("ml-2 inline-flex size-[44px] items-center justify-center rounded-xl text-[color:var(--color-icon-default)] hover:bg-bg-subtle", FOCUS)}
          >
            <Icon icon={Comment01Icon} size={22} />
          </Link>
        )
      )}
      {(onComments || commentsHref !== null) && <span className={cn(T.meta, "tabular-nums")}>{comments === null ? "" : compactCount(comments)}</span>}
      {views && (
        <span className={cn(T.meta, "flex items-center gap-2 px-6 tabular-nums")}>
          <span className="text-[color:var(--color-icon-default)]">
            <Icon icon={ViewIcon} size={16} />
          </span>
          <span className="sr-only">Views</span>
          {compactCount(counts.views)}
        </span>
      )}
      <span className="flex-1" />
      {onMore && <IconButton hierarchy="ghost" size="xl" aria-label={moreLabel ?? "More actions"} icon={<Icon icon={MoreHorizontalIcon} size={22} />} onClick={onMore} />}
      <IconButton
        hierarchy="ghost"
        size="xl"
        aria-label={counts.saved ? "Unsave" : "Save"}
        aria-pressed={counts.saved}
        disabled={!hydrated}
        className={counts.saved ? "text-text-brand" : undefined}
        icon={<Icon icon={Bookmark02Icon} size={22} />}
        onClick={() => {
          if (!toggle("saved", postId)) failed();
          else toast({ title: counts.saved ? "Removed from Saved" : "Saved" });
        }}
      />
    </div>
  );
}

/** A More projects tile: the 4:3 cover, the name, then "2 products · Oct 12" and what is for sale
 *  (the web's facts); your own carry ⋯ for pinning. */
function ProjectTile({ item, onMore }: { item: MadeItem; onMore?: () => void }) {
  return (
    <li className="relative flex min-w-0 flex-col gap-2">
      <Link href={phoneProjectHref(item)} className={cn("flex flex-col gap-2 rounded-lg", FOCUS)}>
        <CoverImage item={item} className="aspect-[4/3] w-full" />
        <span className={cn(T.meta, "truncate text-text-primary")}>{item.title}</span>
        <span className={cn(T.micro, "truncate")}>
          {[item.products > 0 ? plural(item.products, "product", "products") : null, shortDateOf(item.changedAt)].filter(Boolean).join(" · ")}
        </span>
        {item.sale && (
          <span className="flex">
            <Badge tone="blue">{item.sale === "whole" ? "For sale" : "Copies for sale"}</Badge>
          </span>
        )}
      </Link>
      {onMore && (
        <span className="absolute right-2 top-2">
          <IconButton
            hierarchy="secondary"
            size="xl"
            aria-label={`Actions for ${item.title}`}
            icon={<Icon icon={MoreHorizontalIcon} size={22} />}
            onClick={onMore}
          />
        </span>
      )}
    </li>
  );
}

const WORK_TABS = ["timeline", "projects", "activity"] as const;
type WorkTab = (typeof WORK_TABS)[number];

/** Timeline · Projects · Activity (M14 line tabs, sticky under the top bar). Timeline (owner
 *  2026-11-22) leads: every project and product shared, newest first; Projects is Featured and More
 *  projects; Activity the journey rows. Only the tabs with something in them show, the first of them
 *  open; with one, no strip. The tab lives in the address (`?tab=projects`, as on the web), so Back
 *  from a project returns to the tab you left. Nothing at all: nothing renders (the caller's empty
 *  state shows). */
export function Work({
  timeline,
  items,
  activity,
  maker,
  pinnedBy,
  now,
  onMore,
}: {
  /** The Timeline's posts, drawn by the caller (timeline.tsx), and how many. */
  timeline: { count: number; content: React.ReactNode } | null;
  items: readonly MadeItem[];
  activity: readonly ActivityItem[];
  maker: Maker;
  /** "you" or a first name: "Pinned by …". */
  pinnedBy: string;
  now: number;
  /** Your own profile: a card's ⋯ (Pin to top · Open project). */
  onMore?: (item: MadeItem) => void;
}) {
  const lead = featuredOf(items);
  const shown = WORK_TABS.filter((t) => (t === "timeline" ? (timeline?.count ?? 0) > 0 : t === "projects" ? !!lead : activity.length > 0));
  const first: WorkTab = shown[0] ?? "timeline";
  const [tab, setTab] = useTabParam("tab", WORK_TABS, first);
  if (!shown.length) return null;
  const active = shown.includes(tab) ? tab : first;
  const tabs = shown.length > 1;
  const count = (t: WorkTab) => (t === "timeline" ? (timeline?.count ?? 0) : t === "projects" ? items.length : activity.length);
  const LABEL: Record<WorkTab, string> = { timeline: "Timeline", projects: "Projects", activity: "Activity" };
  return (
    <div className="flex flex-col gap-6">
      {tabs && (
        <div className="sticky top-0 z-sticky -mx-8 bg-bg-page px-8">
          <MobileTabs label="Work" idBase="work" width="hug" value={active} onChange={setTab} tabs={shown.map((t) => ({ value: t, label: LABEL[t], count: count(t) }))} />
        </div>
      )}
      <div {...(tabs ? tabPanelProps("work", active) : {})} className="flex flex-col gap-6 outline-none">
        {active === "timeline" ? (
          <>
            {!tabs && <h2 className={T.section}>Timeline</h2>}
            {timeline?.content}
          </>
        ) : active === "projects" && lead ? (
          <>
            <section aria-labelledby="work-featured" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 id="work-featured" className={T.section}>
                  Featured
                </h2>
                {lead.pinned ? (
                  <span className={cn(T.meta, "text-text-tertiary")}>Pinned by {pinnedBy}</span>
                ) : (
                  onMore && <span className={cn(T.meta, "text-text-tertiary")}>Pin up to 3 from a card’s ⋯</span>
                )}
              </div>
              <ProjectCard item={lead.featured} maker={maker} onMore={onMore && lead.featured.projectId ? () => onMore(lead.featured) : undefined} />
            </section>
            {lead.rest.length > 0 && (
              <section aria-labelledby="work-more" className="flex flex-col gap-4">
                <h2 id="work-more" className={T.section}>
                  More projects
                </h2>
                <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0">
                  {lead.rest.map((m) => (
                    <ProjectTile key={m.key} item={m} onMore={onMore && m.projectId ? () => onMore(m) : undefined} />
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <ActivityRows items={activity} now={now} />
        )}
      </div>
    </div>
  );
}

const ACTIVITY_FIRST = 10;

/** Activity: "Prototype built · Smart Plant Watering Kit · 2 d", each opening its project. The
 *  name gives way first, so the age always shows; what was written about it sits underneath. */
function ActivityRows({ items, now }: { items: readonly ActivityItem[]; now: number }) {
  const [all, setAll] = React.useState(false);
  const shown = all ? items : items.slice(0, ACTIVITY_FIRST);
  return (
    <div className="flex flex-col gap-2">
      <ol className="-mx-6 m-0 flex list-none flex-col p-0">
        {shown.map((a) => (
          <li key={a.key}>
            <Link href={a.href} className={cn(INFO_ROW, "h-auto min-h-[44px] flex-col items-stretch gap-1")}>
              <span className="flex items-center gap-4">
                <span className={cn(T.body, "shrink-0")}>{a.type}</span>
                <span className={cn(T.body, "min-w-0 flex-1 truncate text-right text-text-primary")}>{a.project}</span>
                <time dateTime={new Date(a.at).toISOString()} className={cn(T.meta, "shrink-0 text-text-tertiary")}>
                  <span aria-hidden>· {ageOf(a.at, now)}</span>
                  <span className="sr-only">{shortDateOf(a.at, true)}</span>
                </time>
                <Chevron />
              </span>
              {a.text && <span className={cn(T.meta, "line-clamp-2")}>{a.text}</span>}
            </Link>
          </li>
        ))}
      </ol>
      {items.length > ACTIVITY_FIRST && (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll((v) => !v)}
          className={cn(T.rowTitle, "inline-flex min-h-[44px] items-center self-start text-text-brand hover:underline", FOCUS)}
        >
          {all ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────── states ───────────────────────────

/** PR-19: the cover band, the photo, two lines and the two buttons' places. */
export function ProfileBones() {
  return (
    <div role="status" aria-label="Loading the profile" className="flex flex-col">
      <Skeleton shape="block" className="h-[120px] w-full rounded-none" />
      <div className="flex flex-col gap-6 px-8 pt-6">
        <Skeleton shape="circle" size="lg" />
        <Skeleton shape="text" size="lg" className="w-[240px]" />
        <Skeleton shape="text" size="md" className="w-[160px]" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton shape="block" className="h-[44px] w-full" />
          <Skeleton shape="block" className="h-[44px] w-full" />
        </div>
      </div>
    </div>
  );
}
