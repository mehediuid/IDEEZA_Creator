"use client";

// What an Innovations post's product view shares with the product page in its
// "post" context (a post of this browser's own project, plan §6): the locked
// pieces' panel (D2), the product switcher, the way back to the post's
// comments, and the rail's "Open to everyone" and "Questions" blocks.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, Comment01Icon, SquareLock02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { RailBlock } from "@/components/projects/details/rail-block";
import { postHref, postProductHref } from "@/lib/innovations/slug";
import { ME_ID, type InnovationPost } from "@/lib/innovations/types";
import { cn } from "@/lib/utils";
import { TAP } from "./post-bits";

export type LockedId = "pcb" | "code" | "wiring";

const LOCKED: Record<LockedId, { title: string; includes: string[] }> = {
  pcb: {
    title: "PCB files come with a copy",
    includes: ["The schematic, converted into a board layout", "The board's bill of materials", "The fab profile it was laid out for"],
  },
  code: {
    title: "Firmware comes with a copy",
    includes: ["The source code, fully commented", "The library list, pinned to versions", "The map from the code to the board's pins"],
  },
  wiring: {
    title: "Wiring comes with a copy",
    includes: ["The netlist and a pin-to-pin table", "Wire colours, harness lengths and connector pinouts", "A continuity test checklist"],
  },
};

export const isLockedPiece = (t: string): t is LockedId => t === "pcb" || t === "code" || t === "wiring";

/** The post's other products, each its own page. */
export function ProductSwitcher({ post, current }: { post: InnovationPost; current: string }) {
  return (
    <nav aria-label="Products in this post" className="max-w-full overflow-x-auto">
      <ul role="list" className="inline-flex overflow-hidden rounded-lg border border-solid border-border">
        {post.products.map((p, i) => {
          const on = p.id === current;
          return (
            <li key={p.id} className={cn(i > 0 && "border-l border-solid border-border")}>
              <Link
                href={postProductHref(post.slug, p.id)}
                aria-current={on ? "page" : undefined}
                replace
                scroll={false}
                className={cn(
                  "inline-flex min-h-[36px] items-center whitespace-nowrap px-7 text-md font-semibold leading-md outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus motion-reduce:transition-none",
                  TAP,
                  on ? "bg-bg-brand-subtle text-text-brand" : "bg-bg-surface text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                )}
              >
                {p.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A piece that comes with a copy (D2): what a copy includes and where to get one, never the files. */
export function LockedPiecePanel({ post, kind }: { post: InnovationPost; kind: LockedId }) {
  const id = React.useId();
  const copy = LOCKED[kind];
  const who = post.creator.id === ME_ID ? "You share" : `${post.creator.name.split(" ")[0] || post.creator.name} shares`;
  const listing = post.listing;
  return (
    <section aria-labelledby={id} className="flex flex-col items-start gap-6 rounded-xl border border-dashed border-border-strong bg-bg-surface p-16 max-md:p-8">
      <span aria-hidden className="inline-flex size-[44px] items-center justify-center rounded-xl bg-bg-brand-subtle text-text-brand">
        <Icon icon={SquareLock02Icon} size={22} />
      </span>
      <h2 id={id} className="text-xl font-bold leading-xl text-text-primary">
        {copy.title}
      </h2>
      <p className="max-w-[62ch] text-md leading-relaxed text-text-secondary">
        {who} the PCB, firmware and wiring with people who get a copy. The 3D model, parts list and specs stay open to everyone.
      </p>
      <div className="flex flex-col gap-2">
        <p className="text-md font-semibold leading-md text-text-primary">A copy includes</p>
        <ul className="flex list-disc flex-col gap-2 pl-8 text-md leading-relaxed text-text-secondary marker:text-text-tertiary">
          {copy.includes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      {listing ? (
        <>
          <Link href={listing.href} className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "hover:text-[color:var(--color-button-secondary-text)]", TAP)}>
            Get a copy on Marketplace
            <Icon icon={ArrowRight01Icon} size={16} />
          </Link>
          <dl className="grid grid-cols-[minmax(0,auto)_auto] gap-x-8 gap-y-2 text-sm leading-sm">
            {listing.rows.map((r) => (
              <React.Fragment key={`${r.label}:${r.price}`}>
                <dt className="text-text-secondary">{r.label}</dt>
                <dd className="font-semibold tabular-nums text-text-primary">{r.price}</dd>
              </React.Fragment>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-md font-semibold leading-md text-text-secondary">Not for sale right now.</p>
      )}
    </section>
  );
}

export function commentsOnPostLabel(comments: number | null): string {
  return comments === null ? "Comments on the post" : comments === 0 ? "Comment on the post" : `${comments} ${comments === 1 ? "comment" : "comments"} on the post`;
}

/** Above the product header: the post's other products, and the way to its comments (they are per post). */
export function PostProductLinks({ post, productId, comments }: { post: InnovationPost; productId: string; comments: number | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
      {post.products.length > 1 && <ProductSwitcher post={post} current={productId} />}
      <Link
        href={`${postHref(post.slug)}#comments`}
        className={cn(
          "ml-auto inline-flex items-center gap-3 rounded-sm text-md font-semibold leading-md text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus",
          TAP,
        )}
      >
        <Icon icon={Comment01Icon} size={16} />
        {commentsOnPostLabel(comments)}
      </Link>
    </div>
  );
}

/** The product page's rail blocks in the "post" context, in its own rail idiom (no card in a card). */
export function PostRailBlocks({ post, productName, comments }: { post: InnovationPost; productName: string; comments: number | null }) {
  return (
    <>
      <RailBlock title="Open to everyone">
        <ul role="list" className="flex flex-col gap-4 text-md leading-md">
          <li className="flex items-start gap-4 text-text-primary">
            <span aria-hidden className="mt-1 text-text-success">
              <Icon icon={Tick02Icon} size={16} strokeWidth={2} />
            </span>
            Media, 3D model, parts list and specs
          </li>
          <li className="flex items-start gap-4 text-text-secondary">
            <span aria-hidden className="mt-1">
              <Icon icon={SquareLock02Icon} size={16} />
            </span>
            PCB, firmware and wiring come with a copy
          </li>
        </ul>
      </RailBlock>
      <RailBlock title="Questions">
        <Link
          href={`${postHref(post.slug)}#comments`}
          className="group flex items-center gap-6 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-md font-semibold leading-md text-text-primary group-hover:underline">Ask about {productName} on the post</span>
            {comments ? <span className="text-sm leading-sm text-text-secondary">{`${comments} ${comments === 1 ? "comment" : "comments"} so far.`}</span> : null}
          </span>
          <span aria-hidden className="shrink-0 text-text-tertiary">
            <Icon icon={ArrowRight01Icon} size={18} />
          </span>
        </Link>
      </RailBlock>
    </>
  );
}
