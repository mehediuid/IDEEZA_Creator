"use client";

// Earn on the phone (Figma "Project Details · 2026 update" 12–17; the web's
// /projects/[id]/earn at 375 px, its words kept): the top bar "Earn" with Back
// to the project; the project's name with the one status pill from the
// commercial axis (`earnStatusOf`), the lock line once sold in full and, once
// there is something to see, the link "Preview as others see it" (the web
// header's words); the tabs Overview · Sell · Business plan · Money (the kit's
// MobileTabs). A tab is client state: a tap swaps the panel at once and puts
// the tab's own address in place (replaceState — no fetch, works offline, no
// Back step), so a reload or a link still opens that tab.
//
// Owner only (`canOpenEarn`): anyone else — a Feed sample included — gets
// "Only the owner can manage earning". Bones while the stores are read; an
// unknown address says the project isn't here.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { commercialFactsOf, commercialStateOf } from "@/lib/commerce/state";
import type { EarnSection } from "@/lib/manual/earn-route";
import { canOpenEarn, earnStatusOf } from "@/lib/manual/earn-view";
import { labelOf } from "@/lib/manual/journey";
import { can, hasAudience } from "@/lib/manual/permissions";
import { PHONE_EARN_TABS, parsePhoneEarnSection, phoneEarnHref, phonePreviewHref } from "@/lib/manual/phone-earn";
import { sampleProjectOf } from "@/lib/manual/phone-project";
import { headerText } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import { EmptyState, NotFoundState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { MobileTabs, tabPanelProps } from "../kit/tabs";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import type { Ready } from "../project/context";
import { EarnProvider, type EarnCtx } from "./context";
import { EarnMoneyTab } from "./money-tab";
import { EarnOverviewTab } from "./overview-tab";
import { PhoneWalletScope } from "./phone-wallet";
import { EarnPlanTab } from "./plan-tab";
import { EarnSellTab } from "./sell-tab";
import { T } from "../type";

export function EarnScreen({ id, section }: { id: string; section: EarnSection }) {
  const data = useProjectPageData(id, "project");
  if (data.state === "loading") return <EarnLoading id={id} />;
  if (data.state === "missing") return <EarnMissing id={id} />;
  return <EarnReady data={data} section={section} />;
}

function EarnLoading({ id }: { id: string }) {
  return (
    <Screen top={<TopBar back={`/m/projects/${encodeURIComponent(id)}`} title="Earn" />}>
      <div role="status" aria-label="Loading earning" className="flex flex-col gap-6 px-8 pb-8">
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[40px] w-full" />
        <Skeleton shape="block" className="h-[240px] w-full" />
        <Skeleton shape="block" className="h-[120px] w-full" />
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

const TAB_IDS = PHONE_EARN_TABS.map((t) => ({ value: t.id, label: t.label }));

/** The tab in the address (`…/earn` is the Overview, `…/earn/<section>` the others). */
function sectionOfPath(pathname: string): EarnSection | null {
  const m = /\/earn(?:\/([a-z]+))?\/?$/.exec(pathname);
  if (!m) return null;
  return m[1] ? parsePhoneEarnSection(m[1]) : "overview";
}

/** Earn's tab as client state: shown at once, its address put in place by replaceState (no fetch). */
function useEarnTab(projectId: string, opened: EarnSection): [EarnSection, (value: EarnSection) => void] {
  const pathname = usePathname();
  const [picked, setPicked] = React.useState<EarnSection | null>(null);
  const [seen, setSeen] = React.useState(pathname);
  if (pathname !== seen) {
    setSeen(pathname);
    setPicked(null);
  }
  const set = React.useCallback(
    (value: EarnSection) => {
      setPicked(value);
      window.history.replaceState(null, "", phoneEarnHref(projectId, value));
    },
    [projectId],
  );
  return [picked ?? sectionOfPath(pathname) ?? opened, set];
}

function EarnReady({ data, section: opened }: { data: Ready; section: EarnSection }) {
  const { project, view, viewer, brief } = data;
  const [section, setSection] = useEarnTab(project.id, opened);
  const back = `/m/projects/${encodeURIComponent(project.id)}`;
  const commercial = commercialStateOf(commercialFactsOf(project, brief, { listing: view.listing, sales: view.sales }));
  const [live, setLive] = React.useState("");
  const announce = React.useCallback((message: string) => {
    setLive("");
    window.setTimeout(() => setLive(message), 50);
  }, []);
  const ctx = React.useMemo<EarnCtx>(() => ({ ...data, commercial, announce }), [data, commercial, announce]);

  if (!canOpenEarn(viewer)) return <OwnerOnly back={back} name={project.name} />;

  const status = earnStatusOf(commercial);
  const text = headerText(view.summary, { viewer, now: { label: labelOf(view.current) } });
  const preview = commercial !== "none" && can(viewer, "preview.enter") && hasAudience(view.summary.status, view.summary.showcase);

  return (
    <PhoneWalletScope>
      <EarnProvider value={ctx}>
        <Screen
          top={
            <>
              <TopBar back={back} title="Earn" />
              <div className="flex flex-col gap-2 px-8 pb-6">
                <div className="flex min-w-0 items-center gap-4">
                  <p className={cn(T.rowTitle, "min-w-0 truncate")}>{project.name}</p>
                  <Badge tone={status.tone} className="shrink-0">
                    {status.word}
                  </Badge>
                </div>
                {text.lockLine && (
                  <p className={cn(T.meta, "flex items-start gap-2 text-text-primary")}>
                    <span aria-hidden className="mt-1 text-[color:var(--color-icon-secondary)]">
                      <Icon icon={LockIcon} size={14} />
                    </span>
                    {text.lockLine}
                  </p>
                )}
                {preview && (
                  <Link
                    href={phonePreviewHref(project.id, "buyer")}
                    className={cn(T.rowTitle, "-my-3 inline-flex min-h-[44px] items-center self-start text-text-brand outline-none hover:underline focus-visible:underline")}
                  >
                    Preview as others see it
                  </Link>
                )}
              </div>
              <MobileTabs label="Earn" idBase="earn" width="hug" className="px-8" tabs={TAB_IDS} value={section} onChange={setSection} />
            </>
          }
        >
          <OfflineBanner />
          <div {...tabPanelProps("earn", section)} className="px-8 pb-12 pt-8 outline-none">
            {section === "overview" && <EarnOverviewTab />}
            {section === "sell" && <EarnSellTab />}
            {section === "plan" && <EarnPlanTab />}
            {section === "money" && <EarnMoneyTab />}
          </div>
          <p aria-live="polite" className="sr-only">
            {live}
          </p>
        </Screen>
      </EarnProvider>
    </PhoneWalletScope>
  );
}

