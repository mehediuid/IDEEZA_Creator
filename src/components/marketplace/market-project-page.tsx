"use client";

// MarketProjectPage — /marketplace/[id], the buyer view (Phase 2 spec §2.4;
// P2-MARKETPLACE-8 as changed). The project page's own shell and reads:
// `useProjectPageData(id, "market")` — every store the page needs, then the
// one derivation, with the viewer `{ kind: "demo-buyer", buyerId }` from the
// active demo buyer — and ProjectShell with MARKET_SLOTS, the breadcrumb
// "Explore marketplace › {project}" and the title "{project} · Explore
// marketplace · IDEEZA".
//
// Three states, as on the project page: the skeleton until every store is
// read (COR-2); "This project isn't on the marketplace" for an address that
// matches nothing or a project that has never had a listing, so a private
// project never leaks through a typed URL; else the shell.

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Store01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { marketDocTitle, parseProjectTab } from "@/lib/manual/project-route";
import { PAGE_CONTAINER } from "@/components/projects/details/frame";
import { ProjectSkeleton } from "@/components/projects/details/page-states";
import { ProjectShell } from "@/components/projects/details/shell";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { cn } from "@/lib/utils";
import { MARKET_SLOTS } from "./market-slots";

export function MarketProjectPage({ id }: { id: string }) {
  // useSearchParams needs a boundary so the route can still be pre-rendered.
  return (
    <React.Suspense fallback={<ProjectSkeleton />}>
      <MarketProjectInner id={id} />
    </React.Suspense>
  );
}

function MarketProjectInner({ id }: { id: string }) {
  const search = useSearchParams();
  const data = useProjectPageData(id, "market");
  if (data.state === "loading") return <ProjectSkeleton />;
  if (data.state === "missing") return <NotOnMarketplace id={id} />;
  return (
    <ProjectShell
      project={data.project}
      view={data.view}
      viewer={data.viewer}
      brief={data.brief}
      now={data.now}
      asked={parseProjectTab(search.get("tab"))}
      networkReadable={data.networkReadable}
      slots={MARKET_SLOTS}
      trail={[{ label: "Explore marketplace", href: "/marketplace" }, { label: data.project.name }]}
      docTitle={marketDocTitle(data.project.name)}
    />
  );
}

/** Nothing listed at this address. Its title is the page's h1, which route focus lands on (COR-7). */
export function NotOnMarketplace({ id }: { id: string }) {
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [id]);
  return (
    <div className={PAGE_CONTAINER}>
      <div className="flex justify-center px-8 py-40">
        <StateCard
          tone="empty"
          titleAs="h1"
          titleRef={titleRef}
          icon={<Icon icon={Store01Icon} size={32} />}
          title="This project isn't on the marketplace"
          body="Only a project its creator added to Explore marketplace opens here. It may never have been listed, or it was listed in a different browser."
          action={
            <Link
              href="/marketplace"
              className={cn(
                buttonVariants({ hierarchy: "primary", size: "lg" }),
                "hover:text-[color:var(--color-button-primary-text)]",
              )}
            >
              Back to Explore marketplace
            </Link>
          }
        />
      </div>
    </div>
  );
}
