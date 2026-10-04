"use client";

// A paused listing is off Explore marketplace (P2-LISTING-13): the owner's
// Paused card tells them buyers can't see or buy it, so its address says the
// same — "This project is off the marketplace for now" — instead of showing
// the project. A demo buyer who already holds part of it still gets the page:
// what they bought, and its files, stay theirs.
//
// Wraps /marketplace/[id] and its product pages; anything but a paused
// listing renders the page as it is.

import * as React from "react";
import Link from "next/link";
import { PauseIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { PAGE_CONTAINER } from "@/components/projects/details/frame";
import { ProjectSkeleton } from "@/components/projects/details/page-states";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { resolveProject } from "@/lib/manual/project-route";
import { useManualProjects } from "@/lib/manual/projects";
import { listingViewOf } from "@/lib/market/listing";
import { useMarket } from "@/lib/market/market-store";
import type { ListingMetadata } from "@/lib/market/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";

// Only the listing's kind is read here, not the paused diff.
const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };

export function OffMarketGate({ id, children }: { id: string; children: React.ReactNode }) {
  const { hydrated, projects } = useManualProjects();
  const { hydrated: marketHydrated, data } = useMarket();
  const { buyer } = useActiveBuyer();
  const now = useMinuteClock();
  if (!hydrated || !marketHydrated) return <ProjectSkeleton />;
  const project = resolveProject(projects, id);
  if (!project) return <>{children}</>;
  const listing = listingViewOf(project.id, { ...data, now, current: NO_METADATA });
  const holds = data.sales.some((s) => s.projectId === project.id && s.buyerId === buyer.id);
  if (listing.kind !== "paused" || holds) return <>{children}</>;
  return <OffMarket id={id} />;
}

/** Its title is the page's h1, which route focus lands on (COR-7). */
function OffMarket({ id }: { id: string }) {
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
          icon={<Icon icon={PauseIcon} size={32} />}
          title="This project is off the marketplace for now"
          body="Its creator paused the listing to make changes. It can't be bought until they relist it, and then it's back here."
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
