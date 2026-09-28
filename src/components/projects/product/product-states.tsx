"use client";

// The product page's states around its content: the loading shape (COR-2),
// "This product isn't in {project}" (COR-30), the note for a product no build
// stands behind (COR-24's words), and the buyer-preview banner (PPL-5). An
// unknown project is the project page's own ProjectNotFound (COR-1).

import * as React from "react";
import Link from "next/link";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, StateCard, buttonVariants } from "@/components/ideeza";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { cn } from "@/lib/utils";
import { PAGE_CONTAINER, PAGE_CONTENT } from "../details/frame";

function Bone({ className }: { className: string }) {
  return <span aria-hidden className={cn("block rounded-md bg-bg-subtle motion-safe:animate-pulse", className)} />;
}

/** The page's final shape while the two stores hydrate — crumbs, the h1 and
 *  its meta, the identity row, the tab strip, a panel — so no state flashes a
 *  not-found before its read completes. Also the Suspense fallback. */
export function ProductLoading() {
  return (
    <div className={PAGE_CONTAINER}>
      <div role="status" aria-label="Loading product" className={cn(PAGE_CONTENT, "flex flex-col gap-10")}>
        <Bone className="h-[16px] w-[240px] max-w-full" />
        <div className="flex flex-col gap-4">
          <Bone className="h-[32px] w-[320px] max-w-full" />
          <Bone className="h-[16px] w-[420px] max-w-full" />
        </div>
        <div className="grid gap-8 [@container(min-width:640px)]:grid-cols-[240px_minmax(0,1fr)] [@container(min-width:640px)]:gap-12">
          <Bone className="aspect-[16/10] w-full [@container(min-width:640px)]:aspect-[4/3]" />
          <div className="flex flex-col gap-4">
            <Bone className="h-[16px] w-full" />
            <Bone className="h-[16px] w-4/5" />
            <Bone className="h-[16px] w-3/5" />
          </div>
        </div>
        <Bone className="h-[36px] w-full" />
        <Bone className="h-[320px] w-full" />
      </div>
    </div>
  );
}

/** The project is here, but none of its products has this id (COR-30). The
 *  card is the whole page, so its title is the h1 route focus lands on. */
export function ProductMissing({ projectName, href }: { projectName: string; href: string }) {
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [href]);
  return (
    <div className={PAGE_CONTAINER}>
      <div className="flex justify-center px-8 py-40">
        <StateCard
          tone="empty"
          titleAs="h1"
          titleRef={titleRef}
          icon={<Icon icon={HelpCircleIcon} size={32} />}
          title={`This product isn't in ${projectName}`}
          body="Its link doesn't match any product saved in this project — it may have come from another browser."
          action={
            <Link
              href={href}
              className={cn(
                buttonVariants({ hierarchy: "secondary", size: "lg" }),
                "hover:text-[color:var(--color-button-secondary-text)]",
              )}
            >
              Back to the project
            </Link>
          }
        />
      </div>
    </div>
  );
}

const UNBUILT: Record<Exclude<ProjectProduct["state"], "built">, string> = {
  "build-gone": "Its build isn't in this browser any more.",
  unmatched: "Its build can't be matched to this name.",
  hand: "Made by hand — its work is in the editor.",
};

/** A product no build stands behind has no version and no deliverables — the
 *  card's own words say why (COR-24), where the tabs would be. */
export function UnbuiltNote({ state }: { state: ProjectProduct["state"] }) {
  if (state === "built") return null;
  return (
    <p className="rounded-xl border border-dashed border-border px-10 py-12 text-center text-md text-text-secondary">
      {UNBUILT[state]}
    </p>
  );
}

/** PPL-5 — the preview's banner, sticky at the top of the content, with the
 *  way out. The preview carries through from the project page (COR-37). */
export function PreviewBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="sticky top-0 z-sticky flex flex-col gap-4 bg-bg-page py-4 [@container(min-width:560px)]:flex-row [@container(min-width:560px)]:items-center">
      <Banner tone="info" title="Previewing as a buyer" className="min-w-0 flex-1">
        This is your page without your editing controls. Nothing is published — it&apos;s saved only in this browser.
      </Banner>
      <Button
        hierarchy="secondary"
        size="md"
        onClick={onExit}
        className="shrink-0 [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
      >
        Exit preview
      </Button>
    </div>
  );
}
