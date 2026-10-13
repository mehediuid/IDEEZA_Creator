"use client";

// A profile's cover and identity column (owner picked the Portfolio
// direction, then asked for a cover, 2026-10-14): who the creator is, at a
// glance. The cover runs across the page; the photo sits over its lower edge. The head (photo, name,
// headline, where and since when, and on someone else's profile how you are
// connected), the actions, what they are open to, four counts read from their
// shared work, and About. The second half (Built with, Works on, Links) sits
// under it on a wide page and after the work on a narrow one, so a phone
// reaches the projects first.

import * as React from "react";
import { ArrowUpRight01Icon, Calendar03Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Badge, Tag } from "@/components/ideeza";
import { cn } from "@/lib/utils";

/** "June 2025". */
function monthYearLong(at: number): string {
  return new Date(at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const META = "flex items-start gap-[8px] text-md leading-md text-text-secondary";

/** The band across the top: the creator's cover, else their featured project's picture, else a
 *  quiet brand tint, so it is never an empty frame. `action` (your own profile) sits on it. */
export function CoverBand({ src, action }: { src: string | null; action?: React.ReactNode }) {
  return (
    <div className="relative h-[140px] overflow-hidden rounded-2xl bg-bg-brand-subtle [@container(min-width:640px)_and_(max-width:999.98px)]:h-[200px] [@container(min-width:1000px)]:h-[240px]">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {action && <div className="absolute bottom-[12px] right-[12px]">{action}</div>}
    </div>
  );
}

export function IdentityHead({
  titleRef,
  avatar,
  name,
  latinName,
  headline,
  demo,
  location,
  localTime,
  since,
  relation,
  phoneMenu,
}: {
  titleRef?: React.Ref<HTMLHeadingElement>;
  avatar: { initials: string; color: string | null; src: string | null };
  name: string;
  latinName: string | null;
  /** The headline, or on your own empty profile a link that opens Edit profile. */
  headline: React.ReactNode;
  /** A demo person (everyone but you, until there are accounts). */
  demo: boolean;
  location: string | null;
  /** "9:40 pm" where they are. */
  localTime: string | null;
  since: number | null;
  /** How you are connected to them; only you see it, since it is about you. */
  relation: string | null;
  /** At phone width the actions move to a bottom bar; ⋯ stays here, by the name. */
  phoneMenu?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      {/* The photo rises over the cover's lower edge, ringed in the page colour; at phone width ⋯
          sits beside it, just under the cover. */}
      <div className="flex items-start gap-[16px]">
        <Avatar
          size="xl"
          initials={avatar.initials}
          color={avatar.color ?? undefined}
          src={avatar.src ?? undefined}
          className="-mt-[48px] shrink-0 ring-4 ring-bg-page"
        />
        {phoneMenu && <div className="ml-auto md:hidden">{phoneMenu}</div>}
      </div>
      <div className="flex flex-col gap-[4px]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[4px]">
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="min-w-0 break-words text-4xl font-bold leading-4xl tracking-tight text-text-primary outline-none [text-wrap:balance]"
          >
            {name}
          </h1>
          {demo && <Badge tone="neutral">Demo creator</Badge>}
        </div>
        {latinName && <p className="text-sm leading-sm text-text-tertiary">{latinName}</p>}
        {headline && <div className="mt-[4px] text-lg leading-lg text-text-secondary [text-wrap:pretty]">{headline}</div>}
      </div>
      {(location || since !== null || relation) && (
        <div className="flex flex-col gap-[8px]">
          {location && (
            <p className={META}>
              <Icon icon={Location01Icon} size={16} className="mt-[2px] shrink-0 text-text-tertiary" />
              <span>
                {location}
                {localTime && <span className="tabular-nums">{` · ${localTime} there`}</span>}
              </span>
            </p>
          )}
          {since !== null && (
            <p className={META}>
              <Icon icon={Calendar03Icon} size={16} className="mt-[2px] shrink-0 text-text-tertiary" />
              {`Building on IDEEZA since ${monthYearLong(since)}`}
            </p>
          )}
          {relation && (
            <p className="flex items-center gap-[8px] text-md font-semibold leading-md text-text-primary">
              <span aria-hidden className="size-[8px] shrink-0 rounded-full bg-bg-brand" />
              {relation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** "Open to collaboration and questions": a statement, not a control. */
export function OpenToLine({ words }: { words: string }) {
  return (
    <p className="flex items-center gap-[8px] rounded-lg bg-bg-success-subtle px-[12px] py-[10px] text-md font-semibold leading-md text-text-success">
      <span aria-hidden className="size-[8px] shrink-0 rounded-full bg-bg-success" />
      {words}
    </p>
  );
}

/** 1 234 → "1.2k". */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
}

export function StatList({ stats }: { stats: readonly { label: string; value: number }[] }) {
  if (!stats.length) return null;
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-[12px] gap-y-[16px] border-y border-solid border-border py-[16px] [@container(min-width:520px)_and_(max-width:999.98px)]:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col-reverse gap-[2px]">
          <dt className="text-sm leading-sm text-text-tertiary">{s.label}</dt>
          <dd className="m-0 text-xl font-bold leading-xl tabular-nums text-text-primary">{compact(s.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SideSection({
  title,
  note,
  children,
}: {
  title: string;
  /** One quiet line under the heading: where the section's facts come from. */
  note?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-[12px]">
      <div className="flex flex-col gap-[2px]">
        <h2 id={id} className="text-lg font-semibold leading-lg text-text-primary">
          {title}
        </h2>
        {note && <p className="text-sm leading-sm text-text-tertiary">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export function ChipRow({ chips, mono = false }: { chips: readonly string[]; mono?: boolean }) {
  return (
    <ul role="list" className="m-0 flex list-none flex-wrap gap-[8px] p-0">
      {chips.map((c) => (
        <li key={c}>
          <Tag size="md" className={cn(mono && "font-mono")}>
            {c}
          </Tag>
        </li>
      ))}
    </ul>
  );
}

/** "naimrahman.dev" from "https://naimrahman.dev/". */
function hostPathOf(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

export function LinkList({ links }: { links: readonly string[] }) {
  return (
    <ul role="list" className="m-0 flex list-none flex-col gap-[8px] p-0">
      {links.map((href) => (
        <li key={href} className="min-w-0">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="inline-flex max-w-full items-center gap-[4px] text-md font-semibold leading-md text-text-link underline-offset-[3px] outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <span className="truncate">{hostPathOf(href)}</span>
            <Icon icon={ArrowUpRight01Icon} size={16} className="shrink-0" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
