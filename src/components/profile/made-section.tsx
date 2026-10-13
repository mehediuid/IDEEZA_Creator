"use client";

// A profile's Made section (spec 2026-10-14-creator-profile-design.md): the
// projects already public, as one grid of cards that each open the project's
// public page. On your own profile a card's ⋯ pins it to the top (three at
// most). Empty: your own says what shows here and offers Share a project;
// someone else's says they haven't shared one yet.

import * as React from "react";
import Link from "next/link";
import { CpuIcon, Folder01Icon, MoreHorizontalIcon, PinIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, StateCard } from "@/components/ideeza";
import { MenuButton } from "@/components/messages/menu";
import { ageOf } from "@/lib/manual/journey";
import type { MadeItem } from "@/lib/people/made";
import { PINS_MAX } from "@/lib/people/fields";

const SALE_WORD = { whole: "For sale", copies: "Copies for sale" } as const;

function MadeCard({
  item,
  now,
  own,
  onTogglePin,
}: {
  item: MadeItem;
  now: number;
  own: boolean;
  onTogglePin?: (item: MadeItem) => void;
}) {
  const age = item.stageAt !== null ? ageOf(item.stageAt, now) : null;
  return (
    <li className="relative min-w-0">
      <Link
        href={item.href}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-solid border-border bg-bg-surface outline-none transition-colors duration-normal ease-out hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
      >
        <span className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-bg-subtle text-text-tertiary">
          {item.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Icon icon={CpuIcon} size={28} />
          )}
          {item.pinned && (
            <span className="absolute left-[8px] top-[8px]">
              <Badge tone="neutral" icon={<Icon icon={PinIcon} size={12} />} className="bg-bg-surface">
                Pinned
              </Badge>
            </span>
          )}
        </span>
        <span className="flex flex-col gap-[6px] px-[12px] pb-[14px] pt-[12px]">
          <span className="truncate text-lg font-semibold leading-lg text-text-primary group-hover:underline group-hover:underline-offset-[3px]">
            {item.title}
          </span>
          <span className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px]">
            {item.stage && <Badge tone="neutral">{item.stage}</Badge>}
            {age && <span className="text-sm leading-sm text-text-tertiary">{age}</span>}
            {item.sale && <Badge tone="brand-outline" className="px-[6px] py-[1px] text-xs">{SALE_WORD[item.sale]}</Badge>}
          </span>
        </span>
      </Link>
      {own && item.projectId && onTogglePin && (
        <span className="absolute right-[8px] top-[8px]">
          <MenuButton
            label={`Actions for ${item.title}`}
            align="end"
            trigger={<Icon icon={MoreHorizontalIcon} size={18} />}
            className="size-[32px] rounded-lg border border-solid border-border bg-bg-surface text-text-secondary hover:bg-bg-subtle"
            items={[
              {
                id: "pin",
                label: item.pinned ? "Unpin" : "Pin to top",
                onSelect: () => onTogglePin(item),
              },
            ]}
          />
        </span>
      )}
    </li>
  );
}

export function MadeSection({
  items,
  now,
  own,
  ownerName,
  onTogglePin,
  pinNotice,
}: {
  items: readonly MadeItem[];
  now: number;
  own: boolean;
  /** For someone else's empty state: "{name} hasn't shared a project yet." */
  ownerName: string;
  onTogglePin?: (item: MadeItem) => void;
  /** A refused pin or write, said once under the heading. */
  pinNotice?: string | null;
}) {
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-[16px]">
      <div className="flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px] border-b border-solid border-border pb-[8px]">
        <h2 id={headingId} className="text-xl font-semibold leading-xl text-text-primary">
          Made
        </h2>
        {items.length > 0 && (
          <span className="text-sm leading-sm text-text-tertiary">
            {own ? `Pin up to ${PINS_MAX} from a card's menu` : `${items.length} ${items.length === 1 ? "project" : "projects"}`}
          </span>
        )}
      </div>
      {pinNotice && (
        <p role="status" className="text-md leading-md text-text-secondary">
          {pinNotice}
        </p>
      )}
      {items.length > 0 ? (
        <ul role="list" className="m-0 grid list-none grid-cols-1 gap-[24px] p-0 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
          {items.map((item) => (
            <MadeCard key={item.key} item={item} now={now} own={own} onTogglePin={onTogglePin} />
          ))}
        </ul>
      ) : own ? (
        <StateCard
          tone="empty"
          icon={<Icon icon={Folder01Icon} size={36} />}
          title="Nothing shared yet"
          body="Projects you share to Innovations or put on sale show here. Everything else stays private."
          action={
            <Link
              href="/projects"
              className="inline-flex h-[36px] items-center justify-center rounded-md bg-[var(--color-button-primary-bg)] px-[12px] text-sm font-semibold text-[color:var(--color-button-primary-text)] outline-none hover:bg-[var(--color-button-primary-bg-hover)] focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
            >
              Share a project
            </Link>
          }
          className="w-full"
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border px-[24px] py-[32px] text-center text-md leading-md text-text-secondary">
          {`${ownerName} hasn't shared a project yet.`}
        </p>
      )}
    </section>
  );
}
