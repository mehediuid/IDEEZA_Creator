"use client";

// The phone's project page (Figma "Project Details · 2026 update" 01–01b,
// 20a–20d; owner decisions M1–M6). The same project as the web's
// /projects/[id], read through the web's one derivation
// (`useProjectPageData`), placed for a phone:
// · the top bar: Back to My projects and ⋯ (07); the project's name comes into
//   the bar once the header scrolls away (01b);
// · the header: the name and its status chip, the stage line with its version
//   (opens Versions), the meta line, the lock line once sold in full, the
//   description clamped to 3 lines (Show more), or Add a description; the
//   description coachmark (07o); a newer version's notice (05b / 05c);
// · the tabs Overview · Products · Media · Activity (the kit's MobileTabs),
//   pinned under the top bar while the page scrolls; a tab is client state kept
//   in `?tab=` (no navigation), so Back and a reload keep it. The web's
//   `?tab=team|network|versions` opens that screen of its own instead;
// · the Bottom action bar fixed to the foot (M4): Publish + Earn while there is
//   a way to publish, else Earn alone with its live fact (20b).
// Loading shows bones under the bar with no ⋯ (20c); an address that matches no
// project says so, with Back to My projects (20d, the kit's not-found state),
// on this page and on every screen under it. A write the browser refused
// (storage full) says so under the top bar, as the web does.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight01Icon,
  Coins01Icon,
  InformationCircleIcon,
  PencilEdit01Icon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { earnSourceOf, useEarnFacts } from "@/components/projects/earn/ladder/use-earn-facts";
import { coachmarkDue, COACHMARK_TEXT } from "@/components/projects/details/description-coachmark";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { postIdOfProject } from "@/lib/innovations/slug";
import { earnHref, publishOptionsOf } from "@/lib/manual/earn-route";
import { earnButtonOf } from "@/lib/manual/earn-view";
import { labelOf } from "@/lib/manual/journey";
import { can } from "@/lib/manual/permissions";
import { engineeringMetaOf, pendingNoticesOf, stageLineOf } from "@/lib/manual/project-header";
import { headerText } from "@/lib/manual/project-summary";
import { productRowsOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import {
  PHONE_TABS,
  phoneBarOf,
  phoneHrefOf,
  phoneProjectPath,
  phoneSubScreenOf,
  sampleProjectOf,
  type PhoneTab,
} from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { NotFoundState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { Screen } from "../screen";
import { MORE_ICON, TopBar } from "../top-bar";
import { T } from "../type";
import { ActivityTab } from "./activity-tab";
import { ProjectProvider, useProject, type ProjectSheet, type Ready } from "./context";
import { MediaTab } from "./media-tab";
import { OverviewTab } from "./overview";
import { LINK_SM, PhoneStatusChip, SharedChip, TapLink } from "./parts";
import { ProductsTab } from "./products-tab";
import { SampleProject } from "./sample-project";
import { ProjectSheets } from "./sheets";
import { usePhoneWriteGate } from "./write-gate";

const TAB_IDS = PHONE_TABS.map((t) => t.id);
const TABS = PHONE_TABS.map((t) => ({ value: t.id, label: t.label }));

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

/** 20c · Loading project: the bar and the header's shape, no ⋯ yet. */
export function ProjectLoading() {
  return (
    <Screen top={<TopBar back="/m/projects" />}>
      <div role="status" aria-label="Loading project" className="flex flex-col gap-6 px-8 pb-8">
        <Skeleton shape="text" size="lg" />
        <Skeleton shape="text" size="md" />
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[60px] w-full" />
        <Skeleton shape="block" className="h-[40px] w-full" />
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
  const router = useRouter();
  const { project } = data;
  const [tab, setTab] = useTabParam<PhoneTab>("tab", TAB_IDS, "overview");
  const gate = usePhoneWriteGate(project.id);
  const [sheet, setSheet] = React.useState<ProjectSheet | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleGone = useScrolledPast(titleRef, scrollRef);

  // A new tab starts at its top, under the pinned tabs, when the page was scrolled past the header.
  const goTab = (t: PhoneTab) => {
    const scroller = scrollRef.current;
    const tabs = tabsRef.current;
    if (scroller && tabs && scroller.scrollTop > tabs.offsetTop) scroller.scrollTop = tabs.offsetTop;
    setTab(t);
  };

  // An in-page link to a tab ("See all" → Products, the Activity card) switches it in place too.
  const onTabLink = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const url = new URL(a.href, window.location.href);
    if (url.pathname !== window.location.pathname) return;
    const next = url.searchParams.get("tab") ?? "overview";
    if (!(TAB_IDS as readonly string[]).includes(next)) return;
    e.preventDefault();
    goTab(next as PhoneTab);
  };

  const ctx = { ...data, gate, open: setSheet };
  const viewPost = () => router.push(`/m/clip/${encodeURIComponent(postIdOfProject(project.id))}`);
  const owner = can(data.viewer, "facts.seeOwnerOnly");
  return (
    <ProjectProvider value={ctx}>
      <Screen
        top={
          <TopBar
            back="/m/projects"
            title={titleGone ? project.name : undefined}
            actions={owner ? [{ icon: MORE_ICON, label: "Project actions", onClick: () => setSheet({ kind: "menu" }) }] : []}
          />
        }
        footer={<ProjectBar />}
      >
        <ScrollHost scrollRef={scrollRef}>
          <OfflineBanner />
          <StorageErrorBanner className="mx-8 mb-6" />
          <ProjectHeader titleRef={titleRef} onViewPost={viewPost} />
          <div ref={tabsRef} className="sticky top-0 z-10 bg-bg-page">
            <MobileTabs label="Project" idBase="project" tabs={TABS} value={tab} onChange={goTab} />
          </div>
          <div {...tabPanelProps("project", tab)} onClick={onTabLink} className="px-8 pb-12 pt-8 outline-none">
            {tab === "overview" && <OverviewTab />}
            {tab === "products" && <ProductsTab />}
            {tab === "media" && <MediaTab />}
            {tab === "activity" && <ActivityTab />}
          </div>
        </ScrollHost>
      </Screen>
      <ProjectSheets sheet={sheet} onSheet={setSheet} />
      {gate.sheet}
    </ProjectProvider>
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

// ─────────────────────────── the header ───────────────────────────

function ProjectHeader({ titleRef, onViewPost }: { titleRef: React.RefObject<HTMLHeadingElement | null>; onViewPost: () => void }) {
  const { project, view, viewer, open } = useProject();
  const { setDescriptionHint } = useManualProjects();
  const { summary, canCtx } = view;
  const text = headerText(summary, { viewer, now: null, context: "project" });
  const owner = can(viewer, "facts.seeOwnerOnly");
  const canDescribe = owner && can(viewer, "project.editDescription", canCtx);

  const stage = stageLineOf(view.engineering, summary).split(" · ");
  const version = view.engineering.state === "empty" ? null : stage.pop() ?? null;
  const meta = engineeringMetaOf(summary, { label: labelOf(view.current) })
    .map((m) => (m.kind === "time" ? m.time.text : m.text))
    .join(" · ");

  const review = text.pair.first?.kind === "review-version" && can(viewer, "product.add", canCtx) ? text.pair.first : null;
  const notices = owner ? pendingNoticesOf(view.pending, view.lineages, review ? (summary.pendingVersion?.buildId ?? null) : null) : [];

  return (
    <header className="flex flex-col gap-6 px-8 pb-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 ref={titleRef} className={cn(T.title, "min-w-0 break-words")}>
              {project.name}
            </h1>
            <PhoneStatusChip status={summary.status} word={text.chip.word} />
          </div>
          {text.chip.badge && (
            <div className="flex">
              <SharedChip onOpen={owner ? onViewPost : undefined} />
            </div>
          )}
          <p className={cn(T.meta, "flex flex-wrap items-center gap-2")}>
            <span>
              {stage.join(" · ")}
              {version ? " ·" : ""}
            </span>
            {version && (
              <Link
                href={phoneProjectPath(project.id, "versions")}
                aria-label={`${version}, open Versions`}
                className={LINK_SM}
              >
                {version}
                <Icon icon={ArrowRight01Icon} size={14} />
              </Link>
            )}
          </p>
        </div>
        <p className={T.meta}>{meta}</p>
      </div>

      {text.lockLine && (
        <div className="flex flex-col gap-2">
          <p className={cn(T.body, "flex items-start gap-2 text-text-primary")}>
            <span aria-hidden className="mt-1 text-[color:var(--color-icon-secondary)]">
              <Icon icon={InformationCircleIcon} size={14} />
            </span>
            {text.lockLine}
          </p>
          <div className="pl-8">
            <TapLink href={phoneHrefOf(earnHref(project.id, "customers")) ?? "/m/projects"}>See the sale</TapLink>
          </div>
        </div>
      )}

      <Description text={project.description} onAdd={canDescribe ? () => open({ kind: "edit" }) : undefined} />

      {/* One thing at a time above the tabs: a version to review comes first, the description
          hint once that is handled (05b before 07o). */}
      {canDescribe && coachmarkDue(project) && !review && notices.length === 0 && (
        <div className="flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand bg-bg-brand-subtle p-6">
          <p className={cn(T.body, "text-text-primary")}>{COACHMARK_TEXT}</p>
          <div className="flex gap-4">
            <Button hierarchy="secondary" size="lg" onClick={() => open({ kind: "edit", ai: true })}>
              Update description
            </Button>
            <Button
              hierarchy="ghost"
              size="lg"
              onClick={() => setDescriptionHint(project.id, { dismissedAt: Date.now(), productCount: productRowsOf(project).length })}
            >
              Not now
            </Button>
          </div>
        </div>
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
  const earnLink = (
    <Link
      href={earnHrefPhone}
      className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full min-w-0 flex-1")}
    >
      <Icon icon={Coins01Icon} size={20} />
      Earn
    </Link>
  );
  return (
    <BottomBar className={bar.kind === "pair" ? "flex-row gap-6 pt-8" : "gap-2 pt-8"}>
      {bar.kind === "pair" ? (
        <>
          <Button
            hierarchy={bar.publishPrimary ? "primary" : "secondary"}
            size="xl"
            className="min-w-0 flex-1"
            iconLeading={<Icon icon={Rocket01Icon} size={20} />}
            onClick={() => open({ kind: "publish" })}
          >
            Publish
          </Button>
          {earnLink}
        </>
      ) : (
        <>
          {earnLink}
          {bar.fact && <p className={T.meta}>{bar.fact}</p>}
        </>
      )}
    </BottomBar>
  );
}

