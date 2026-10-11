"use client";

// ProjectHeader — the top of /projects/[id] (spec §5.4; Phase 2 §2.2; Build
// and Earn P0; owner, 2026-10-11). It has two readings.
//
// The engineering header — the owner and a contributor preview. Two columns
// from a 720 px header, stacked below it:
// - left: the h1 with the "Shared" chip while the project is on Innovations
//   (and, in a contributor preview, the role chip, P2-CONTRIB-13); one meta
//   line — the stage line, then Saved {date} · … (`stageLineOf`,
//   `engineeringMetaOf`); the lock line once the project is sold in full; the
//   description (or "Add a description"), then `headerParts.afterDescription`
//   (its coachmark);
// - right: Review version {n} while a draft has a newer version ready, the
//   one "Earn from this project" button (`earnButtonOf`) and the ⋯ menu
//   (project-menu.tsx: Edit name and description, Share to Innovations,
//   Activity, Delete project…), with Earn's short fact under them.
// Then one notice per newer build of a chat that isn't saved yet. The page has
// one violet — Review version while it is pending, else Earn once it is ready.
// No pencil by the h1, no "Edit description" line, no Activity chip: each
// lives in the ⋯ menu, once.
//
// The buyer's side (`buyerSide`: Preview as buyer, and Explore marketplace's
// "market" context) reads the header as before: the status chip, the Shared
// badge, `headerParts.statusRow` (the Utility NFT pill), the status line, the
// meta line ([Created by you · Owned by X] · … · Stage {short} — on Explore
// marketplace "Created by you · Listed {date}"), the description. It offers
// no control: `can()` refuses a visitor and a buyer every one (PPL-6).
//
// Every string here is `headerText()`'s (project-summary.ts) or
// project-header.ts's. Every `can()` passes `view.canCtx`, so the 100 % lock
// refuses editing here as everywhere (§3.8.5). There is no Open in editor: it
// lives on the product page (P2-EDITOR-12).
//
// The h1's arrival focus (COR-7) and the page's one polite live region
// (COR-101) are the shell's (usePageArrival, shell.tsx): `titleRef` and
// `announce` arrive from there through the header slot.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight02Icon, BubbleChatIcon, Coins01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner } from "@/components/ideeza";
import { LeaveButton } from "@/components/create/leave-button";
import { ShowcaseChip, StatusChip } from "@/components/projects/status-chip";
import { LockLine } from "@/components/projects/product/product-states";
import { roleChipOf } from "@/lib/manual/contributors";
import { earnHref } from "@/lib/manual/earn-route";
import { earnButtonOf } from "@/lib/manual/earn-view";
import { headerText, type MetaPart } from "@/lib/manual/project-summary";
import { buyerSide } from "@/lib/manual/project-route";
import { can } from "@/lib/manual/permissions";
import { engineeringMetaOf, pendingNoticesOf, stageLineOf, type PendingNotice } from "@/lib/manual/project-header";
import { earnSourceOf, useEarnFacts } from "../earn/ladder/use-earn-facts";
import { BUYER_PREVIEW_ENTRY, isPreview, useFocusAfterPreview } from "./buyer-preview";
import { ProjectDescription } from "./description-editor";
import { useEditDetails } from "./edit-details";
import { ProjectMenu } from "./project-menu";
import type { ProjectSlots, SlotProps } from "./slots";
import { ProjectTitle } from "./title-editor";

/** Preview as buyer's id (PPL-5). The button lives in Earn's header now; Exit preview still
 *  hands focus to it when it is on the page, else to the h1. */
export const PREVIEW_TRIGGER_ID = "preview-as-buyer-trigger";

/** Sharing the row with ⋯ and 44 px tall at phone width (COR-11, PPL-4); their own width from a
 *  480 px header, 40 px tall once the actions sit beside the title (720 px). */
const HEADER_BUTTON =
  "h-[44px] min-w-0 flex-1 justify-center [@container(min-width:480px)]:flex-none [@container(min-width:720px)]:h-[40px]";

const INLINE_LINK =
  "rounded-sm font-medium text-text-link underline-offset-2 outline-none transition-colors duration-normal ease-decelerate hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";

export function ProjectHeader({
  project,
  view,
  viewer,
  brief,
  now,
  titleRef,
  announce,
  parts,
  context = "project",
}: SlotProps & {
  /** The shell's h1 ref (COR-7), forwarded to ProjectTitle. */
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  /** The page's `headerParts` (§3.10): each renders from the same SlotProps. */
  parts?: ProjectSlots["headerParts"];
  /** "market" on Explore marketplace's buyer view: the meta line leads with "Created by you · Listed {date}". */
  context?: "project" | "market";
}) {
  const router = useRouter();
  // Which control is taking the maker off the page. Never cleared: the navigation unmounts it.
  const [leaving, setLeaving] = React.useState<string | null>(null);
  const earnFactId = React.useId();
  const menuRef = React.useRef<HTMLButtonElement>(null);

  const slotProps: SlotProps = { project, view, viewer, brief, now, announce };
  const { summary, canCtx } = view;
  const text = headerText(summary, { viewer, stage: view.stage, context });
  const owner = can(viewer, "facts.seeOwnerOnly");
  const engineering = context === "project" && !buyerSide(viewer);
  // The ladder's facts, the ones Earn's overview and every commit point read.
  const earnSource = React.useMemo(() => earnSourceOf(project, view, brief), [project, view, brief]);
  const ladder = useEarnFacts(earnSource);

  // What is left of the pair on the engineering page: Review version {n}, the page's violet.
  const review =
    engineering && text.pair.first?.kind === "review-version" && can(viewer, "product.add", canCtx) ? text.pair.first : null;
  const earn =
    engineering && owner
      ? earnButtonOf({
          projectId: project.id,
          commercial: earnSource.commercial,
          soldSharePct: summary.customers.soldSharePct,
          facts: ladder.ready ? ladder.facts : null,
          reviewPending: review !== null,
        })
      : null;
  // A buyer reads a Draft as the chip alone; a minted line stays — "Listed" never stands without its subline (COR-76).
  const showLine = !engineering && summary.status !== "draft";
  const role = roleChipOf(viewer);
  // A2's PendingBuild ↔ A3's PendingVersion: the header's Review version opens `pendingVersion.buildId`.
  const reviewedInHeader = review ? (summary.pendingVersion?.buildId ?? null) : null;
  const notices = owner ? pendingNoticesOf(view.pending, view.lineages, reviewedInHeader) : [];

  const leave = (key: string, href: string) => {
    setLeaving(key);
    router.push(href);
  };
  // PPL-5: Exit preview hands focus back to Preview as buyer when it entered the
  // preview and is on the page — else to the h1 (a bare ?view=buyer link, or
  // the button in Earn's header).
  useFocusAfterPreview(
    !isPreview(viewer),
    () => document.getElementById(PREVIEW_TRIGGER_ID) ?? titleRef.current,
    { claims: (from) => from === BUYER_PREVIEW_ENTRY },
  );

  // P2-CONTRIB-10 on the buyer's side: "Owned by Ana Silva" (a visitor never sees the roster, so
  // the name is never a link). On Explore marketplace: "Created by you · Listed Sep 28, 2026" (§2.4).
  const lead: React.ReactNode[] = [];
  if (!engineering) {
    if (text.createdBy) lead.push(text.createdBy);
    else if (text.ownedBy?.created) lead.push(text.ownedBy.created);
    if (text.ownedBy) lead.push(`Owned by ${text.ownedBy.ownedBy}`);
  }
  const meta: MetaPart[] = engineering
    ? [{ kind: "text", text: stageLineOf(view.engineering, summary) }, ...engineeringMetaOf(summary, view.stage)]
    : text.meta;
  // One editor for the name and the description, opened from ⋯, "Add a description" and the coachmark.
  const canEdit = can(viewer, "project.rename", canCtx) || can(viewer, "project.editDescription", canCtx);
  const fallbackFocus = React.useCallback(() => menuRef.current ?? titleRef.current, [titleRef]);
  const edit = useEditDetails({ project, canEdit: engineering && owner && canEdit, announce, fallbackFocus });
  const menu = engineering && owner;

  return (
    <header className="flex flex-col gap-8 [container-type:inline-size]">
      <div className="flex flex-col gap-6 [@container(min-width:720px)]:flex-row [@container(min-width:720px)]:items-start [@container(min-width:720px)]:justify-between [@container(min-width:720px)]:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 max-w-full">
              <ProjectTitle project={project} titleRef={titleRef} />
            </div>
            {engineering && text.chip.badge && <ShowcaseChip />}
            {parts?.titleRow?.map((Part, i) => <Part key={i} {...slotProps} />)}
            {role && (
              <Badge tone="neutral" icon={<Icon icon={UserIcon} size={12} />}>
                {role}
              </Badge>
            )}
          </div>

          {!engineering && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-md text-text-secondary">
              <StatusChip status={summary.status} word={text.chip.word} />
              {text.chip.badge && <ShowcaseChip />}
              {parts?.statusRow?.map((Part, i) => <Part key={i} {...slotProps} />)}
            </div>
          )}

          {showLine && <p className="min-w-0 text-md text-text-secondary">{text.chip.line}</p>}

          <p className="text-sm text-text-secondary">
            {[
              ...lead,
              ...meta.map((m, i) =>
                m.kind === "time" ? (
                  <time key={`t${i}`} dateTime={m.time.dateTime} title={m.time.title}>
                    {m.time.text}
                  </time>
                ) : (
                  m.text
                ),
              ),
            ].map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && " · "}
                {part}
              </React.Fragment>
            ))}
          </p>

          {text.lockLine && (
            <LockLine line={text.lockLine}>
              {" "}
              <Link href={earnHref(project.id, "customers")} className={INLINE_LINK}>
                See the sale
              </Link>
            </LockLine>
          )}

          <ProjectDescription
            project={project}
            onAdd={menu && can(viewer, "project.editDescription", canCtx) ? () => edit.open() : undefined}
          />
          {parts?.afterDescription?.map((Part, i) => <Part key={i} {...slotProps} />)}
        </div>

        {(review || earn || menu) && (
          <div
            data-header-actions
            className="flex shrink-0 flex-col gap-2 [@container(min-width:480px)]:flex-row [@container(min-width:480px)]:items-center [@container(min-width:480px)]:gap-4 [@container(min-width:720px)]:flex-col [@container(min-width:720px)]:items-end [@container(min-width:720px)]:gap-2"
          >
            <div data-earn-state={earn?.state} className="flex items-center gap-3">
              {review && (
                <LeaveButton
                  tone="primary"
                  busy={leaving === "review"}
                  blocked={leaving !== null}
                  onClick={() => leave("review", review.href)}
                  icon={ArrowRight02Icon}
                  className={HEADER_BUTTON}
                >
                  {review.label}
                </LeaveButton>
              )}
              {earn && (
                <LeaveButton
                  tone={earn.violet ? "primary" : "quiet"}
                  busy={leaving === "earn"}
                  blocked={leaving !== null}
                  onClick={() => leave("earn", earn.href)}
                  icon={Coins01Icon}
                  className={HEADER_BUTTON}
                  aria-describedby={earn.sub ? earnFactId : undefined}
                >
                  {earn.label}
                </LeaveButton>
              )}
              {menu && (
                <ProjectMenu {...slotProps} canEdit={canEdit} onEdit={() => edit.open()} triggerRef={menuRef} />
              )}
            </div>
            {earn?.sub && (
              <span id={earnFactId} className="text-sm text-text-secondary">
                {earn.sub}
              </span>
            )}
          </div>
        )}
      </div>

      {notices.length > 0 && (
        <div className="flex flex-col gap-4">
          {notices.map((n) => (
            <PendingBanner
              key={n.buildId}
              notice={n}
              busy={leaving === n.buildId}
              blocked={leaving !== null}
              onLeave={(href) => leave(n.buildId, href)}
            />
          ))}
        </div>
      )}
      {edit.dialog}
    </header>
  );
}

/** COR-18: a newer build of one chat, not saved yet. The Banner is a polite live
 *  region; what it speaks changes only with `announceKey` (COR-101), while the
 *  visible count follows every finished piece. */
function PendingBanner({
  notice,
  busy,
  blocked,
  onLeave,
}: {
  notice: PendingNotice;
  busy: boolean;
  blocked: boolean;
  onLeave: (href: string) => void;
}) {
  const spoken = useKeyed(notice.text, notice.announceKey);
  const action = notice.action;
  return (
    <Banner
      tone={notice.tone}
      action={
        action ? (
          <LeaveButton
            tone="quiet"
            busy={busy}
            blocked={blocked}
            onClick={() => onLeave(action.href)}
            icon={action.kind === "chat" ? BubbleChatIcon : ArrowRight02Icon}
            className="h-[44px] [@container(min-width:520px)]:h-[40px]"
          >
            {action.label}
          </LeaveButton>
        ) : undefined
      }
    >
      <span aria-hidden>{notice.text}</span>
      <span className="sr-only">{spoken}</span>
    </Banner>
  );
}

/** `text` as it was when `key` last changed. */
function useKeyed(text: string, key: string): string {
  const [held, setHeld] = React.useState({ key, text });
  if (held.key !== key) setHeld({ key, text });
  return held.key === key ? held.text : text;
}
