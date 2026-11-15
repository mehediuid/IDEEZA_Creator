"use client";

// The product page's states around its content (Product Details 10v–10wb,
// 32a–32b): loading (the page's shape under the bar, "Loading product"),
// offline while loading (the saved copy is shown once it is read), a read
// that never finishes ("We couldn't load this product" + Try again), the
// product that isn't in its project, the project that isn't here, and — on
// the marketplace — a project that isn't on it, or is off it for now.

import * as React from "react";
import Link from "next/link";
import { HelpCircleIcon, Store01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { buttonVariants } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { StateCard } from "@/components/ideeza/state-card";
import { cn } from "@/lib/utils";
import { ErrorState, NotFoundState } from "../kit/state";
import { useOnline } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";

/** How long a read may take before the page says it couldn't load (10wb). */
const STUCK_MS = 10_000;

/** 10w · Loading product; 10wa offline; 10wb couldn't load. */
export function ProductLoading() {
  const online = useOnline();
  const [stuck, setStuck] = React.useState(false);
  React.useEffect(() => {
    const t = window.setTimeout(() => setStuck(true), STUCK_MS);
    return () => window.clearTimeout(t);
  }, []);
  if (stuck && online) {
    return (
      <Screen top={<TopBar back />} className="px-8 pb-8">
        <ErrorState title="We couldn’t load this product" body="Check your connection and try again." action={{ label: "Try again", onClick: () => window.location.reload() }} />
      </Screen>
    );
  }
  return (
    <Screen top={<TopBar back />}>
      <div className="flex flex-col gap-6 px-8 pb-8">
        {!online && (
          <Banner tone="attention" title="You’re offline">
            Showing what was saved on this phone. It updates when you’re back online.
          </Banner>
        )}
        <div role="status" aria-label="Loading product" className="flex flex-col gap-6">
          <Skeleton shape="text" size="sm" />
          <Skeleton shape="text" size="lg" />
          <Skeleton shape="text" size="md" />
          <Skeleton shape="block" className="h-[60px] w-full" />
          <div className="flex gap-4">
            <Skeleton shape="block" className="h-[28px] w-[88px]" />
            <Skeleton shape="block" className="h-[28px] w-[72px]" />
          </div>
          <Skeleton shape="block" className="h-[40px] w-full" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} shape="block" className="h-[72px] w-full" />
          ))}
        </div>
      </div>
    </Screen>
  );
}

/** The card is the page: Back in the bar, and the card's title is the screen's one h1. */
function CardScreen({ back = true, children }: { back?: string | true; children: React.ReactNode }) {
  return (
    <Screen top={<TopBar back={back} />} className="px-8 pb-8">
      {children}
    </Screen>
  );
}

/** 10v · Product not found (KIT-ER-04's card). */
export function ProductMissing({ projectName, back }: { projectName: string; back: string }) {
  return (
    <CardScreen back={back}>
      <NotFoundState
        thing="product"
        body={`Its link doesn’t match any product in ${projectName}. It may have been removed.`}
        action={{ label: "Back to the project", href: back }}
      />
    </CardScreen>
  );
}

/** An address that matches no project in this browser (the project page's 20d). */
export function ProjectMissing() {
  return (
    <CardScreen back="/m/projects">
      <NotFoundState thing="project" body="It may have been deleted, or it was made in another browser." action={{ label: "Back to My projects", href: "/m/projects" }} />
    </CardScreen>
  );
}

/** A piece the build doesn't have, or one this viewer can't open (10v's card on a piece screen). */
export function PieceMissing({ title, body, back }: { title: string; body: string; back: string }) {
  return (
    <StateCard
      phone
      tone="empty"
      className="w-full"
      icon={<Icon icon={HelpCircleIcon} size={32} />}
      title={title}
      body={body}
      action={
        <Link href={back} replace className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "border-solid")}>
          Back to Build
        </Link>
      }
    />
  );
}

/** 32a · not on the marketplace; 32b · off it for now (its creator paused it). The phone's
 *  marketplace items live on the Feed, so that is where Back goes. */
export function OffMarket({ paused }: { paused: boolean }) {
  return (
    <CardScreen>
      <StateCard
        phone
        tone="empty"
        className="w-full"
        titleAs="h1"
        icon={<Icon icon={paused ? HelpCircleIcon : Store01Icon} size={32} />}
        title={paused ? "This project is off the marketplace for now" : "This project isn’t on the marketplace"}
        body={
          paused
            ? "Its creator paused the listing to make changes. It can’t be bought until they relist it, and then it’s back here."
            : "This page shows only projects their creator added to Explore marketplace. This one may never have been listed, or its creator took it off."
        }
        action={
          <Link href="/m" className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "border-solid")}>
            Back to the Feed
          </Link>
        }
      />
    </CardScreen>
  );
}
