"use client";

// The phone's project page (Figma "Project Details · 2026 update" 01–01b,
// 20a–20d; owner decisions M1–M6), laid out as a native object page (mobile UX
// pass, 2026-11-15). The same project as the web's /projects/[id], read
// through the web's one derivation (`useProjectPageData`), placed for a phone:
// · the top bar: Back to My projects and ⋯ Project actions (07); the name comes
//   into the bar once the large title scrolls away (01b);
// · media first: the project video in use, else the cover (the buyer page's
//   MediaHero); a tap on the cover opens the build images (Use as cover);
// · one header: the name once, one line with the status chip (the Shared eye
//   inside it) and the stage words, the description clamped to 3 lines (Show
//   more) or Add a description, the lock line as a row to the sale, a newer
//   version's notice with Review version n (05b / 05c);
// · Products, the main content: the rows, Add a product, All n products;
// · the description tip (07o), slim, after the products;
// · a hub of rows that push: Activity, Media, Versions, Team, Network; About;
//   Recent once the project has gone out (overview.tsx);
// · the Bottom action bar in the thumb zone (M4): Publish + Earn while there is
//   a way to publish, else the live fact beside Earn (20b).
// Products, Media and Activity are screens of their own at the old tab
// addresses (`?tab=products|media|activity`), so every link to a tab lands on
// its screen, with Back to the page; the web's `?tab=team|network|versions`
// opens that screen instead. Loading shows bones under the bar with no ⋯
// (20c); an address that matches no project says so, with Back to My projects
// (20d, the kit's not-found state), on this page and on every screen under it.
// A write the browser refused (storage full) says so under the top bar.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AiMagicIcon, Cancel01Icon, Coins01Icon, Image02Icon, InformationCircleIcon, PencilEdit01Icon, Rocket01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { earnSourceOf, useEarnFacts } from "@/components/projects/earn/ladder/use-earn-facts";
import { coachmarkDue, COACHMARK_TEXT } from "@/components/projects/details/description-coachmark";
import { mediaTilesOf } from "@/components/projects/details/media-tab";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { useClipUrl } from "@/components/video-jobs/video-player";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { earnHref, publishOptionsOf } from "@/lib/manual/earn-route";
import { earnButtonOf } from "@/lib/manual/earn-view";
import { can } from "@/lib/manual/permissions";
import { pendingNoticesOf, stageLineOf } from "@/lib/manual/project-header";
import { headerText } from "@/lib/manual/project-summary";
import { coverOf, productRowsOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import {
  PHONE_TABS,
  phoneBarOf,
  phoneHrefOf,
  phoneProjectHref,
  phoneProjectPath,
  phoneSubScreenOf,
  sampleProjectOf,
} from "@/lib/manual/phone-project";
import { projectVideoStatusOf } from "@/lib/video/project-video";
import { useProjectVideos } from "@/lib/video/store";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { Chevron, LIST_CARD } from "../kit/list";
import { MEDIA_CHIP, MEDIA_GROUND } from "../kit/media";
import { NotFoundState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { Screen } from "../screen";
import { MORE_ICON, TopBar } from "../top-bar";
import { PRESSED, PRESSED_DIM } from "../kit/press";
import { T } from "../type";
import { ActivityBar, ActivityTab } from "./activity-tab";
import { ProjectProvider, useProject, type ProjectSheet, type Ready } from "./context";
import { BuildImagesViewer, MediaBar, MediaTab } from "./media-tab";
import { ProjectAbout, ProjectHub, ProjectRecent } from "./overview";
import { LINK_SM, PhoneStatusChip, TapLink } from "./parts";
import { ProductsBar, ProductsSection, ProductsTab } from "./products-tab";
import { MediaHero, SampleProject } from "./sample-project";
import { ProjectSheets } from "./sheets";
import { usePhoneWriteGate } from "./write-gate";

/** The screens under the page at the old tab addresses. */
type SubView = "products" | "media" | "activity";
const SUB_VIEWS: readonly SubView[] = ["products", "media", "activity"];
const SUB_TITLE = Object.fromEntries(PHONE_TABS.map((t) => [t.id, t.label])) as Record<SubView, string>;

export function ProjectScreen({ id }: { id: string }) {
  const data = useProjectPageData(id, "project");
  const router = useRouter();
  const params = useSearchParams();
  // The web's Team, Network and Versions tabs are screens of their own here: go there in place.
  const sub = phoneSubScreenOf(params.get("tab"));
  React.useEffect(() => {
    if (sub) router.replace(phoneProjectPath(id, sub));
  }, [sub, id, router]);
  if (sub || data.state === "loading") return <ProjectLoading />;
  if (data.state === "missing") {
    // Not one of the viewer's own: another creator's shared project, as the Feed links it.
    const sample = sampleProjectOf(id);
    return sample ? <SampleProject post={sample} id={id} /> : <ProjectMissing />;
  }
  return <ProjectReady data={data} />;
}

/** 20c · Loading project: the bar and the page's shape (media, title, rows), no ⋯ yet. */
export function ProjectLoading() {
  return (
    <Screen top={<TopBar back="/m/projects" />}>
      <div role="status" aria-label="Loading project" className="flex flex-col gap-6 px-8 pb-8">
        <Skeleton shape="block" className="aspect-video h-auto w-full" />
        <Skeleton shape="text" size="lg" />
        <Skeleton shape="text" size="md" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} shape="block" className="h-[80px] w-full" />
        ))}
      </div>
    </Screen>
  );
}

/** 20d · Project not found, on the page and on every screen under it (Team, Network, Versions,
 *  Project video, the activity form): the kit's not-found state and the way back. `thing` names
 *  what is missing ("product", "activity"); `back` is where its Back and its button go. */
export function ProjectMissing({
  thing = "project",
  back = "/m/projects",
  backLabel = "Back to My projects",
}: {
  thing?: string;
  back?: string;
  backLabel?: string;
}) {
  return (
    <Screen top={<TopBar back={back} />} className="px-8 pb-8">
      <NotFoundState thing={thing} body="It may have been deleted, or it was made in another browser." action={{ label: backLabel, href: back }} />
    </Screen>
  );
}

function ProjectReady({ data }: { data: Ready }) {
  const { project } = data;
  const params = useSearchParams();
  const raw = params.get("tab");
  const view = (SUB_VIEWS as readonly string[]).includes(raw ?? "") ? (raw as SubView) : null;
  const gate = usePhoneWriteGate(project.id);
  const [sheet, setSheet] = React.useState<ProjectSheet | null>(null);
  const ctx = { ...data, gate, open: setSheet };
  return (
    <ProjectProvider value={ctx}>
      {/* Keyed, so a screen and the page never share one scroller (each opens at its own top). */}
      {view ? <ProjectSubScreen key={view} view={view} /> : <ProjectPage key="page" />}
      <ProjectSheets sheet={sheet} onSheet={setSheet} />
      {gate.sheet}
    </ProjectProvider>
  );
}

// Where the page was scrolled when a row opened a screen under it: Back puts it back.
const pageTop = new Map<string, number>();

function ProjectPage() {
  const { project, viewer, open } = useProject();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleGone = useScrolledPast(titleRef, scrollRef);
  const owner = can(viewer, "facts.seeOwnerOnly");

  React.useLayoutEffect(() => {
    const top = pageTop.get(project.id);
    pageTop.delete(project.id);
    if (top && scrollRef.current) scrollRef.current.scrollTop = top;
  }, [project.id]);
  // A link on the page (a product, a hub row) is about to open a screen: keep the place.
  const keepPlace = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a") && scrollRef.current) pageTop.set(project.id, scrollRef.current.scrollTop);
  };

  return (
    <Screen
      top={
        <TopBar
          back="/m/projects"
          title={titleGone ? project.name : undefined}
          titleAs="p"
          actions={owner ? [{ icon: MORE_ICON, label: "Project actions", onClick: () => open({ kind: "menu" }) }] : []}
        />
      }
      footer={<ProjectBar />}
    >
      <ScrollHost scrollRef={scrollRef}>
        <div onClickCapture={keepPlace} className="flex flex-col pb-12">
          <OfflineBanner />
          <StorageErrorBanner className="mx-8 mb-6" />
          <ProjectHero />
          <ProjectHeader titleRef={titleRef} />
          <div className="flex flex-col gap-12 px-8">
            <ProductsSection />
            <DescriptionTip />
            <ProjectHub />
            <ProjectAbout />
            <ProjectRecent key={project.id} />
          </div>
        </div>
      </ScrollHost>
    </Screen>
  );
}

/** Products, Media or Activity on a screen of its own, Back to the page. */
function ProjectSubScreen({ view }: { view: SubView }) {
  const { project } = useProject();
  const footer = view === "products" ? <ProductsBar /> : view === "media" ? <MediaBar /> : <ActivityBar />;
  return (
    <Screen top={<TopBar back={phoneProjectHref(project.id)} title={SUB_TITLE[view]} />} footer={footer}>
      <OfflineBanner />
      <StorageErrorBanner className="mx-8 mb-6" />
      <div className="px-8 pb-12 pt-2">
        {view === "products" && <ProductsTab />}
        {view === "media" && <MediaTab />}
        {view === "activity" && <ActivityTab />}
      </div>
    </Screen>
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

/** True once `target` has scrolled up out of `root`'s view (the top bar takes the title then). */
function useScrolledPast(target: React.RefObject<HTMLElement | null>, root: React.RefObject<HTMLElement | null>): boolean {
  const [gone, setGone] = React.useState(false);
  React.useEffect(() => {
    const el = target.current;
    const scroller = root.current;
    if (!el || !scroller) return;
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), {
      root: scroller,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [target, root]);
  return gone;
}

// ─────────────────────────── media first ───────────────────────────

/** The project video in use, playing as the Feed plays it (the buyer page's MediaHero); else the
 *  cover, whose tap opens the build images full size (Use as cover lives there). Nothing when the
 *  project has no picture at all (hand-made products only). */
function ProjectHero() {
  const { project, view } = useProject();
  const { record } = useProjectVideos(project.id);
  const { jobs, now } = useVideoJobs();
  const status = projectVideoStatusOf({ products: view.products, videos: record, jobs, now });
  const take = status.video.state === "ready" ? status.video.take : null;
  const clip = useClipUrl(take?.id ?? null);
  const cover = coverOf(project, view.refs);
  const tiles = React.useMemo(() => mediaTilesOf(view.refs), [view.refs]);
  const [viewing, setViewing] = React.useState(false);

  if (take && clip.state === "ready" && clip.url) {
    return <MediaHero video={{ src: clip.url, alt: `${project.name} project video` }} picture={clip.posterUrl ?? cover} name={project.name} />;
  }
  if (!cover) return null;
  const frame = cn(MEDIA_GROUND, "relative block aspect-video w-full overflow-hidden rounded-xl");
  // eslint-disable-next-line @next/next/no-img-element -- the cover from the build store
  const img = <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />;
  return (
    <div className="px-8 pb-6">
      {tiles.length > 0 ? (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${project.name}, the cover. Open the images`}
          onClick={() => setViewing(true)}
          className={cn(frame, PRESSED_DIM, "outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
        >
          {img}
          {tiles.length > 1 && (
            <span aria-hidden className={cn(MEDIA_CHIP, "absolute bottom-4 right-4 min-h-[24px] px-3")}>
              <Icon icon={Image02Icon} size={12} />
              {Math.max(0, tiles.findIndex((t) => t.url === cover)) + 1} / {tiles.length}
            </span>
          )}
        </button>
      ) : (
        <div role="img" aria-label={`${project.name}, the cover`} className={frame}>
          {img}
        </div>
      )}
      {viewing && <BuildImagesViewer startUrl={cover} onClose={() => setViewing(false)} />}
    </div>
  );
}

// ─────────────────────────── the header ───────────────────────────

/** What the header and the tip both read: the header's words and what waits for the owner. */
function usePending() {
  const { view, viewer } = useProject();
  const { summary, canCtx } = view;
  const text = headerText(summary, { viewer, now: null, context: "project" });
  const owner = can(viewer, "facts.seeOwnerOnly");
  const review = text.pair.first?.kind === "review-version" && can(viewer, "product.add", canCtx) ? text.pair.first : null;
  const notices = owner ? pendingNoticesOf(view.pending, view.lineages, review ? (summary.pendingVersion?.buildId ?? null) : null) : [];
  return { text, owner, review, notices, canDescribe: owner && can(viewer, "project.editDescription", canCtx) };
}

function ProjectHeader({ titleRef }: { titleRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { project, view, open } = useProject();
  const { text, review, notices, canDescribe } = usePending();
  const { summary } = view;
  // One line under the name: the stage words and the count ("Built · 3 products"); the version
  // and the saved time are the Versions row's, "Now: …" the Activity row's.
  const stage = stageLineOf(view.engineering, summary).split(" · ");
  if (view.engineering.state !== "empty") stage.pop();

  return (
    <header className="flex flex-col gap-6 px-8 pb-12">
      <div className="flex flex-col gap-3">
        <h1 ref={titleRef} className={cn(T.title, "break-words")}>
          {project.name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <PhoneStatusChip status={summary.status} word={text.chip.word} shared={text.chip.badge !== null} />
          <p className={T.meta}>{stage.join(" · ")}</p>
        </div>
      </div>

      <Description text={project.description} onAdd={canDescribe ? () => open({ kind: "edit" }) : undefined} />

      {text.lockLine && (
        <Link
          href={phoneHrefOf(earnHref(project.id, "customers")) ?? "/m/projects"}
          className={cn(LIST_CARD, "flex-row items-center gap-4 px-8 py-6 outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle", PRESSED)}
        >
          <span aria-hidden className="shrink-0 text-[color:var(--color-icon-secondary)]">
            <Icon icon={InformationCircleIcon} size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={cn(T.body, "text-text-primary")}>{text.lockLine}</span>
            <span className={T.meta}>See the sale</span>
          </span>
          <Chevron />
        </Link>
      )}

      {notices.map((n) => {
        const href = n.action ? phoneHrefOf(n.action.href, project.id) : null;
        return (
          <Banner key={n.buildId} tone={n.tone} action={n.action && href ? <TapLink href={href}>{n.action.label}</TapLink> : undefined}>
            {n.text}
          </Banner>
        );
      })}
      {review && (
        <Link href={phoneHrefOf(review.href, project.id) ?? "#"} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
          {review.label}
        </Link>
      )}
    </header>
  );
}

/** 07o · the description tip, slim and after the products (one tip a screen, never first): a tap
 *  writes the description with AI, ✕ is Not now. It waits while a version is to review (05b). */
function DescriptionTip() {
  const { project, open } = useProject();
  const { setDescriptionHint } = useManualProjects();
  const { review, notices, canDescribe } = usePending();
  if (!canDescribe || !coachmarkDue(project) || review || notices.length > 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand bg-bg-brand-subtle">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => open({ kind: "edit", ai: true })}
        className={cn("flex min-w-0 flex-1 items-start gap-4 rounded-xl py-6 pl-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus", PRESSED)}
      >
        <span aria-hidden className="mt-[2px] shrink-0 text-[color:var(--color-icon-brand)]">
          <Icon icon={AiMagicIcon} size={20} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className={cn(T.body, "text-text-primary")}>{COACHMARK_TEXT}</span>
          <span className={cn(T.rowTitle, "text-text-brand")}>Update description</span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Not now"
        onClick={() => setDescriptionHint(project.id, { dismissedAt: Date.now(), productCount: productRowsOf(project).length })}
        className={cn("inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus", PRESSED)}
      >
        <Icon icon={Cancel01Icon} size={20} />
      </button>
    </div>
  );
}

/** The description, clamped to 3 lines with Show more (A03 Link SM) only when it is cut, or Add a
 *  description. The viewer's page (sample-project.tsx) shows another creator's the same way. */
export function Description({ text, onAdd }: { text: string; onAdd?: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const [clamps, setClamps] = React.useState(false);
  const ref = React.useRef<HTMLParagraphElement>(null);
  const id = React.useId();
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setClamps(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  if (!text.trim()) {
    return onAdd ? (
      <div>
        <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={PencilEdit01Icon} size={20} />} onClick={onAdd}>
          Add a description
        </Button>
      </div>
    ) : null;
  }
  return (
    <div className="flex flex-col gap-2">
      <p ref={ref} id={id} className={cn(T.body, "whitespace-pre-line break-words", !expanded && "line-clamp-3")}>
        {text}
      </p>
      {(clamps || expanded) && (
        <div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((v) => !v)}
            className={LINK_SM}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── the Bottom action bar (M4) ───────────────────────────

function ProjectBar() {
  const { project, view, viewer, brief, open } = useProject();
  const owner = can(viewer, "facts.seeOwnerOnly");
  const earnSource = React.useMemo(() => earnSourceOf(project, view, brief), [project, view, brief]);
  const ladder = useEarnFacts(earnSource);
  if (!owner) return null;
  const text = headerText(view.summary, { viewer, now: null, context: "project" });
  const reviewPending = text.pair.first?.kind === "review-version" && can(viewer, "product.add", view.canCtx);
  const earn = earnButtonOf({
    projectId: project.id,
    commercial: earnSource.commercial,
    soldSharePct: view.summary.customers.soldSharePct,
    facts: ladder.ready ? ladder.facts : null,
    reviewPending,
  });
  const publishOptions = view.lock === null ? publishOptionsOf(view.summary.status, brief?.state.mintedAt != null) : null;
  const bar = phoneBarOf({ publishOptions, earn, reviewPending });
  if (!bar) return null;
  const earnHrefPhone = phoneHrefOf(earn.href) ?? `/m/projects/${project.id}/earn`;
  if (bar.kind === "pair") {
    return (
      <BottomBar className="flex-row gap-6 pt-8">
        <Button
          hierarchy={bar.publishPrimary ? "primary" : "secondary"}
          size="xl"
          className="min-w-0 flex-1"
          iconLeading={<Icon icon={Rocket01Icon} size={20} />}
          onClick={() => open({ kind: "publish" })}
        >
          Publish
        </Button>
        <Link href={earnHrefPhone} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "min-w-0 flex-1")}>
          <Icon icon={Coins01Icon} size={20} />
          Earn
        </Link>
      </BottomBar>
    );
  }
  // Gone out: the live fact ("Listed", "Sold 40%") beside Earn, the screen's one primary — quiet
  // while a newer version waits for review, whose button is then the primary.
  return (
    <BottomBar className="flex-row items-center gap-6 pt-8">
      {bar.fact && <p className={cn(T.bodyStrong, "min-w-0 flex-1 break-words")}>{bar.fact}</p>}
      <Link
        href={earnHrefPhone}
        className={cn(buttonVariants({ hierarchy: reviewPending ? "secondary" : "primary", size: "xl" }), bar.fact ? "min-w-0 flex-1" : "w-full")}
      >
        <Icon icon={Coins01Icon} size={20} />
        Earn
      </Link>
    </BottomBar>
  );
}
