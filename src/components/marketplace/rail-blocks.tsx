"use client";

// The rail blocks every Explore marketplace details page shares (owner,
// 2026-11-24: "some pages give the rail as separate cut-out boxes, some flat
// together — why? keep the information the same way everywhere"). One rail
// on every page — a sample's, a listing of this browser's, and their product
// pages: the project page's one surface with hairlines between blocks
// (frame.tsx RAIL_SURFACE, COR-54), never a card per block, in one order:
//   Marketplace (the buy box) → Creator → On Innovations → the page's facts
//   (a project's About and Recent, a product's Specs and Build check).
// Creator and On Innovations are drawn here once, so no page words or lays
// them out its own way:
// - Creator: the avatar, the name (a link to the profile) and how many
//   projects they have on Innovations, then the way to them — Follow and
//   Message for another creator, Ask the creator / Get creator support on a
//   listing of this browser's (the creator is you, so there is no Follow).
// - On Innovations: while the project is shared there, its appreciations and
//   comments and "Read the story" — the conversation's one home is the post.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { AvatarLabelGroup, Badge, buttonVariants } from "@/components/ideeza";
import { MessageCreator, useMessageRefusal } from "@/components/newsfeed/creator-row";
import { FollowButton } from "@/components/profile/person-actions";
import { PersonName } from "@/components/profile/person-name";
import { makerLineOf, useMakerPostCount } from "@/components/innovations/post-rail";
import { RailBlock } from "@/components/projects/details/rail-block";
import { canonicalId } from "@/lib/people/ids";
import { ME_ID, type InnovationPost } from "@/lib/innovations/types";
import { cn } from "@/lib/utils";

/** Every button in the Creator block: the rail's width, 44 px tall. */
export const RAIL_BUTTON = "h-[44px] w-full";

export function CreatorBlock({
  initials,
  color,
  name,
  supporting,
  actions,
  note,
}: {
  initials: string;
  color: string;
  name: React.ReactNode;
  supporting: string;
  /** One or two buttons; two sit side by side. */
  actions: React.ReactNode[];
  /** Why a button can't be used, under them. */
  note?: React.ReactNode;
}) {
  const shown = actions.filter(Boolean);
  return (
    <RailBlock title="Creator" collapsible={false}>
      <div className="flex flex-col gap-6">
        <AvatarLabelGroup size="md" initials={initials} color={color} name={name} supporting={supporting} />
        {shown.length > 0 && (
          <div className={cn("grid gap-4", shown.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {shown.map((a, i) => (
              <React.Fragment key={i}>{a}</React.Fragment>
            ))}
          </div>
        )}
        {note}
      </div>
    </RailBlock>
  );
}

/** Another creator's sample: Follow and Message, as on its Innovations post. */
export function SampleCreatorBlock({ post }: { post: InnovationPost }) {
  const maker = post.creator;
  const count = useMakerPostCount(maker.id);
  const refusal = useMessageRefusal(maker);
  const reasonId = React.useId();
  const own = maker.id === ME_ID;
  return (
    <CreatorBlock
      initials={maker.initials}
      color={maker.color}
      name={
        <span className="inline-flex min-w-0 items-center gap-3">
          <PersonName id={maker.id} from="innovations" className="truncate">
            {maker.name}
          </PersonName>
          {maker.pro && <Badge tone="neutral">Pro</Badge>}
        </span>
      }
      supporting={makerLineOf(count)}
      actions={
        own
          ? []
          : [
              <FollowButton
                key="follow"
                person={{ id: canonicalId(maker.id, "innovations"), kind: "feed", name: maker.name }}
                hierarchy="secondary"
                size="md"
                className={RAIL_BUTTON}
              />,
              <MessageCreator key="message" creator={maker} slug={post.slug} refusal={refusal} reasonId={reasonId} className={RAIL_BUTTON} />,
            ]
      }
      note={
        refusal && !own ? (
          <p id={reasonId} className="m-0 text-md leading-md text-text-secondary">
            {refusal}
          </p>
        ) : null
      }
    />
  );
}

export function OnInnovationsBlock({
  title,
  href,
  appreciations,
  comments,
}: {
  /** The project's name. */
  title: string;
  /** Its Innovations post. */
  href: string;
  appreciations: number;
  comments: number;
}) {
  const counts = `${appreciations} ${appreciations === 1 ? "appreciation" : "appreciations"} · ${comments} ${comments === 1 ? "comment" : "comments"}`;
  return (
    <RailBlock title="On Innovations" meta={counts}>
      <div className="flex flex-col gap-6">
        <p className="m-0 text-md text-text-secondary">
          <span className="tabular-nums">{counts}</span>
          <br />
          The creator&apos;s story and the conversation about {title} are on its Innovations post.
        </p>
        <Link
          href={href}
          className={cn(
            buttonVariants({ hierarchy: "secondary", size: "lg" }),
            "h-[44px] w-full gap-2 hover:text-[color:var(--color-button-secondary-text)]",
          )}
        >
          Read the story
          <Icon icon={ArrowRight01Icon} size={16} />
        </Link>
      </div>
    </RailBlock>
  );
}
