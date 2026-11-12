"use client";

// /m/projects/<id>/earn/mint — the mint on the phone (Figma 13–13l, 08c, 08d;
// the web's mint page): it waits until every store it reads is in, then
//  · no project → "We couldn't find this project";
//  · a project minted from its page, without a Brief → "{name} is already
//    minted" with Open Sell (the web's `useBriefOpens` rule);
//  · otherwise the flow (mint-flow.tsx), in the browser only (it reads the
//    stored draft as it opens), signing through the phone's wallet sheet.

import * as React from "react";
import dynamic from "next/dynamic";
import { NoteRemoveIcon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useBriefOpens } from "@/components/brief/use-brief-opens";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { commercialFactsOf, commercialStateOf } from "@/lib/commerce/state";
import { phoneEarnHref } from "@/lib/manual/phone-earn";
import { useMarket } from "@/lib/market/market-store";
import { EmptyState, NotFoundState } from "../../kit/state";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";
import { EarnProvider, type EarnCtx } from "../context";
import { PhoneWalletScope } from "../phone-wallet";
import type { Ready } from "../../project/context";

const MintFlow = dynamic(() => import("./mint-flow").then((m) => m.MintFlow), { ssr: false, loading: () => <MintLoading /> });

export function MintScreen({ id }: { id: string }) {
  const data = useProjectPageData(id, "project");
  const market = useMarket();
  const project = data.state === "ready" ? data.project : null;
  const opens = useBriefOpens(project);
  if (data.state === "loading" || !market.hydrated) return <MintLoading />;
  if (data.state === "missing") return <MintMissing />;
  if (opens === undefined) return <MintLoading />;
  if (!opens) return <AlreadyMinted name={data.project.name} projectId={data.project.id} />;
  return <MintReady data={data} />;
}

function MintReady({ data }: { data: Ready }) {
  const { project, view, brief } = data;
  const commercial = commercialStateOf(commercialFactsOf(project, brief, { listing: view.listing, sales: view.sales }));
  const ctx = React.useMemo<EarnCtx>(() => ({ ...data, commercial, announce: () => {} }), [data, commercial]);
  return (
    <PhoneWalletScope>
      <EarnProvider value={ctx}>
        <MintFlow key={project.id} projectId={project.id} />
      </EarnProvider>
    </PhoneWalletScope>
  );
}

export function MintLoading() {
  return (
    <Screen top={<TopBar back title="Mint" />}>
      <div role="status" aria-label="Loading the mint flow" className="flex flex-col gap-6 px-8 pb-8">
        <Skeleton shape="text" size="md" />
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[68px] w-full" />
        <Skeleton shape="block" className="h-[68px] w-full" />
        <Skeleton shape="block" className="h-[240px] w-full" />
      </div>
    </Screen>
  );
}

function MintMissing() {
  return (
    <Screen top={<TopBar back="/m/projects" title="Mint" />} className="px-8 pb-8">
      <NotFoundState thing="project" body="It may have been deleted, or it was made in another browser." action={{ label: "Go to My projects", href: "/m/projects" }} />
    </Screen>
  );
}

function AlreadyMinted({ name, projectId }: { name: string; projectId: string }) {
  return (
    <Screen top={<TopBar back={phoneEarnHref(projectId)} title="Mint" />} className="px-8 pb-8">
      <EmptyState
        icon={NoteRemoveIcon}
        title={`${name} is already minted`}
        body="It was minted from its page, so there's no mint flow to open. Its proof and its sale are in Earn › Sell."
        action={{ label: "Open Sell", href: phoneEarnHref(projectId, "sell") }}
      />
    </Screen>
  );
}
