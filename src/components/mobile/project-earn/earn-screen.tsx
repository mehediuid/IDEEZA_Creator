"use client";

// Earn on the phone (Figma "Project Details · 2026 update" 12–17; the web's
// /projects/[id]/earn, its words kept), as a native hub, not four tabs:
// · the hub (`/earn`): the top bar "Earn" (Back to the project; it takes the
//   project's name once the large title scrolls away; ⋯ holds Preview as
//   others see it and Sell copies of a product), the name once as the large
//   title with the one status pill from the commercial axis (`earnStatusOf`)
//   and the lock line once sold in full, then the summary, the rows Sell ·
//   Business plan · Money and the state's one action at the foot
//   (overview-tab.tsx);
// · a section (`/earn/sell`, `/earn/plan`, `/earn/money`): its own screen,
//   the top bar "‹ {Section}" (Back to the hub) with the section's ⋯, its
//   content and its one primary at the foot.
// A row opens its section in place: the address is pushed (pushState — no
// fetch, works offline) and Back pops it, so the hub comes back; a link or a
// reload opens the section's own address. A `#part` (`#copies`, `#customers`)
// is scrolled to once the section shows.
//
// Owner only (`canOpenEarn`): anyone else — a Feed sample included — gets
// "Only the owner can manage earning". Bones while the stores are read; an
// unknown address says the project isn't here. A write the browser refused
// says so under the top bar, as on the project screen (EARN-18, the web's
// Earn shell).

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bug01Icon, LockIcon, ShoppingBag01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { REPORT_PROBLEM, reportProblemHref } from "../help/report-link";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { commercialFactsOf, commercialStateOf } from "@/lib/commerce/state";
import type { EarnSection } from "@/lib/manual/earn-route";
import { canOpenEarn, earnNextOf } from "@/lib/manual/earn-view";
import { can, hasAudience } from "@/lib/manual/permissions";
import { PHONE_EARN_TABS, parsePhoneEarnSection, phoneEarnHref, phonePreviewHref } from "@/lib/manual/phone-earn";
import { sampleProjectOf } from "@/lib/manual/phone-project";
import { ActionSheet, type ActionSheetItem } from "../kit/sheet";
import { EmptyState, NotFoundState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { Screen } from "../screen";
import { MORE_ICON, TopBar, type TopBarAction } from "../top-bar";
import type { Ready } from "../project/context";
import { EarnProvider, type EarnCtx } from "./context";
import { EarnMoneyTab } from "./money-tab";
import { EarnHub } from "./overview-tab";
import { PhoneWalletScope } from "./phone-wallet";
import { EarnPlanTab } from "./plan-tab";
import { EarnSellTab } from "./sell-tab";

export function EarnScreen({ id, section }: { id: string; section: EarnSection }) {
  const data = useProjectPageData(id, "project");
  if (data.state === "loading") return <EarnLoading id={id} section={section} />;
  if (data.state === "missing") return <EarnMissing id={id} />;
  return <EarnReady data={data} section={section} />;
}

const LABEL: Record<EarnSection, string> = Object.fromEntries(PHONE_EARN_TABS.map((t) => [t.id, t.label])) as Record<EarnSection, string>;

function EarnLoading({ id, section }: { id: string; section: EarnSection }) {
  const hub = section === "overview";
  return (
    <Screen top={<TopBar back={hub ? `/m/projects/${encodeURIComponent(id)}` : phoneEarnHref(id)} title={hub ? "Earn" : LABEL[section]} />}>
      <div role="status" aria-label="Loading earning" className="flex flex-col gap-8 px-8 pb-8 pt-2">
        {hub && <Skeleton shape="text" size="lg" />}
        <Skeleton shape="block" className="h-[200px] w-full" />
        <Skeleton shape="block" className="h-[168px] w-full" />
      </div>
    </Screen>
  );
}

/** Someone else's project: only its owner manages earning. */
function OwnerOnly({ back, name }: { back: string; name: string }) {
  return (
    <Screen top={<TopBar back={back} title="Earn" />} className="px-8 pb-8">
      <EmptyState icon={LockIcon} title="Only the owner can manage earning" action={{ label: `Back to ${name}`, href: back }} />
    </Screen>
  );
}

function EarnMissing({ id }: { id: string }) {
  // A Feed sample exists; it just isn't yours.
  const sample = sampleProjectOf(id);
  if (sample) return <OwnerOnly back={`/m/projects/${encodeURIComponent(id)}`} name={sample.title} />;
  return (
    <Screen top={<TopBar back="/m/projects" title="Earn" />} className="px-8 pb-8">
      <NotFoundState thing="project" body="It may have been deleted, or it was made in another browser." action={{ label: "Go to My projects", href: "/m/projects" }} />
    </Screen>
  );
}

/** The section in the address (`…/earn` is the hub, `…/earn/<section>` the others). */
function sectionOfPath(pathname: string): EarnSection | null {
  const m = /\/earn(?:\/([a-z]+))?\/?$/.exec(pathname);
  if (!m) return null;
  return m[1] ? parsePhoneEarnSection(m[1]) : "overview";
}

/** The open section, read from the address; `open` pushes a section's address in place (no fetch). */
function useEarnSection(projectId: string, opened: EarnSection): [EarnSection, (section: EarnSection, hash?: string) => void] {
  const pathname = usePathname();
  const open = React.useCallback(
    (section: EarnSection, hash?: string) => {
      window.history.pushState(null, "", `${phoneEarnHref(projectId, section)}${hash ? `#${hash}` : ""}`);
    },
    [projectId],
  );
  return [sectionOfPath(pathname) ?? opened, open];
}

/** The hub's large title has scrolled away (the top bar then says the project's name). Watched
 *  again each time the hub shows, since its screen is a new one. */
function useTitleGone(ref: React.RefObject<HTMLElement | null>, section: EarnSection): boolean {
  const [gone, setGone] = React.useState<{ section: EarnSection; gone: boolean }>({ section, gone: false });
  React.useEffect(() => {
    const el = ref.current;
    const scroller = el?.closest(".overflow-y-auto");
    if (section !== "overview" || !el || !scroller) return;
    const io = new IntersectionObserver(
      ([e]) => setGone({ section, gone: !e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0) }),
      { root: scroller },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, section]);
  return gone.section === section && gone.gone;
}

function EarnReady({ data, section: opened }: { data: Ready; section: EarnSection }) {
  const { project, view, viewer, brief } = data;
  const router = useRouter();
  const [section, openSection] = useEarnSection(project.id, opened);
  const back = `/m/projects/${encodeURIComponent(project.id)}`;
  const commercial = commercialStateOf(commercialFactsOf(project, brief, { listing: view.listing, sales: view.sales }));
  const [live, setLive] = React.useState("");
  const announce = React.useCallback((message: string) => {
    setLive("");
    window.setTimeout(() => setLive(message), 50);
  }, []);
  const [footEl, setFootEl] = React.useState<HTMLElement | null>(null);
  const [topActions, setTopActions] = React.useState<TopBarAction[]>([]);
  const [menu, setMenu] = React.useState(false);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleGone = useTitleGone(titleRef, section);
  const ctx = React.useMemo<EarnCtx>(
    () => ({ ...data, commercial, announce, footEl, setTopActions, openSection }),
    [data, commercial, announce, footEl, openSection],
  );

  // A `#part` in the address is brought into view once its section shows.
  React.useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    // Before the mint a product's own row (`#editions-<product>`) isn't there: its copies section is.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => (document.getElementById(id) ?? (id.startsWith("editions-") ? document.getElementById("copies") : null))?.scrollIntoView({ block: "start" })),
    );
    return () => cancelAnimationFrame(raf);
  }, [section]);

  if (!canOpenEarn(viewer)) return <OwnerOnly back={back} name={project.name} />;

  const hub = section === "overview";
  const copiesOnSale = view.lock === null && view.editions.some((t) => t.listing !== null);
  const isLive = earnNextOf(project.id, commercial, copiesOnSale).point === null;
  const preview = commercial !== "none" && can(viewer, "preview.enter") && hasAudience(view.summary.status, view.summary.showcase);
  const hubItems: ActionSheetItem[] = [
    ...(preview ? [{ label: "Preview as others see it", icon: ViewIcon, onSelect: () => router.push(phonePreviewHref(project.id, "buyer")) }] : []),
    ...(isLive && commercial !== "given" ? [{ label: "Sell copies of a product", icon: ShoppingBag01Icon, onSelect: () => openSection("sell", "copies") }] : []),
    { label: REPORT_PROBLEM, icon: Bug01Icon, onSelect: () => router.push(reportProblemHref()) },
  ];
  const actions: TopBarAction[] = hub
    ? hubItems.length
      ? [{ icon: MORE_ICON, label: "More earning actions", onClick: () => setMenu(true) }]
      : []
    : topActions;

  return (
    <PhoneWalletScope>
      <EarnProvider value={ctx}>
        <Screen
          key={section}
          top={
            hub ? (
              <TopBar back={back} titleAs="p" title={titleGone ? project.name : "Earn"} actions={actions} />
            ) : (
              <TopBar back={phoneEarnHref(project.id)} title={LABEL[section]} actions={actions} />
            )
          }
          footer={<div ref={setFootEl} />}
        >
          <OfflineBanner />
          <StorageErrorBanner className="mx-8 mb-6" />
          <div className={hub ? "px-8 pb-12 pt-2" : "px-8 pb-12 pt-4"}>
            {hub && <EarnHub titleRef={titleRef} />}
            {section === "sell" && <EarnSellTab />}
            {section === "plan" && <EarnPlanTab />}
            {section === "money" && <EarnMoneyTab />}
          </div>
          <p aria-live="polite" className="sr-only">
            {live}
          </p>
        </Screen>
        {hub && <ActionSheet open={menu} onClose={() => setMenu(false)} title="Earn" items={hubItems} />}
      </EarnProvider>
    </PhoneWalletScope>
  );
}
