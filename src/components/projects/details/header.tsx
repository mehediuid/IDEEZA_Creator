"use client";

// ProjectHeader — the top of /projects/[id] (spec §5.4; Phase 2 §2.2). In
// reading order, at every width:
// 1. the title row: the h1 and its rename pencil, then `headerParts.titleRow`
//    (the Activity chip and its "?", the Business plan chip, right-aligned);
// 2. the status row: the status chip, the Showcase badge,
//    `headerParts.statusRow` (the Utility NFT pill) and, in a contributor
//    preview, the role chip (P2-CONTRIB-13);
// 3. the status line — in the owner's Sold line the buyer is a link to their
//    Customers row — then the lock line once the project is sold in full;
// 4. the meta line: [Created by you · Owned by X] · … · Stage {short};
// 5. the description, then `headerParts.afterDescription` (its coachmark);
// 6. the action pair, then Preview as buyer (quiet, last); then one notice
//    per newer build of a chat that isn't saved yet.
// The pair sits after the description at every width now: the title row
// holds the chips, and the one next step reads last, just before the tabs.
//
// Every string here is `headerText()`'s (project-summary.ts) and the pair is
// its `pair` — `nextAction()`'s, the same object the My projects card shows
// (COR-11, LST-32). Nothing here derives a status, a line or an action of its
// own. Every `can()` passes `view.canCtx`, so the 100 % lock refuses rename,
// description and the listing start here as everywhere (§3.8.5). There is no
// ⋮ and no Share (COR-14, P2-TABS-30), and no Open in editor: it lives on the
// product page (P2-EDITOR-12). "Add to marketplace" / "List another share" is
// `actions["add-to-marketplace"]` (T22), rendered in the pair's place with
// the pair's tone; with no such entry it renders nothing.
//
// The h1's arrival focus (COR-7) and the page's one polite live region
// (COR-101) are the shell's (usePageArrival, shell.tsx): `titleRef` and
// `announce` arrive from there through the header slot.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight02Icon, BubbleChatIcon, EyeIcon, Tag01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge, Banner } from "@/components/ideeza";
import { LeaveButton } from "@/components/create/leave-button";
import { ShowcaseChip, StatusChip } from "@/components/projects/status-chip";
import { LockLine } from "@/components/projects/product/product-states";
import { roleChipOf } from "@/lib/manual/contributors";
import { useManualProjects } from "@/lib/manual/projects";
import { headerText, type NextAction } from "@/lib/manual/project-summary";
import { withTab } from "@/lib/manual/project-route";
import { can, hasAudience } from "@/lib/manual/permissions";
import { pendingNoticesOf, type PendingNotice } from "@/lib/manual/project-header";
import { isPreview, useEnterPreview, useFocusAfterPreview } from "./buyer-preview";
import { ProjectDescription } from "./description-editor";
import type { ProjectSlots, SlotProps } from "./slots";
import { ProjectTitle } from "./title-editor";

/** Preview as buyer's id: Exit preview hands focus back to it (PPL-5). */
export const PREVIEW_TRIGGER_ID = "preview-as-buyer-trigger";

const ACTION_ICON: Record<NextAction["kind"], IconValue> = {
  "review-version": ArrowRight02Icon,
  "continue-brief": ArrowRight02Icon,
  "add-brief": ArrowRight02Icon,
  "view-brief": ArrowRight02Icon,
  "add-to-marketplace": Tag01Icon,
};

/** Full width and 44 px at phone width (COR-11, PPL-4); their own width from a 520 px header. */
const HEADER_BUTTON = "h-[44px] w-full justify-center [@container(min-width:520px)]:w-auto";

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
  actions,
  context = "project",
}: SlotProps & {
  /** The shell's h1 ref (COR-7), forwarded to ProjectTitle. */
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  /** The page's `headerParts` (§3.10): each renders from the same SlotProps. */
  parts?: ProjectSlots["headerParts"];
  /** The page's `actions` (§3.10): the listing start, T22. */
  actions?: ProjectSlots["actions"];
  /** "market" on Explore marketplace's buyer view: the meta line leads with "Created by you · Listed {date}". */
  context?: "project" | "market";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { selectProject } = useManualProjects();
  // Which control is taking the maker off the page. Never cleared: the navigation unmounts it.
  const [leaving, setLeaving] = React.useState<string | null>(null);

  const slotProps: SlotProps = { project, view, viewer, brief, now, announce };
  const { summary, canCtx } = view;
  const text = headerText(summary, { viewer, stage: view.stage, context });
  const owner = can(viewer, "facts.seeOwnerOnly");

  // The pair shows only what this viewer may do (PPL-6: absent, not disabled).
  const allowed = (a: NextAction) => {
    switch (a.kind) {
      case "review-version":
        return can(viewer, "product.add", canCtx);
      case "add-to-marketplace":
        // A blocked start (co-owners hold everything) still shows, aria-disabled with its reason.
        return a.blocked ? can(viewer, "facts.seeOwnerOnly") : can(viewer, "listing.create", canCtx);
      default:
        return can(viewer, "project.brief", canCtx);
    }
  };
  const first = text.pair.first && allowed(text.pair.first) ? text.pair.first : null;
  const second = first && text.pair.second && allowed(text.pair.second) ? text.pair.second : null;
  const preview = can(viewer, "preview.enter") && hasAudience(summary.status, summary.showcase);
  // A Draft's line is the maker's own workflow ("Brief in progress · …"); a buyer sees the chip alone.
  // A minted line stays — "Listed" never stands without its subline (COR-76).
  const showLine = owner || summary.status !== "draft";
  const role = roleChipOf(viewer);
  // A2's PendingBuild ↔ A3's PendingVersion: the header's primary opens `pendingVersion.buildId`.
  const reviewedInHeader =
    first?.kind === "review-version" ? (summary.pendingVersion?.buildId ?? null) : null;
  const notices = owner ? pendingNoticesOf(view.pending, view.lineages, reviewedInHeader) : [];

  const leave = (key: string, href: string) => {
    setLeaving(key);
    // The Brief works on the active project; choosing it first skips the workspace's "Opening project…" frame.
    if (href.startsWith("/project/")) selectProject(project.id);
    router.push(href);
  };
  const enterPreview = useEnterPreview();
  // PPL-5: Exit preview hands focus back to this button — or to the h1 when
  // the project offers no preview button of its own (a bare ?view=buyer link).
  useFocusAfterPreview(!isPreview(viewer), () => document.getElementById(PREVIEW_TRIGGER_ID) ?? titleRef.current);

  const Action = actions?.["add-to-marketplace"];
  const actionButton = (a: NextAction, key: "first" | "second", primary: boolean) => {
    if (a.kind === "add-to-marketplace") {
      return Action ? <Action key={key} {...slotProps} action={a} violet={primary} className={HEADER_BUTTON} /> : null;
    }
    return (
      <LeaveButton
        key={key}
        tone={primary ? "primary" : "quiet"}
        busy={leaving === key}
        blocked={leaving !== null}
        onClick={() => leave(key, a.href)}
        icon={ACTION_ICON[a.kind]}
        className={HEADER_BUTTON}
      >
        {a.label}
      </LeaveButton>
    );
  };
  const pairButtons = [
    first ? actionButton(first, "first", text.pair.violet) : null,
    second ? actionButton(second, "second", false) : null,
  ].filter((b) => b !== null);

  // P2-CONTRIB-10: "Created by you · Owned by Ana Silva" — the name a link to the roster when the
  // viewer may see it. On Explore marketplace: "Created by you · Listed Sep 28, 2026" (§2.4).
  const tabHref = (tab: "contributors") => {
    const qs = withTab(search.toString(), tab);
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const lead: React.ReactNode[] = [];
  if (text.createdBy) lead.push(text.createdBy);
  else if (text.ownedBy?.created) lead.push(text.ownedBy.created);
  if (text.ownedBy) {
    lead.push(
      <>
        Owned by{" "}
        {text.ownedBy.linkTab ? (
          <Link href={tabHref(text.ownedBy.linkTab)} scroll={false} className={INLINE_LINK}>
            {text.ownedBy.ownedBy}
          </Link>
        ) : (
          text.ownedBy.ownedBy
        )}
      </>,
    );
  }

  return (
    <header className="flex flex-col gap-8 [container-type:inline-size]">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
          <div className="min-w-0 max-w-full">
            <ProjectTitle
              project={project}
              canRename={can(viewer, "project.rename", canCtx)}
              announce={announce}
              titleRef={titleRef}
            />
          </div>
          {parts?.titleRow?.map((Part, i) => <Part key={i} {...slotProps} />)}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-md text-text-secondary">
          <StatusChip status={summary.status} word={text.chip.word} />
          {text.chip.badge && <ShowcaseChip />}
          {parts?.statusRow?.map((Part, i) => <Part key={i} {...slotProps} />)}
          {role && (
            <Badge tone="neutral" icon={<Icon icon={UserIcon} size={12} />}>
              {role}
            </Badge>
          )}
        </div>

        {showLine && (
          <p className="min-w-0 text-md text-text-secondary">
            {text.soldBuyerLink ? (
              <>
                {text.soldBuyerLink.before}
                <Link href={text.soldBuyerLink.href} scroll={false} className={INLINE_LINK}>
                  {text.soldBuyerLink.label}
                </Link>
                {text.soldBuyerLink.after}
              </>
            ) : (
              text.chip.line
            )}
          </p>
        )}
        {text.lockLine && <LockLine line={text.lockLine} />}

        <p className="text-sm text-text-secondary">
          {[
            ...lead,
            ...text.meta.map((m, i) =>
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

        <ProjectDescription
          project={project}
          canEdit={can(viewer, "project.editDescription", canCtx)}
          announce={announce}
        />
        {parts?.afterDescription?.map((Part, i) => <Part key={i} {...slotProps} />)}
      </div>

      {(pairButtons.length > 0 || preview) && (
        <div
          data-header-actions
          className="flex max-w-full flex-col gap-4 [@container(min-width:520px)]:flex-row [@container(min-width:520px)]:flex-wrap [@container(min-width:520px)]:items-center"
        >
          {pairButtons}
          {preview && (
            <LeaveButton
              id={PREVIEW_TRIGGER_ID}
              tone="quiet"
              busy={false}
              blocked={leaving !== null}
              onClick={enterPreview}
              icon={EyeIcon}
              className={HEADER_BUTTON}
            >
              Preview as buyer
            </LeaveButton>
          )}
        </div>
      )}

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
