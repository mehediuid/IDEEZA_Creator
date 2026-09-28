"use client";

// The product page's states around its content: the loading shape (COR-2),
// "This product isn't in {project}" (COR-30, the unknown product), the lock
// line of a project sold in full (§3.8.5), and the source line of a product
// no build stands behind (P2-EDITOR-9's table). An unknown project is the
// project page's own ProjectNotFound (COR-1). The preview banners (PPL-5) are
// the project page's, shared rather than this page's own.

import * as React from "react";
import Link from "next/link";
import { HelpCircleIcon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { cn } from "@/lib/utils";
import { PAGE_CONTAINER, PAGE_CONTENT } from "../details/frame";

function Bone({ className }: { className: string }) {
  return <span aria-hidden className={cn("block rounded-md bg-bg-subtle motion-safe:animate-pulse", className)} />;
}

/** The page's final shape while the stores hydrate — crumbs, the h1 and
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

/** A product no build stands behind has no version and no pieces: one line under
 *  the header says why, in the card's own words (COR-24, P2-EDITOR-9). Its page
 *  still has Media, Contributors and Customers. */
export function UnbuiltNote({ state }: { state: ProjectProduct["state"] }) {
  if (state === "built") return null;
  return <p className="text-md text-text-secondary">{UNBUILT[state]}</p>;
}

/** §3.8.5's owner line on a project sold in full, under the status line of both pages:
 *  everything is read-only, so the product page has no Open in editor and no Editor block. */
export function LockLine({ line }: { line: string }) {
  return (
    <p className="flex min-w-0 items-start gap-3 text-md font-medium text-text-primary">
      <span aria-hidden className="inline-flex pt-[2px] text-text-secondary">
        <Icon icon={LockIcon} size={16} />
      </span>
      <span className="min-w-0">{line}</span>
    </p>
  );
}
