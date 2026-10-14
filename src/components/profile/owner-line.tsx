"use client";

// Your own profile's owner-only facts (spec 2026-10-14-creator-profile-design.md;
// owner moved them under Edit profile, 2026-10-14): how much of your work
// others can see, where the rest is, and who you follow. A short list in the
// identity column, beside your own controls, so the work column stays the
// work. Nothing else on the page differs between your view and everyone
// else's, so there is no "view as others" mode.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, LockIcon, UserMultipleIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

type IconDef = typeof ViewIcon;

const ROW = "flex min-h-[40px] w-full items-center gap-[10px] rounded-lg px-[8px] text-md leading-md max-md:min-h-[var(--touch-min)]";
const ACTION =
  "text-left text-text-primary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";

function Row({ icon, children, href, onClick }: { icon: IconDef; children: React.ReactNode; href?: string; onClick?: () => void }) {
  const body = (
    <>
      <Icon icon={icon} size={16} className="shrink-0 text-text-tertiary" />
      <span className="min-w-0 flex-1">{children}</span>
      {(href || onClick) && <Icon icon={ArrowRight01Icon} size={16} className="shrink-0 text-text-tertiary" />}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cn(ROW, ACTION)}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(ROW, ACTION)}>
        {body}
      </button>
    );
  }
  return <div className={cn(ROW, "text-text-secondary")}>{body}</div>;
}

export function OwnerFacts({
  shown,
  hidden,
  following,
  onFollowing,
}: {
  /** Projects others can see. */
  shown: number;
  /** Projects only you can see, in My projects. */
  hidden: number;
  /** How many creators you follow; null until the store is read. */
  following: number | null;
  onFollowing: () => void;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="-mx-[8px] flex flex-col gap-[4px]">
      <h2 id={id} className="px-[8px] text-sm font-semibold leading-sm text-text-tertiary">
        Only you see this
      </h2>
      <ul role="list" className="m-0 flex list-none flex-col p-0">
        <li>
          <Row icon={ViewIcon}>
            {shown > 0 ? `${shown} ${shown === 1 ? "project is" : "projects are"} public` : "Others see your name and nothing else yet"}
          </Row>
        </li>
        {hidden > 0 && (
          <li>
            <Row icon={LockIcon} href="/projects">
              {`${hidden} private in My projects`}
            </Row>
          </li>
        )}
        {following !== null && (
          <li>
            <Row icon={UserMultipleIcon} onClick={onFollowing}>
              {`You follow ${following}`}
            </Row>
          </li>
        )}
      </ul>
    </section>
  );
}
