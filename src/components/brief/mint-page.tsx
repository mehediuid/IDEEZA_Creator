"use client";

// /projects/<id>/earn/mint — the mint flow's page (Build and Earn P1-2). It
// holds the flow until every store it reads is in (projects, marketplace),
// then:
// - no project → the project page's own not-found state;
// - a project minted without a Brief (from its page) → says so and links to
//   Earn › Project NFT, never an editable Choose on a minted, perhaps locked,
//   project (R2-8, `useBriefOpens`);
// - otherwise the flow: a draft's next step, or a minted Brief's read-only
//   success step.
// The old addresses (/project/<slug>/brief, /build/<id>/brief) redirect here.

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { NoteRemoveIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { ProjectNotFound } from "@/components/projects/details/page-states";
import { earnHref } from "@/lib/manual/earn-route";
import { useManualProjects } from "@/lib/manual/projects";
import { useMarket } from "@/lib/market/market-store";
import { cn } from "@/lib/utils";
import { useBriefOpens } from "./use-brief-opens";

// The flow reads localStorage on mount, so it is a client-only tree.
const BriefApp = dynamic(() => import("./brief-app").then((m) => m.BriefApp), {
  ssr: false,
  loading: () => <MintSkeleton />,
});

export function MintPage({ id }: { id: string }) {
  const { hydrated, projects } = useManualProjects();
  const market = useMarket();
  const ready = hydrated && market.hydrated;
  const project = ready ? (projects.find((p) => p.id === id) ?? null) : null;
  const opens = useBriefOpens(project);

  React.useEffect(() => {
    if (project) document.title = `Mint · ${project.name} · IDEEZA`;
  }, [project]);

  if (!ready) return <MintSkeleton />;
  if (!project) return <ProjectNotFound id={id} />;
  if (opens === undefined) return <MintSkeleton />;
  if (!opens) return <NoBrief name={project.name} href={earnHref(project.id, "sell")} />;
  return <BriefApp key={project.id} projectId={project.id} />;
}

/** The flow's own shape while it loads — the step line and the card. */
function MintSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading the mint flow"
      className="flex min-h-full w-full flex-col items-center gap-6 px-[16px] pb-[48px] pt-[24px] motion-safe:animate-pulse md:px-[32px] md:pb-[64px] md:pt-[40px]"
    >
      <span className="sr-only">Loading the mint flow</span>
      <div className="h-[14px] w-full max-w-[600px] rounded bg-bg-subtle" />
      <div className="h-[420px] w-full max-w-[600px] rounded-2xl bg-bg-subtle" />
    </div>
  );
}

function NoBrief({ name, href }: { name: string; href: string }) {
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="flex justify-center px-[16px] py-[48px] md:py-[80px]">
      <StateCard
        tone="empty"
        titleAs="h1"
        titleRef={titleRef}
        icon={<Icon icon={NoteRemoveIcon} size={32} />}
        title={`${name} is already minted`}
        body="It was minted from its page, so there's no mint flow to open. Its proof and its sale are in Earn › Project NFT."
        action={
          <Link
            href={href}
            className={cn(
              buttonVariants({ hierarchy: "secondary", size: "lg" }),
              "no-underline hover:text-[color:var(--color-button-secondary-text)] [@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]",
            )}
          >
            Open Project NFT
          </Link>
        }
      />
    </div>
  );
}
