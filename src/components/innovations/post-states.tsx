"use client";

// The post page's frame and its other states (mockup States.dc.html):
// loading is a skeleton in the page's own shape, so nothing jumps when the
// post arrives; a post that isn't there says so and goes back to the feed.
// The product view shares both.

import * as React from "react";
import Link from "next/link";
import { News01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants, Skeleton, StateCard } from "@/components/ideeza";
import { PAGE_CONTAINER, PAGE_CONTENT } from "@/components/projects/details/frame";
import { cn } from "@/lib/utils";
import { FEED_HREF, TAP } from "./post-bits";

/** The page container and its content box (the project page's own), with room
 *  under it for the phone's action bar. */
export const POST_PAGE = PAGE_CONTAINER;
export const POST_CONTENT = cn(PAGE_CONTENT, "flex flex-col gap-10 max-md:pb-[104px]");

/** One column; from a 1024 px page container the story and a 320 px rail beside it. */
export const POST_COLUMNS =
  "flex flex-col gap-12 [@container(min-width:1024px)]:grid [@container(min-width:1024px)]:grid-cols-[minmax(0,1fr)_320px] [@container(min-width:1024px)]:items-start [@container(min-width:1024px)]:gap-x-16";

/** Shown beside the story only (the rail), or only in the one-column flow. */
export const WIDE_ONLY = "hidden [@container(min-width:1024px)]:flex";
export const NARROW_ONLY = "[@container(min-width:1024px)]:hidden";

export function PostSkeleton() {
  return (
    <div className={POST_PAGE}>
      <div className={POST_CONTENT} aria-busy="true">
        <span className="sr-only" role="status">
          Loading the post
        </span>
        <div className="flex items-center justify-between gap-6">
          <Skeleton shape="text" size="md" className="w-[220px]" />
          <Skeleton shape="block" className="size-[36px] rounded-lg" />
        </div>
        <div className={POST_COLUMNS}>
          <div className="flex min-w-0 flex-col gap-12">
            <div className="flex flex-col gap-6">
              <Skeleton shape="block" className="aspect-video h-auto w-full rounded-2xl" />
              <div className="flex gap-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} shape="block" className="aspect-[4/3] h-auto w-[96px] max-md:w-[64px]" />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Skeleton shape="text" size="lg" className="h-[28px] w-[52%]" />
              <Skeleton shape="text" size="md" className="w-[36%]" />
            </div>
            <Skeleton shape="block" className="h-[120px] w-full rounded-xl" />
          </div>
          <div className="flex min-w-0 flex-col gap-8">
            <Skeleton shape="block" className="h-[120px] w-full rounded-xl" />
            <Skeleton shape="block" className="h-[96px] w-full rounded-xl max-md:hidden" />
            <Skeleton shape="block" className="h-[200px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostProductSkeleton() {
  return (
    <div className={POST_PAGE}>
      <div className={POST_CONTENT} aria-busy="true">
        <span className="sr-only" role="status">
          Loading the product
        </span>
        <Skeleton shape="text" size="md" className="w-[300px] max-w-full" />
        <div className="flex items-start gap-8">
          <Skeleton shape="block" className="size-[88px] rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Skeleton shape="text" size="lg" className="h-[28px] w-[40%]" />
            <Skeleton shape="text" size="md" className="w-[30%]" />
            <Skeleton shape="text" size="md" className="w-[70%]" />
          </div>
        </div>
        <div className={POST_COLUMNS}>
          <div className="flex min-w-0 flex-col gap-8">
            <Skeleton shape="text" size="lg" className="h-[36px] w-full" />
            <Skeleton shape="block" className="h-[320px] w-full rounded-xl" />
          </div>
          <div className="flex min-w-0 flex-col gap-8">
            <Skeleton shape="block" className="h-[200px] w-full rounded-xl" />
            <Skeleton shape="block" className="h-[96px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** "We couldn't find this post" (or product), with the way back. */
export function PostMissing({
  title = "We couldn't find this post",
  body = "The link may be wrong, or the post was removed.",
  back = { label: "Back to Innovations", href: FEED_HREF },
}: {
  title?: string;
  body?: string;
  back?: { label: string; href: string };
}) {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className={POST_PAGE}>
      <div className={cn(PAGE_CONTENT, "flex justify-center")}>
        <StateCard
          tone="empty"
          icon={<Icon icon={News01Icon} size={32} />}
          title={title}
          body={body}
          titleAs="h1"
          titleRef={titleRef}
          action={
            <Link href={back.href} className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "hover:text-[color:var(--color-button-secondary-text)]", TAP)}>
              {back.label}
            </Link>
          }
        />
      </div>
    </div>
  );
}
