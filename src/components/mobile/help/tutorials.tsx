"use client";

// Tutorials on the phone (mobile Figma "Tutorial": Tutorial Categories and
// Tutorial Details, its ☰ "Menu Dropdown" as a pick-one sheet), on the web's
// content, progress and rewards (lib/tutorials): six categories, a topic is
// a page or a group of pages, every count and IDZ total worked out from the
// content. A category opens the page last read there, else its first page;
// reaching a page's end marks it read. A video card: "Video coming soon"
// until its file arrives (owner D1, no reward), then Earn → the % watched
// (only real playback counts) → Claim 2.0 IDZ (paid into the demo wallet as
// a wallet line, once per video; no wallet → Connect first) → ✓ Claimed.
// The editor categories say up front that their steps are done on a
// computer: a phone has no editors, keyboard or sidebar.

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowUp01Icon, Clock01Icon, Menu01Icon, PlayIcon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Banner } from "@/components/ideeza/banner";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { SearchInput } from "@/components/ideeza/search-input";
import { Tag } from "@/components/ideeza/tag";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { TUTORIAL_CATEGORIES } from "@/lib/tutorials/content";
import { anchorsOf, countLabel, findPage, formatIdz, isAvailable, isGroup, isZero, pagesOf, statsOf, type PageMatch } from "@/lib/tutorials/catalog";
import { addSpan, earnedIn, isPageDone, pageKey, resumeSlugOf, rewardStateOf, tickSpan, watchedShare, type Span, type TutorialProgress } from "@/lib/tutorials/progress";
import { claimReward, payeeOf } from "@/lib/tutorials/reward";
import type { TutorialBlock, TutorialCategory, TutorialVideo } from "@/lib/tutorials/types";
import { updateProgress, useTutorialProgress } from "@/lib/tutorials/use-progress";
import { readWallet } from "@/lib/wallet/demo-wallet";
import { TIMING } from "@/lib/wallet/request";
import { cn } from "@/lib/utils";
import { ConnectSheet } from "../earn-coin/parts";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../kit/list";
import { MEDIA_INK } from "../kit/media";
import { Sheet } from "../kit/sheet";
import { EmptyState, NotFoundState } from "../kit/state";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";

const POSTER = "/tutorials/video-poster.jpg";
export const tutorialHref = (category: string, page: string) => `/m/tutorials/${category}/${page}`;
/** Categories whose steps happen in the editors or the parts library: on a computer, not the phone. */
const ON_A_COMPUTER = new Set(["parts-vs-agile-modules", "code-tech"]);

// ── Tutorial Categories ────────────────────────────────────────────────

export function TutorialsScreen() {
  const progress = useTutorialProgress();
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const hits = q
    ? TUTORIAL_CATEGORIES.flatMap((c) =>
        pagesOf(c)
          .filter((e) => `${e.page.title} ${e.page.summary ?? ""} ${e.group?.title ?? ""}`.toLowerCase().includes(q))
          .map((e) => ({ category: c, entry: e })),
      )
    : [];
  return (
    <Screen top={<TopBar back="/m/help" title="Tutorial categories" />} className="px-8 pb-12 pt-4">
      <div className="flex flex-col gap-8">
        <p className={T.body}>
          Let’s learn about the IDEEZA platform and how it will revolutionise hardware designing. Take a look at all our categories for more tutorials.
        </p>
        <SearchInput size="xl" aria-label="Search tutorials" placeholder="Search tutorials" value={query} onValueChange={setQuery} onClear={() => setQuery("")} />
        {q ? (
          hits.length === 0 ? (
            <EmptyState icon={Search01Icon} title={`No tutorial about “${query.trim()}”`} body="Try other words, or look through the categories." action={{ label: "Clear search", onClick: () => setQuery("") }} />
          ) : (
            <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
              {hits.map(({ category, entry }) => (
                <li key={`${category.slug}/${entry.page.slug}`}>
                  <Link href={tutorialHref(category.slug, entry.page.slug)} className={LIST_ROW}>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className={T.rowTitle}>{entry.page.title}</span>
                      <span className={cn(T.meta, "truncate")}>
                        {category.title}
                        {entry.group ? ` › ${entry.group.title}` : ""}
                      </span>
                    </span>
                    <Chevron />
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="flex flex-col gap-8">
            {TUTORIAL_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <CategoryCard category={c} progress={progress} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  );
}

function CategoryCard({ category, progress }: { category: TutorialCategory; progress: TutorialProgress | undefined }) {
  const stats = statsOf(category);
  const slug = progress ? resumeSlugOf(progress, category) : pagesOf(category)[0]?.page.slug;
  const done = progress ? pagesOf(category).filter((e) => isPageDone(progress, category.slug, e.page)).length : 0;
  const earned = progress ? earnedIn(progress, category) : "0";
  const line = [done ? `${done} of ${countLabel(stats.topics, "topic", "topics")} done` : null, isZero(earned) ? null : `${formatIdz(earned)} IDZ earned`].filter(Boolean);
  return (
    <article className="relative flex flex-col gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-6">
      {/* eslint-disable-next-line @next/next/no-img-element -- a static cover from public/ */}
      <img src={category.cover.src} alt={category.cover.alt} decoding="async" className="aspect-[8/5] w-full rounded-lg bg-bg-subtle object-cover" />
      <div className="flex items-start gap-4">
        <h2 className={cn(T.section, "min-w-0 flex-1")}>
          <Link
            href={slug ? tutorialHref(category.slug, slug) : "/m/tutorials"}
            className="outline-none before:absolute before:inset-0 before:rounded-xl before:content-[''] focus-visible:before:ring-2 focus-visible:before:ring-border-focus"
          >
            {category.title}
          </Link>
        </h2>
        {!isZero(stats.idz) && (
          <p className={cn(T.rowTitle, "shrink-0 text-text-brand")}>
            <span className="sr-only">Earn up to </span>
            {formatIdz(stats.idz)} IDZ
          </p>
        )}
      </div>
      <p className={cn(T.body, "line-clamp-3")}>{category.description}</p>
      <div className="flex flex-wrap items-center gap-4">
        <Tag size="sm">{countLabel(stats.topics, "Topic", "Topics")}</Tag>
        {stats.videos > 0 ? (
          <Tag size="sm" icon={<Icon icon={PlayIcon} size={14} />}>
            {countLabel(stats.videos, "Video", "Videos")}
          </Tag>
        ) : stats.comingSoon > 0 ? (
          <Tag size="sm" icon={<Icon icon={Clock01Icon} size={14} />}>
            Videos coming soon
          </Tag>
        ) : null}
      </div>
      {line.length > 0 && <p className={cn(T.meta, "text-text-success")}>{line.join(" · ")}</p>}
    </article>
  );
}

// ── Tutorial Details ───────────────────────────────────────────────────

export function TutorialCategoryRedirect() {
  const { category } = useParams<{ category: string }>();
  const router = useRouter();
  const progress = useTutorialProgress();
  const c = TUTORIAL_CATEGORIES.find((x) => x.slug === category);
  React.useEffect(() => {
    if (!c || !progress) return;
    const slug = resumeSlugOf(progress, c);
    router.replace(slug ? tutorialHref(c.slug, slug) : "/m/tutorials");
  }, [c, progress, router]);
  if (!c) return <NotFound />;
  return (
    <Screen top={<TopBar back="/m/tutorials" title="Tutorial details" />} className="px-8 pt-4">
      <ListBones rows={3} />
    </Screen>
  );
}

function NotFound() {
  return (
    <Screen top={<TopBar back="/m/tutorials" title="Tutorial details" />} className="px-8 pt-8">
      <NotFoundState thing="tutorial" body="This address doesn’t name a tutorial." action={{ label: "See every tutorial", href: "/m/tutorials" }} />
    </Screen>
  );
}

export function TutorialPageScreen() {
  const { category, topic } = useParams<{ category: string; topic: string }>();
  const match = findPage(TUTORIAL_CATEGORIES, category, topic);
  if (!match) return <NotFound />;
  return <TopicPage key={`${category}/${topic}`} match={match} />;
}

function TopicPage({ match }: { match: PageMatch }) {
  const { category, page, prev, next } = match;
  const progress = useTutorialProgress();
  const [menu, setMenu] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const key = pageKey(category.slug, page.slug);

  // Opening a page remembers it as the category's last.
  React.useEffect(() => {
    updateProgress((p) => (p.last[category.slug] === page.slug ? p : { ...p, last: { ...p.last, [category.slug]: page.slug } }));
  }, [category.slug, page.slug]);

  // Reaching its end marks it read.
  React.useEffect(() => {
    const end = endRef.current;
    if (!end || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        updateProgress((p) => (p.read[key] ? p : { ...p, read: { ...p.read, [key]: Date.now() } }));
        io.disconnect();
      }
    });
    io.observe(end);
    return () => io.disconnect();
  }, [key]);

  const blocks = page.blocks ?? [];
  const anchors = anchorsOf(blocks);
  return (
    <Screen top={<TopBar back="/m/tutorials" title="Tutorial details" actions={[{ icon: Menu01Icon, label: "Tutorial topics", onClick: () => setMenu(true) }]} />} className="px-8 pb-12 pt-4">
      <article className="flex flex-col gap-6">
        <p className={T.meta}>
          {category.title}
          {match.group ? ` › ${match.group.title}` : ""}
        </p>
        <h2 className={T.display}>{page.title}</h2>
        {page.summary && <p className={cn(T.bodyLg, "text-text-secondary")}>{page.summary}</p>}
        {ON_A_COMPUTER.has(category.slug) && (
          <Banner tone="info" title="These steps are done on a computer">
            The editors and the parts library open on a computer. On the phone you can look at every piece and ask for changes in words.
          </Banner>
        )}
        {blocks.map((b, i) => (
          <Block key={i} block={b} anchor={anchors.get(i)} progress={progress} />
        ))}
        <div ref={endRef} />
        {progress?.read[key] && (
          <p className={cn(T.caption, "flex items-center gap-2 text-text-success")}>
            <Icon icon={Tick02Icon} size={14} />
            Read
          </p>
        )}
        <nav aria-label="More in this category" className="flex gap-4 border-t-[length:var(--border-width-1)] border-solid border-border pt-6">
          {prev ? (
            <Link href={tutorialHref(category.slug, prev.page.slug)} className="flex min-h-[56px] min-w-0 flex-1 flex-col justify-center gap-1 rounded-xl bg-bg-subtle px-6 py-4 outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
              <span className={cn(T.meta, "flex items-center gap-1")}>
                <Icon icon={ArrowLeft01Icon} size={14} />
                Previous
              </span>
              <span className={cn(T.rowTitle, "truncate")}>{prev.page.title}</span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link href={tutorialHref(category.slug, next.page.slug)} className="flex min-h-[56px] min-w-0 flex-1 flex-col items-end justify-center gap-1 rounded-xl bg-bg-subtle px-6 py-4 text-right outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
              <span className={cn(T.meta, "flex items-center gap-1")}>
                Next
                <Icon icon={ArrowRight01Icon} size={14} />
              </span>
              <span className={cn(T.rowTitle, "w-full truncate")}>{next.page.title}</span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </nav>
      </article>
      <TopicsSheet open={menu} onClose={() => setMenu(false)} current={match} progress={progress} />
    </Screen>
  );
}

function Block({ block: b, anchor, progress }: { block: TutorialBlock; anchor?: string; progress: TutorialProgress | undefined }) {
  switch (b.kind) {
    case "paragraph":
      return <p className={T.bodyLg}>{b.text}</p>;
    case "heading":
      return b.level === 2 ? (
        <h3 id={anchor} className={cn(T.title, "pt-4")}>
          {b.text}
        </h3>
      ) : (
        <h4 id={anchor} className={T.section}>
          {b.text}
        </h4>
      );
    case "list":
      return (
        <ul className={cn(T.bodyLg, "flex list-disc flex-col gap-2 pl-10")}>
          {b.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      );
    case "image":
      // eslint-disable-next-line @next/next/no-img-element -- a static image from public/
      return <img src={b.src} alt={b.alt} className="w-full rounded-xl bg-bg-subtle object-cover" />;
    case "video":
      return <VideoCard video={b} progress={progress} />;
  }
}

/** Saves what has played so far, and the video's length. */
function save(videoId: string, live: readonly Span[], duration: number | null) {
  if (!live.length && !duration) return;
  updateProgress((p) => ({
    ...p,
    watched: live.length ? { ...p.watched, [videoId]: live.reduce<Span[]>((acc, [a, z]) => addSpan(acc, a, z), [...(p.watched[videoId] ?? [])]) } : p.watched,
    duration: duration ? { ...p.duration, [videoId]: duration } : p.duration,
  }));
}

function VideoCard({ video, progress }: { video: TutorialVideo; progress: TutorialProgress | undefined }) {
  const toast = useToast();
  const [claiming, setClaiming] = React.useState(false);
  const [connect, setConnect] = React.useState(false);
  const live = React.useRef<Span[]>([]);
  const last = React.useRef<number | null>(null);
  const duration = React.useRef<number | null>(null);
  const state = progress ? rewardStateOf(progress, video) : "soon";
  const share = progress ? watchedShare(progress, video.id) : 0;
  const reward = `${formatIdz(video.reward)} IDZ Token`;

  const flush = () => {
    save(video.id, live.current, duration.current);
    live.current = [];
  };
  React.useEffect(() => () => save(video.id, live.current, duration.current), [video.id]);

  const claim = () => {
    const w = readWallet();
    if (!progress) return;
    if (!payeeOf(w)) return setConnect(true);
    setClaiming(true);
    window.setTimeout(() => {
      const at = Date.now();
      const r = claimReward(readWallet(), progress, video, at);
      setClaiming(false);
      if (!r.ok) {
        if (r.reason === "already") updateProgress((p) => ({ ...p, claimed: { ...p.claimed, [video.id]: { at: r.entry.at, amount: video.reward, activityId: r.entry.id } } }));
        else toast({ title: r.reason === "noWallet" ? "Connect your wallet to claim." : "Watch the video to the end first.", lead: "error" });
        return;
      }
      if (!persistWallet(r.wallet)) return toast({ title: "This browser couldn’t save it — storage is full or blocked.", lead: "error" });
      updateProgress((p) => ({ ...p, claimed: { ...p.claimed, [video.id]: { at, amount: video.reward, activityId: r.entry.id } } }));
      toast({ title: `${formatIdz(video.reward)} IDZ added to your demo wallet`, lead: "success" });
    }, TIMING.connect);
  };

  return (
    <figure className="flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-4">
      {isAvailable(video) ? (
        <video
          src={video.src}
          poster={video.poster ?? POSTER}
          controls
          playsInline
          preload="metadata"
          aria-label={video.title}
          className="aspect-video w-full rounded-lg bg-bg-subtle"
          onLoadedMetadata={(e) => {
            if (Number.isFinite(e.currentTarget.duration)) duration.current = e.currentTarget.duration;
          }}
          onPlay={(e) => {
            last.current = e.currentTarget.currentTime;
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (last.current !== null && !v.paused) {
              const span = tickSpan(last.current, v.currentTime, v.seeking);
              if (span) live.current = addSpan(live.current, span[0], span[1]);
            }
            last.current = v.currentTime;
          }}
          onSeeking={() => {
            last.current = null;
          }}
          onPause={flush}
          onEnded={flush}
        />
      ) : (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-bg-overlay">
          {/* eslint-disable-next-line @next/next/no-img-element -- the shared poster from public/ */}
          <img src={POSTER} alt="" className="absolute inset-0 size-full object-cover" />
          <div className={cn(MEDIA_INK, "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--color-modal-scrim)]")}>
            <Icon icon={Clock01Icon} size={22} />
            <p className={cn(T.rowTitle, MEDIA_INK)}>Video coming soon</p>
          </div>
        </div>
      )}
      <figcaption className="flex items-center justify-between gap-4 px-2 pb-2">
        <span className={cn(T.body, "text-text-primary")}>{state === "soon" ? video.title : "See this video and earn IDZ Token"}</span>
        {state === "claimed" ? (
          <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
            Claimed
          </Badge>
        ) : state === "ready" ? (
          <Button size="sm" loading={claiming} onClick={claim}>
            Claim {reward}
          </Button>
        ) : state === "soon" ? (
          <span className={cn(T.caption, "shrink-0 text-text-tertiary")}>No reward yet</span>
        ) : (
          <span className={cn(T.caption, "shrink-0 text-text-brand")}>Earn: {reward}</span>
        )}
      </figcaption>
      {state === "watching" && (
        <div className="flex flex-col gap-2 px-2 pb-2">
          <ProgressBar value={share * 100} label={`${Math.round(share * 100)}% watched`} />
          <span className={T.meta}>{Math.round(share * 100)}% watched · watch to the end to earn</span>
        </div>
      )}
      <ConnectSheet
        open={connect}
        onClose={() => setConnect(false)}
        description="Your IDZ reward goes to it. This is the testnet demo wallet — test funds only, nothing is written to a real blockchain."
        onConnected={() => window.setTimeout(claim, 0)}
      />
    </figure>
  );
}

/** The topics menu (Figma "Menu Dropdown"): every category opens and closes; a group opens its pages; the page on show is marked. */
function TopicsSheet({ open, onClose, current, progress }: { open: boolean; onClose: () => void; current: PageMatch; progress: TutorialProgress | undefined }) {
  const router = useRouter();
  const [openCats, setOpenCats] = React.useState<Set<string>>(() => new Set([current.category.slug]));
  const toggle = (slug: string) =>
    setOpenCats((s) => {
      const next = new Set(s);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  const go = (category: string, page: string) => {
    onClose();
    router.push(tutorialHref(category, page));
  };
  const row = "flex min-h-[44px] w-full items-center justify-between gap-4 rounded-md px-4 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";
  return (
    <Sheet open={open} onClose={onClose} title="Tutorial topics" fill>
      <ul className="-mx-4 flex flex-col">
        {TUTORIAL_CATEGORIES.map((c) => {
          const on = openCats.has(c.slug);
          return (
            <li key={c.slug}>
              <button type="button" aria-expanded={on} onClick={() => toggle(c.slug)} className={cn(row, T.rowTitle)}>
                {c.title}
                <Icon icon={on ? ArrowUp01Icon : ArrowDown01Icon} size={16} />
              </button>
              {on && (
                <ul className="flex flex-col pl-6">
                  {c.topics.map((t) =>
                    isGroup(t) ? (
                      <li key={t.slug}>
                        <p className={cn(T.meta, "px-4 pb-1 pt-3")}>{t.title}</p>
                        <ul className="flex flex-col pl-6">
                          {t.children!.map((p) => (
                            <PageRow key={p.slug} title={p.title} current={current.category.slug === c.slug && current.page.slug === p.slug} done={!!progress && isPageDone(progress, c.slug, p)} onPick={() => go(c.slug, p.slug)} className={row} />
                          ))}
                        </ul>
                      </li>
                    ) : (
                      <PageRow key={t.slug} title={t.title} current={current.category.slug === c.slug && current.page.slug === t.slug} done={!!progress && isPageDone(progress, c.slug, t)} onPick={() => go(c.slug, t.slug)} className={row} />
                    ),
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

function PageRow({ title, current, done, onPick, className }: { title: string; current: boolean; done: boolean; onPick: () => void; className: string }) {
  return (
    <li>
      <button type="button" aria-current={current ? "page" : undefined} onClick={onPick} className={cn(className, current ? cn(T.rowTitle, "bg-bg-brand-subtle text-text-brand") : cn(T.body, "text-text-primary"))}>
        {title}
        {done && (
          <span className="text-text-success">
            <Icon icon={Tick02Icon} size={14} aria-label="Done" />
          </span>
        )}
      </button>
    </li>
  );
}
