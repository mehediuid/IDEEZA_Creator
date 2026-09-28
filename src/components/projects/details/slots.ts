// The project page's slots (spec §5.3, §5.5). The shell (./shell.tsx) owns the
// frame every state shares: the breadcrumb, the layout, route focus, the title,
// the tab strip and its URL, and the rail's order. Each section of the page is
// a component plugged in through ProjectSlots, in project-page.tsx's SLOTS.
// Every slot renders from the same SlotProps, so the owner's page and Preview
// as buyer are one tree and can't drift apart (PPL-2).

import type * as React from "react";
import type { StoredDraft } from "@/lib/brief/project-brief";
import type { Viewer } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import type { ManualProject } from "@/lib/manual/projects";
import type { NextAction } from "@/lib/manual/project-summary";

/** What every slot is rendered with. */
export type SlotProps = {
  project: ManualProject;
  /** The one derivation (COR-74): refs, lineages, products, versions, pending,
   *  log, summary and commerce. No slot derives project state of its own. */
  view: ProjectView;
  /** Who is looking (PPL-1). Owner-only controls ask can(viewer, …); in Preview
   *  as buyer they are absent, not disabled (PPL-6). */
  viewer: Viewer;
  /** The project's Brief draft, already read: the page shows its skeleton
   *  until it is (COR-2). */
  brief: StoredDraft | null;
  /** The minute clock `view` was derived at. */
  now: number;
  /** Says `message` in the page's one polite live region (COR-101): a rename,
   *  showcasing, a save. */
  announce: (message: string) => void;
};

/** The header also gets the h1's ref. Put it on the h1 with tabIndex={-1} and
 *  outline-none; the shell focuses it on arrival (COR-7). */
export type HeaderSlotProps = SlotProps & {
  titleRef: React.RefObject<HTMLHeadingElement | null>;
};

/** A tab panel's body. The shell draws the tabpanel element around it (and its
 *  20 px under the strip); a panel starts with its own h2 (COR-99) and never
 *  renders role="tabpanel" itself. */
export type PanelSlot = React.ComponentType<SlotProps>;

/** The rail's blocks, in order (COR-54; Phase 2 spec §2.2, §3.10). The v1
 *  `editor` block moves to the product page (decision 7). */
export const RAIL_ORDER = ["marketplace", "outcome", "details", "legal", "versions", "log", "manage"] as const;
export type RailBlockId = (typeof RAIL_ORDER)[number];

/** The header's "Add to marketplace" / "List another share" (§3.6.3): the
 *  header renders `slots.actions["add-to-marketplace"]` in the pair's place,
 *  with the pair's tone and the header's button class (T22). */
export type ActionSlotProps = SlotProps & {
  action: Extract<NextAction, { kind: "add-to-marketplace" }>;
  violet: boolean;
  className: string;
};

/** The page's composition (§3.10). Every Phase 2 key is optional, so a page
 *  without it still compiles; tasks add their entries at the merge points. */
export type ProjectSlots = {
  /** v1: first in the content, above the breadcrumb — the Preview-as-buyer banner (PPL-5). */
  banner?: React.ComponentType<SlotProps>;
  /** Each returns null unless it applies (buyer, contributor, demo buyer). */
  banners?: React.ComponentType<SlotProps>[];
  /** Above the tab strip: SAVE's "Saved to My projects". */
  notice?: React.ComponentType<SlotProps>;
  /** Everything between the breadcrumb and the tab strip (COR-8…18, CNT-1…7). */
  header: React.ComponentType<HeaderSlotProps>;
  /** Parts the header renders in its rows: the title row (Activity, Business plan chips),
   *  the status row (Utility NFT pill) and after the description (its coachmark). */
  headerParts?: {
    titleRow?: React.ComponentType<SlotProps>[];
    statusRow?: React.ComponentType<SlotProps>[];
    afterDescription?: React.ComponentType<SlotProps>[];
  };
  actions?: { "add-to-marketplace"?: React.ComponentType<ActionSlotProps> };
  /** One panel per tab (COR-19). A tab without a panel is not in the strip. */
  tabs: {
    products: PanelSlot;
    media?: PanelSlot;
    network?: PanelSlot;
    contributors?: PanelSlot;
    customers?: PanelSlot;
  };
  /** Rendered in RAIL_ORDER inside the rail surface. Each block wraps itself in
   *  <RailBlock>; a block with nothing real in it returns null, which leaves no
   *  divider behind (COR-54). */
  rail: Partial<Record<RailBlockId, React.ComponentType<SlotProps>>>;
};
